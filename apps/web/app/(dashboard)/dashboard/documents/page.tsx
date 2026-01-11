"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent } from "@/components/ui/card";
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
} from "@/components/ui/alert-dialog";
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
    Filter,
    Grid,
    List,
    CheckCircle,
    AlertCircle,
    RefreshCw,
    Upload,
    ChevronLeft,
    ChevronRight,
    Building2,
    Lock,
    Globe,
    Users,
    Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatBytes } from "@/lib/utils";
import Link from "next/link";

type ViewMode = "table" | "grid";
type FilterStatus = "all" | "completed" | "processing" | "failed";
type FilterType = "all" | "pdf" | "word" | "xml" | "text";

const ITEMS_PER_PAGE = 10;

export default function DocumentsPage() {
    const { toast } = useToast();

    const [viewMode, setViewMode] = useState<ViewMode>("table");
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
    const [filterType, setFilterType] = useState<FilterType>("all");
    const [filterOrganization, setFilterOrganization] = useState<string>("all");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

    const {
        data: documents,
        isLoading,
        refetch,
    } = trpc.document.list.useQuery();
    const { data: organizations } = trpc.organization.list.useQuery();

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

    const filteredDocuments = useMemo(() => {
        if (!documents) return [];

        let result = [...documents];

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter((doc) =>
                doc.filename.toLowerCase().includes(query)
            );
        }

        if (filterStatus !== "all") {
            result = result.filter(
                (doc) => doc.processingStatus === filterStatus
            );
        }

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

        if (filterOrganization !== "all") {
            if (filterOrganization === "personal") {
                result = result.filter((doc) => !doc.organizationId);
            } else {
                result = result.filter(
                    (doc) => doc.organizationId === filterOrganization
                );
            }
        }

        result.sort(
            (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime()
        );

        return result;
    }, [documents, searchQuery, filterStatus, filterType, filterOrganization]);

    const totalPages = Math.ceil(filteredDocuments.length / ITEMS_PER_PAGE);
    const paginatedDocuments = filteredDocuments.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

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

    const handleBulkDelete = () => {
        setDeleteTarget(null);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (deleteTarget) {
            await deleteMutation.mutateAsync({ id: deleteTarget });
        } else {
            for (const id of selectedIds) {
                await deleteMutation.mutateAsync({ id });
            }
        }
        setDeleteDialogOpen(false);
        setDeleteTarget(null);
    };

    const handleDownload = async (doc: { id: string; filename: string }) => {
        try {
            const token = localStorage.getItem("auth_token");
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

            const response = await fetch(`${serverUrl}/api/files/${doc.id}`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error("Download failed");
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
        } catch {
            toast({
                title: "Error",
                description: "Failed to download file",
                variant: "destructive",
            });
        }
    };

    const getFileType = (mimeType: string) => {
        if (mimeType.includes("pdf")) return "PDF";
        if (mimeType.includes("word") || mimeType.includes("document"))
            return "DOC";
        if (mimeType.includes("xml")) return "XML";
        if (mimeType.includes("text")) return "TXT";
        return "FILE";
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "completed":
                return (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-chart-2/10 text-chart-2">
                        <CheckCircle className="h-3 w-3" />
                        Completed
                    </span>
                );
            case "processing":
                return (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-chart-4/10 text-chart-4">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Processing
                    </span>
                );
            case "failed":
                return (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-destructive/10 text-destructive">
                        <AlertCircle className="h-3 w-3" />
                        Failed
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-muted text-muted-foreground">
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
                <span title="Personal">
                    <Lock className="h-3 w-3 text-muted-foreground" />
                </span>
            );
        }
        switch (visibility) {
            case "private":
                return (
                    <span title="Private">
                        <Lock className="h-3 w-3 text-destructive" />
                    </span>
                );
            case "organization":
                return (
                    <span title="Organization">
                        <Users className="h-3 w-3 text-primary" />
                    </span>
                );
            case "public":
                return (
                    <span title="Public">
                        <Globe className="h-3 w-3 text-chart-2" />
                    </span>
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
        <div className="h-full overflow-y-auto p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto custom-scrollbar">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">
                        Documents
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Manage your uploaded files and their processing status.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetch()}
                        disabled={isLoading}
                        className="rounded-lg h-9"
                    >
                        <RefreshCw
                            className={`h-4 w-4 mr-2 ${
                                isLoading ? "animate-spin" : ""
                            }`}
                        />
                        Refresh
                    </Button>
                    <Link href="/dashboard/upload">
                        <Button size="sm" className="rounded-lg h-9 bg-primary">
                            <Upload className="h-4 w-4 mr-2" />
                            Upload
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Filters */}
            <Card className="bg-card border-border">
                <CardContent className="p-4">
                    <div className="flex flex-col lg:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search documents..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="bg-accent border-border pl-10 h-10 rounded-lg"
                            />
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <Select
                                value={filterStatus}
                                onValueChange={(value: FilterStatus) => {
                                    setFilterStatus(value);
                                    setCurrentPage(1);
                                }}
                            >
                                <SelectTrigger className="w-36 bg-accent border-border h-10 rounded-lg">
                                    <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-border rounded-lg">
                                    <SelectItem value="all">
                                        All Status
                                    </SelectItem>
                                    <SelectItem value="completed">
                                        Completed
                                    </SelectItem>
                                    <SelectItem value="processing">
                                        Processing
                                    </SelectItem>
                                    <SelectItem value="failed">
                                        Failed
                                    </SelectItem>
                                </SelectContent>
                            </Select>

                            <Select
                                value={filterType}
                                onValueChange={(value: FilterType) => {
                                    setFilterType(value);
                                    setCurrentPage(1);
                                }}
                            >
                                <SelectTrigger className="w-32 bg-accent border-border h-10 rounded-lg">
                                    <SelectValue placeholder="Type" />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-border rounded-lg">
                                    <SelectItem value="all">
                                        All Types
                                    </SelectItem>
                                    <SelectItem value="pdf">PDF</SelectItem>
                                    <SelectItem value="word">Word</SelectItem>
                                    <SelectItem value="xml">XML</SelectItem>
                                    <SelectItem value="text">Text</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select
                                value={filterOrganization}
                                onValueChange={(value: string) => {
                                    setFilterOrganization(value);
                                    setCurrentPage(1);
                                }}
                            >
                                <SelectTrigger className="w-40 bg-accent border-border h-10 rounded-lg">
                                    <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
                                    <SelectValue placeholder="Organization" />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-border rounded-lg">
                                    <SelectItem value="all">All</SelectItem>
                                    <SelectItem value="personal">
                                        Personal
                                    </SelectItem>
                                    {organizations?.map((org) => (
                                        <SelectItem key={org.id} value={org.id}>
                                            {org.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <div className="flex items-center bg-accent border border-border rounded-lg p-1">
                                <button
                                    onClick={() => setViewMode("table")}
                                    className={`p-2 rounded ${
                                        viewMode === "table"
                                            ? "bg-background shadow-sm"
                                            : ""
                                    }`}
                                >
                                    <List className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => setViewMode("grid")}
                                    className={`p-2 rounded ${
                                        viewMode === "grid"
                                            ? "bg-background shadow-sm"
                                            : ""
                                    }`}
                                >
                                    <Grid className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {selectedIds.size > 0 && (
                        <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-medium">
                                    {selectedIds.size} selected
                                </span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSelectedIds(new Set())}
                                    className="h-8"
                                >
                                    Clear
                                </Button>
                            </div>
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={handleBulkDelete}
                                className="h-8 rounded-lg"
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Selected
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Documents */}
            {isLoading ? (
                <Card className="bg-card border-border">
                    <CardContent className="p-12 text-center">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-primary" />
                        <p className="text-sm text-muted-foreground">
                            Loading documents...
                        </p>
                    </CardContent>
                </Card>
            ) : paginatedDocuments.length === 0 ? (
                <Card className="bg-card border-border">
                    <CardContent className="p-12 text-center">
                        <div className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center mx-auto mb-3">
                            <FileText className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <h3 className="font-medium mb-1">No documents found</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            {searchQuery ||
                            filterStatus !== "all" ||
                            filterType !== "all"
                                ? "Try adjusting your filters."
                                : "Upload your first document to get started."}
                        </p>
                        {!searchQuery &&
                            filterStatus === "all" &&
                            filterType === "all" && (
                                <Link href="/dashboard/upload">
                                    <Button className="rounded-lg">
                                        <Upload className="h-4 w-4 mr-2" />
                                        Upload Document
                                    </Button>
                                </Link>
                            )}
                    </CardContent>
                </Card>
            ) : viewMode === "table" ? (
                <Card className="bg-card border-border overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-border bg-accent">
                                    <th className="px-4 py-3 text-left w-10">
                                        <Checkbox
                                            checked={
                                                selectedIds.size ===
                                                    paginatedDocuments.length &&
                                                paginatedDocuments.length > 0
                                            }
                                            onCheckedChange={handleSelectAll}
                                        />
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                                        Name
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase hidden sm:table-cell">
                                        Type
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">
                                        Size
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                                        Status
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase hidden lg:table-cell">
                                        Date
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {paginatedDocuments.map((doc) => (
                                    <tr
                                        key={doc.id}
                                        className={`group hover:bg-accent transition-colors ${
                                            selectedIds.has(doc.id)
                                                ? "bg-primary/5"
                                                : ""
                                        }`}
                                    >
                                        <td className="px-4 py-3">
                                            <Checkbox
                                                checked={selectedIds.has(
                                                    doc.id
                                                )}
                                                onCheckedChange={() =>
                                                    handleSelect(doc.id)
                                                }
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
                                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-medium text-sm truncate max-w-[200px]">
                                                            {doc.filename}
                                                        </p>
                                                        {getVisibilityIcon(
                                                            (doc as { visibility?: string })
                                                                .visibility,
                                                            (doc as { organizationId?: string })
                                                                .organizationId
                                                        )}
                                                    </div>
                                                    {(doc as { organizationId?: string })
                                                        .organizationId && (
                                                        <p className="text-xs text-muted-foreground mt-0.5">
                                                            {getOrganizationName(
                                                                (doc as { organizationId?: string })
                                                                    .organizationId
                                                            )}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 hidden sm:table-cell">
                                            <span className="text-xs font-medium px-2 py-0.5 rounded bg-accent">
                                                {getFileType(doc.mimeType)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">
                                            {formatBytes(doc.size)}
                                        </td>
                                        <td className="px-4 py-3">
                                            {getStatusBadge(
                                                doc.processingStatus
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-muted-foreground hidden lg:table-cell">
                                            {formatDate(doc.createdAt)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() =>
                                                        handleDownload(doc)
                                                    }
                                                    className="h-8 w-8 rounded-lg"
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
                                                            className="h-8 w-8 rounded-lg"
                                                        >
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent
                                                        align="end"
                                                        className="bg-card border-border rounded-lg"
                                                    >
                                                        <DropdownMenuItem
                                                            onClick={() =>
                                                                handleDownload(
                                                                    doc
                                                                )
                                                            }
                                                            className="rounded"
                                                        >
                                                            <Download className="h-4 w-4 mr-2" />
                                                            Download
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator className="bg-border" />
                                                        <DropdownMenuItem
                                                            onClick={() =>
                                                                handleDelete(
                                                                    doc.id
                                                                )
                                                            }
                                                            className="text-destructive focus:text-destructive rounded"
                                                        >
                                                            <Trash2 className="h-4 w-4 mr-2" />
                                                            Delete
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {paginatedDocuments.map((doc) => (
                        <Card
                            key={doc.id}
                            className={`bg-card border-border hover:border-primary/30 transition-colors cursor-pointer ${
                                selectedIds.has(doc.id)
                                    ? "ring-1 ring-primary"
                                    : ""
                            }`}
                            onClick={() => handleSelect(doc.id)}
                        >
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                                        <FileText className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger
                                            asChild
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 rounded-lg"
                                            >
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent
                                            align="end"
                                            className="bg-card border-border rounded-lg"
                                        >
                                            <DropdownMenuItem
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDownload(doc);
                                                }}
                                                className="rounded"
                                            >
                                                <Download className="h-4 w-4 mr-2" />
                                                Download
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator className="bg-border" />
                                            <DropdownMenuItem
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDelete(doc.id);
                                                }}
                                                className="text-destructive focus:text-destructive rounded"
                                            >
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                <h3 className="font-medium text-sm truncate mb-1">
                                    {doc.filename}
                                </h3>
                                <p className="text-xs text-muted-foreground mb-3">
                                    {formatBytes(doc.size)}
                                </p>

                                <div className="flex items-center justify-between">
                                    {getStatusBadge(doc.processingStatus)}
                                    <span className="text-xs text-muted-foreground">
                                        {formatDate(doc.createdAt)}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                        Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
                        {Math.min(
                            currentPage * ITEMS_PER_PAGE,
                            filteredDocuments.length
                        )}{" "}
                        of {filteredDocuments.length}
                    </p>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                                setCurrentPage((p) => Math.max(1, p - 1))
                            }
                            disabled={currentPage === 1}
                            className="h-8 rounded-lg"
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
                                className="h-8 w-8 rounded-lg"
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
                            className="h-8 rounded-lg"
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
                <AlertDialogContent className="bg-card border-border rounded-xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Document</AlertDialogTitle>
                        <AlertDialogDescription>
                            {deleteTarget
                                ? "This document will be permanently deleted. This action cannot be undone."
                                : `Are you sure you want to delete ${selectedIds.size} document(s)?`}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-lg">
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-lg"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
