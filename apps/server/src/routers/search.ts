import { router, protectedProcedure } from "../trpc";
import { RAGQuerySchema, SearchQuerySchema } from "@fileai/shared";
import { TRPCError } from "@trpc/server";
import { performRAGQuery } from "../services/rag-service";
import { searchVectorStore } from "../services/vector-service";

export const searchRouter = router({
  rag: protectedProcedure
    .input(RAGQuerySchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const result = await performRAGQuery(
          input.query,
          ctx.userId!,
          input.topK,
          input.documentIds
        );

        return result;
      } catch (error) {
        console.error("RAG query error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to perform RAG query",
        });
      }
    }),

  vector: protectedProcedure
    .input(SearchQuerySchema)
    .query(async ({ input, ctx }) => {
      try {
        const results = await searchVectorStore(
          input.query,
          ctx.userId!,
          input.topK,
          input.filter
        );

        return results;
      } catch (error) {
        console.error("Vector search error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to search documents",
        });
      }
    }),
});

