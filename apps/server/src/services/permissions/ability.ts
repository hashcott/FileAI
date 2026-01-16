import {
  AbilityBuilder,
  createMongoAbility,
  MongoAbility,
  ForcedSubject,
  detectSubjectType,
} from '@casl/ability';
import {
  IMembership,
  MemberRole,
  DEFAULT_ROLE_PERMISSIONS,
  PermissionAction,
  ResourceType,
} from '../../db/models/Membership';

// Define subjects (resources) that can be acted upon
type Subjects = 'Organization' | 'Document' | 'Chat' | 'Member' | 'Settings' | 'all';

// Define actions
type Actions = PermissionAction;

// Define the ability type
export type AppAbility = MongoAbility<[Actions, Subjects | ForcedSubject<Subjects>]>;

// User context for ability building
export interface AbilityContext {
  userId: string;
  memberships: {
    organizationId: string;
    role: MemberRole;
    customPermissions?: IMembership['customPermissions'];
  }[];
}

// Map resource types to subjects
const resourceToSubject: Record<ResourceType, Subjects> = {
  all: 'all',
  organization: 'Organization',
  document: 'Document',
  chat: 'Chat',
  member: 'Member',
  settings: 'Settings',
};

// All concrete subjects (not including 'all')
const CONCRETE_SUBJECTS: Subjects[] = ['Organization', 'Document', 'Chat', 'Member', 'Settings'];

// All possible actions
const ALL_ACTIONS: Actions[] = [
  'manage',
  'create',
  'read',
  'update',
  'delete',
  'share',
  'export',
  'invite',
];

/**
 * Build ability (permissions) for a user based on their memberships
 */
export function defineAbilityFor(context: AbilityContext): AppAbility {
  const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  // For each organization the user is a member of
  for (const membership of context.memberships) {
    const { organizationId, role, customPermissions } = membership;

    // Get default permissions for the role
    const rolePermissions = DEFAULT_ROLE_PERMISSIONS[role] || [];

    // Apply role-based permissions
    for (const permission of rolePermissions) {
      const subjectType = resourceToSubject[permission.resource];

      for (const action of permission.actions) {
        if (subjectType === 'all') {
          // 'all' resource means permission applies to all concrete subjects
          if (action === 'manage') {
            // 'manage' on 'all' = full control of everything
            for (const concreteSubject of CONCRETE_SUBJECTS) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              can('manage', concreteSubject, { organizationId } as any);
            }
          } else {
            for (const concreteSubject of CONCRETE_SUBJECTS) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              can(action, concreteSubject, { organizationId } as any);
            }
          }
        } else if (action === 'manage') {
          // "manage" grants all actions on the specific resource
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          can('manage', subjectType, { organizationId } as any);
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          can(action, subjectType, { organizationId } as any);
        }
      }
    }

    // Apply custom permissions (overrides)
    if (customPermissions) {
      for (const permission of customPermissions) {
        const subjectType = resourceToSubject[permission.resource];

        for (const action of permission.actions) {
          if (subjectType === 'all') {
            // Custom 'all' permission applies to all concrete subjects
            for (const concreteSubject of CONCRETE_SUBJECTS) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              can(action, concreteSubject, { organizationId } as any);
            }
          } else {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            can(action, subjectType, { organizationId } as any);
          }
        }
      }
    }
  }

  // Users can always read their own data (regardless of organization)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  can('read', 'Document', { userId: context.userId } as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  can('read', 'Chat', { userId: context.userId } as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  can('manage', 'Chat', { userId: context.userId } as any);

  return build({
    detectSubjectType: (item) => {
      if (item && typeof item === 'object') {
        if ('__typename' in item) {
          return item.__typename as Subjects;
        }
        if ('__caslSubjectType__' in item) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return (item as any).__caslSubjectType__ as Subjects;
        }
      }
      return detectSubjectType(item) as Subjects;
    },
  });
}

/**
 * Check if user has permission for an action on a resource
 */
export function checkPermission(
  ability: AppAbility,
  action: Actions,
  resource: Subjects,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resourceData?: Record<string, any>
): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ability.can(action, resource, resourceData as any);
}

/**
 * Get all permissions for a user in a specific organization based on role
 */
export function getOrganizationPermissions(
  role: MemberRole,
  customPermissions?: IMembership['customPermissions']
): Record<Subjects, Actions[]> {
  const permissions: Record<string, Actions[]> = {
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
    const subject = resourceToSubject[perm.resource];

    if (subject === 'all') {
      // 'all' resource applies to everything
      const actionsToAdd = perm.actions.includes('manage') ? [...ALL_ACTIONS] : [...perm.actions];

      for (const resourceKey of Object.keys(permissions)) {
        permissions[resourceKey] = Array.from(
          new Set([...permissions[resourceKey], ...actionsToAdd])
        );
      }
    } else if (subject in permissions) {
      const actionsToAdd = perm.actions.includes('manage') ? [...ALL_ACTIONS] : [...perm.actions];

      permissions[subject] = Array.from(new Set([...permissions[subject], ...actionsToAdd]));
    }
  }

  // Apply custom permissions
  if (customPermissions && customPermissions.length > 0) {
    for (const perm of customPermissions) {
      const subject = resourceToSubject[perm.resource];

      if (subject === 'all') {
        const actionsToAdd = perm.actions.includes('manage') ? [...ALL_ACTIONS] : [...perm.actions];

        for (const resourceKey of Object.keys(permissions)) {
          permissions[resourceKey] = Array.from(
            new Set([...permissions[resourceKey], ...actionsToAdd])
          );
        }
      } else if (subject in permissions) {
        const actionsToAdd = perm.actions.includes('manage') ? [...ALL_ACTIONS] : [...perm.actions];

        permissions[subject] = Array.from(new Set([...permissions[subject], ...actionsToAdd]));
      }
    }
  }

  return permissions as Record<Subjects, Actions[]>;
}

/**
 * Create a simple ability for public/unauthenticated users
 */
export function definePublicAbility(): AppAbility {
  const { cannot, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  // Public users cannot do anything by default
  cannot('manage', 'all');

  return build({
    detectSubjectType: (item) => {
      if (item && typeof item === 'object' && '__typename' in item) {
        return item.__typename as Subjects;
      }
      return detectSubjectType(item) as Subjects;
    },
  });
}
