'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Users,
  Settings,
  UserPlus,
  Shield,
  Crown,
  Edit3,
  Eye,
  UserMinus,
  Trash2,
  Check,
  X,
  Mail,
  Calendar,
  FileText,
  MessageSquare,
  Building2,
  Cog,
  Info,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

const roleIcons: Record<string, React.ReactNode> = {
  owner: <Crown className="h-4 w-4 text-yellow-500" />,
  admin: <Shield className="h-4 w-4 text-purple-500" />,
  editor: <Edit3 className="h-4 w-4 text-blue-500" />,
  member: <Users className="h-4 w-4 text-green-500" />,
  viewer: <Eye className="h-4 w-4 text-slate-500" />,
  guest: <UserMinus className="h-4 w-4 text-slate-400" />,
};

const roleBadgeColors: Record<string, string> = {
  owner: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  editor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  member: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  viewer: 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400',
  guest: 'bg-slate-100 text-slate-600 dark:bg-slate-900/30 dark:text-slate-500',
};

// Define role permissions for display
const ROLE_PERMISSIONS_DISPLAY = {
  owner: {
    description: 'Full access to all resources and settings',
    permissions: {
      organization: ['manage', 'create', 'read', 'update', 'delete'],
      document: ['manage', 'create', 'read', 'update', 'delete', 'share', 'export'],
      chat: ['manage', 'create', 'read', 'update', 'delete'],
      member: ['manage', 'create', 'read', 'update', 'delete', 'invite'],
      settings: ['manage', 'read', 'update'],
    },
  },
  admin: {
    description: 'Manage members and full document management',
    permissions: {
      organization: ['read', 'update'],
      document: ['manage', 'create', 'read', 'update', 'delete', 'share', 'export'],
      chat: ['manage', 'create', 'read', 'update', 'delete'],
      member: ['create', 'read', 'update', 'delete', 'invite'],
      settings: ['read', 'update'],
    },
  },
  editor: {
    description: 'Create and edit documents',
    permissions: {
      organization: ['read'],
      document: ['create', 'read', 'update'],
      chat: ['create', 'read', 'update'],
      member: ['read'],
      settings: [],
    },
  },
  member: {
    description: 'Create and view documents',
    permissions: {
      organization: ['read'],
      document: ['create', 'read'],
      chat: ['create', 'read'],
      member: ['read'],
      settings: [],
    },
  },
  viewer: {
    description: 'View documents only',
    permissions: {
      organization: ['read'],
      document: ['read'],
      chat: ['read'],
      member: ['read'],
      settings: [],
    },
  },
  guest: {
    description: 'View only documents shared with them',
    permissions: {
      organization: [],
      document: ['read'],
      chat: [],
      member: [],
      settings: [],
    },
  },
};

const RESOURCE_ICONS: Record<string, React.ReactNode> = {
  organization: <Building2 className="h-4 w-4" />,
  document: <FileText className="h-4 w-4" />,
  chat: <MessageSquare className="h-4 w-4" />,
  member: <Users className="h-4 w-4" />,
  settings: <Cog className="h-4 w-4" />,
};

const ALL_ACTIONS = ['manage', 'create', 'read', 'update', 'delete', 'share', 'export', 'invite'];

export default function OrganizationDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'editor' | 'member' | 'viewer' | 'guest'>(
    'member'
  );

  const { data: org, isLoading } = trpc.organization.getById.useQuery({ id: id as string });
  const { data: members, refetch: refetchMembers } = trpc.organization.listMembers.useQuery({
    organizationId: id as string,
  });
  const { data: permissions } = trpc.organization.getMyPermissions.useQuery({
    organizationId: id as string,
  });

  const inviteMutation = trpc.organization.inviteMember.useMutation({
    onSuccess: () => {
      toast({ title: 'Success', description: 'Member invited successfully!' });
      setInviteDialogOpen(false);
      setInviteEmail('');
      refetchMembers();
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateRoleMutation = trpc.organization.updateMemberRole.useMutation({
    onSuccess: () => {
      toast({ title: 'Success', description: 'Role updated successfully!' });
      refetchMembers();
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const removeMemberMutation = trpc.organization.removeMember.useMutation({
    onSuccess: () => {
      toast({ title: 'Success', description: 'Member removed successfully!' });
      refetchMembers();
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteOrgMutation = trpc.organization.delete.useMutation({
    onSuccess: () => {
      toast({ title: 'Success', description: 'Organization deleted!' });
      router.push('/dashboard/organization');
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const canInvite =
    permissions?.Member?.includes('invite') || permissions?.Member?.includes('manage');
  const canUpdateMembers =
    permissions?.Member?.includes('update') || permissions?.Member?.includes('manage');
  const canDeleteMembers =
    permissions?.Member?.includes('delete') || permissions?.Member?.includes('manage');
  const canUpdateOrg =
    permissions?.Organization?.includes('update') || permissions?.Organization?.includes('manage');

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="p-6">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-12 text-center">
            <p className="text-slate-500">Organization not found</p>
            <Link href="/dashboard/organization">
              <Button className="mt-4">Go Back</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn h-full overflow-y-auto custom-scrollbar space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/organization">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-800 dark:text-white">
              {org.name}
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${roleBadgeColors[org.role]}`}
              >
                {roleIcons[org.role]}
                {org.role}
              </span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              /{org.slug} • {org.type}
            </p>
          </div>
        </div>

        {org.isOwner && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Organization?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. All members will lose access.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteOrgMutation.mutate({ id: org.id })}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <Tabs defaultValue="members" className="space-y-6">
        <TabsList className="grid w-full grid-cols-1 gap-2 md:grid-cols-4 h-auto rounded-lg bg-white p-1 shadow-sm dark:bg-slate-800">
          <TabsTrigger
            value="members"
            className="w-full justify-start data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Users className="mr-2 h-4 w-4" />
            Members
          </TabsTrigger>
          <TabsTrigger
            value="permissions"
            className="w-full justify-start data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Shield className="mr-2 h-4 w-4" />
            My Permissions
          </TabsTrigger>
          <TabsTrigger
            value="role-permissions"
            className="w-full justify-start data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Info className="mr-2 h-4 w-4" />
            Role Reference
          </TabsTrigger>
          {canUpdateOrg && (
            <TabsTrigger
              value="settings"
              className="w-full justify-start data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </TabsTrigger>
          )}
        </TabsList>

        {/* Members Tab */}
        <TabsContent value="members">
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Members ({members?.length || 0})</CardTitle>
                <CardDescription>Manage team members and their roles</CardDescription>
              </div>
              {canInvite && (
                <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gradient-primary border-0">
                      <UserPlus className="mr-2 h-4 w-4" />
                      Invite Member
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Invite Member</DialogTitle>
                      <DialogDescription>Invite a user to join this organization</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Email Address</Label>
                        <Input
                          type="email"
                          placeholder="user@example.com"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Role</Label>
                        <Select
                          value={inviteRole}
                          onValueChange={(
                            value: 'admin' | 'editor' | 'member' | 'viewer' | 'guest'
                          ) => setInviteRole(value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="editor">Editor</SelectItem>
                            <SelectItem value="member">Member</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                            <SelectItem value="guest">Guest</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        onClick={() =>
                          inviteMutation.mutate({
                            organizationId: id as string,
                            email: inviteEmail,
                            role: inviteRole,
                          })
                        }
                        disabled={inviteMutation.isPending}
                        className="gradient-primary border-0"
                      >
                        {inviteMutation.isPending ? 'Inviting...' : 'Invite'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {members?.map((member) => (
                  <div
                    key={member.id}
                    className="flex flex-col gap-4 py-4 md:flex-row md:items-center md:justify-between first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                        <span className="text-sm font-medium text-blue-600">
                          {member.name?.charAt(0).toUpperCase() || '?'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-slate-800 dark:text-white">{member.name}</p>
                        <p className="flex items-center gap-1 text-sm text-slate-500">
                          <Mail className="h-3 w-3" />
                          {member.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex w-full items-center justify-between gap-3 md:w-auto md:justify-end">
                      {member.joinedAt && (
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <Calendar className="h-3 w-3" />
                          {new Date(member.joinedAt).toLocaleDateString()}
                        </span>
                      )}

                      {canUpdateMembers && member.role !== 'owner' ? (
                        <Select
                          value={member.role}
                          onValueChange={(
                            value: 'admin' | 'editor' | 'member' | 'viewer' | 'guest'
                          ) =>
                            updateRoleMutation.mutate({
                              organizationId: id as string,
                              userId: member.userId,
                              role: value,
                            })
                          }
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="editor">Editor</SelectItem>
                            <SelectItem value="member">Member</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                            <SelectItem value="guest">Guest</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${roleBadgeColors[member.role]}`}
                        >
                          {roleIcons[member.role]}
                          {member.role}
                        </span>
                      )}

                      {canDeleteMembers && member.role !== 'owner' && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove Member?</AlertDialogTitle>
                              <AlertDialogDescription>
                                {member.name} will lose access to this organization.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() =>
                                  removeMemberMutation.mutate({
                                    organizationId: id as string,
                                    userId: member.userId,
                                  })
                                }
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Permissions Tab */}
        <TabsContent value="permissions">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Your Permissions</CardTitle>
              <CardDescription>What you can do in this organization</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {permissions &&
                  Object.entries(permissions).map(([resource, actions]) => (
                    <div key={resource} className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50">
                      <h4 className="mb-2 font-medium text-slate-800 dark:text-white">
                        {resource}
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {[
                          'manage',
                          'create',
                          'read',
                          'update',
                          'delete',
                          'share',
                          'export',
                          'invite',
                        ].map((action) => (
                          <span
                            key={action}
                            className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium ${
                              (actions as string[]).includes(action)
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-slate-200 text-slate-400 dark:bg-slate-700 dark:text-slate-500'
                            }`}
                          >
                            {(actions as string[]).includes(action) ? (
                              <Check className="h-3 w-3" />
                            ) : (
                              <X className="h-3 w-3" />
                            )}
                            {action}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Role Permissions Reference Tab */}
        <TabsContent value="role-permissions">
          <div className="space-y-6">
            {/* Overview */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-600" />
                  Role Permissions Reference
                </CardTitle>
                <CardDescription>
                  A complete overview of what each role can do in this organization
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Permissions Matrix */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {(Object.keys(ROLE_PERMISSIONS_DISPLAY) as Array<keyof typeof ROLE_PERMISSIONS_DISPLAY>).map((role) => {
                const roleData = ROLE_PERMISSIONS_DISPLAY[role];
                return (
                  <Card key={role} className="border-0 shadow-sm transition-all hover:shadow-md">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                          role === 'owner' ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                          role === 'admin' ? 'bg-purple-100 dark:bg-purple-900/30' :
                          role === 'editor' ? 'bg-blue-100 dark:bg-blue-900/30' :
                          role === 'member' ? 'bg-green-100 dark:bg-green-900/30' :
                          'bg-slate-100 dark:bg-slate-800'
                        }`}>
                          {roleIcons[role]}
                        </div>
                        <div>
                          <CardTitle className="text-lg capitalize">{role}</CardTitle>
                          <CardDescription className="text-xs">{roleData.description}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {Object.entries(roleData.permissions).map(([resource, actions]) => (
                        <div key={resource} className="space-y-1.5">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                            {RESOURCE_ICONS[resource]}
                            <span className="capitalize">{resource}</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {actions.length > 0 ? (
                              (actions as string[]).includes('manage') ? (
                                <span className="inline-flex items-center gap-1 rounded bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                  <Check className="h-2.5 w-2.5" />
                                  Full Access
                                </span>
                              ) : (
                                actions.map((action) => (
                                  <span
                                    key={action}
                                    className="inline-flex items-center rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                                  >
                                    {action}
                                  </span>
                                ))
                              )
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-500">
                                <X className="h-2.5 w-2.5" />
                                No access
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Permissions Legend */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Permissions Legend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  {[
                    { action: 'manage', desc: 'Full control over resource', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
                    { action: 'create', desc: 'Create new items', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
                    { action: 'read', desc: 'View items', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
                    { action: 'update', desc: 'Edit existing items', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
                    { action: 'delete', desc: 'Remove items', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
                    { action: 'share', desc: 'Share with others', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
                    { action: 'export', desc: 'Export/download', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
                    { action: 'invite', desc: 'Invite new members', color: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400' },
                  ].map((item) => (
                    <div key={item.action} className="flex items-start gap-2">
                      <span className={`mt-0.5 inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${item.color}`}>
                        {item.action}
                      </span>
                      <span className="text-xs text-slate-600 dark:text-slate-400">{item.desc}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Role Comparison Table */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Comparison Table</CardTitle>
                <CardDescription>Quick comparison of document permissions across roles</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="py-3 text-left font-medium text-slate-600 dark:text-slate-400">Feature</th>
                        {['owner', 'admin', 'editor', 'member', 'viewer', 'guest'].map((role) => (
                          <th key={role} className="px-2 py-3 text-center">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${roleBadgeColors[role]}`}>
                              {roleIcons[role]}
                              {role}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {[
                        { feature: 'View documents', perms: [true, true, true, true, true, true] },
                        { feature: 'Upload documents', perms: [true, true, true, true, false, false] },
                        { feature: 'Edit documents', perms: [true, true, true, false, false, false] },
                        { feature: 'Delete documents', perms: [true, true, false, false, false, false] },
                        { feature: 'Share documents', perms: [true, true, false, false, false, false] },
                        { feature: 'Manage members', perms: [true, true, false, false, false, false] },
                        { feature: 'Invite members', perms: [true, true, false, false, false, false] },
                        { feature: 'Organization settings', perms: [true, true, false, false, false, false] },
                        { feature: 'Delete organization', perms: [true, false, false, false, false, false] },
                      ].map((row) => (
                        <tr key={row.feature} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="py-3 text-slate-700 dark:text-slate-300">{row.feature}</td>
                          {row.perms.map((allowed, idx) => (
                            <td key={idx} className="px-2 py-3 text-center">
                              {allowed ? (
                                <Check className="mx-auto h-4 w-4 text-green-600" />
                              ) : (
                                <X className="mx-auto h-4 w-4 text-slate-300 dark:text-slate-600" />
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Guest Role Note */}
            <Card className="border-l-4 border-l-amber-400 border-0 shadow-sm">
              <CardContent className="flex items-start gap-3 py-4">
                <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" />
                <div>
                  <p className="font-medium text-slate-800 dark:text-white">About the Guest Role</p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    Guests can only view documents that have been explicitly shared with them. They do not have access to all organization documents by default. Use this role for external collaborators who need limited, document-specific access.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Settings Tab */}
        {canUpdateOrg && (
          <TabsContent value="settings">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Organization Settings</CardTitle>
                <CardDescription>Configure organization preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Default Member Role
                    </p>
                    <p className="font-medium capitalize text-slate-800 dark:text-white">
                      {org.settings?.defaultMemberRole || 'member'}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50">
                    <p className="text-sm text-slate-500 dark:text-slate-400">Public Documents</p>
                    <p className="font-medium text-slate-800 dark:text-white">
                      {org.settings?.allowPublicDocuments ? 'Allowed' : 'Disabled'}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50">
                    <p className="text-sm text-slate-500 dark:text-slate-400">Storage Limit</p>
                    <p className="font-medium text-slate-800 dark:text-white">
                      {((org.settings?.maxStorageBytes || 0) / 1024 / 1024 / 1024).toFixed(1)} GB
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50">
                    <p className="text-sm text-slate-500 dark:text-slate-400">Max Documents</p>
                    <p className="font-medium text-slate-800 dark:text-white">
                      {org.settings?.maxDocuments || 1000}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
