import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { Organization } from '../db/models/Organization';
import {
  Membership,
  ROLE_HIERARCHY,
  DEFAULT_ROLE_PERMISSIONS,
  MemberRole,
  PermissionAction,
  ResourceType,
} from '../db/models/Membership';
import { User } from '../db/models/User';
import { getUserAbility, authorize } from '../services/permissions';
import { createNotification } from './notification';

// Input schemas
const CreateOrganizationSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/),
  type: z.enum(['company', 'school', 'team', 'personal']).default('team'),
  description: z.string().max(500).optional(),
});

const UpdateOrganizationSchema = z.object({
  id: z.string(),
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional(),
  settings: z
    .object({
      allowPublicDocuments: z.boolean().optional(),
      defaultMemberRole: z.string().optional(),
      maxStorageBytes: z.number().optional(),
      maxDocuments: z.number().optional(),
    })
    .optional(),
});

const InviteMemberSchema = z.object({
  organizationId: z.string(),
  email: z.string().email(),
  role: z.enum(['admin', 'editor', 'member', 'viewer', 'guest']).default('member'),
});

const UpdateMemberRoleSchema = z.object({
  organizationId: z.string(),
  userId: z.string(),
  role: z.enum(['admin', 'editor', 'member', 'viewer', 'guest']),
});

const SetCustomPermissionsSchema = z.object({
  organizationId: z.string(),
  userId: z.string(),
  customPermissions: z.array(
    z.object({
      resource: z.enum(['all', 'organization', 'document', 'chat', 'member', 'settings']),
      actions: z.array(
        z.enum(['manage', 'create', 'read', 'update', 'delete', 'share', 'export', 'invite'])
      ),
    })
  ),
});

export const organizationRouter = router({
  // Create a new organization (admin only)
  create: protectedProcedure.input(CreateOrganizationSchema).mutation(async ({ input, ctx }) => {
    // Only admin can create organizations
    if (ctx.userRole !== 'admin') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only admin users can create organizations',
      });
    }

    // Check if slug is available
    const existing = await Organization.findOne({ slug: input.slug });
    if (existing) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'Organization slug already exists',
      });
    }

    // Create organization
    const organization = await Organization.create({
      ...input,
      ownerId: ctx.userId,
    });

    // Create owner membership
    await Membership.create({
      userId: ctx.userId,
      organizationId: organization._id,
      role: 'owner',
      status: 'active',
      joinedAt: new Date(),
    });

    return {
      id: organization._id.toString(),
      name: organization.name,
      slug: organization.slug,
      type: organization.type,
    };
  }),

  // List user's organizations
  list: protectedProcedure.query(async ({ ctx }) => {
    const memberships = await Membership.find({
      userId: ctx.userId,
      status: 'active',
    }).populate<{ organizationId: typeof Organization.prototype }>('organizationId');

    return memberships.map((m) => {
      const org = m.organizationId as typeof Organization.prototype;
      return {
        id: org._id.toString(),
        name: org.name,
        slug: org.slug,
        type: org.type,
        logo: org.logo,
        role: m.role,
        joinedAt: m.joinedAt,
      };
    });
  }),

  // Get organization details
  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input, ctx }) => {
    const organization = await Organization.findById(input.id);
    if (!organization) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Organization not found',
      });
    }

    // Check membership
    const membership = await Membership.findOne({
      userId: ctx.userId,
      organizationId: input.id,
      status: 'active',
    });

    if (!membership) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Not a member of this organization',
      });
    }

    // Get user's permissions
    const ability = await getUserAbility(ctx.userId!);
    const orgId = String(input.id);
    const orgSubject = {
      __typename: 'Organization' as const,
      organizationId: orgId,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const canManage = ability.can('manage', orgSubject as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const canUpdate = ability.can('update', orgSubject as any);

    return {
      id: organization._id.toString(),
      name: organization.name,
      slug: organization.slug,
      type: organization.type,
      description: organization.description,
      logo: organization.logo,
      settings: organization.settings,
      isOwner: organization.ownerId.toString() === ctx.userId,
      role: membership.role,
      permissions: {
        canManage,
        canUpdate,
      },
      createdAt: organization.createdAt,
    };
  }),

  // Update organization
  update: protectedProcedure.input(UpdateOrganizationSchema).mutation(async ({ input, ctx }) => {
    await authorize(ctx.userId!, 'update', 'Organization', {
      organizationId: input.id,
    });

    const organization = await Organization.findByIdAndUpdate(
      input.id,
      {
        ...(input.name && { name: input.name }),
        ...(input.description !== undefined && {
          description: input.description,
        }),
        ...(input.settings && { settings: { ...input.settings } }),
      },
      { new: true }
    );

    if (!organization) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Organization not found',
      });
    }

    return {
      id: organization._id.toString(),
      name: organization.name,
      updated: true,
    };
  }),

  // Delete organization (owner only)
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const organization = await Organization.findById(input.id);
      if (!organization) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Organization not found',
        });
      }

      if (organization.ownerId.toString() !== ctx.userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only the owner can delete the organization',
        });
      }

      // Delete all memberships
      await Membership.deleteMany({ organizationId: input.id });

      // Delete organization
      await organization.deleteOne();

      return { success: true };
    }),

  // List organization members
  listMembers: protectedProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ input, ctx }) => {
      await authorize(ctx.userId!, 'read', 'Member', {
        organizationId: input.organizationId,
      });

      const memberships = await Membership.find({
        organizationId: input.organizationId,
      }).populate<{ userId: typeof User.prototype }>('userId', 'name email');

      return memberships.map((m) => {
        const user = m.userId as typeof User.prototype;
        return {
          id: m._id.toString(),
          userId: user._id.toString(),
          name: user.name,
          email: user.email,
          role: m.role,
          status: m.status,
          customPermissions: m.customPermissions,
          joinedAt: m.joinedAt,
          invitedAt: m.invitedAt,
        };
      });
    }),

  // Invite member
  /**
   * Invite a new member to the organization.
   * 
   * Permissions:
   * - Requires 'invite' action on 'Member' resource.
   * - 'owner' and 'admin' roles have this permission by default.
   * 
   * @throws TRPCError (FORBIDDEN) if user lacks permission.
   */
  inviteMember: protectedProcedure.input(InviteMemberSchema).mutation(async ({ input, ctx }) => {
    await authorize(ctx.userId!, 'invite', 'Member', {
      organizationId: input.organizationId,
    });

    // Check if user exists
    const user = await User.findOne({ email: input.email });
    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User not found with this email',
      });
    }

    // Check if already a member
    const existing = await Membership.findOne({
      userId: user._id,
      organizationId: input.organizationId,
    });

    if (existing) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'User is already a member',
      });
    }

    // Create membership
    const membership = await Membership.create({
      userId: user._id,
      organizationId: input.organizationId,
      role: input.role,
      invitedBy: ctx.userId,
      invitedAt: new Date(),
      status: 'active', // Auto-accept for now
      joinedAt: new Date(),
    });

    // Get organization and inviter info for notification
    const [organization, inviter] = await Promise.all([
      Organization.findById(input.organizationId).select('name').lean(),
      User.findById(ctx.userId).select('name email').lean(),
    ]);

    const orgName = organization?.name || 'an organization';
    const inviterName = inviter?.name || inviter?.email || 'Someone';

    // Create notification for invited user
    try {
      await createNotification(
        user._id.toString(),
        'organization_joined',
        'Added to Organization',
        `${inviterName} added you to "${orgName}" as ${input.role}.`,
        {
          link: `/dashboard/organization/${input.organizationId}`,
          metadata: { organizationId: input.organizationId },
        }
      );
    } catch (notifyError) {
      console.error('Failed to create invite notification:', notifyError);
    }

    return {
      id: membership._id.toString(),
      userId: user._id.toString(),
      email: user.email,
      role: membership.role,
    };
  }),

  // Update member role
  updateMemberRole: protectedProcedure
    .input(UpdateMemberRoleSchema)
    .mutation(async ({ input, ctx }) => {
      await authorize(ctx.userId!, 'update', 'Member', {
        organizationId: input.organizationId,
      });

      // Get current user's membership
      const currentMembership = await Membership.findOne({
        userId: ctx.userId,
        organizationId: input.organizationId,
        status: 'active',
      });

      if (!currentMembership) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Not a member',
        });
      }

      // Get target membership
      const targetMembership = await Membership.findOne({
        userId: input.userId,
        organizationId: input.organizationId,
      });

      if (!targetMembership) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Member not found',
        });
      }

      // Check hierarchy - can't change role of someone with higher rank
      if (ROLE_HIERARCHY[targetMembership.role] >= ROLE_HIERARCHY[currentMembership.role]) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot modify role of member with equal or higher rank',
        });
      }

      // Can't assign a role higher than your own
      if (ROLE_HIERARCHY[input.role] >= ROLE_HIERARCHY[currentMembership.role]) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot assign a role equal to or higher than your own',
        });
      }

      targetMembership.role = input.role;
      await targetMembership.save();

      // Create notification for role change
      try {
        const organization = await Organization.findById(input.organizationId)
          .select('name')
          .lean();
        const orgName = organization?.name || 'the organization';

        await createNotification(
          input.userId,
          'organization_joined',
          'Role Updated',
          `Your role in "${orgName}" has been changed to ${input.role}.`,
          {
            link: `/dashboard/organization/${input.organizationId}`,
            metadata: { organizationId: input.organizationId },
          }
        );
      } catch (notifyError) {
        console.error('Failed to create role update notification:', notifyError);
      }

      return { success: true, newRole: input.role };
    }),

  // Set custom permissions for a member
  setCustomPermissions: protectedProcedure
    .input(SetCustomPermissionsSchema)
    .mutation(async ({ input, ctx }) => {
      await authorize(ctx.userId!, 'manage', 'Member', {
        organizationId: input.organizationId,
      });

      const membership = await Membership.findOne({
        userId: input.userId,
        organizationId: input.organizationId,
      });

      if (!membership) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Member not found',
        });
      }

      membership.customPermissions = input.customPermissions as typeof membership.customPermissions;
      await membership.save();

      return { success: true };
    }),

  // Remove member
  removeMember: protectedProcedure
    .input(z.object({ organizationId: z.string(), userId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await authorize(ctx.userId!, 'delete', 'Member', {
        organizationId: input.organizationId,
      });

      const membership = await Membership.findOne({
        userId: input.userId,
        organizationId: input.organizationId,
      });

      if (!membership) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Member not found',
        });
      }

      // Can't remove owner
      if (membership.role === 'owner') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot remove the owner',
        });
      }

      await membership.deleteOne();

      return { success: true };
    }),

  // Leave organization
  leave: protectedProcedure
    .input(z.object({ organizationId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const membership = await Membership.findOne({
        userId: ctx.userId,
        organizationId: input.organizationId,
      });

      if (!membership) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Not a member',
        });
      }

      // Owner can't leave - must transfer ownership first
      if (membership.role === 'owner') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Owner cannot leave. Transfer ownership first.',
        });
      }

      await membership.deleteOne();

      return { success: true };
    }),

  // Get my permissions in an organization
  getMyPermissions: protectedProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ input, ctx }) => {
      // Get user's membership for this organization
      const membership = await Membership.findOne({
        userId: ctx.userId,
        organizationId: input.organizationId,
        status: 'active',
      }).lean();

      if (!membership) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Not a member of this organization',
        });
      }

      const role = membership.role as MemberRole;
      const customPermissions = membership.customPermissions;

      // Map resource types to display names
      const resourceToDisplay: Record<ResourceType, string> = {
        all: 'All',
        organization: 'Organization',
        document: 'Document',
        chat: 'Chat',
        member: 'Member',
        settings: 'Settings',
      };

      const allActions: PermissionAction[] = [
        'manage',
        'create',
        'read',
        'update',
        'delete',
        'share',
        'export',
        'invite',
      ];

      // Initialize permissions for each resource
      const permissions: Record<string, string[]> = {
        Organization: [],
        Document: [],
        Chat: [],
        Member: [],
        Settings: [],
      };

      // Get role-based permissions
      const rolePermissions = DEFAULT_ROLE_PERMISSIONS[role] || [];

      // Apply role-based permissions
      for (const perm of rolePermissions) {
        const displayName = resourceToDisplay[perm.resource];

        if (perm.resource === 'all') {
          // 'all' resource applies to everything
          const actionsToAdd = perm.actions.includes('manage')
            ? [...allActions]
            : [...perm.actions];

          for (const resourceKey of Object.keys(permissions)) {
            permissions[resourceKey] = Array.from(
              new Set([...permissions[resourceKey], ...actionsToAdd])
            );
          }
        } else if (displayName && displayName in permissions) {
          // Specific resource
          const actionsToAdd = perm.actions.includes('manage')
            ? [...allActions]
            : [...perm.actions];

          permissions[displayName] = Array.from(
            new Set([...permissions[displayName], ...actionsToAdd])
          );
        }
      }

      // Apply custom permissions (overrides/additions)
      if (customPermissions && customPermissions.length > 0) {
        for (const perm of customPermissions) {
          const displayName = resourceToDisplay[perm.resource as ResourceType];

          if (perm.resource === 'all') {
            const actionsToAdd = perm.actions.includes('manage')
              ? [...allActions]
              : [...(perm.actions as PermissionAction[])];

            for (const resourceKey of Object.keys(permissions)) {
              permissions[resourceKey] = Array.from(
                new Set([...permissions[resourceKey], ...actionsToAdd])
              );
            }
          } else if (displayName && displayName in permissions) {
            const actionsToAdd = perm.actions.includes('manage')
              ? [...allActions]
              : [...(perm.actions as PermissionAction[])];

            permissions[displayName] = Array.from(
              new Set([...permissions[displayName], ...actionsToAdd])
            );
          }
        }
      }

      return permissions;
    }),
});
