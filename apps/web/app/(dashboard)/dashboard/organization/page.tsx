"use client";

import { useState } from "react";
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
    Building2,
    GraduationCap,
    Users,
    User,
    Plus,
    Crown,
    Shield,
    Edit3,
    Eye,
    UserMinus,
    Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

const orgTypeIcons: Record<string, React.ReactNode> = {
    company: <Building2 className="h-5 w-5" />,
    school: <GraduationCap className="h-5 w-5" />,
    team: <Users className="h-5 w-5" />,
    personal: <User className="h-5 w-5" />,
};

const roleIcons: Record<string, React.ReactNode> = {
    owner: <Crown className="h-4 w-4 text-chart-4" />,
    admin: <Shield className="h-4 w-4 text-primary" />,
    editor: <Edit3 className="h-4 w-4 text-chart-1" />,
    member: <Users className="h-4 w-4 text-chart-2" />,
    viewer: <Eye className="h-4 w-4 text-muted-foreground" />,
    guest: <UserMinus className="h-4 w-4 text-muted-foreground" />,
};

const roleBadgeColors: Record<string, string> = {
    owner: "bg-chart-4/10 text-chart-4",
    admin: "bg-primary/10 text-primary",
    editor: "bg-chart-1/10 text-chart-1",
    member: "bg-chart-2/10 text-chart-2",
    viewer: "bg-muted text-muted-foreground",
    guest: "bg-muted text-muted-foreground",
};

export default function OrganizationPage() {
    const { toast } = useToast();
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [newOrg, setNewOrg] = useState({
        name: "",
        slug: "",
        type: "team" as "company" | "school" | "team" | "personal",
        description: "",
    });

    const { data: organizations, isLoading, refetch } = trpc.organization.list.useQuery();

    const createMutation = trpc.organization.create.useMutation({
        onSuccess: () => {
            toast({ title: "Success", description: "Organization created" });
            setCreateDialogOpen(false);
            setNewOrg({ name: "", slug: "", type: "team", description: "" });
            refetch();
        },
        onError: (error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    const handleCreateOrg = () => {
        if (!newOrg.name || !newOrg.slug) {
            toast({ title: "Error", description: "Name and slug are required", variant: "destructive" });
            return;
        }
        createMutation.mutate(newOrg);
    };

    const generateSlug = (name: string) => {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-")
            .substring(0, 50);
    };

    return (
        <div className="h-full overflow-y-auto p-6 lg:p-8 space-y-6 max-w-5xl mx-auto custom-scrollbar">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Organizations</h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Manage your teams and workspaces.
                    </p>
                </div>

                <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="rounded-lg bg-primary h-9">
                            <Plus className="h-4 w-4 mr-2" />
                            Create Organization
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-card border-border rounded-xl">
                        <DialogHeader>
                            <DialogTitle>Create Organization</DialogTitle>
                            <DialogDescription>
                                Create a new shared workspace for your team.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    placeholder="e.g., My Team"
                                    value={newOrg.name}
                                    className="bg-accent border-border"
                                    onChange={(e) => {
                                        setNewOrg({
                                            ...newOrg,
                                            name: e.target.value,
                                            slug: generateSlug(e.target.value),
                                        });
                                    }}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="slug">Slug</Label>
                                <Input
                                    id="slug"
                                    placeholder="my-team"
                                    value={newOrg.slug}
                                    className="bg-accent border-border font-mono"
                                    onChange={(e) =>
                                        setNewOrg({ ...newOrg, slug: e.target.value })
                                    }
                                />
                                <p className="text-xs text-muted-foreground">
                                    URL: /org/{newOrg.slug || "slug"}
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="type">Type</Label>
                                <Select
                                    value={newOrg.type}
                                    onValueChange={(value: "company" | "school" | "team" | "personal") =>
                                        setNewOrg({ ...newOrg, type: value })
                                    }
                                >
                                    <SelectTrigger className="bg-accent border-border">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-card border-border rounded-lg">
                                        <SelectItem value="company">
                                            <div className="flex items-center gap-2">
                                                <Building2 className="h-4 w-4" />
                                                Company
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="school">
                                            <div className="flex items-center gap-2">
                                                <GraduationCap className="h-4 w-4" />
                                                School
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="team">
                                            <div className="flex items-center gap-2">
                                                <Users className="h-4 w-4" />
                                                Team
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setCreateDialogOpen(false)}
                                className="rounded-lg"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleCreateOrg}
                                disabled={createMutation.isPending}
                                className="rounded-lg bg-primary"
                            >
                                {createMutation.isPending ? "Creating..." : "Create"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Organizations */}
            {isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : organizations?.length === 0 ? (
                <Card className="bg-card border-border">
                    <CardContent className="p-12 text-center">
                        <div className="w-14 h-14 rounded-xl bg-accent flex items-center justify-center mx-auto mb-4">
                            <Building2 className="h-7 w-7 text-muted-foreground" />
                        </div>
                        <h3 className="font-medium mb-1">No organizations</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Create an organization to collaborate with your team.
                        </p>
                        <Button
                            onClick={() => setCreateDialogOpen(true)}
                            className="rounded-lg bg-primary"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Create Organization
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {organizations?.map((org) => (
                        <Link key={org.id} href={`/dashboard/organization/${org.id}`}>
                            <Card className="bg-card border-border hover:border-primary/30 transition-colors cursor-pointer h-full">
                                <CardContent className="p-5">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                            {orgTypeIcons[org.type] || <Building2 className="h-5 w-5 text-primary" />}
                                        </div>
                                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium ${roleBadgeColors[org.role] || roleBadgeColors.member}`}>
                                            {roleIcons[org.role]}
                                            {org.role}
                                        </span>
                                    </div>

                                    <h3 className="font-medium truncate mb-1">{org.name}</h3>
                                    <p className="text-xs text-muted-foreground font-mono mb-4">/{org.slug}</p>
                                    
                                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border">
                                        <span className="capitalize">{org.type}</span>
                                        {org.joinedAt && (
                                            <span>{new Date(org.joinedAt).toLocaleDateString()}</span>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}

            {/* Role Legend */}
            <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Shield className="h-5 w-5 text-primary" />
                        Role Permissions
                    </CardTitle>
                    <CardDescription>
                        Understanding access levels within organizations
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {[
                            { role: "owner", desc: "Full control and can delete organization" },
                            { role: "admin", desc: "Manage members and all documents" },
                            { role: "editor", desc: "Create and edit documents" },
                            { role: "member", desc: "Upload and view documents" },
                            { role: "viewer", desc: "View documents only" },
                            { role: "guest", desc: "Limited read access" },
                        ].map(({ role, desc }) => (
                            <div
                                key={role}
                                className="flex items-start gap-3 p-3 rounded-lg bg-accent border border-border"
                            >
                                <div className="mt-0.5">{roleIcons[role]}</div>
                                <div>
                                    <p className="font-medium text-sm capitalize">{role}</p>
                                    <p className="text-xs text-muted-foreground">{desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
