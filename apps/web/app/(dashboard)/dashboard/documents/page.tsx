"use client";

import { useState, useMemo } from "react";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    FileText,
    Search,
    Download,
    Trash2,
    MoreVertical,
    Eye,
    Filter,
    Grid,
    List,
    AlertTriangle,
    CheckCircle,
    Clock,
    AlertCircle,
    FileType,
    Calendar,
    HardDrive,
    RefreshCw,
    Upload,
    ChevronLeft,
    ChevronRight,
    Building2,
    Lock,
    Globe,
    Users,
    Share2,
    UserPlus,
    UserMinus,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatBytes } from "@/lib/utils";
import Link from "next/link";

type ViewMode = "table" | "grid";
type FilterStatus = "all" | "completed" | "processing" | "failed";
type FilterType = "all" | "pdf" | "word" | "xml" | "text";
type SortField = "filename" | "size" | "createdAt" | "status";
type SortOrder = "asc" | "desc";

const ITEMS_PER_PAGE = 10;

export default function DocumentsPage() {
    const { toast } = useToast();

    // State
    const [viewMode, setViewMode] = useState<ViewMode>("table");
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
    const [filterType, setFilterType] = useState<FilterType>("all");
    const [filterOrganization, setFilterOrganization] = useState<string>("all");
    const [sortField, setSortField] = useState<SortField>("createdAt");
    const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
    const [shareDialogOpen, setShareDialogOpen] = useState(false);
    const [shareTarget, setShareTarget] = useState<string | null>(null);
    const [shareType, setShareType] = useState<
        "user" | "organization" | "public"
    >("user");
    const [shareUserQuery, setShareUserQuery] = useState("");
    const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(
        new Set()
    );
    const [selectedOrganizationIds, setSelectedOrganizationIds] = useState<
        Set<string>
    >(new Set());
    const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(
        new Set(["read"])
    );

    // Queries
    const {
        data: documents,
        isLoading,
        refetch,
    } = trpc.document.list.useQuery();
    const { data: organizations } = trpc.organization.list.useQuery();
    const { data: users } = trpc.document.listUsers.useQuery(
        { query: shareUserQuery },
        { enabled: shareDialogOpen }
    );
    const { data: shareInfo, refetch: refetchShareInfo } =
        trpc.document.getShareInfo.useQuery(
            { documentId: shareTarget! },
            { enabled: !!shareTarget && shareDialogOpen }
        );

    const deleteMutation = trpc.document.delete.useMutation({
        onSuccess: () => {
            toast({
                title: "Success",
                description: "Document deleted successfully",
            });
            refetch();
            setSelectedIds(new Set());
        },
        onError: (error) => {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const shareMutation = trpc.document.share.useMutation({
        onSuccess: (data) => {
            toast({ title: "Success", description: data.message });
            refetch();
            refetchShareInfo();
            setSelectedUserIds(new Set());
            setSelectedOrganizationIds(new Set());
            setShareUserQuery("");
            setSelectedPermissions(new Set(["read"]));
        },
        onError: (error) => {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const unshareMutation = trpc.document.unshare.useMutation({
        onSuccess: () => {
            toast({
                title: "Success",
                description: "Share removed successfully",
            });
            refetch();
            refetchShareInfo();
        },
        onError: (error) => {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    // Filter and sort documents
    const filteredDocuments = useMemo(() => {
        if (!documents) return [];

        let result = [...documents];

        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter((doc) =>
                doc.filename.toLowerCase().includes(query)
            );
        }

        // Status filter
        if (filterStatus !== "all") {
            result = result.filter(
                (doc) => doc.processingStatus === filterStatus
            );
        }

        // Type filter
        if (filterType !== "all") {
            const typeMap: Record<string, string[]> = {
                pdf: ["application/pdf"],
                word: [
                    "application/msword",
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                ],
                xml: ["application/xml", "text/xml"],
                text: ["text/plain"],
            };
            result = result.filter((doc) =>
                typeMap[filterType]?.includes(doc.mimeType)
            );
        }

        // Organization filter
        if (filterOrganization !== "all") {
            if (filterOrganization === "personal") {
                result = result.filter((doc) => !doc.organizationId);
            } else {
                result = result.filter(
                    (doc) => doc.organizationId === filterOrganization
                );
            }
        }

        // Sort
        result.sort((a, b) => {
            let comparison = 0;
            switch (sortField) {
                case "filename":
                    comparison = a.filename.localeCompare(b.filename);
                    break;
                case "size":
                    comparison = a.size - b.size;
                    break;
                case "createdAt":
                    comparison =
                        new Date(a.createdAt).getTime() -
                        new Date(b.createdAt).getTime();
                    break;
                case "status":
                    comparison = a.processingStatus.localeCompare(
                        b.processingStatus
                    );
                    break;
            }
            return sortOrder === "asc" ? comparison : -comparison;
        });

        return result;
    }, [
        documents,
        searchQuery,
        filterStatus,
        filterType,
        filterOrganization,
        sortField,
        sortOrder,
    ]);

    // Pagination
    const totalPages = Math.ceil(filteredDocuments.length / ITEMS_PER_PAGE);
    const paginatedDocuments = filteredDocuments.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    // Handlers
    const handleSelectAll = () => {
        if (selectedIds.size === paginatedDocuments.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(paginatedDocuments.map((d) => d.id)));
        }
    };

    const handleSelect = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const handleDelete = (id: string) => {
        setDeleteTarget(id);
        setDeleteDialogOpen(true);
    };

    const handleShare = (id: string) => {
        setShareTarget(id);
        setShareDialogOpen(true);
        setShareType("user");
        setSelectedUserIds(new Set());
        setSelectedOrganizationIds(new Set());
        setShareUserQuery("");
        setSelectedPermissions(new Set(["read"]));
    };

    const handleShareConfirm = () => {
        if (!shareTarget) return;

        if (shareType === "user" && selectedUserIds.size === 0) return;
        if (shareType === "organization" && selectedOrganizationIds.size === 0)
            return;
        if (shareType === "public" && selectedPermissions.size === 0) return;
        if (selectedPermissions.size === 0) return;

        shareMutation.mutate({
            documentId: shareTarget,
            shareType,
            userIds:
                shareType === "user" ? Array.from(selectedUserIds) : undefined,
            organizationIds:
                shareType === "organization"
                    ? Array.from(selectedOrganizationIds)
                    : undefined,
            permissions: Array.from(selectedPermissions) as Array<
                | "manage"
                | "create"
                | "read"
                | "update"
                | "delete"
                | "share"
                | "export"
            >,
        });
    };

    const handleUnshare = (
        shareType: "user" | "organization" | "public",
        id?: string
    ) => {
        if (!shareTarget) return;
        unshareMutation.mutate({
            documentId: shareTarget,
            shareType,
            userIds: shareType === "user" && id ? [id] : undefined,
            organizationIds:
                shareType === "organization" && id ? [id] : undefined,
        });
    };

    const toggleUserSelection = (userId: string) => {
        const newSelected = new Set(selectedUserIds);
        if (newSelected.has(userId)) {
            newSelected.delete(userId);
        } else {
            newSelected.add(userId);
        }
        setSelectedUserIds(newSelected);
    };

    const toggleOrganizationSelection = (orgId: string) => {
        const newSelected = new Set(selectedOrganizationIds);
        if (newSelected.has(orgId)) {
            newSelected.delete(orgId);
        } else {
            newSelected.add(orgId);
        }
        setSelectedOrganizationIds(newSelected);
    };

    const togglePermission = (permission: string) => {
        const newSelected = new Set(selectedPermissions);
        if (permission === "manage") {
            // Manage includes all permissions
            if (newSelected.has("manage")) {
                newSelected.clear();
                newSelected.add("read");
            } else {
                newSelected.clear();
                newSelected.add("manage");
            }
        } else {
            if (newSelected.has(permission)) {
                newSelected.delete(permission);
                // If removing read and no other permissions, add read back
                if (newSelected.size === 0) {
                    newSelected.add("read");
                }
            } else {
                // Remove manage if selecting specific permission
                newSelected.delete("manage");
                newSelected.add(permission);
            }
        }
        setSelectedPermissions(newSelected);
    };

    const permissionLabels: Record<string, string> = {
        manage: "Manage (All permissions)",
        read: "Read",
        update: "Update",
        delete: "Delete",
        share: "Share",
        export: "Export",
    };

    const handleBulkDelete = () => {
        setDeleteTarget(null);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (deleteTarget) {
            await deleteMutation.mutateAsync({ id: deleteTarget });
        } else {
            // Bulk delete
            for (const id of selectedIds) {
                await deleteMutation.mutateAsync({ id });
            }
        }
        setDeleteDialogOpen(false);
        setDeleteTarget(null);
    };

    const handleDownload = async (doc: any) => {
        try {
            // Get auth token from localStorage
            const token = localStorage.getItem("auth_token");
            console.log("Download - Token present:", !!token);

            if (!token) {
                toast({
                    title: "Error",
                    description: "Please login again",
                    variant: "destructive",
                });
                return;
            }

            const serverUrl =
                process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3001";
            console.log("Download - Server URL:", serverUrl);
            console.log("Download - Doc ID:", doc.id);

            const response = await fetch(`${serverUrl}/api/files/${doc.id}`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            console.log("Download - Response status:", response.status);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error("Download error:", errorData);
                throw new Error(errorData.error || "Download failed");
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = doc.filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast({ title: "Success", description: "Download started" });
        } catch (error) {
            console.error("Download error:", error);
            toast({
                title: "Error",
                description: "Failed to download file",
                variant: "destructive",
            });
        }
    };

    const getFileTypeIcon = (mimeType: string) => {
        if (mimeType.includes("pdf")) return "PDF";
        if (mimeType.includes("word") || mimeType.includes("document"))
            return "DOC";
        if (mimeType.includes("xml")) return "XML";
        if (mimeType.includes("text")) return "TXT";
        return "FILE";
    };

    const getFileTypeColor = (mimeType: string) => {
        if (mimeType.includes("pdf"))
            return "bg-rose-500/10 text-rose-500 border border-rose-500/20";
        if (mimeType.includes("word") || mimeType.includes("document"))
            return "bg-primary/10 text-primary border border-primary/20";
        if (mimeType.includes("xml"))
            return "bg-amber-500/10 text-amber-500 border border-amber-500/20";
        if (mimeType.includes("text"))
            return "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20";
        return "bg-slate-500/10 text-slate-500 border border-slate-500/20";
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "completed":
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-sm">
                        <CheckCircle className="h-3 w-3" />
                        Indexed
                    </span>
                );
            case "processing":
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary border border-primary/20 shadow-sm">
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        Analyzing
                    </span>
                );
            case "failed":
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-rose-500/10 text-rose-500 border border-rose-500/20 shadow-sm">
                        <AlertCircle className="h-3 w-3" />
                        Terminal
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-muted/10 text-muted-foreground border border-muted/20 shadow-sm">
                        {status}
                    </span>
                );
        }
    };

    const getVisibilityIcon = (
        visibility?: string,
        organizationId?: string
    ) => {
        if (!organizationId) {
            return (
                <div title="Personal Hive" className="p-1 bg-amber-500/10 rounded-md border border-amber-500/20">
                    <Lock className="h-3 w-3 text-amber-500" />
                </div>
            );
        }
        switch (visibility) {
            case "private":
                return (
                    <div title="Restricted" className="p-1 bg-rose-500/10 rounded-md border border-rose-500/20">
                        <Lock className="h-3 w-3 text-rose-500" />
                    </div>
                );
            case "organization":
                return (
                    <div title="Organization Mesh" className="p-1 bg-primary/10 rounded-md border border-primary/20">
                        <Users className="h-3 w-3 text-primary" />
                    </div>
                );
            case "public":
                return (
                    <div title="Global Broadcast" className="p-1 bg-emerald-500/10 rounded-md border border-emerald-500/20">
                        <Globe className="h-3 w-3 text-emerald-500" />
                    </div>
                );
            default:
                return null;
        }
    };

    const getOrganizationName = (organizationId?: string) => {
        if (!organizationId) return null;
        return organizations?.find((org) => org.id === organizationId)?.name;
    };

    return (
        <div className="h-full overflow-y-auto p-8 sm:p-10 pb-20 space-y-10 max-w-[1600px] mx-auto animate-fadeIn custom-scrollbar">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight">Intelligence Assets</h1>
                    <p className="text-muted-foreground mt-2 text-lg font-medium">
                        Manage and orchestrate your indexed knowledge base.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        onClick={() => refetch()}
                        disabled={isLoading}
                        className="rounded-xl border-border/40 dark:border-border/50 h-11 px-5"
                    >
                        <RefreshCw
                            className={`h-4 w-4 mr-2 opacity-70 ${isLoading ? "animate-spin" : ""
                                }`}
                        />
                        Refresh Index
                    </Button>
                    <Link href="/dashboard/upload">
                        <Button className="bg-ai-gradient shadow-ai border-none rounded-xl h-11 px-6 font-bold hover:opacity-90 transition-all hover:scale-[1.02] active:scale-[0.98]">
                            <Upload className="h-4 w-4 mr-2" />
                            Ingest Assets
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Search and Filters Hub - Premium Glass */}
            <Card className="glass border-none shadow-xl overflow-hidden rounded-3xl">
                <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row gap-6">
                        {/* Smart Search */}
                        <div className="flex-1 relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
                            <Input
                                placeholder="Universal Identity Search..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="bg-black/5 dark:bg-white/5 border-none pl-11 h-12 rounded-2xl focus:ring-1 focus:ring-primary/40 placeholder:text-muted-foreground/40 font-medium"
                            />
                        </div>

                        {/* Operation Filters */}
                        <div className="flex flex-wrap items-center gap-3">
                            <Select
                                value={filterStatus}
                                onValueChange={(value: FilterStatus) => {
                                    setFilterStatus(value);
                                    setCurrentPage(1);
                                }}
                            >
                                <SelectTrigger className="w-40 bg-black/5 dark:bg-white/5 border-none h-12 rounded-2xl focus:ring-1 focus:ring-primary/40 font-medium">
                                    <div className="flex items-center gap-2">
                                        <Filter className="h-4 w-4 text-primary/70" />
                                        <SelectValue placeholder="Status" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="glass border-black/5 dark:border-white/10 rounded-xl">
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                    <SelectItem value="processing">Processing</SelectItem>
                                    <SelectItem value="failed">Failed</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select
                                value={filterType}
                                onValueChange={(value: FilterType) => {
                                    setFilterType(value);
                                    setCurrentPage(1);
                                }}
                            >
                                <SelectTrigger className="w-40 bg-black/5 dark:bg-white/5 border-none h-12 rounded-2xl focus:ring-1 focus:ring-primary/40 font-medium">
                                    <div className="flex items-center gap-2">
                                        <FileType className="h-4 w-4 text-primary/70" />
                                        <SelectValue placeholder="Format" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="glass border-black/5 dark:border-white/10 rounded-xl">
                                    <SelectItem value="all">All Formats</SelectItem>
                                    <SelectItem value="pdf">PDF Artifact</SelectItem>
                                    <SelectItem value="word">Word Doc</SelectItem>
                                    <SelectItem value="xml">XML Schema</SelectItem>
                                    <SelectItem value="text">Flat Text</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select
                                value={filterOrganization}
                                onValueChange={(value: string) => {
                                    setFilterOrganization(value);
                                    setCurrentPage(1);
                                }}
                            >
                                <SelectTrigger className="w-52 bg-black/5 dark:bg-white/5 border-none h-12 rounded-2xl focus:ring-1 focus:ring-primary/40 font-medium">
                                    <div className="flex items-center gap-2">
                                        <Building2 className="h-4 w-4 text-primary/70" />
                                        <SelectValue placeholder="Nexus" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="glass border-black/5 dark:border-white/10 rounded-xl">
                                    <SelectItem value="all">All Networks</SelectItem>
                                    <SelectItem value="personal">Personal Vault</SelectItem>
                                    {organizations?.map((org) => (
                                        <SelectItem key={org.id} value={org.id}>
                                            {org.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <div className="w-px h-8 bg-border/40 dark:bg-border/50 mx-1 hidden lg:block" />

                            <div className="flex items-center bg-black/5 dark:bg-white/5 p-1.5 rounded-2xl">
                                <button
                                    onClick={() => setViewMode("table")}
                                    className={`p-2.5 rounded-xl transition-all ${viewMode === "table"
                                        ? "bg-background shadow-sm text-primary"
                                        : "text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
                                        }`}
                                >
                                    <List className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => setViewMode("grid")}
                                    className={`p-2.5 rounded-xl transition-all ${viewMode === "grid"
                                        ? "bg-background shadow-sm text-primary"
                                        : "text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
                                        }`}
                                >
                                    <Grid className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Bulk Operations Overlay */}
                    {selectedIds.size > 0 && (
                        <div className="mt-8 pt-6 border-t border-black/5 dark:border-white/5 flex items-center justify-between animate-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center gap-4">
                                <div className="px-5 py-2 bg-primary/10 text-primary font-black uppercase tracking-widest text-[10px] rounded-full shadow-sm">
                                    {selectedIds.size} Neural Assets Targeted
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSelectedIds(new Set())}
                                    className="text-muted-foreground hover:text-foreground font-black uppercase tracking-widest text-[10px] h-9 rounded-xl px-4"
                                >
                                    Cancel Selection
                                </Button>
                            </div>
                            <div className="flex items-center gap-3">
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={handleBulkDelete}
                                    className="rounded-xl font-black uppercase tracking-widest text-[10px] px-6 h-10 shadow-lg shadow-rose-500/20"
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Purge Selection
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Documents List */}
            {isLoading ? (
                <Card className="glass border-none shadow-xl rounded-[2rem] overflow-hidden">
                    <CardContent className="p-32 text-center">
                        <div className="relative w-20 h-20 mx-auto mb-8">
                            <div className="absolute inset-0 rounded-full border-t-2 border-primary animate-spin"></div>
                            <div className="absolute inset-2 rounded-full border-b-2 border-primary/30 animate-spin-slow"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <RefreshCw className="h-6 w-6 text-primary animate-pulse" />
                            </div>
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground animate-pulse">
                            Synchronizing Neural Index...
                        </p>
                    </CardContent>
                </Card>
            ) : paginatedDocuments.length === 0 ? (
                <Card className="glass border-none shadow-xl rounded-[2rem] overflow-hidden">
                    <CardContent className="p-32 text-center">
                        <div className="w-24 h-24 rounded-[2rem] bg-black/5 dark:bg-white/5 flex items-center justify-center mx-auto mb-8 relative group">
                            <div className="absolute inset-0 bg-primary/20 rounded-[2rem] blur-2xl group-hover:bg-primary/30 transition-all"></div>
                            <FileText className="h-10 w-10 text-primary relative z-10" />
                        </div>
                        <h3 className="text-2xl font-bold text-foreground mb-3">
                            Neural Index Vacant
                        </h3>
                        <p className="text-sm text-muted-foreground/80 mb-8 max-w-sm mx-auto leading-relaxed">
                            {searchQuery ||
                                filterStatus !== "all" ||
                                filterType !== "all"
                                ? "No intelligence assets match your current filtering protocols. Adjust your parameters to locate data."
                                : "Your knowledge base is currently offline. Initialize data ingestion to populate the neural network."}
                        </p>
                        {!searchQuery &&
                            filterStatus === "all" &&
                            filterType === "all" && (
                                <Link href="/dashboard/upload">
                                    <Button className="gradient-primary border-0 rounded-xl px-8 h-12 shadow-lg shadow-primary/20">
                                        <Upload className="h-4 w-4 mr-2" />
                                        Upload Intelligence
                                    </Button>
                                </Link>
                            )}
                    </CardContent>
                </Card>
            ) : viewMode === "table" ? (
                /* Table View - Sophisticated AI List */
                <Card className="glass border-none shadow-xl overflow-hidden rounded-[2rem]">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5">
                                    <th className="px-6 py-4 text-left">
                                        <Checkbox
                                            checked={
                                                selectedIds.size ===
                                                paginatedDocuments.length &&
                                                paginatedDocuments.length > 0
                                            }
                                            onCheckedChange={handleSelectAll}
                                            className="border-primary/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                        />
                                    </th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                                        Asset Identity
                                    </th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                                        Format
                                    </th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                                        Vectors
                                    </th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                                        Status
                                    </th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                                        Indexed
                                    </th>
                                    <th className="px-6 py-4 text-right text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                {paginatedDocuments.map((doc) => (
                                    <tr
                                        key={doc.id}
                                        className={`group hover:bg-black/5 dark:hover:bg-white/5 transition-all ${selectedIds.has(doc.id)
                                            ? "bg-primary/5 dark:bg-primary/10"
                                            : ""
                                            }`}
                                    >
                                        <td className="px-6 py-4">
                                            <Checkbox
                                                checked={selectedIds.has(
                                                    doc.id
                                                )}
                                                onCheckedChange={() =>
                                                    handleSelect(doc.id)
                                                }
                                                className="border-primary/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div
                                                    className={`w-12 h-12 rounded-2xl flex items-center justify-center text-[10px] font-black shadow-inner transition-transform group-hover:scale-110 ${getFileTypeColor(
                                                        doc.mimeType
                                                    )}`}
                                                >
                                                    {getFileTypeIcon(
                                                        doc.mimeType
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-bold text-foreground/90 truncate max-w-[200px] group-hover:text-primary transition-colors">
                                                            {doc.filename}
                                                        </p>
                                                        {getVisibilityIcon(
                                                            (doc as any)
                                                                .visibility,
                                                            (doc as any)
                                                                .organizationId
                                                        )}
                                                        {(doc as any)
                                                            .isShared && (
                                                                <div title="Shared with you" className="p-1 bg-blue-500/10 rounded-md">
                                                                    <Share2 className="h-3 w-3 text-blue-500" />
                                                                </div>
                                                            )}
                                                    </div>
                                                    {(doc as any)
                                                        .organizationId && (
                                                            <p className="text-[10px] text-muted-foreground opacity-60 font-medium mt-1 flex items-center gap-1 uppercase tracking-tighter">
                                                                <Building2 className="h-3 w-3" />
                                                                {getOrganizationName(
                                                                    (doc as any)
                                                                        .organizationId
                                                                )}
                                                            </p>
                                                        )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span
                                                className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ${getFileTypeColor(
                                                    doc.mimeType
                                                )}`}
                                            >
                                                {getFileTypeIcon(doc.mimeType)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-xs font-bold text-muted-foreground">
                                            {formatBytes(doc.size)}
                                        </td>
                                        <td className="px-6 py-4">
                                            {getStatusBadge(
                                                doc.processingStatus
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-xs font-bold text-muted-foreground">
                                            {formatDate(doc.createdAt)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDownload(doc)}
                                                    className="w-10 h-10 rounded-xl hover:bg-primary/10 hover:text-primary"
                                                >
                                                    <Download className="h-4 w-4" />
                                                </Button>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger
                                                        asChild
                                                    >
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="w-10 h-10 rounded-xl hover:bg-black/10 dark:hover:bg-white/10"
                                                        >
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="glass border-black/5 dark:border-white/10 rounded-xl shadow-2xl">
                                                        <DropdownMenuItem
                                                            onClick={() =>
                                                                handleDownload(
                                                                    doc
                                                                )
                                                            }
                                                            className="rounded-lg focus:bg-primary/10"
                                                        >
                                                            <Download className="h-4 w-4 mr-2" />
                                                            Download Binary
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() =>
                                                                handleShare(
                                                                    doc.id
                                                                )
                                                            }
                                                            className="rounded-lg focus:bg-primary/10"
                                                        >
                                                            <Share2 className="h-4 w-4 mr-2" />
                                                            Permissions & Share
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem className="rounded-lg focus:bg-primary/10">
                                                            <Eye className="h-4 w-4 mr-2" />
                                                            Inspect Metadata
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator className="bg-black/5 dark:bg-white/5" />
                                                        <DropdownMenuItem
                                                            onClick={() =>
                                                                handleDelete(
                                                                    doc.id
                                                                )
                                                            }
                                                            className="text-rose-500 rounded-lg focus:bg-rose-500/10 focus:text-rose-600"
                                                        >
                                                            <Trash2 className="h-4 w-4 mr-2" />
                                                            Purge Asset
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            ) : (
                /* Grid View - Premium Asset Cards */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {paginatedDocuments.map((doc) => (
                        <Card
                            key={doc.id}
                            className={`glass border-none shadow-xl card-hover cursor-pointer rounded-[2rem] overflow-hidden group/grid ${selectedIds.has(doc.id)
                                ? "ring-2 ring-primary bg-primary/5"
                                : ""
                                }`}
                            onClick={() => handleSelect(doc.id)}
                        >
                            <CardContent className="p-8">
                                <div className="flex items-start justify-between mb-8">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={`w-14 h-14 rounded-2xl flex items-center justify-center text-[10px] font-black shadow-inner transition-transform group-hover/grid:scale-110 ${getFileTypeColor(
                                                doc.mimeType
                                            )}`}
                                        >
                                            {getFileTypeIcon(doc.mimeType)}
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            {getVisibilityIcon(
                                                (doc as any).visibility,
                                                (doc as any).organizationId
                                            )}
                                            {(doc as any).isShared && (
                                                <div title="Shared with you" className="p-1 bg-blue-500/10 rounded-md w-fit">
                                                    <Share2 className="h-3 w-3 text-blue-500" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger
                                            asChild
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="w-10 h-10 rounded-xl hover:bg-black/10 dark:hover:bg-white/10"
                                            >
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="glass border-black/5 dark:border-white/10 rounded-xl shadow-2xl">
                                            <DropdownMenuItem
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDownload(doc);
                                                }}
                                                className="rounded-lg focus:bg-primary/10"
                                            >
                                                <Download className="h-4 w-4 mr-2" />
                                                Download binary
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleShare(doc.id);
                                                }}
                                                className="rounded-lg focus:bg-primary/10"
                                            >
                                                <Share2 className="h-4 w-4 mr-2" />
                                                Permissions
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                className="rounded-lg focus:bg-primary/10"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <Eye className="h-4 w-4 mr-2" />
                                                Metadata
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator className="bg-black/5 dark:bg-white/5" />
                                            <DropdownMenuItem
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDelete(doc.id);
                                                }}
                                                className="text-rose-500 rounded-lg focus:bg-rose-500/10 focus:text-rose-600"
                                            >
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Purge Asset
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <h3 className="text-xl font-bold text-foreground/90 truncate mb-1 group-hover/grid:text-primary transition-colors">
                                            {doc.filename}
                                        </h3>
                                        {(doc as any).organizationId && (
                                            <p className="text-[10px] text-muted-foreground opacity-60 font-medium flex items-center gap-1 uppercase tracking-widest">
                                                <Building2 className="h-3 w-3" />
                                                {getOrganizationName(
                                                    (doc as any).organizationId
                                                )}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-muted-foreground/50">
                                            {formatBytes(doc.size)}
                                        </span>
                                        {getStatusBadge(doc.processingStatus)}
                                    </div>

                                    <div className="pt-4 border-t border-black/5 dark:border-white/5">
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground opacity-40 uppercase tracking-tighter">
                                            <Calendar className="h-3 w-3" />
                                            <span>Map Registered: {formatDate(doc.createdAt)}</span>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
                        {Math.min(
                            currentPage * ITEMS_PER_PAGE,
                            filteredDocuments.length
                        )}{" "}
                        of {filteredDocuments.length} documents
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                                setCurrentPage((p) => Math.max(1, p - 1))
                            }
                            disabled={currentPage === 1}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        {Array.from(
                            { length: totalPages },
                            (_, i) => i + 1
                        ).map((page) => (
                            <Button
                                key={page}
                                variant={
                                    currentPage === page ? "default" : "outline"
                                }
                                size="sm"
                                onClick={() => setCurrentPage(page)}
                                className={
                                    currentPage === page
                                        ? "gradient-primary border-0"
                                        : ""
                                }
                            >
                                {page}
                            </Button>
                        ))}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                                setCurrentPage((p) =>
                                    Math.min(totalPages, p + 1)
                                )
                            }
                            disabled={currentPage === totalPages}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            <AlertDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
            >
                <AlertDialogContent className="glass border-none shadow-2xl rounded-[2rem]">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-2xl font-bold">Confirm Deletion</AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground/80">
                            {deleteTarget
                                ? "This asset will be permanently purged from the neural index. This action is irreversible."
                                : `Are you sure you want to purge ${selectedIds.size} document(s)? All vector data will be lost.`}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2">
                        <AlertDialogCancel className="rounded-xl border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5">
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className="bg-rose-500 text-white hover:bg-rose-600 rounded-xl px-6"
                        >
                            Purge Asset
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
                <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto glass border-none shadow-2xl rounded-[2rem]">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold">Permissions & Neural Sharing</DialogTitle>
                        <DialogDescription className="text-muted-foreground/80">
                            Configure access parameters for this intelligence asset across users and organizations.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                        {/* Share Type Selection */}
                        <div className="space-y-2">
                            <Label>Share Type</Label>
                            <Select
                                value={shareType}
                                onValueChange={(
                                    value: "user" | "organization" | "public"
                                ) => {
                                    setShareType(value);
                                    setSelectedUserIds(new Set());
                                    setSelectedOrganizationIds(new Set());
                                    setShareUserQuery("");
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="user">
                                        Specific Users
                                    </SelectItem>
                                    <SelectItem value="organization">
                                        Organizations
                                    </SelectItem>
                                    <SelectItem value="public">
                                        Public
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Permissions Selection */}
                        <div className="space-y-4">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Access Protocol</Label>
                            <div className="grid grid-cols-2 gap-3 p-4 rounded-[1.5rem] border border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5">
                                {Object.entries(permissionLabels).map(
                                    ([perm, label]) => (
                                        <div
                                            key={perm}
                                            className="flex items-center space-x-3 group cursor-pointer"
                                            onClick={() => togglePermission(perm)}
                                        >
                                            <Checkbox
                                                id={`perm-${perm}`}
                                                checked={selectedPermissions.has(
                                                    perm
                                                )}
                                                onCheckedChange={() =>
                                                    togglePermission(perm)
                                                }
                                                className="border-primary/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                            />
                                            <Label
                                                htmlFor={`perm-${perm}`}
                                                className="text-xs font-bold text-muted-foreground group-hover:text-foreground transition-colors cursor-pointer"
                                            >
                                                {label}
                                            </Label>
                                        </div>
                                    )
                                )}
                            </div>
                        </div>

                        {/* Current Shares */}
                        {shareInfo && (
                            <div className="space-y-4">
                                {/* Shared Users */}
                                {shareInfo.sharedUsers &&
                                    shareInfo.sharedUsers.length > 0 && (
                                        <div className="space-y-3">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Active Collaborators</Label>
                                            <div className="space-y-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                                                {shareInfo.sharedUsers.map(
                                                    (user) => (
                                                        <div
                                                            key={user.id}
                                                            className="flex items-center justify-between p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 group"
                                                        >
                                                            <div className="flex-1">
                                                                <p className="text-sm font-bold">
                                                                    {user.name}
                                                                </p>
                                                                <p className="text-[10px] font-medium text-muted-foreground opacity-60">
                                                                    {user.email}
                                                                </p>
                                                                <div className="flex flex-wrap gap-1 mt-2">
                                                                    {user.permissions.map(p => (
                                                                        <span key={p} className="text-[9px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                                                                            {p}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                onClick={() =>
                                                                    handleUnshare(
                                                                        "user",
                                                                        user.id
                                                                    )
                                                                }
                                                                className="h-8 w-8 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-all"
                                                            >
                                                                <UserMinus className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    )}

                                {/* Shared Organizations */}
                                {shareInfo.sharedOrganizations &&
                                    shareInfo.sharedOrganizations.length >
                                    0 && (
                                        <div className="space-y-3">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                                Enterprise Nodes
                                            </Label>
                                            <div className="space-y-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                                                {shareInfo.sharedOrganizations.map(
                                                    (org) => (
                                                        <div
                                                            key={org.id}
                                                            className="flex items-center justify-between p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 group"
                                                        >
                                                            <div className="flex-1">
                                                                <p className="text-sm font-bold">
                                                                    {org.name}
                                                                </p>
                                                                <div className="flex flex-wrap gap-1 mt-2">
                                                                    {org.permissions.map(p => (
                                                                        <span key={p} className="text-[9px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                                                                            {p}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                onClick={() =>
                                                                    handleUnshare(
                                                                        "organization",
                                                                        org.id
                                                                    )
                                                                }
                                                                className="h-8 w-8 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-all"
                                                            >
                                                                <UserMinus className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    )}

                                {/* Public Share */}
                                {shareInfo.publicShare &&
                                    shareInfo.publicShare.enabled && (
                                        <div className="space-y-3">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Neural Broadcast</Label>
                                            <div className="flex items-center justify-between p-4 rounded-2xl bg-primary/5 border border-primary/10 group">
                                                <div className="flex-1">
                                                    <p className="text-sm font-bold text-primary">
                                                        Authorized Public Access
                                                    </p>
                                                    <div className="flex flex-wrap gap-1 mt-2">
                                                        {shareInfo.publicShare.permissions.map(p => (
                                                            <span key={p} className="text-[9px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                                                                {p}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={() =>
                                                        handleUnshare("public")
                                                    }
                                                    className="h-8 w-8 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-all"
                                                >
                                                    <UserMinus className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                            </div>
                        )}

                        {/* User Selection (when shareType === "user") */}
                        {shareType === "user" && (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="user-search">
                                        Search users to share with
                                    </Label>
                                    <Input
                                        id="user-search"
                                        placeholder="Search by email or name..."
                                        value={shareUserQuery}
                                        onChange={(e) =>
                                            setShareUserQuery(e.target.value)
                                        }
                                    />
                                </div>

                                {users && users.length > 0 && (
                                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                        {users
                                            .filter(
                                                (user) =>
                                                    !shareInfo?.sharedUsers?.some(
                                                        (su) =>
                                                            su.id === user.id
                                                    )
                                            )
                                            .map((user) => (
                                                <div
                                                    key={user.id}
                                                    className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all border ${selectedUserIds.has(
                                                        user.id
                                                    )
                                                        ? "bg-primary/10 border-primary/20 shadow-inner"
                                                        : "bg-black/5 dark:bg-white/5 border-transparent hover:border-black/10 dark:hover:border-white/10"
                                                        }`}
                                                    onClick={() =>
                                                        toggleUserSelection(
                                                            user.id
                                                        )
                                                    }
                                                >
                                                    <div>
                                                        <p className="text-sm font-bold">
                                                            {user.name}
                                                        </p>
                                                        <p className="text-[10px] font-medium text-muted-foreground opacity-60">
                                                            {user.email}
                                                        </p>
                                                    </div>
                                                    {selectedUserIds.has(
                                                        user.id
                                                    ) && (
                                                            <CheckCircle className="h-5 w-5 text-primary" />
                                                        )}
                                                </div>
                                            ))}
                                    </div>
                                )}

                                {users &&
                                    users.length === 0 &&
                                    shareUserQuery && (
                                        <p className="text-sm text-slate-500 text-center py-4">
                                            No users found
                                        </p>
                                    )}

                                {!shareUserQuery &&
                                    (!users || users.length === 0) && (
                                        <p className="text-sm text-slate-500 text-center py-4">
                                            Type to search for users
                                        </p>
                                    )}
                            </>
                        )}

                        {/* Organization Selection (when shareType === "organization") */}
                        {shareType === "organization" && (
                            <div className="space-y-2">
                                <Label>Select Organizations</Label>
                                <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                    {organizations
                                        ?.filter(
                                            (org) =>
                                                !shareInfo?.sharedOrganizations?.some(
                                                    (so) => so.id === org.id
                                                )
                                        )
                                        .map((org) => (
                                            <div
                                                key={org.id}
                                                className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all border ${selectedOrganizationIds.has(
                                                    org.id
                                                )
                                                    ? "bg-primary/10 border-primary/20 shadow-inner"
                                                    : "bg-black/5 dark:bg-white/5 border-transparent hover:border-black/10 dark:hover:border-white/10"
                                                    }`}
                                                onClick={() =>
                                                    toggleOrganizationSelection(
                                                        org.id
                                                    )
                                                }
                                            >
                                                <div>
                                                    <p className="text-sm font-bold">
                                                        {org.name}
                                                    </p>
                                                </div>
                                                {selectedOrganizationIds.has(
                                                    org.id
                                                ) && (
                                                        <CheckCircle className="h-5 w-5 text-primary" />
                                                    )}
                                            </div>
                                        ))}
                                </div>
                                {(!organizations ||
                                    organizations.length === 0) && (
                                        <p className="text-sm text-slate-500 text-center py-4">
                                            No organizations available
                                        </p>
                                    )}
                            </div>
                        )}

                        {/* Public Share Info */}
                        {shareType === "public" && (
                            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                                <p className="text-xs font-bold text-rose-600 dark:text-rose-400 flex gap-2 items-center">
                                    <AlertTriangle className="h-4 w-4" />
                                    SECURITY ALERT
                                </p>
                                <p className="text-[10px] font-medium text-rose-500/80 mt-1 leading-relaxed">
                                    Broadcasting this asset will enable global access for anyone possessing the neural link.
                                    Exercise extreme caution with sensitive intelligence.
                                </p>
                            </div>
                        )}
                    </div>
                    <DialogFooter className="gap-2">
                        <Button
                            variant="ghost"
                            className="rounded-xl hover:bg-black/5 dark:hover:bg-white/5"
                            onClick={() => {
                                setShareDialogOpen(false);
                                setSelectedUserIds(new Set());
                                setSelectedOrganizationIds(new Set());
                                setShareUserQuery("");
                                setSelectedPermissions(new Set(["read"]));
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleShareConfirm}
                            disabled={
                                (shareType === "user" &&
                                    selectedUserIds.size === 0) ||
                                (shareType === "organization" &&
                                    selectedOrganizationIds.size === 0) ||
                                selectedPermissions.size === 0 ||
                                shareMutation.isPending
                            }
                            className="gradient-primary border-0 rounded-xl px-8 shadow-lg shadow-primary/20"
                        >
                            {shareMutation.isPending
                                ? "Synchronizing..."
                                : shareType === "user"
                                    ? `Authorize ${selectedUserIds.size} User(s)`
                                    : shareType === "organization"
                                        ? `Authorize ${selectedOrganizationIds.size} Org(s)`
                                        : "Initialize Broadcast"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
