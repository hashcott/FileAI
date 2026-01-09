"use client";

import { trpc } from "@/lib/trpc/client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate, formatBytes } from "@/lib/utils";
import {
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  Trash2,
  Download,
  Upload,
  Search,
  Database,
  TrendingUp,
  Eye,
  MessageSquare,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
import Link from "next/link";

export default function DashboardPage() {
  const { toast } = useToast();
  const { data: documents, isLoading, refetch } = trpc.document.list.useQuery();
  const deleteMutation = trpc.document.delete.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Document deleted successfully",
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDelete = (id: string) => {
    deleteMutation.mutate({ id });
  };

  const handleDownload = async (doc: { id: string; filename: string }) => {
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        toast({ title: "Error", description: "Please login again", variant: "destructive" });
        return;
      }

      const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3001";
      const response = await fetch(`${serverUrl}/api/files/${doc.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Download failed");

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
      toast({ title: "Error", description: "Failed to download file", variant: "destructive" });
    }
  };

  // Stats
  const totalDocuments = documents?.length || 0;
  const completedDocuments = documents?.filter((d) => d.processingStatus === "completed").length || 0;
  const processingDocuments = documents?.filter((d) => d.processingStatus === "processing").length || 0;
  const totalSize = documents?.reduce((acc, d) => acc + d.size, 0) || 0;

  const stats = [
    {
      title: "Total Documents",
      value: totalDocuments,
      icon: FileText,
      gradient: "gradient-primary",
      change: "+12%",
    },
    {
      title: "Processed",
      value: completedDocuments,
      icon: CheckCircle,
      gradient: "gradient-success",
      change: "+8%",
    },
    {
      title: "Processing",
      value: processingDocuments,
      icon: Clock,
      gradient: "gradient-warning",
      change: "0",
    },
    {
      title: "Total Storage",
      value: formatBytes(totalSize),
      icon: Database,
      gradient: "gradient-danger",
      change: "+5%",
    },
  ];

  return (
    <div className="h-full overflow-y-auto p-6 sm:p-8 lg:p-10 pb-20 space-y-10 max-w-[1600px] mx-auto animate-fadeIn custom-scrollbar">
      {/* Page Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Overview</h2>
          <p className="text-muted-foreground mt-1">
            Welcome back. Here's what's happening with your documents today.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="rounded-xl border-border/50 h-10 px-4 font-medium" onClick={() => refetch()}>
            <Clock className="mr-2 h-4 w-4 opacity-70" />
            Refresh
          </Button>
          <Link href="/dashboard/upload">
            <Button className="rounded-xl bg-ai-gradient hover:opacity-90 shadow-ai border-none h-10 px-6 font-bold">
              <Upload className="mr-2 h-4 w-4" />
              Upload New
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid - Premium Glass Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="glass card-hover border-none relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl -mr-8 -mt-8 transition-transform group-hover:scale-150 duration-500" />
            <CardContent className="p-6 relative z-10">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">
                    {stat.title}
                  </p>
                  <h3 className="text-3xl font-bold tracking-tight">
                    {stat.value}
                  </h3>
                  <div className="flex items-center gap-2 mt-4">
                    <div className="flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 text-[10px] font-bold">
                      <TrendingUp className="h-3 w-3" />
                      {stat.change}
                    </div>
                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">vs last month</span>
                  </div>
                </div>
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${stat.title === "Total Documents" ? "from-blue-500 to-indigo-600" :
                  stat.title === "Processed" ? "from-emerald-400 to-teal-600" :
                    stat.title === "Processing" ? "from-amber-400 to-orange-600" :
                      "from-rose-500 to-pink-600"
                  } flex items-center justify-center shadow-lg transform transition-transform group-hover:rotate-12 duration-300`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions - Floating Hover Effect */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { title: "Upload Documents", desc: "Add new files for AI analysis", icon: Upload, href: "/dashboard/upload", color: "from-blue-500/10 to-transparent" },
          { title: "Search & Chat", desc: "Query your documents with AI", icon: MessageSquare, href: "/dashboard/search", color: "from-purple-500/10 to-transparent" },
          { title: "Semantic Search", desc: "Find files by conceptual meaning", icon: Search, href: "/dashboard/files", color: "from-emerald-500/10 to-transparent" }
        ].map((action, i) => (
          <Link key={i} href={action.href}>
            <Card className="glass card-hover border-none h-full group cursor-pointer relative overflow-hidden">
              <div className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              <CardContent className="p-6 flex items-center gap-5 relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-accent/50 flex items-center justify-center flex-shrink-0 transition-all group-hover:bg-background group-hover:shadow-ai group-hover:scale-110">
                  <action.icon className="h-6 w-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-lg group-hover:text-primary transition-colors">
                    {action.title}
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                    {action.desc}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Documents Table - Modern Minimalist */}
      <Card className="glass border-none shadow-2xl overflow-hidden rounded-3xl">
        <CardHeader className="p-8 border-b border-black/5 dark:border-white/5 space-y-1">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold tracking-tight">Recent Activity</CardTitle>
            <Link href="/dashboard/documents">
              <Button variant="ghost" className="text-primary font-bold hover:bg-primary/5 rounded-xl">
                View All
                <TrendingUp className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
          <CardDescription className="text-base">
            Track and manage your recently uploaded intelligent assets.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-80 gap-4">
              <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <p className="text-muted-foreground font-medium animate-pulse">Analyzing document repository...</p>
            </div>
          ) : !documents || documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-80 text-center px-6">
              <div className="w-24 h-24 rounded-full bg-accent/30 flex items-center justify-center mb-6 animate-process shadow-inner">
                <FileText className="h-10 w-10 text-muted-foreground opacity-50" />
              </div>
              <h4 className="text-xl font-bold">No documents yet</h4>
              <p className="text-muted-foreground mt-2 max-w-sm">
                Start building your knowledge base by uploading your first document.
              </p>
              <Link href="/dashboard/upload" className="mt-8">
                <Button className="rounded-xl bg-ai-gradient h-12 px-8 font-bold shadow-ai">
                  Get Started
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-black/5 dark:bg-white/5 border-b border-black/5 dark:border-white/5">
                    <th className="px-8 py-5 text-xs font-bold text-muted-foreground uppercase tracking-widest">Document</th>
                    <th className="px-8 py-5 text-xs font-bold text-muted-foreground uppercase tracking-widest">Metadata</th>
                    <th className="px-8 py-5 text-xs font-bold text-muted-foreground uppercase tracking-widest">Status</th>
                    <th className="px-8 py-5 text-xs font-bold text-muted-foreground uppercase tracking-widest">Timestamp</th>
                    <th className="px-8 py-5 text-right text-xs font-bold text-muted-foreground uppercase tracking-widest">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 dark:divide-white/5">
                  {documents.slice(0, 10).map((doc) => (
                    <tr key={doc.id} className="group hover:bg-black/5 dark:hover:bg-white/5 transition-all duration-300">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-accent shadow-inner flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                            <FileText className="h-5 w-5 text-foreground/70 group-hover:text-primary transition-colors" />
                          </div>
                          <div className="max-w-[240px] lg:max-w-xs">
                            <p className="font-bold text-sm truncate group-hover:text-primary transition-colors">
                              {doc.filename}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] font-bold text-muted-foreground/60 uppercase">ID: {doc.id.slice(0, 8)}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-semibold text-foreground/80">{formatBytes(doc.size)}</span>
                          <span className="text-[10px] text-muted-foreground font-medium uppercase">{doc.mimeType.split('/')[1] || doc.mimeType}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase ${doc.processingStatus === "completed"
                          ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                          : doc.processingStatus === "failed"
                            ? "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                            : "bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse"
                          }`}>
                          {doc.processingStatus === "processing" ? (
                            <div className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                          ) : (
                            <div className={`w-2 h-2 rounded-full ${doc.processingStatus === "completed" ? "bg-emerald-500" : "bg-rose-500"}`} />
                          )}
                          {doc.processingStatus}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <div className="text-xs font-medium text-muted-foreground">
                          {formatDate(doc.createdAt)}
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary text-muted-foreground transition-all"
                            disabled={doc.processingStatus !== "completed"}
                            onClick={() => handleDownload(doc)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-9 w-9 rounded-xl hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-all"
                                disabled={deleteMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="glass border-border/40 dark:border-none rounded-3xl shadow-2xl">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-2xl font-bold">Delete Document?</AlertDialogTitle>
                                <AlertDialogDescription className="text-base text-muted-foreground mt-2">
                                  This will permanently remove <span className="text-foreground font-bold font-mono">"{doc.filename}"</span> and all AI-extracted insights. This action is irreversible.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter className="mt-8 gap-3">
                                <AlertDialogCancel className="rounded-xl border-border/50 font-bold">Hold on</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(doc.id)}
                                  className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold px-8 shadow-lg shadow-destructive/20"
                                >
                                  Proceed
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
        <CardFooter className="p-6 bg-black/5 dark:bg-white/5 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
          <p className="text-xs text-muted-foreground font-medium">
            Showing {documents?.length ? Math.min(documents.length, 10) : 0} of {documents?.length || 0} documents
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 rounded-lg text-xs font-bold border-border/40 dark:border-border/50 opacity-50" disabled>Previous</Button>
            <Button variant="outline" size="sm" className="h-8 rounded-lg text-xs font-bold border-border/40 dark:border-border/50 opacity-50" disabled>Next</Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
