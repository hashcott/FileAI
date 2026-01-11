"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/stores";
import {
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
    Leaf,
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
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const logout = useAuthStore((state) => state.logout);

    useEffect(() => {
        if (!isAuthenticated) {
            router.push("/login");
        }
    }, [router, isAuthenticated]);

    const handleLogout = () => {
        logout();
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
        <div className="flex h-screen bg-background text-foreground selection:bg-primary/20">
            {/* Mobile menu overlay */}
            {mobileMenuOpen && (
                <div
                    className="fixed inset-0 z-40 bg-foreground/30 lg:hidden transition-all duration-200"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar - Clean & Minimal */}
            <aside
                className={`fixed lg:static inset-y-0 left-0 z-50 flex flex-col transition-all duration-200 ease-out bg-card border-r border-border ${
                    sidebarOpen ? "w-64" : "w-[72px]"
                } ${
                    mobileMenuOpen
                        ? "translate-x-0"
                        : "-translate-x-full lg:translate-x-0"
                }`}
                onClick={(e) => {
                    if (window.innerWidth < 1024) {
                        const target = e.target as HTMLElement;
                        if (target.closest('a')) {
                            setMobileMenuOpen(false);
                        }
                    }
                }}
            >
                {/* Logo Section */}
                <div className={`flex items-center h-16 border-b border-border ${sidebarOpen ? "justify-between px-5" : "justify-center px-0"}`}>
                    <div className={`flex items-center ${sidebarOpen ? "gap-3" : "gap-0"}`}>
                        <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
                            <Leaf className="h-5 w-5 text-primary-foreground" />
                        </div>
                        {sidebarOpen && (
                            <div className="animate-fadeIn">
                                <h1 className="font-semibold text-base tracking-tight text-foreground">
                                    DocuAI
                                </h1>
                                <p className="text-[10px] text-muted-foreground/60 font-medium tracking-wide">
                                    Enterprise
                                </p>
                            </div>
                        )}
                    </div>
                    {sidebarOpen && mobileMenuOpen && (
                        <button
                            onClick={() => setMobileMenuOpen(false)}
                            className="lg:hidden p-2 rounded-lg hover:bg-accent transition-colors"
                        >
                            <X className="h-5 w-5 text-muted-foreground" />
                        </button>
                    )}
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto no-scrollbar">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link key={item.href} href={item.href}>
                                <div
                                    className={`sidebar-item ${isActive ? "active" : ""} ${!sidebarOpen ? "justify-center px-0" : ""}`}
                                    title={item.name}
                                >
                                    <item.icon className={`h-[18px] w-[18px] flex-shrink-0 ${isActive ? "text-primary-foreground" : ""} ${!sidebarOpen ? "m-0" : ""}`} />
                                    {sidebarOpen && (
                                        <span className="truncate animate-fadeIn">{item.name}</span>
                                    )}
                                </div>
                            </Link>
                        );
                    })}
                </nav>

                {/* AI Usage Indicator */}
                {sidebarOpen && (
                    <div className="px-4 py-4 mx-3 mb-3 rounded-lg bg-accent border border-border">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-muted-foreground">AI Tokens</span>
                            <span className="text-xs font-semibold text-primary">84%</span>
                        </div>
                        <div className="h-1 w-full bg-border rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full w-[84%]" />
                        </div>
                    </div>
                )}

                {/* User Section */}
                <div className="mt-auto p-3 border-t border-border">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                className={`w-full flex items-center rounded-lg p-2.5 transition-colors duration-150 hover:bg-accent ${
                                    sidebarOpen ? "gap-3" : "justify-center"
                                }`}
                            >
                                <div className="relative">
                                    <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center">
                                        <span className="text-xs font-semibold text-primary-foreground">
                                            {getInitials(user?.name, user?.email)}
                                        </span>
                                    </div>
                                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-chart-2 border-2 border-card rounded-full" />
                                </div>
                                {sidebarOpen && (
                                    <>
                                        <div className="flex-1 text-left animate-fadeIn min-w-0">
                                            <p className="text-sm font-medium truncate">
                                                {user?.name || "Admin User"}
                                            </p>
                                            <p className="text-xs text-muted-foreground/60 truncate">
                                                {user?.email || "admin@example.com"}
                                            </p>
                                        </div>
                                        <ChevronDown className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
                                    </>
                                )}
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            align={sidebarOpen ? "end" : "start"}
                            side="right"
                            className="w-56 p-1.5 bg-card rounded-lg shadow-lg border-border"
                        >
                            <div className="px-2.5 py-2 border-b border-border mb-1">
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Account</p>
                            </div>
                            <DropdownMenuItem asChild className="rounded focus:bg-accent cursor-pointer py-2">
                                <Link href="/dashboard/account" className="flex items-center gap-2.5">
                                    <User className="h-4 w-4" />
                                    <span className="font-medium">My Profile</span>
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild className="rounded focus:bg-accent cursor-pointer py-2">
                                <Link href="/dashboard/settings" className="flex items-center gap-2.5">
                                    <Settings className="h-4 w-4" />
                                    <span className="font-medium">Settings</span>
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-border my-1" />
                            <DropdownMenuItem
                                onClick={handleLogout}
                                className="rounded focus:bg-destructive/10 focus:text-destructive text-destructive cursor-pointer py-2"
                            >
                                <LogOut className="h-4 w-4 mr-2.5" />
                                <span className="font-medium">Sign Out</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden relative z-10">
                {/* Header - Minimal & Functional */}
                <header className="h-16 flex items-center justify-between px-5 border-b border-border bg-background sticky top-0 z-40">
                    <div className="flex items-center gap-3 flex-1 max-w-xl">
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="hidden lg:flex p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                            aria-label="Toggle sidebar"
                        >
                            <Menu className="h-5 w-5" />
                        </button>
                        <button
                            onClick={() => setMobileMenuOpen(true)}
                            className="lg:hidden p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                            aria-label="Open menu"
                        >
                            <Menu className="h-5 w-5" />
                        </button>

                        <div className="flex-1 lg:max-w-sm relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <form onSubmit={handleSearch}>
                                <Input
                                    type="text"
                                    placeholder="Search documents..."
                                    className="w-full bg-accent border-border pl-10 h-10 rounded-lg focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-muted-foreground font-medium"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </form>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleTheme}
                            className="w-9 h-9 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                        >
                            {isDark ? (
                                <Sun className="h-[18px] w-[18px] text-chart-4" />
                            ) : (
                                <Moon className="h-[18px] w-[18px]" />
                            )}
                        </Button>

                        <Button
                            variant="ghost"
                            size="icon"
                            className="w-9 h-9 rounded-lg hover:bg-accent relative text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <Bell className="h-[18px] w-[18px]" />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full" />
                        </Button>

                        <div className="w-px h-5 bg-border/50 mx-1 hidden sm:block" />

                        <Link href="/dashboard/upload">
                            <Button className="hidden sm:flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg h-9 px-4 font-medium">
                                <Upload className="h-4 w-4" />
                                <span>Upload</span>
                            </Button>
                        </Link>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-hidden relative">
                    {children}
                </main>
            </div>
        </div>
    );
}
