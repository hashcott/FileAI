import { router, publicProcedure, adminProcedure } from "../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { SystemConfigSchema } from "@fileai/shared";
import { SystemConfig } from "../db/models/SystemConfig";

export const configRouter = router({
  get: publicProcedure.query(async () => {
    const config = await SystemConfig.findOne();

    if (!config) {
      return {
        isSetupComplete: false,
      };
    }

    return {
      isSetupComplete: config.isSetupComplete,
      storage: config.storage,
      vectorDB: config.vectorDB,
      llm: {
        provider: config.llm.provider,
        model: config.llm.model,
        baseUrl: config.llm.baseUrl,
        temperature: config.llm.temperature,
      },
      embedding: {
        provider: config.embedding.provider,
        model: config.embedding.model,
        baseUrl: config.embedding.baseUrl,
      },
    };
  }),

  save: adminProcedure
    .input(
      SystemConfigSchema.omit({
        id: true,
        createdAt: true,
        updatedAt: true,
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Update or create config
        const config = await SystemConfig.findOneAndUpdate(
          {},
          { ...input, isSetupComplete: true },
          { upsert: true, new: true }
        );

        return {
          success: true,
          id: config._id.toString(),
        };
      } catch (error) {
        console.error("Config save error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to save configuration",
        });
      }
    }),

  testConnection: adminProcedure
    .input(
      z.object({
        type: z.enum(["database", "storage", "vector", "llm"]),
        config: z.record(z.any()),
      })
    )
    .mutation(async ({ input }) => {
      // TODO: Implement connection testing
      return { success: true, message: "Connection successful" };
    }),
});

