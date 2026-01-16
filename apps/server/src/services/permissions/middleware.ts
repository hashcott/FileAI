import { TRPCError } from '@trpc/server';
import { Membership, PermissionAction, DEFAULT_ROLE_PERMISSIONS } from '../../db/models/Membership';
import { defineAbilityFor, AppAbility, AbilityContext } from './ability';
import { Document, IDocument } from '../../db/models/Document';
import mongoose from 'mongoose';

/**
 * Get user's ability (permissions) based on their memberships
 */
export async function getUserAbility(userId: string): Promise<AppAbility> {
  // Fetch all active memberships for the user
  const memberships = await Membership.find({
    userId,
    status: 'active',
  }).lean();

  const context: AbilityContext = {
    userId,
    memberships: memberships.map((m) => {
      // Ensure organizationId is always a string
      const orgId =
        m.organizationId instanceof mongoose.Types.ObjectId
          ? m.organizationId.toString()
          : String(m.organizationId);

      return {
        organizationId: orgId,
        role: m.role,
        customPermissions: m.customPermissions,
      };
    }),
  };

  return defineAbilityFor(context);
}

/**
 * Check if user can perform action on a resource
 * Throws TRPCError if not authorized
 */
export async function authorize(
  userId: string,
  action: string,
  resource: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resourceData?: Record<string, any>
): Promise<void> {
  const ability = await getUserAbility(userId);

  // For MongoAbility, when we define: can(action, "Document", { organizationId: "123" })
  // We check by passing a subject object that matches the conditions
  let canAccess: boolean;

  if (resourceData && resourceData.organizationId) {
    // Ensure organizationId is a string to match the definition
    const orgId = String(resourceData.organizationId);
    // Create subject object that matches the conditions we defined
    // MongoAbility will match the subject object against the defined conditions
    const subject = {
      __typename: resource,
      __caslSubjectType__: resource, // Fallback for CASL subject detection
      organizationId: orgId,
    };
    
    // Debug logging
    console.log(`[AUTH_DEBUG_${Date.now()}] Authorize check: User ${userId} attempting to ${action} ${resource}`);
    console.log('Subject:', JSON.stringify(subject));
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    canAccess = ability.can(action as PermissionAction, subject as any);
    
    if (!canAccess) {
      const dbName = mongoose.connection.name;
      const memberships = await Membership.find({ userId, status: 'active' });
      const roles = memberships.map(m => m.role).join(', ');

      console.warn(`[AUTH_FAILURE] Authorization failed for user ${userId} on ${resource}`);
      console.warn(`[AUTH_FAILURE] DB: ${dbName}, Roles: [${roles}]`);
      console.warn('Ability rules:', JSON.stringify(ability.rules));

      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `You don't have permission to ${action} this ${resource.toLowerCase()}. Your roles: [${roles || 'none'}].`,
      });
    }
  } else {
    // No conditions - check without conditions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    canAccess = ability.can(action as PermissionAction, resource as any);
  }

  if (!canAccess) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: `You don't have permission to ${action} this ${resource.toLowerCase()}`,
    });
  }
}

/**
 * Get user's memberships with organization details
 */
export async function getUserMemberships(userId: string) {
  return Membership.find({
    userId,
    status: 'active',
  })
    .populate('organizationId', 'name slug type logo')
    .lean();
}

/**
 * Check if user is member of an organization
 */
export async function isMemberOf(userId: string, organizationId: string): Promise<boolean> {
  const membership = await Membership.findOne({
    userId,
    organizationId,
    status: 'active',
  });

  return !!membership;
}

/**
 * Get user's role in an organization
 */
export async function getUserRole(userId: string, organizationId: string): Promise<string | null> {
  const membership = await Membership.findOne({
    userId,
    organizationId,
    status: 'active',
  });

  return membership?.role || null;
}

/**
 * Get all organization IDs that the user is a member of
 */
export async function getUserOrganizations(userId: string): Promise<string[]> {
  const memberships = await Membership.find({
    userId,
    status: 'active',
  }).lean();

  return memberships.map((m) => m.organizationId.toString());
}

/**
 * Get document access context (organization membership info)
 */
export async function getDocumentAccessContext(
  userId: string,
  document: IDocument
): Promise<{
  isPersonal: boolean;
  organizationId: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  membership: any | null;
  isOwner: boolean;
}> {
  const isPersonal = !document.organizationId;
  const organizationId = document.organizationId?.toString() || null;

  let membership = null;
  if (organizationId) {
    membership = await Membership.findOne({
      userId,
      organizationId,
      status: 'active',
    }).lean();
  }

  const isOwner = document.userId === userId;

  return {
    isPersonal,
    organizationId,
    membership,
    isOwner,
  };
}

/**
 * Get user's share permissions for a document
 */
export function getUserSharePermissions(
  userId: string,
  document: IDocument,
  userOrgs: string[]
): {
  fromUserShare: string[] | null;
  fromOrgShare: string[] | null;
  fromPublicShare: string[] | null;
} {
  // Check user-specific share
  let fromUserShare: string[] | null = null;
  if (document.sharedWithUsers) {
    const userShare = document.sharedWithUsers.find((s) => s.userId === userId);
    if (userShare) {
      fromUserShare = userShare.permissions;
    }
  }

  // Check organization share
  let fromOrgShare: string[] | null = null;
  if (document.sharedWithOrganizations && userOrgs.length > 0) {
    for (const orgShare of document.sharedWithOrganizations) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const orgIdValue = orgShare.organizationId as any;
      const orgId =
        orgIdValue instanceof mongoose.Types.ObjectId ? orgIdValue.toString() : String(orgIdValue);

      if (userOrgs.includes(orgId)) {
        // User is member of shared organization, merge permissions
        if (!fromOrgShare) {
          fromOrgShare = [];
        }
        // Merge permissions (union, no duplicates)
        fromOrgShare = Array.from(new Set([...fromOrgShare, ...orgShare.permissions]));
      }
    }
  }

  // Check public share
  let fromPublicShare: string[] | null = null;
  if (document.publicShare && document.publicShare.enabled) {
    fromPublicShare = document.publicShare.permissions || [];
  }

  // Backward compatibility: check old sharedWith array
  if (!fromUserShare && document.sharedWith && document.sharedWith.includes(userId)) {
    fromUserShare = ['read']; // Default to read-only for old shares
  }

  return {
    fromUserShare,
    fromOrgShare,
    fromPublicShare,
  };
}

/**
 * Check if user can perform action on a document
 */
export async function canAccessDocument(
  userId: string,
  documentId: string,
  action: PermissionAction
): Promise<boolean> {
  const document = await Document.findById(documentId);
  if (!document) {
    return false;
  }

  const context = await getDocumentAccessContext(userId, document);
  const userOrgs = await getUserOrganizations(userId);

  // Owner always has all permissions
  if (context.isOwner) {
    return true;
  }

  // Check share permissions (user share, org share, public share)
  const sharePerms = getUserSharePermissions(userId, document, userOrgs);

  // Check user-specific share permissions
  if (sharePerms.fromUserShare && sharePerms.fromUserShare.includes(action)) {
    return true;
  }
  // Check if "manage" is granted (manage includes all actions)
  if (sharePerms.fromUserShare && sharePerms.fromUserShare.includes('manage')) {
    return true;
  }

  // Check organization share permissions
  if (sharePerms.fromOrgShare && sharePerms.fromOrgShare.includes(action)) {
    return true;
  }
  if (sharePerms.fromOrgShare && sharePerms.fromOrgShare.includes('manage')) {
    return true;
  }

  // Check public share permissions
  if (sharePerms.fromPublicShare && sharePerms.fromPublicShare.includes(action)) {
    return true;
  }
  if (sharePerms.fromPublicShare && sharePerms.fromPublicShare.includes('manage')) {
    return true;
  }

  // Personal documents: only owner or shared users can access
  if (context.isPersonal) {
    return false; // Already checked owner above
  }

  // Organization documents
  if (!context.membership) {
    // Not a member of the organization
    return false;
  }

  // Check visibility rules
  if (document.visibility === 'private') {
    // Private documents: only owner can access (already checked)
    return false;
  }

  // Guest role has no default org document access - they need explicit shares
  if (context.membership.role === 'guest') {
    return false;
  }

  // Check role-based permissions directly
  const role = context.membership.role as keyof typeof DEFAULT_ROLE_PERMISSIONS;
  const rolePermissions = DEFAULT_ROLE_PERMISSIONS[role] || [];

  // Check if role has the required action for documents
  for (const perm of rolePermissions) {
    if (perm.resource === 'all' || perm.resource === 'document') {
      if (perm.actions.includes('manage') || perm.actions.includes(action)) {
        return true;
      }
    }
  }

  // Also check custom permissions
  if (context.membership.customPermissions) {
    for (const perm of context.membership.customPermissions) {
      if (perm.resource === 'all' || perm.resource === 'document') {
        if (perm.actions.includes('manage') || perm.actions.includes(action)) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Filter documents by user's access permissions
 */
export async function filterDocumentsByPermission(
  userId: string,
  documents: IDocument[],
  action: PermissionAction = 'read'
): Promise<IDocument[]> {
  const userOrgs = await getUserOrganizations(userId);
  const userOrgIds = new Set(userOrgs);

  // Get user's memberships with roles for direct role checking
  const memberships = await Membership.find({
    userId,
    status: 'active',
  }).lean();

  // Create a map of orgId -> membership for quick lookup
  const membershipMap = new Map(memberships.map((m) => [m.organizationId.toString(), m]));

  const accessible: IDocument[] = [];

  for (const doc of documents) {
    // Owner always has access
    if (doc.userId === userId) {
      accessible.push(doc);
      continue;
    }

    // Check share permissions
    const sharePerms = getUserSharePermissions(userId, doc, userOrgs);

    // Check if user has permission from any share type
    let hasPermission = false;

    // Check user share
    if (sharePerms.fromUserShare) {
      hasPermission =
        sharePerms.fromUserShare.includes(action) || sharePerms.fromUserShare.includes('manage');
    }

    // Check organization share
    if (!hasPermission && sharePerms.fromOrgShare) {
      hasPermission =
        sharePerms.fromOrgShare.includes(action) || sharePerms.fromOrgShare.includes('manage');
    }

    // Check public share
    if (!hasPermission && sharePerms.fromPublicShare) {
      hasPermission =
        sharePerms.fromPublicShare.includes(action) ||
        sharePerms.fromPublicShare.includes('manage');
    }

    if (hasPermission) {
      accessible.push(doc);
      continue;
    }

    // Personal documents: only owner or shared users can access
    if (!doc.organizationId) {
      continue; // Already checked owner and shares above
    }

    // Organization documents
    const orgId = doc.organizationId.toString();

    // Check if user is member of the organization
    if (!userOrgIds.has(orgId)) {
      continue;
    }

    // Check visibility - private documents only accessible by owner
    if (doc.visibility === 'private') {
      continue;
    }

    // Get user's membership for this organization
    const membership = membershipMap.get(orgId);
    if (!membership) {
      continue;
    }

    // Guest role has no default org document access - they need explicit shares
    if (membership.role === 'guest') {
      continue;
    }

    // Check role-based permissions directly
    const rolePermissions = DEFAULT_ROLE_PERMISSIONS[membership.role] || [];

    // Check if role has the required action for documents
    let roleHasPermission = false;
    for (const perm of rolePermissions) {
      if (perm.resource === 'all' || perm.resource === 'document') {
        if (perm.actions.includes('manage') || perm.actions.includes(action)) {
          roleHasPermission = true;
          break;
        }
      }
    }

    // Also check custom permissions
    if (!roleHasPermission && membership.customPermissions) {
      for (const perm of membership.customPermissions) {
        if (perm.resource === 'all' || perm.resource === 'document') {
          if (perm.actions.includes('manage') || perm.actions.includes(action)) {
            roleHasPermission = true;
            break;
          }
        }
      }
    }

    if (roleHasPermission) {
      accessible.push(doc);
    }
  }

  return accessible;
}
