'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Shield,
  Crown,
  Edit3,
  Eye,
  Users,
  UserMinus,
  FileText,
  MessageSquare,
  Building2,
  Cog,
  Check,
  X,
  Info,
  Lock,
  Key,
  ArrowRight,
} from 'lucide-react';

const roleIcons: Record<string, React.ReactNode> = {
  owner: <Crown className="h-5 w-5 text-yellow-500" />,
  admin: <Shield className="h-5 w-5 text-purple-500" />,
  editor: <Edit3 className="h-5 w-5 text-blue-500" />,
  member: <Users className="h-5 w-5 text-green-500" />,
  viewer: <Eye className="h-5 w-5 text-slate-500" />,
  guest: <UserMinus className="h-5 w-5 text-slate-400" />,
};

const roleBadgeColors: Record<string, string> = {
  owner: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  editor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  member: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  viewer: 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400',
  guest: 'bg-slate-100 text-slate-600 dark:bg-slate-900/30 dark:text-slate-500',
};

const ROLE_DEFINITIONS = [
  {
    role: 'owner',
    title: 'Owner',
    description: 'Full access to all resources and complete control over the organization',
    capabilities: [
      'Full control over all organization settings',
      'Manage, create, edit, and delete all documents',
      'Add, remove, and manage all members',
      'Transfer or delete the organization',
      'Access all features and integrations',
    ],
    icon: 'owner',
    color: 'yellow',
  },
  {
    role: 'admin',
    title: 'Admin',
    description: 'Manage members and have full document management capabilities',
    capabilities: [
      'Full control over documents (create, edit, delete, share)',
      'Invite, update roles, and remove members',
      'Update organization settings',
      'Export and share documents externally',
      'Cannot delete the organization',
    ],
    icon: 'admin',
    color: 'purple',
  },
  {
    role: 'editor',
    title: 'Editor',
    description: 'Create and edit documents with collaboration features',
    capabilities: [
      'Create new documents',
      'Edit and update existing documents',
      'View all organization documents',
      'Participate in chat and discussions',
      'Cannot delete documents or manage members',
    ],
    icon: 'editor',
    color: 'blue',
  },
  {
    role: 'member',
    title: 'Member',
    description: 'Create and view documents within the organization',
    capabilities: [
      'Create new documents',
      'View all organization documents',
      'Participate in chat and discussions',
      'Cannot edit documents created by others',
      'Cannot delete documents or manage members',
    ],
    icon: 'member',
    color: 'green',
  },
  {
    role: 'viewer',
    title: 'Viewer',
    description: 'Read-only access to organization documents',
    capabilities: [
      'View all organization documents',
      'View chat and discussions (read-only)',
      'Cannot create or modify documents',
      'Cannot participate in discussions',
      'Perfect for stakeholders needing visibility',
    ],
    icon: 'viewer',
    color: 'slate',
  },
  {
    role: 'guest',
    title: 'Guest',
    description: 'Limited access to specifically shared documents only',
    capabilities: [
      'View only documents shared directly with them',
      'No access to organization-wide documents',
      'Cannot see other members or settings',
      'Ideal for external collaborators',
      'Access controlled per-document',
    ],
    icon: 'guest',
    color: 'slate',
  },
];

const RESOURCES = [
  {
    name: 'Organization',
    icon: <Building2 className="h-5 w-5" />,
    description: 'Organization settings, billing, and configuration',
  },
  {
    name: 'Documents',
    icon: <FileText className="h-5 w-5" />,
    description: 'PDF files, uploads, and document management',
  },
  {
    name: 'Chat',
    icon: <MessageSquare className="h-5 w-5" />,
    description: 'Conversations and AI-powered search discussions',
  },
  {
    name: 'Members',
    icon: <Users className="h-5 w-5" />,
    description: 'Team members and their role assignments',
  },
  {
    name: 'Settings',
    icon: <Cog className="h-5 w-5" />,
    description: 'Configuration options and preferences',
  },
];

const PERMISSION_MATRIX = [
  { feature: 'View documents', owner: true, admin: true, editor: true, member: true, viewer: true, guest: 'shared' },
  { feature: 'Upload documents', owner: true, admin: true, editor: true, member: true, viewer: false, guest: false },
  { feature: 'Edit documents', owner: true, admin: true, editor: true, member: false, viewer: false, guest: false },
  { feature: 'Delete documents', owner: true, admin: true, editor: false, member: false, viewer: false, guest: false },
  { feature: 'Share documents', owner: true, admin: true, editor: false, member: false, viewer: false, guest: false },
  { feature: 'View members', owner: true, admin: true, editor: true, member: true, viewer: true, guest: false },
  { feature: 'Invite members', owner: true, admin: true, editor: false, member: false, viewer: false, guest: false },
  { feature: 'Manage roles', owner: true, admin: true, editor: false, member: false, viewer: false, guest: false },
  { feature: 'Remove members', owner: true, admin: true, editor: false, member: false, viewer: false, guest: false },
  { feature: 'Edit settings', owner: true, admin: true, editor: false, member: false, viewer: false, guest: false },
  { feature: 'Delete organization', owner: true, admin: false, editor: false, member: false, viewer: false, guest: false },
];

function PermissionCell({ value }: { value: boolean | 'shared' }) {
  if (value === 'shared') {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
        <Key className="h-2.5 w-2.5" />
        Shared
      </span>
    );
  }
  return value ? (
    <Check className="mx-auto h-4 w-4 text-green-600" />
  ) : (
    <X className="mx-auto h-4 w-4 text-slate-300 dark:text-slate-600" />
  );
}

export default function PermissionsPage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4">
            <div className="from-purple-500/20 to-blue-500/20 rounded-2xl bg-gradient-to-br p-4 shadow-sm">
              <Shield className="h-7 w-7 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Permissions & Roles</h1>
              <p className="text-muted-foreground">
                Understand the role-based access control system
              </p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="roles" className="space-y-6">
          <TabsList className="grid w-full grid-cols-1 gap-2 md:grid-cols-3 h-auto bg-background border shadow-sm p-1">
            <TabsTrigger value="roles" className="w-full justify-start gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Crown className="h-4 w-4" />
              Roles
            </TabsTrigger>
            <TabsTrigger value="matrix" className="w-full justify-start gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Lock className="h-4 w-4" />
              Permission Matrix
            </TabsTrigger>
            <TabsTrigger value="resources" className="w-full justify-start gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Key className="h-4 w-4" />
              Resources
            </TabsTrigger>
          </TabsList>

          {/* Roles Tab */}
          <TabsContent value="roles" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {ROLE_DEFINITIONS.map((role) => (
                <Card key={role.role} className="group overflow-hidden transition-all hover:shadow-lg">
                  <CardHeader className={`pb-3 ${
                    role.color === 'yellow' ? 'bg-gradient-to-r from-yellow-50 to-transparent dark:from-yellow-900/10' :
                    role.color === 'purple' ? 'bg-gradient-to-r from-purple-50 to-transparent dark:from-purple-900/10' :
                    role.color === 'blue' ? 'bg-gradient-to-r from-blue-50 to-transparent dark:from-blue-900/10' :
                    role.color === 'green' ? 'bg-gradient-to-r from-green-50 to-transparent dark:from-green-900/10' :
                    'bg-gradient-to-r from-slate-50 to-transparent dark:from-slate-900/10'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-xl shadow-sm ${
                        role.color === 'yellow' ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                        role.color === 'purple' ? 'bg-purple-100 dark:bg-purple-900/30' :
                        role.color === 'blue' ? 'bg-blue-100 dark:bg-blue-900/30' :
                        role.color === 'green' ? 'bg-green-100 dark:bg-green-900/30' :
                        'bg-slate-100 dark:bg-slate-800'
                      }`}>
                        {roleIcons[role.role]}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{role.title}</CardTitle>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${roleBadgeColors[role.role]}`}>
                          {role.role}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <p className="text-muted-foreground mb-4 text-sm">{role.description}</p>
                    <ul className="space-y-2">
                      {role.capabilities.map((cap, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <ArrowRight className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-blue-500" />
                          <span className="text-muted-foreground">{cap}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Role Hierarchy */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Info className="h-4 w-4 text-blue-500" />
                  Role Hierarchy
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center justify-center gap-2 py-4">
                  {['owner', 'admin', 'editor', 'member', 'viewer', 'guest'].map((role, idx, arr) => (
                    <div key={role} className="flex items-center gap-2">
                      <div className={`flex items-center gap-2 rounded-lg px-4 py-2 ${roleBadgeColors[role]}`}>
                        {roleIcons[role]}
                        <span className="font-medium capitalize">{role}</span>
                      </div>
                      {idx < arr.length - 1 && (
                        <ArrowRight className="text-muted-foreground h-4 w-4" />
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-muted-foreground text-center text-sm">
                  Higher roles inherit permissions from lower roles. Owners have full access.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Permission Matrix Tab */}
          <TabsContent value="matrix">
            <Card>
              <CardHeader>
                <CardTitle>Permission Matrix</CardTitle>
                <CardDescription>
                  A detailed view of what each role can do across all features
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-slate-200 dark:border-slate-700">
                        <th className="py-4 pr-4 text-left font-semibold text-slate-700 dark:text-slate-300">Feature</th>
                        {['owner', 'admin', 'editor', 'member', 'viewer', 'guest'].map((role) => (
                          <th key={role} className="px-3 py-4 text-center">
                            <div className="flex flex-col items-center gap-2">
                              {roleIcons[role]}
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${roleBadgeColors[role]}`}>
                                {role}
                              </span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {PERMISSION_MATRIX.map((row) => (
                        <tr key={row.feature} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="py-4 pr-4 font-medium text-slate-700 dark:text-slate-300">{row.feature}</td>
                          <td className="px-3 py-4 text-center"><PermissionCell value={row.owner} /></td>
                          <td className="px-3 py-4 text-center"><PermissionCell value={row.admin} /></td>
                          <td className="px-3 py-4 text-center"><PermissionCell value={row.editor} /></td>
                          <td className="px-3 py-4 text-center"><PermissionCell value={row.member} /></td>
                          <td className="px-3 py-4 text-center"><PermissionCell value={row.viewer} /></td>
                          <td className="px-3 py-4 text-center"><PermissionCell value={row.guest as boolean | 'shared'} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Legend */}
            <Card className="mt-4">
              <CardContent className="py-4">
                <div className="flex flex-wrap items-center justify-center gap-6">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-slate-600 dark:text-slate-400">Allowed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <X className="h-4 w-4 text-slate-300 dark:text-slate-600" />
                    <span className="text-sm text-slate-600 dark:text-slate-400">Not allowed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                      <Key className="h-2.5 w-2.5" />
                      Shared
                    </span>
                    <span className="text-sm text-slate-600 dark:text-slate-400">Only for shared items</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Resources Tab */}
          <TabsContent value="resources" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {RESOURCES.map((resource) => (
                <Card key={resource.name} className="group transition-all hover:shadow-lg">
                  <CardContent className="flex items-start gap-4 pt-6">
                    <div className="bg-primary/10 text-primary flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl">
                      {resource.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold">{resource.name}</h3>
                      <p className="text-muted-foreground mt-1 text-sm">{resource.description}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Actions Explanation */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Permission Actions</CardTitle>
                <CardDescription>The actions that can be performed on resources</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {[
                    { action: 'manage', desc: 'Full control over the resource', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
                    { action: 'create', desc: 'Create new items', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
                    { action: 'read', desc: 'View and access items', color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400' },
                    { action: 'update', desc: 'Edit existing items', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
                    { action: 'delete', desc: 'Remove items permanently', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
                    { action: 'share', desc: 'Share with other users', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
                    { action: 'export', desc: 'Download and export', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' },
                    { action: 'invite', desc: 'Invite new members', color: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400' },
                  ].map((item) => (
                    <div key={item.action} className="rounded-lg border p-4">
                      <span className={`inline-flex items-center rounded px-2 py-1 text-xs font-medium uppercase ${item.color}`}>
                        {item.action}
                      </span>
                      <p className="text-muted-foreground mt-2 text-sm">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Info Card */}
        <Card className="mt-6 border-l-4 border-l-blue-500">
          <CardContent className="flex items-start gap-3 py-4">
            <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-500" />
            <div>
              <p className="font-medium">Need Help?</p>
              <p className="text-muted-foreground mt-1 text-sm">
                If you need to change member roles or permissions, go to your organization settings. 
                Only owners and admins can modify member roles. Contact your organization owner if you need elevated access.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
