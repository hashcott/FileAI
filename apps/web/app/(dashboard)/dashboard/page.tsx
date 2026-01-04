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
    <div className="p-6 space-y-6 animate-fadeIn">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="card-hover border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {stat.title}
                  </p>
                  <p className="text-3xl font-bold text-slate-800 dark:text-white mt-2">
                    {stat.value}
                  </p>
                  <div className="flex items-center gap-1 mt-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span className="text-xs text-green-500">{stat.change}</span>
                    <span className="text-xs text-slate-400">this month</span>
                  </div>
                </div>
                <div className={`w-14 h-14 rounded-xl ${stat.gradient} flex items-center justify-center`}>
                  <stat.icon className="h-7 w-7 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/dashboard/upload">
          <Card className="card-hover border-0 shadow-sm cursor-pointer group">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Upload className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-white">
                  Upload Documents
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Add new files to your library
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/search">
          <Card className="card-hover border-0 shadow-sm cursor-pointer group">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Search className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-white">
                  Search & Chat
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Ask questions about your docs
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/files">
          <Card className="card-hover border-0 shadow-sm cursor-pointer group">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Eye className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-white">
                  Find Files
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Semantic search your files
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Documents Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Recent Documents</CardTitle>
              <CardDescription>
                Manage and view all your uploaded documents
              </CardDescription>
            </div>
            <Link href="/dashboard/upload">
              <Button className="gradient-primary border-0">
                <Upload className="h-4 w-4 mr-2" />
                Upload New
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : !documents || documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64">
              <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                <FileText className="h-10 w-10 text-slate-400" />
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-center">
                No documents uploaded yet.
                <br />
                Start by uploading your first document!
              </p>
              <Link href="/dashboard/upload" className="mt-4">
                <Button className="gradient-primary border-0">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Document
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-800">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Document
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Size
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {documents.map((doc) => (
                    <tr
                      key={doc.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-800 dark:text-white truncate max-w-xs">
                              {doc.filename}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {doc.mimeType}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                        {formatBytes(doc.size)}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                            doc.processingStatus === "completed"
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : doc.processingStatus === "failed"
                              ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                              : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                          }`}
                        >
                          {doc.processingStatus === "completed" && (
                            <CheckCircle className="h-3 w-3" />
                          )}
                          {doc.processingStatus === "processing" && (
                            <Clock className="h-3 w-3 animate-spin" />
                          )}
                          {doc.processingStatus === "failed" && (
                            <AlertCircle className="h-3 w-3" />
                          )}
                          {doc.processingStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                        {formatDate(doc.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-slate-500 hover:text-blue-600"
                            disabled={doc.processingStatus !== "completed"}
                            onClick={() => handleDownload(doc)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-slate-500 hover:text-red-600"
                                disabled={deleteMutation.isLoading}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Document?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete "{doc.filename}" and all its
                                  associated data. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(doc.id)}
                                  className="bg-red-600 text-white hover:bg-red-700"
                                >
                                  Delete
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
      </Card>
    </div>
  );
}
