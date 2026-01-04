import { router, publicProcedure, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { LoginSchema, CreateUserSchema } from "@search-pdf/shared";
import { User } from "../db/models/User";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/jwt";

export const authRouter = router({
    register: publicProcedure
        .input(CreateUserSchema)
        .mutation(async ({ input }) => {
            // Check if user already exists
            const existingUser = await User.findOne({ email: input.email });
            if (existingUser) {
                throw new TRPCError({
                    code: "CONFLICT",
                    message: "User already exists",
                });
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(input.password, 10);

            // Create user
            const user = await User.create({
                email: input.email,
                password: hashedPassword,
                name: input.name,
                role: input.role || "user",
            });

            // Generate JWT token
            const token = jwt.sign(
                { userId: user._id.toString(), role: user.role },
                JWT_SECRET,
                { expiresIn: "7d" }
            );

            return {
                token,
                user: {
                    id: user._id.toString(),
                    email: user.email,
                    name: user.name,
                    role: user.role,
                },
            };
        }),

    login: publicProcedure.input(LoginSchema).mutation(async ({ input }) => {
        // Find user
        const user = await User.findOne({ email: input.email });
        if (!user) {
            throw new TRPCError({
                code: "UNAUTHORIZED",
                message: "Invalid credentials",
            });
        }

        // Verify password
        const isValid = await bcrypt.compare(input.password, user.password);
        if (!isValid) {
            throw new TRPCError({
                code: "UNAUTHORIZED",
                message: "Invalid credentials",
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id.toString(), role: user.role },
            JWT_SECRET,
            { expiresIn: "7d" }
        );

        return {
            token,
            user: {
                id: user._id.toString(),
                email: user.email,
                name: user.name,
                role: user.role,
            },
        };
    }),

    me: protectedProcedure.query(async ({ ctx }) => {
        const user = await User.findById(ctx.userId);
        if (!user) {
            throw new TRPCError({
                code: "NOT_FOUND",
                message: "User not found",
            });
        }

        return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
        };
    }),
});
