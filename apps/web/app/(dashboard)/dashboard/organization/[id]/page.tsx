"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
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
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

const roleIcons: Record<string, React.ReactNode> = {
    owner: <Crown className="h-4 w-4 text-yellow-500" />,
    admin: <Shield className="h-4 w-4 text-purple-500" />,
    editor: <Edit3 className="h-4 w-4 text-blue-500" />,
    member: <Users className="h-4 w-4 text-green-500" />,
    viewer: <Eye className="h-4 w-4 text-slate-500" />,
    guest: <UserMinus className="h-4 w-4 text-slate-400" />,
};

const roleBadgeColors: Record<string, string> = {
    owner: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    admin: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    editor: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    member: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    viewer: "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400",
    guest: "bg-slate-100 text-slate-600 dark:bg-slate-900/30 dark:text-slate-500",
};

export default function OrganizationDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState<"admin" | "editor" | "member" | "viewer" | "guest">("member");

    const { data: org, isLoading } = trpc.organization.getById.useQuery({ id: id as string });
    const { data: members, refetch: refetchMembers } = trpc.organization.listMembers.useQuery({ organizationId: id as string });
    const { data: permissions } = trpc.organization.getMyPermissions.useQuery({ organizationId: id as string });

    const inviteMutation = trpc.organization.inviteMember.useMutation({
        onSuccess: () => {
            toast({ title: "Success", description: "Member invited successfully!" });
            setInviteDialogOpen(false);
            setInviteEmail("");
            refetchMembers();
        },
        onError: (error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    const updateRoleMutation = trpc.organization.updateMemberRole.useMutation({
        onSuccess: () => {
            toast({ title: "Success", description: "Role updated successfully!" });
            refetchMembers();
        },
        onError: (error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    const removeMemberMutation = trpc.organization.removeMember.useMutation({
        onSuccess: () => {
            toast({ title: "Success", description: "Member removed successfully!" });
            refetchMembers();
        },
        onError: (error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    const deleteOrgMutation = trpc.organization.delete.useMutation({
        onSuccess: () => {
            toast({ title: "Success", description: "Organization deleted!" });
            router.push("/dashboard/organization");
        },
        onError: (error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    const canInvite = permissions?.Member?.includes("invite") || permissions?.Member?.includes("manage");
    const canUpdateMembers = permissions?.Member?.includes("update") || permissions?.Member?.includes("manage");
    const canDeleteMembers = permissions?.Member?.includes("delete") || permissions?.Member?.includes("manage");
    const canUpdateOrg = permissions?.Organization?.includes("update") || permissions?.Organization?.includes("manage");

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
        <div className="p-6 space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/organization">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            {org.name}
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${roleBadgeColors[org.role]}`}>
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
                                <Trash2 className="h-4 w-4 mr-2" />
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
                <TabsList className="bg-white dark:bg-slate-800 shadow-sm p-1 rounded-lg">
                    <TabsTrigger value="members" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
                        <Users className="h-4 w-4 mr-2" />
                        Members
                    </TabsTrigger>
                    <TabsTrigger value="permissions" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
                        <Shield className="h-4 w-4 mr-2" />
                        My Permissions
                    </TabsTrigger>
                    {canUpdateOrg && (
                        <TabsTrigger value="settings" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
                            <Settings className="h-4 w-4 mr-2" />
                            Settings
                        </TabsTrigger>
                    )}
                </TabsList>

                {/* Members Tab */}
                <TabsContent value="members">
                    <Card className="border-0 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Members ({members?.length || 0})</CardTitle>
                                <CardDescription>
                                    Manage team members and their roles
                                </CardDescription>
                            </div>
                            {canInvite && (
                                <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                                    <DialogTrigger asChild>
                                        <Button className="gradient-primary border-0">
                                            <UserPlus className="h-4 w-4 mr-2" />
                                            Invite Member
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Invite Member</DialogTitle>
                                            <DialogDescription>
                                                Invite a user to join this organization
                                            </DialogDescription>
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
                                                    onValueChange={(value: "admin" | "editor" | "member" | "viewer" | "guest") => setInviteRole(value)}
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
                                                onClick={() => inviteMutation.mutate({
                                                    organizationId: id as string,
                                                    email: inviteEmail,
                                                    role: inviteRole,
                                                })}
                                                disabled={inviteMutation.isLoading}
                                                className="gradient-primary border-0"
                                            >
                                                {inviteMutation.isLoading ? "Inviting..." : "Invite"}
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
                                        className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                                <span className="text-sm font-medium text-blue-600">
                                                    {member.name?.charAt(0).toUpperCase() || "?"}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-800 dark:text-white">
                                                    {member.name}
                                                </p>
                                                <p className="text-sm text-slate-500 flex items-center gap-1">
                                                    <Mail className="h-3 w-3" />
                                                    {member.email}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            {member.joinedAt && (
                                                <span className="text-xs text-slate-400 flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    {new Date(member.joinedAt).toLocaleDateString()}
                                                </span>
                                            )}

                                            {canUpdateMembers && member.role !== "owner" ? (
                                                <Select
                                                    value={member.role}
                                                    onValueChange={(value: "admin" | "editor" | "member" | "viewer" | "guest") =>
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
                                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${roleBadgeColors[member.role]}`}>
                                                    {roleIcons[member.role]}
                                                    {member.role}
                                                </span>
                                            )}

                                            {canDeleteMembers && member.role !== "owner" && (
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700">
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
                                                                onClick={() => removeMemberMutation.mutate({
                                                                    organizationId: id as string,
                                                                    userId: member.userId,
                                                                })}
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
                            <CardDescription>
                                What you can do in this organization
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {permissions && Object.entries(permissions).map(([resource, actions]) => (
                                    <div key={resource} className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                                        <h4 className="font-medium text-slate-800 dark:text-white mb-2">
                                            {resource}
                                        </h4>
                                        <div className="flex flex-wrap gap-2">
                                            {["manage", "create", "read", "update", "delete", "share", "export", "invite"].map((action) => (
                                                <span
                                                    key={action}
                                                    className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                                                        (actions as string[]).includes(action)
                                                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                                            : "bg-slate-200 text-slate-400 dark:bg-slate-700 dark:text-slate-500"
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

                {/* Settings Tab */}
                {canUpdateOrg && (
                    <TabsContent value="settings">
                        <Card className="border-0 shadow-sm">
                            <CardHeader>
                                <CardTitle>Organization Settings</CardTitle>
                                <CardDescription>
                                    Configure organization preferences
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                                        <p className="text-sm text-slate-500 dark:text-slate-400">Default Member Role</p>
                                        <p className="font-medium text-slate-800 dark:text-white capitalize">
                                            {org.settings?.defaultMemberRole || "member"}
                                        </p>
                                    </div>
                                    <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                                        <p className="text-sm text-slate-500 dark:text-slate-400">Public Documents</p>
                                        <p className="font-medium text-slate-800 dark:text-white">
                                            {org.settings?.allowPublicDocuments ? "Allowed" : "Disabled"}
                                        </p>
                                    </div>
                                    <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                                        <p className="text-sm text-slate-500 dark:text-slate-400">Storage Limit</p>
                                        <p className="font-medium text-slate-800 dark:text-white">
                                            {((org.settings?.maxStorageBytes || 0) / 1024 / 1024 / 1024).toFixed(1)} GB
                                        </p>
                                    </div>
                                    <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
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

