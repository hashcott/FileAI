import { router, publicProcedure, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { LoginSchema, CreateUserSchema } from "@fileai/shared";
import { User } from "../db/models/User";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/jwt";
import { z } from "zod";

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

    updateProfile: protectedProcedure
        .input(
            z.object({
                name: z.string().min(1).optional(),
                email: z.string().email().optional(),
            })
        )
        .mutation(async ({ input, ctx }) => {
            const user = await User.findById(ctx.userId);
            if (!user) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "User not found",
                });
            }

            // Check if email is being changed and already exists
            if (input.email && input.email !== user.email) {
                const existingUser = await User.findOne({ email: input.email });
                if (existingUser) {
                    throw new TRPCError({
                        code: "CONFLICT",
                        message: "Email already exists",
                    });
                }
            }

            // Update fields
            if (input.name !== undefined) {
                user.name = input.name;
            }
            if (input.email !== undefined) {
                user.email = input.email;
            }

            await user.save();

            return {
                id: user._id.toString(),
                email: user.email,
                name: user.name,
                role: user.role,
            };
        }),

    changePassword: protectedProcedure
        .input(
            z.object({
                currentPassword: z.string().min(1),
                newPassword: z.string().min(6),
            })
        )
        .mutation(async ({ input, ctx }) => {
            const user = await User.findById(ctx.userId);
            if (!user) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "User not found",
                });
            }

            // Verify current password
            const isValid = await bcrypt.compare(input.currentPassword, user.password);
            if (!isValid) {
                throw new TRPCError({
                    code: "UNAUTHORIZED",
                    message: "Current password is incorrect",
                });
            }

            // Hash new password
            const hashedPassword = await bcrypt.hash(input.newPassword, 10);
            user.password = hashedPassword;
            await user.save();

            return { success: true };
        }),
});
