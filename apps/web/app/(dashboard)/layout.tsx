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
    Building2,
    Moon,
    Sun,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc/client";

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
    { name: "Organization", href: "/dashboard/organization", icon: Building2 },
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
    const [searchQuery, setSearchQuery] = useState("");
    const [isDark, setIsDark] = useState(false);

    // Fetch user data
    const { data: user } = trpc.auth.me.useQuery();

    useEffect(() => {
        if (!authService.isAuthenticated()) {
            router.push("/login");
        }
    }, [router]);

    const handleLogout = () => {
        authService.logout();
        router.push("/login");
    };

    // Get user initials for avatar
    const getInitials = (name?: string, email?: string) => {
        if (name) {
            return name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2);
        }
        if (email) {
            return email.substring(0, 2).toUpperCase();
        }
        return "U";
    };

    // Theme toggle
    useEffect(() => {
        if (typeof window !== "undefined") {
            const theme = localStorage.getItem("theme");
            const isDarkMode =
                theme === "dark" ||
                (!theme &&
                    window.matchMedia("(prefers-color-scheme: dark)").matches);
            setIsDark(isDarkMode);
            if (isDarkMode) {
                document.documentElement.classList.add("dark");
            } else {
                document.documentElement.classList.remove("dark");
            }
        }
    }, []);

    const toggleTheme = () => {
        const html = document.documentElement;
        const newIsDark = !html.classList.contains("dark");
        setIsDark(newIsDark);

        if (newIsDark) {
            html.classList.add("dark");
            localStorage.setItem("theme", "dark");
        } else {
            html.classList.remove("dark");
            localStorage.setItem("theme", "light");
        }
    };

    // Handle search
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            router.push(`/dashboard/files?q=${encodeURIComponent(searchQuery)}`);
        }
    };

    return (
        <div className="flex h-screen bg-background">
            {/* Mobile menu overlay */}
            {mobileMenuOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar Layout Pattern - Mobile Optimized */}
            <aside
                className={`fixed lg:static inset-y-0 left-0 z-50 flex flex-col transition-all duration-200 border-r ${
                    sidebarOpen ? "w-64" : "w-16"
                } ${
                    mobileMenuOpen
                        ? "translate-x-0"
                        : "-translate-x-full lg:translate-x-0"
                }`}
                style={{
                    backgroundColor: "hsl(var(--sidebar-background))",
                    borderColor: "hsl(var(--sidebar-border))",
                }}
                onClick={(e) => {
                    // Close mobile menu when clicking on sidebar items
                    if (window.innerWidth < 1024) {
                        const target = e.target as HTMLElement;
                        if (target.closest('a')) {
                            setMobileMenuOpen(false);
                        }
                    }
                }}
            >
                {/* Logo - Flat Design 2.0 */}
                <div 
                    className="flex items-center justify-between h-16 px-4 border-b"
                    style={{
                        borderColor: "hsl(var(--sidebar-border))",
                    }}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-sm">
                            <FileText className="h-4 w-4 text-primary-foreground" />
                        </div>
                        {sidebarOpen && (
                            <div>
                                <h1 className="font-semibold text-sm text-sidebar-foreground">
                                    RAG Search
                                </h1>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => setMobileMenuOpen(false)}
                        className="lg:hidden hover:opacity-70 transition-opacity p-1 rounded"
                        style={{ color: "hsl(var(--sidebar-foreground))" }}
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Navigation - Mobile Optimized */}
                <nav className="flex-1 px-2 sm:px-3 py-4 space-y-1 overflow-y-auto">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link key={item.href} href={item.href}>
                                <div
                                    className={`sidebar-item touch-manipulation ${
                                        isActive ? "active" : ""
                                    }`}
                                    title={item.name}
                                >
                                    <item.icon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                                    {sidebarOpen && <span className="truncate text-sm sm:text-base">{item.name}</span>}
                                </div>
                            </Link>
                        );
                    })}
                </nav>

                {/* User Account Menu - Bottom of Sidebar */}
                <div 
                    className={`border-t ${sidebarOpen ? "p-3" : "p-2"}`}
                    style={{
                        borderColor: "hsl(var(--sidebar-border))",
                    }}
                >
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button 
                                className={`w-full flex items-center rounded-md hover:bg-sidebar-accent transition-colors ${
                                    sidebarOpen 
                                        ? "gap-3 px-3 py-2 text-left" 
                                        : "justify-center p-2"
                                }`}
                            >
                                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                                    <span className="text-sm font-semibold text-primary-foreground">
                                        {getInitials(user?.name, user?.email)}
                                    </span>
                                </div>
                                {sidebarOpen && (
                                    <>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-sidebar-foreground truncate">
                                                {user?.name || "Admin User"}
                                            </p>
                                            <p className="text-xs text-muted-foreground truncate">
                                                {user?.email || "admin@example.com"}
                                            </p>
                                        </div>
                                        <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                    </>
                                )}
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            align={sidebarOpen ? "end" : "start"}
                            side={sidebarOpen ? "right" : "right"}
                            className="w-56"
                        >
                            <DropdownMenuItem asChild>
                                <Link
                                    href="/dashboard/account"
                                    className="flex items-center gap-2 cursor-pointer"
                                >
                                    <Settings className="h-4 w-4" />
                                    <span>Cài đặt tài khoản</span>
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={handleLogout}
                                className="text-destructive focus:text-destructive cursor-pointer"
                            >
                                <LogOut className="h-4 w-4 mr-2" />
                                <span>Đăng xuất</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </aside>

            {/* Main Content Area - Sidebar Layout Pattern */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header - Mobile Optimized */}
                <header 
                    className="h-14 sm:h-16 border-b flex items-center gap-2 sm:gap-4 px-3 sm:px-6 bg-background shadow-sm"
                    style={{ borderColor: "hsl(var(--border))" }}
                >
                    {/* Toggle Sidebar Button */}
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="hidden lg:flex text-muted-foreground hover:text-foreground p-2 rounded-md hover:bg-accent transition-colors"
                        aria-label="Toggle sidebar"
                    >
                        <Menu className="h-5 w-5" />
                    </button>
                    <button
                        onClick={() => setMobileMenuOpen(true)}
                        className="lg:hidden text-muted-foreground hover:text-foreground p-2 rounded-md hover:bg-accent transition-colors touch-manipulation"
                        aria-label="Open menu"
                    >
                        <Menu className="h-5 w-5" />
                    </button>

                    {/* Search Bar - Responsive */}
                    <form onSubmit={handleSearch} className="flex-1 min-w-0 mx-2 sm:mx-4">
                        <div className="relative">
                            <Search className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Tìm kiếm..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8 sm:pl-10 h-9 w-full text-sm"
                            />
                        </div>
                    </form>

                    {/* Right Side Actions - Mobile Optimized */}
                    <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                        {/* Theme Toggle */}
                        <button
                            onClick={toggleTheme}
                            className="p-2 text-muted-foreground hover:text-foreground rounded-md hover:bg-accent transition-colors touch-manipulation"
                            title={isDark ? "Light Mode" : "Dark Mode"}
                            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
                        >
                            {isDark ? (
                                <Sun className="h-5 w-5" />
                            ) : (
                                <Moon className="h-5 w-5" />
                            )}
                        </button>

                        {/* Notifications */}
                        <button 
                            className="relative p-2 text-muted-foreground hover:text-foreground rounded-md hover:bg-accent transition-colors touch-manipulation"
                            aria-label="Notifications"
                        >
                            <Bell className="h-5 w-5" />
                            <span className="absolute top-0 right-0 w-4 h-4 sm:w-5 sm:h-5 bg-destructive rounded-full flex items-center justify-center border-2 border-background">
                                <span className="text-[9px] sm:text-[10px] font-semibold text-destructive-foreground">3</span>
                            </span>
                        </button>
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 overflow-auto bg-background">
                    {children}
                </main>
            </div>
        </div>
    );
}
