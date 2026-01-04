"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { authService } from "@/lib/auth";
import { FileText, Search, Settings, Upload, LogOut } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();

    useEffect(() => {
        if (!authService.isAuthenticated()) {
            router.push("/login");
        }
    }, [router]);

    const handleLogout = () => {
        authService.logout();
        router.push("/login");
    };

    return (
        <div className="flex h-screen bg-gray-50">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
                <div className="p-6 border-b border-gray-200">
                    <h1 className="text-xl font-bold text-gray-900">
                        RAG Search
                    </h1>
                </div>
                <nav className="flex-1 p-4 space-y-2">
                    <Link href="/dashboard">
                        <Button
                            variant="ghost"
                            className="w-full justify-start"
                        >
                            <FileText className="mr-2 h-4 w-4" />
                            Documents
                        </Button>
                    </Link>
                    <Link href="/dashboard/search">
                        <Button
                            variant="ghost"
                            className="w-full justify-start"
                        >
                            <Search className="mr-2 h-4 w-4" />
                            Chat & Search
                        </Button>
                    </Link>
                    <Link href="/dashboard/files">
                        <Button
                            variant="ghost"
                            className="w-full justify-start"
                        >
                            <Search className="mr-2 h-4 w-4" />
                            Find Files
                        </Button>
                    </Link>
                    <Link href="/dashboard/upload">
                        <Button
                            variant="ghost"
                            className="w-full justify-start"
                        >
                            <Upload className="mr-2 h-4 w-4" />
                            Upload
                        </Button>
                    </Link>
                    <Link href="/dashboard/settings">
                        <Button
                            variant="ghost"
                            className="w-full justify-start"
                        >
                            <Settings className="mr-2 h-4 w-4" />
                            Settings
                        </Button>
                    </Link>
                </nav>
                <div className="p-4 border-t border-gray-200">
                    <Button
                        variant="ghost"
                        className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={handleLogout}
                    >
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                    </Button>
                </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 overflow-auto">{children}</main>
        </div>
    );
}
