"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { authService } from "@/lib/auth";
import {
    FileText,
    Search,
    Upload,
    Settings,
    LogOut,
    Menu,
    X,
    FolderSearch,
    MessageSquare,
    LayoutDashboard,
    ChevronDown,
    Bell,
    User,
    FolderOpen,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface NavItem {
    name: string;
    href: string;
    icon: React.ElementType;
}

const navItems: NavItem[] = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Documents", href: "/dashboard/documents", icon: FolderOpen },
    { name: "Chat & Search", href: "/dashboard/search", icon: MessageSquare },
    { name: "Find Files", href: "/dashboard/files", icon: FolderSearch },
    { name: "Upload", href: "/dashboard/upload", icon: Upload },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
        <div className="flex h-screen bg-slate-100 dark:bg-slate-900">
            {/* Mobile menu overlay */}
            {mobileMenuOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed lg:static inset-y-0 left-0 z-50 flex flex-col bg-slate-900 text-white transition-all duration-300 ${
                    sidebarOpen ? "w-72" : "w-20"
                } ${
                    mobileMenuOpen
                        ? "translate-x-0"
                        : "-translate-x-full lg:translate-x-0"
                }`}
            >
                {/* Logo */}
                <div className="flex items-center justify-between h-20 px-6 border-b border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center">
                            <FileText className="h-6 w-6 text-white" />
                        </div>
                        {sidebarOpen && (
                            <div>
                                <h1 className="font-bold text-lg">
                                    RAG Search
                                </h1>
                                <p className="text-xs text-slate-400">
                                    Document AI
                                </p>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => setMobileMenuOpen(false)}
                        className="lg:hidden text-slate-400 hover:text-white"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
                    <p
                        className={`text-xs text-slate-500 uppercase tracking-wider mb-4 ${
                            !sidebarOpen && "hidden"
                        }`}
                    >
                        Menu
                    </p>
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link key={item.href} href={item.href}>
                                <div
                                    className={`sidebar-item ${
                                        isActive ? "active" : ""
                                    }`}
                                    title={item.name}
                                >
                                    <item.icon className="h-5 w-5 flex-shrink-0" />
                                    {sidebarOpen && <span>{item.name}</span>}
                                </div>
                            </Link>
                        );
                    })}
                </nav>

                {/* User section */}
                <div className="p-4 border-t border-slate-700">
                    <button
                        onClick={handleLogout}
                        className="sidebar-item w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                        <LogOut className="h-5 w-5 flex-shrink-0" />
                        {sidebarOpen && <span>Logout</span>}
                    </button>
                </div>

                {/* Collapse button - Desktop only */}
                <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="hidden lg:flex items-center justify-center h-12 border-t border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                    <ChevronDown
                        className={`h-5 w-5 transition-transform ${
                            sidebarOpen ? "rotate-90" : "-rotate-90"
                        }`}
                    />
                </button>
            </aside>

            {/* Main content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Top bar */}
                <header className="h-20 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-6">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setMobileMenuOpen(true)}
                            className="lg:hidden text-slate-600 dark:text-slate-400"
                        >
                            <Menu className="h-6 w-6" />
                        </button>
                        <div>
                            <h2 className="text-xl font-semibold text-slate-800 dark:text-white">
                                {navItems.find((item) => item.href === pathname)
                                    ?.name || "Dashboard"}
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Welcome back! Manage your documents and search.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Notifications */}
                        <button className="relative p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                            <Bell className="h-5 w-5" />
                            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                        </button>

                        {/* User menu */}
                        <div className="flex items-center gap-3 pl-4 border-l border-slate-200 dark:border-slate-700">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                                <User className="h-5 w-5 text-white" />
                            </div>
                            <div className="hidden md:block">
                                <p className="text-sm font-medium text-slate-800 dark:text-white">
                                    Admin User
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Administrator
                                </p>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-900">
                    {children}
                </main>
            </div>
        </div>
    );
}
