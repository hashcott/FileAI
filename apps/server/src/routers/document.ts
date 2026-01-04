import { router, protectedProcedure } from "../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { FileUploadSchema } from "@search-pdf/shared";
import { Document } from "../db/models/Document";
import { processDocument } from "../services/document-processor";

export const documentRouter = router({
  upload: protectedProcedure
    .input(FileUploadSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        // Decode base64 file data
        const fileBuffer = Buffer.from(input.data, "base64");

        // Process document (will be implemented later)
        const result = await processDocument(
          fileBuffer,
          input.filename,
          input.mimeType,
          ctx.userId!
        );

        return result;
      } catch (error) {
        console.error("Upload error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to upload file",
        });
      }
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    const documents = await Document.find({ userId: ctx.userId }).sort({
      createdAt: -1,
    });

    return documents.map((doc) => ({
      id: doc._id.toString(),
      filename: doc.filename,
      mimeType: doc.mimeType,
      size: doc.size,
      processingStatus: doc.processingStatus,
      processingError: doc.processingError,
      createdAt: doc.createdAt,
    }));
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const document = await Document.findOne({
        _id: input.id,
        userId: ctx.userId,
      });

      if (!document) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
        });
      }

      return {
        id: document._id.toString(),
        filename: document.filename,
        originalPath: document.originalPath,
        mimeType: document.mimeType,
        size: document.size,
        textContent: document.textContent,
        pageCount: document.pageCount,
        processingStatus: document.processingStatus,
        processingError: document.processingError,
        metadata: document.metadata,
        createdAt: document.createdAt,
      };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const document = await Document.findOne({
        _id: input.id,
        userId: ctx.userId,
      });

      if (!document) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
        });
      }

      try {
        // Delete from storage
        const { getStorageAdapter } = await import("../services/storage");
        const storage = await getStorageAdapter();
        await storage.delete(document.originalPath);
      } catch (error) {
        console.error("Failed to delete file from storage:", error);
      }

      try {
        // Delete from vector DB
        const { deleteFromVectorDB } = await import("../services/vector-service");
        await deleteFromVectorDB(document._id.toString());
      } catch (error) {
        console.error("Failed to delete from vector DB:", error);
      }

      // Delete document record
      await document.deleteOne();

      return { success: true };
    }),

  download: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const document = await Document.findOne({
        _id: input.id,
        userId: ctx.userId,
      });

      if (!document) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
        });
      }

      const { getStorageAdapter } = await import("../services/storage");
      const storage = await getStorageAdapter();
      const url = await storage.getUrl(document.originalPath);

      return {
        url,
        filename: document.filename,
      };
    }),

  search: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1),
        topK: z.number().min(1).max(50).optional().default(10),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { searchVectorStore } = await import("../services/vector-service");
      
      const results = await searchVectorStore(
        input.query,
        ctx.userId!,
        input.topK
      );

      // Get unique document IDs from results
      const documentIds = [...new Set(results.map((r) => r.metadata.documentId))];

      // Fetch document metadata
      const documents = await Document.find({
        _id: { $in: documentIds },
        userId: ctx.userId,
      });

      const documentsMap = new Map(
        documents.map((doc) => [doc._id.toString(), doc])
      );

      return results.map((result) => ({
        ...result,
        document: documentsMap.get(result.metadata.documentId),
      }));
    }),
});

