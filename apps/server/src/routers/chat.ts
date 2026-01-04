import { router, protectedProcedure } from "../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { ChatHistory } from "../db/models/ChatHistory";
import { performRAGQuery, performRAGQueryStream } from "../services/rag-service";
import { observable } from "@trpc/server/observable";

export const chatRouter = router({
  // Create new chat
  create: protectedProcedure
    .input(z.object({ title: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const chat = await ChatHistory.create({
        userId: ctx.userId,
        title: input.title || "New Chat",
        messages: [],
      });

      return {
        id: chat._id.toString(),
        title: chat.title,
        createdAt: chat.createdAt,
      };
    }),

  // List user's chats
  list: protectedProcedure.query(async ({ ctx }) => {
    const chats = await ChatHistory.find({ userId: ctx.userId })
      .sort({ updatedAt: -1 })
      .select("_id title createdAt updatedAt messages");

    return chats.map((chat) => ({
      id: chat._id.toString(),
      title: chat.title,
      messageCount: chat.messages.length,
      lastMessage: chat.messages[chat.messages.length - 1]?.content,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
    }));
  }),

  // Get chat by ID
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const chat = await ChatHistory.findOne({
        _id: input.id,
        userId: ctx.userId,
      });

      if (!chat) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Chat not found",
        });
      }

      return {
        id: chat._id.toString(),
        title: chat.title,
        messages: chat.messages,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
      };
    }),

  // Send message (non-streaming)
  sendMessage: protectedProcedure
    .input(
      z.object({
        chatId: z.string(),
        message: z.string().min(1),
        topK: z.number().min(1).max(20).optional().default(5),
        documentIds: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const chat = await ChatHistory.findOne({
        _id: input.chatId,
        userId: ctx.userId,
      });

      if (!chat) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Chat not found",
        });
      }

      // Add user message
      chat.messages.push({
        role: "user",
        content: input.message,
        timestamp: new Date(),
      });

      // Get RAG response
      const response = await performRAGQuery(
        input.message,
        ctx.userId!,
        input.topK,
        input.documentIds
      );

      // Add assistant message
      chat.messages.push({
        role: "assistant",
        content: response.answer,
        sources: response.sources.map((s) => ({
          documentId: s.metadata.documentId,
          filename: s.metadata.filename,
          content: s.content,
          score: s.score,
        })),
        timestamp: new Date(),
      });

      await chat.save();

      return {
        message: response.answer,
        sources: response.sources,
      };
    }),

  // Send message with streaming
  sendMessageStream: protectedProcedure
    .input(
      z.object({
        chatId: z.string(),
        message: z.string().min(1),
        topK: z.number().min(1).max(20).optional().default(5),
        documentIds: z.array(z.string()).optional(),
      })
    )
    .subscription(async ({ input, ctx }) => {
      return observable<{ type: string; data: any }>((emit) => {
        (async () => {
          try {
            const chat = await ChatHistory.findOne({
              _id: input.chatId,
              userId: ctx.userId,
            });

            if (!chat) {
              emit.error(
                new TRPCError({
                  code: "NOT_FOUND",
                  message: "Chat not found",
                })
              );
              return;
            }

            // Add user message
            chat.messages.push({
              role: "user",
              content: input.message,
              timestamp: new Date(),
            });
            await chat.save();

            // Get streaming response
            const { stream, sources } = await performRAGQueryStream(
              input.message,
              ctx.userId!,
              input.topK,
              input.documentIds
            );

            if (!stream) {
              emit.next({
                type: "answer",
                data: "I couldn't find any relevant information in your documents.",
              });
              emit.complete();
              return;
            }

            // Send sources first
            emit.next({
              type: "sources",
              data: sources,
            });

            let fullAnswer = "";

            // Stream chunks
            for await (const chunk of stream) {
              fullAnswer += chunk;
              emit.next({
                type: "chunk",
                data: chunk,
              });
            }

            // Save complete answer to chat history
            chat.messages.push({
              role: "assistant",
              content: fullAnswer,
              sources: sources.map((s) => ({
                documentId: s.metadata.documentId,
                filename: s.metadata.filename,
                content: s.content,
                score: s.score,
              })),
              timestamp: new Date(),
            });
            await chat.save();

            emit.next({
              type: "complete",
              data: { answer: fullAnswer },
            });
            emit.complete();
          } catch (error) {
            emit.error(error as Error);
          }
        })();
      });
    }),

  // Delete chat
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const chat = await ChatHistory.findOne({
        _id: input.id,
        userId: ctx.userId,
      });

      if (!chat) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Chat not found",
        });
      }

      await chat.deleteOne();

      return { success: true };
    }),

  // Update chat title
  updateTitle: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const chat = await ChatHistory.findOne({
        _id: input.id,
        userId: ctx.userId,
      });

      if (!chat) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Chat not found",
        });
      }

      chat.title = input.title;
      await chat.save();

      return { success: true };
    }),
});

