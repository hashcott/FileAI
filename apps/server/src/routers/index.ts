import { router } from "../trpc";
import { authRouter } from "./auth";
import { documentRouter } from "./document";
import { searchRouter } from "./search";
import { configRouter } from "./config";
import { chatRouter } from "./chat";

export const appRouter = router({
  auth: authRouter,
  document: documentRouter,
  search: searchRouter,
  config: configRouter,
  chat: chatRouter,
});

export type AppRouter = typeof appRouter;

