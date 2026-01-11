import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@fileai/server";

export const trpc = createTRPCReact<AppRouter>();

