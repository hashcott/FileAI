import { router, protectedProcedure } from "../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { FileUploadSchema, SearchResult } from "@fileai/shared";
import { Document } from "../db/models/Document";
import { User } from "../db/models/User";
import { processDocument } from "../services/document-processor";
import { getStorageAdapter } from "../services/storage";
import { searchVectorStore, deleteFromVectorDB } from "../services/vector-service";
import { 
    authorize, 
    canAccessDocument, 
    filterDocumentsByPermission,
    getUserOrganizations,
    getUserAbility,
    isMemberOf
} from "../services/permissions";
import mongoose from "mongoose";

// Extended upload schema with optional organizationId
const FileUploadWithOrgSchema = FileUploadSchema.extend({
    organizationId: z.string().optional(),
});

export const documentRouter = router({
    upload: protectedProcedure
        .input(FileUploadWithOrgSchema)
        .mutation(async ({ input, ctx }) => {
            try {
                // If organizationId provided, verify membership and permission
                if (input.organizationId) {
                    const isMember = await isMemberOf(ctx.userId!, input.organizationId);
                    if (!isMember) {
                        throw new TRPCError({
                            code: "FORBIDDEN",
                            message: "You are not a member of this organization",
                        });
                    }

                    // Check create permission
                    // Ensure organizationId is a string for CASL
                    const orgId = String(input.organizationId);
                    await authorize(ctx.userId!, "create", "Document", {
                        organizationId: orgId,
                    });
                }

                // Decode base64 file data
                const fileBuffer = Buffer.from(input.data, "base64");

                // Process document
                const result = await processDocument(
                    fileBuffer,
                    input.filename,
                    input.mimeType,
                    ctx.userId!,
                    input.organizationId
                );

                return result;
            } catch (error) {
                if (error instanceof TRPCError) {
                    throw error;
                }
                console.error("Upload error:", error);
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to upload file",
                });
            }
        }),

    list: protectedProcedure.query(async ({ ctx }) => {
        const userOrgs = await getUserOrganizations(ctx.userId!);
        
        // Build query: personal documents OR organization documents OR shared documents
        const query: any = {
            $or: [
                // Personal documents
                { userId: ctx.userId, organizationId: null },
                // Documents shared with this user
                { sharedWith: ctx.userId },
            ],
        };

        // Add organization documents if user is member of any organizations
        if (userOrgs.length > 0) {
            query.$or.push({
                organizationId: { $in: userOrgs.map(id => new mongoose.Types.ObjectId(id)) },
            });
        }

        const documents = await Document.find(query).sort({
            createdAt: -1,
        });

        // Filter by permissions (visibility and role-based access)
        const accessibleDocs = await filterDocumentsByPermission(
            ctx.userId!,
            documents,
            "read"
        );

        return accessibleDocs.map((doc) => ({
            id: doc._id.toString(),
            filename: doc.filename,
            mimeType: doc.mimeType,
            size: doc.size,
            processingStatus: doc.processingStatus,
            processingError: doc.processingError,
            organizationId: doc.organizationId?.toString(),
            visibility: doc.visibility,
            sharedWith: doc.sharedWith || [],
            isShared: (doc.sharedWith || []).includes(ctx.userId!),
            createdAt: doc.createdAt,
        }));
    }),

    getById: protectedProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ input, ctx }) => {
            const document = await Document.findById(input.id);

            if (!document) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Document not found",
                });
            }

            // Check access permission
            const hasAccess = await canAccessDocument(ctx.userId!, input.id, "read");
            if (!hasAccess) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "You don't have permission to access this document",
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
                organizationId: document.organizationId?.toString(),
                visibility: document.visibility,
                sharedWith: document.sharedWith || [],
                createdAt: document.createdAt,
            };
        }),

    update: protectedProcedure
        .input(z.object({
            id: z.string(),
            filename: z.string().optional(),
            visibility: z.enum(["private", "organization", "public"]).optional(),
        }))
        .mutation(async ({ input, ctx }) => {
            const document = await Document.findById(input.id);

            if (!document) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Document not found",
                });
            }

            // Check update permission
            const hasAccess = await canAccessDocument(ctx.userId!, input.id, "update");
            if (!hasAccess) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "You don't have permission to update this document",
                });
            }

            // Update document
            if (input.filename) document.filename = input.filename;
            if (input.visibility) document.visibility = input.visibility;
            await document.save();

            return {
                id: document._id.toString(),
                filename: document.filename,
                visibility: document.visibility,
            };
        }),

    delete: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ input, ctx }) => {
            const document = await Document.findById(input.id);

            if (!document) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Document not found",
                });
            }

            // Check delete permission
            const hasAccess = await canAccessDocument(ctx.userId!, input.id, "delete");
            if (!hasAccess) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "You don't have permission to delete this document",
                });
            }

            try {
                // Delete from storage
                const storage = await getStorageAdapter();
                await storage.delete(document.originalPath);
            } catch (error) {
                console.error("Failed to delete file from storage:", error);
            }

            try {
                // Delete from vector DB
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
            const document = await Document.findById(input.id);

            if (!document) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Document not found",
                });
            }

            // Check read permission (download requires read access)
            const hasAccess = await canAccessDocument(ctx.userId!, input.id, "read");
            if (!hasAccess) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "You don't have permission to download this document",
                });
            }

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
                organizationId: z.string().optional(), // Optional: search within specific organization
            })
        )
        .mutation(async ({ input, ctx }) => {
            // Get user's organizations for filtering
            const userOrgs = await getUserOrganizations(ctx.userId!);
            
            // If organizationId specified, verify membership
            let orgIds = userOrgs;
            if (input.organizationId) {
                const isMember = await isMemberOf(ctx.userId!, input.organizationId);
                if (!isMember) {
                    throw new TRPCError({
                        code: "FORBIDDEN",
                        message: "You are not a member of this organization",
                    });
                }
                orgIds = [input.organizationId];
            }

            // Search in vector store (includes organization documents)
            const results = await searchVectorStore(
                input.query,
                ctx.userId!,
                input.topK,
                undefined,
                orgIds
            );

            // Get unique document IDs from results
            const documentIds = [
                ...new Set(results.map((r: SearchResult) => r.metadata.documentId as string).filter(Boolean)),
            ];

            if (documentIds.length === 0) {
                return [];
            }

            // Fetch document metadata (including organization documents and shared documents)
            const query: any = {
                _id: { $in: documentIds },
                $or: [
                    { userId: ctx.userId, organizationId: null },
                    { sharedWith: ctx.userId },
                ],
            };

            if (orgIds.length > 0) {
                query.$or.push({
                    organizationId: { $in: orgIds.map(id => new mongoose.Types.ObjectId(id)) },
                });
            }

            const documents = await Document.find(query);
            
            // Filter by permissions
            const accessibleDocs = await filterDocumentsByPermission(
                ctx.userId!,
                documents,
                "read"
            );

            const accessibleDocIds = new Set(accessibleDocs.map(doc => doc._id.toString()));
            const documentsMap = new Map(
                accessibleDocs.map((doc) => [doc._id.toString(), doc])
            );

            // Filter results to only include accessible documents
            return results
                .filter((result: SearchResult) => {
                    const docId = result.metadata.documentId as string;
                    return docId && accessibleDocIds.has(docId);
                })
                .map((result: SearchResult) => ({
                    ...result,
                    document: documentsMap.get(result.metadata.documentId as string),
                }));
        }),

    // Share document (supports users, organizations, and public)
    share: protectedProcedure
        .input(z.object({
            documentId: z.string(),
            shareType: z.enum(["user", "organization", "public"]),
            // For user share
            userIds: z.array(z.string()).optional(),
            // For organization share
            organizationIds: z.array(z.string()).optional(),
            // Permissions to grant
            permissions: z.array(z.enum(["manage", "create", "read", "update", "delete", "share", "export"])),
        }))
        .mutation(async ({ input, ctx }) => {
            const document = await Document.findById(input.documentId);

            if (!document) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Document not found",
                });
            }

            // Check if user owns the document or has share/manage permission
            if (document.userId !== ctx.userId) {
                if (document.organizationId) {
                    const ability = await getUserAbility(ctx.userId!);
                    const orgId = String(document.organizationId);
                    const subject = {
                        __typename: "Document" as const,
                        organizationId: orgId,
                    };
                    
                    const canShare = ability.can("manage", subject);
                    if (!canShare) {
                        throw new TRPCError({
                            code: "FORBIDDEN",
                            message: "You don't have permission to share this document",
                        });
                    }
                } else {
                    throw new TRPCError({
                        code: "FORBIDDEN",
                        message: "Only the document owner can share this document",
                    });
                }
            }

            if (input.shareType === "user" && input.userIds) {
                // Share with specific users
                const users = await User.find({
                    _id: { $in: input.userIds.map(id => new mongoose.Types.ObjectId(id)) },
                });

                if (users.length !== input.userIds.length) {
                    throw new TRPCError({
                        code: "BAD_REQUEST",
                        message: "Some users not found",
                    });
                }

                // Initialize sharedWithUsers if needed
                if (!document.sharedWithUsers) {
                    document.sharedWithUsers = [];
                }

                // Update or add user shares
                input.userIds.forEach(userId => {
                    if (userId !== document.userId) { // Don't share with owner
                        const existingIndex = document.sharedWithUsers.findIndex(
                            s => s.userId === userId
                        );
                        
                        if (existingIndex >= 0) {
                            // Update existing share
                            document.sharedWithUsers[existingIndex].permissions = input.permissions;
                            document.sharedWithUsers[existingIndex].sharedBy = ctx.userId!;
                            document.sharedWithUsers[existingIndex].sharedAt = new Date();
                        } else {
                            // Add new share
                            document.sharedWithUsers.push({
                                userId,
                                permissions: input.permissions,
                                sharedAt: new Date(),
                                sharedBy: ctx.userId!,
                            });
                        }
                    }
                });

                await document.save();

                return {
                    success: true,
                    message: `Document shared with ${users.length} user(s)`,
                };
            } else if (input.shareType === "organization" && input.organizationIds) {
                // Share with organizations
                // Verify user is member of all organizations
                for (const orgId of input.organizationIds) {
                    const isMember = await isMemberOf(ctx.userId!, orgId);
                    if (!isMember) {
                        throw new TRPCError({
                            code: "FORBIDDEN",
                            message: `You are not a member of organization ${orgId}`,
                        });
                    }
                }

                // Initialize sharedWithOrganizations if needed
                if (!document.sharedWithOrganizations) {
                    document.sharedWithOrganizations = [];
                }

                // Update or add organization shares
                input.organizationIds.forEach(orgId => {
                    if (orgId !== document.organizationId?.toString()) { // Don't share with same org
                        const existingIndex = document.sharedWithOrganizations.findIndex(
                            s => s.organizationId.toString() === orgId
                        );
                        
                        if (existingIndex >= 0) {
                            // Update existing share
                            document.sharedWithOrganizations[existingIndex].permissions = input.permissions;
                            document.sharedWithOrganizations[existingIndex].sharedBy = ctx.userId!;
                            document.sharedWithOrganizations[existingIndex].sharedAt = new Date();
                        } else {
                            // Add new share
                            document.sharedWithOrganizations.push({
                                organizationId: new mongoose.Types.ObjectId(orgId),
                                permissions: input.permissions,
                                sharedAt: new Date(),
                                sharedBy: ctx.userId!,
                            } as any);
                        }
                    }
                });

                await document.save();

                return {
                    success: true,
                    message: `Document shared with ${input.organizationIds.length} organization(s)`,
                };
            } else if (input.shareType === "public") {
                // Share publicly
                document.publicShare = {
                    enabled: true,
                    permissions: input.permissions,
                    enabledAt: new Date(),
                    enabledBy: ctx.userId!,
                };

                await document.save();

                return {
                    success: true,
                    message: "Document is now publicly shared",
                };
            } else {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Invalid share type or missing required fields",
                });
            }
        }),

    // Unshare document (supports users, organizations, and public)
    unshare: protectedProcedure
        .input(z.object({
            documentId: z.string(),
            shareType: z.enum(["user", "organization", "public"]),
            // For user unshare
            userIds: z.array(z.string()).optional(),
            // For organization unshare
            organizationIds: z.array(z.string()).optional(),
        }))
        .mutation(async ({ input, ctx }) => {
            const document = await Document.findById(input.documentId);

            if (!document) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Document not found",
                });
            }

            // Check if user owns the document or has share/manage permission
            if (document.userId !== ctx.userId) {
                if (document.organizationId) {
                    const ability = await getUserAbility(ctx.userId!);
                    const orgId = String(document.organizationId);
                    const subject = {
                        __typename: "Document" as const,
                        organizationId: orgId,
                    };
                    
                    const canShare = ability.can("manage", subject);
                    if (!canShare) {
                        throw new TRPCError({
                            code: "FORBIDDEN",
                            message: "You don't have permission to unshare this document",
                        });
                    }
                } else {
                    throw new TRPCError({
                        code: "FORBIDDEN",
                        message: "Only the document owner can unshare this document",
                    });
                }
            }

            if (input.shareType === "user" && input.userIds) {
                // Unshare with specific users
                if (!document.sharedWithUsers) {
                    return { success: true, message: "No user shares to remove" };
                }

                document.sharedWithUsers = document.sharedWithUsers.filter(
                    s => !input.userIds!.includes(s.userId)
                );

                await document.save();

                return {
                    success: true,
                    message: `Removed share from ${input.userIds.length} user(s)`,
                };
            } else if (input.shareType === "organization" && input.organizationIds) {
                // Unshare with organizations
                if (!document.sharedWithOrganizations) {
                    return { success: true, message: "No organization shares to remove" };
                }

                document.sharedWithOrganizations = document.sharedWithOrganizations.filter(
                    s => !input.organizationIds!.includes(s.organizationId.toString())
                );

                await document.save();

                return {
                    success: true,
                    message: `Removed share from ${input.organizationIds.length} organization(s)`,
                };
            } else if (input.shareType === "public") {
                // Disable public share
                if (document.publicShare) {
                    document.publicShare.enabled = false;
                }

                await document.save();

                return {
                    success: true,
                    message: "Document is no longer publicly shared",
                };
            } else {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Invalid share type or missing required fields",
                });
            }
        }),

    // List users for sharing (searchable)
    listUsers: protectedProcedure
        .input(z.object({
            query: z.string().optional().default(""),
        }))
        .query(async ({ input, ctx }) => {
            // Don't include current user
            const searchQuery = input.query.trim().toLowerCase();
            const query: any = {
                _id: { $ne: new mongoose.Types.ObjectId(ctx.userId) },
            };

            if (searchQuery) {
                query.$or = [
                    { email: { $regex: searchQuery, $options: "i" } },
                    { name: { $regex: searchQuery, $options: "i" } },
                ];
            }

            const users = await User.find(query)
                .select("_id email name")
                .limit(20)
                .lean();

            return users.map((user) => ({
                id: user._id.toString(),
                email: user.email,
                name: user.name || user.email,
            }));
        }),

    // Get share information for a document
    getShareInfo: protectedProcedure
        .input(z.object({
            documentId: z.string(),
        }))
        .query(async ({ input, ctx }) => {
            const document = await Document.findById(input.documentId);

            if (!document) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Document not found",
                });
            }

            // Check access
            const hasAccess = await canAccessDocument(ctx.userId!, input.documentId, "read");
            if (!hasAccess) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "You don't have permission to view this document",
                });
            }

            // Get shared users with permissions
            let sharedUsers: Array<{ id: string; email: string; name: string; permissions: string[] }> = [];
            if (document.sharedWithUsers && document.sharedWithUsers.length > 0) {
                const userIds = document.sharedWithUsers.map(s => s.userId);
                const users = await User.find({
                    _id: { $in: userIds.map(id => new mongoose.Types.ObjectId(id)) },
                })
                    .select("_id email name")
                    .lean();

                sharedUsers = document.sharedWithUsers.map(share => {
                    const user = users.find(u => u._id.toString() === share.userId);
                    return {
                        id: share.userId,
                        email: user?.email || "",
                        name: user?.name || user?.email || "",
                        permissions: share.permissions,
                    };
                });
            }

            // Get shared organizations with permissions
            let sharedOrganizations: Array<{ id: string; name: string; permissions: string[] }> = [];
            if (document.sharedWithOrganizations && document.sharedWithOrganizations.length > 0) {
                const orgIds = document.sharedWithOrganizations.map(s => s.organizationId);
                const Organization = (await import("../db/models/Organization")).Organization;
                const orgs = await Organization.find({
                    _id: { $in: orgIds },
                })
                    .select("_id name")
                    .lean();

                sharedOrganizations = document.sharedWithOrganizations.map(share => {
                    const orgId = share.organizationId instanceof mongoose.Types.ObjectId
                        ? share.organizationId.toString()
                        : String(share.organizationId);
                    const org = orgs.find(o => o._id.toString() === orgId);
                    return {
                        id: orgId,
                        name: org?.name || "",
                        permissions: share.permissions,
                    };
                });
            }

            // Get public share info
            const publicShare = document.publicShare && document.publicShare.enabled
                ? {
                    enabled: true,
                    permissions: document.publicShare.permissions || [],
                }
                : {
                    enabled: false,
                    permissions: [] as string[],
                };

            return {
                sharedUsers,
                sharedOrganizations,
                publicShare,
            };
        }),

    // Get shared users for a document (backward compatibility)
    getSharedUsers: protectedProcedure
        .input(z.object({
            documentId: z.string(),
        }))
        .query(async ({ input, ctx }) => {
            const document = await Document.findById(input.documentId);

            if (!document) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Document not found",
                });
            }

            // Check access
            const hasAccess = await canAccessDocument(ctx.userId!, input.documentId, "read");
            if (!hasAccess) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "You don't have permission to view this document",
                });
            }

            // Get shared users with permissions
            let sharedUsers: Array<{ id: string; email: string; name: string; permissions: string[] }> = [];
            if (document.sharedWithUsers && document.sharedWithUsers.length > 0) {
                const userIds = document.sharedWithUsers.map(s => s.userId);
                const users = await User.find({
                    _id: { $in: userIds.map(id => new mongoose.Types.ObjectId(id)) },
                })
                    .select("_id email name")
                    .lean();

                sharedUsers = document.sharedWithUsers.map(share => {
                    const user = users.find(u => u._id.toString() === share.userId);
                    return {
                        id: share.userId,
                        email: user?.email || "",
                        name: user?.name || user?.email || "",
                        permissions: share.permissions,
                    };
                });
            }

            return sharedUsers;
        }),
});
