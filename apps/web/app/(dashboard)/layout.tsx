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
        <div className="flex h-screen bg-background text-foreground selection:bg-primary/20">
            {/* Background Glow Decorations */}
            <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 dark:bg-primary/10 blur-[120px] rounded-full pointer-events-none z-0" />
            <div className="fixed bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-purple-500/5 dark:bg-purple-500/10 blur-[100px] rounded-full pointer-events-none z-0" />

            {/* Mobile menu overlay */}
            {mobileMenuOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/40 backdrop-blur-md lg:hidden transition-all duration-300"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar Layout - Modern & Glassy */}
            <aside
                className={`fixed lg:static inset-y-0 left-0 z-50 flex flex-col transition-all duration-300 ease-in-out border-r glass ${sidebarOpen ? "w-64" : "w-16"
                    } ${mobileMenuOpen
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
                <div className={`flex items-center h-20 border-b border-border/40 dark:border-border/50 ${sidebarOpen ? "justify-between px-4" : "justify-center px-0"}`}>
                    <div className={`flex items-center ${sidebarOpen ? "gap-3" : "gap-0"}`}>
                        <div className="w-10 h-10 rounded-xl bg-ai-gradient p-[1px] shadow-ai flex-shrink-0">
                            <div className="w-full h-full bg-background rounded-[11px] flex items-center justify-center">
                                <FileText className="h-5 w-5 text-primary" />
                            </div>
                        </div>
                        {sidebarOpen && (
                            <div className="animate-fadeIn">
                                <h1 className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                                    DocuAI
                                </h1>
                                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                                    Enterprise
                                </p>
                            </div>
                        )}
                    </div>
                    {sidebarOpen && mobileMenuOpen && (
                        <button
                            onClick={() => setMobileMenuOpen(false)}
                            className="lg:hidden p-2 rounded-full hover:bg-accent/50 transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    )}
                </div>

                {/* Sidebar Navigation */}
                <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto no-scrollbar">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link key={item.href} href={item.href}>
                                <div
                                    className={`sidebar-item group ${isActive ? "active" : "hover:bg-accent/30"} ${!sidebarOpen ? "justify-center px-0" : ""}`}
                                    title={item.name}
                                >
                                    <item.icon className={`h-5 w-5 flex-shrink-0 transition-transform duration-300 group-hover:scale-110 ${isActive ? "text-white" : "text-muted-foreground"} ${!sidebarOpen ? "m-0" : ""}`} />
                                    {sidebarOpen && <span className="truncate font-medium animate-fadeIn">{item.name}</span>}
                                    {isActive && sidebarOpen && (
                                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_white]" />
                                    )}
                                </div>
                            </Link>
                        );
                    })}
                </nav>

                {/* AI Status / Quota Summary */}
                {sidebarOpen && (
                    <div className="px-4 py-4 m-3 rounded-2xl bg-primary/5 border border-primary/10 animate-fadeIn">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-primary/70">AI Tokens</span>
                            <span className="text-[10px] font-bold text-primary">84%</span>
                        </div>
                        <div className="h-1.5 w-full bg-primary/10 rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full w-[84%] shadow-glow" />
                        </div>
                    </div>
                )}

                {/* User Profile Section */}
                <div className="mt-auto p-4 border-t border-border/50">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                className={`w-full flex items-center rounded-xl p-2 transition-all duration-300 hover:bg-accent/50 ${sidebarOpen ? "gap-3" : "justify-center"
                                    }`}
                            >
                                <div className="relative">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-purple-500 flex items-center justify-center shadow-lg">
                                        <span className="text-sm font-bold text-white">
                                            {getInitials(user?.name, user?.email)}
                                        </span>
                                    </div>
                                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full" />
                                </div>
                                {sidebarOpen && (
                                    <>
                                        <div className="flex-1 text-left animate-fadeIn">
                                            <p className="text-sm font-semibold truncate leading-tight">
                                                {user?.name || "Admin User"}
                                            </p>
                                            <p className="text-[11px] text-muted-foreground truncate leading-tight mt-0.5">
                                                {user?.email || "admin@example.com"}
                                            </p>
                                        </div>
                                        <ChevronDown className="h-4 w-4 text-muted-foreground opacity-50 transition-transform group-hover:translate-y-0.5" />
                                    </>
                                )}
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            align={sidebarOpen ? "end" : "start"}
                            side={sidebarOpen ? "right" : "right"}
                            className="w-64 p-2 glass animate-fadeIn rounded-2xl shadow-2xl border-border/50"
                        >
                            <div className="px-3 py-2 border-b border-border/50 mb-1">
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Account</p>
                            </div>
                            <DropdownMenuItem asChild className="rounded-xl focus:bg-primary/10 focus:text-primary transition-colors cursor-pointer py-2.5">
                                <Link href="/dashboard/account" className="flex items-center gap-3">
                                    <User className="h-4 w-4" />
                                    <span className="font-medium">My Profile</span>
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild className="rounded-xl focus:bg-primary/10 focus:text-primary transition-colors cursor-pointer py-2.5">
                                <Link href="/dashboard/settings" className="flex items-center gap-3">
                                    <Settings className="h-4 w-4" />
                                    <span className="font-medium">Workspace Settings</span>
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-border/50 my-1" />
                            <DropdownMenuItem
                                onClick={handleLogout}
                                className="rounded-xl focus:bg-destructive/10 focus:text-destructive text-destructive/80 transition-colors cursor-pointer py-2.5"
                            >
                                <LogOut className="h-4 w-4 mr-3" />
                                <span className="font-bold">Sign Out</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden relative z-10">
                {/* Header - Clean & Minimal */}
                <header className="h-20 flex items-center justify-between px-6 border-b border-border/40 dark:border-border/30 backdrop-blur-md sticky top-0 bg-background/50 z-40">
                    <div className="flex items-center gap-4 flex-1 max-w-2xl">
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="hidden lg:flex p-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-accent/50 transition-all text-muted-foreground hover:text-foreground hover:shadow-sm"
                            aria-label="Toggle sidebar"
                        >
                            <Menu className="h-5 w-5" />
                        </button>
                        <button
                            onClick={() => setMobileMenuOpen(true)}
                            className="lg:hidden p-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-accent/50 transition-all text-muted-foreground hover:text-foreground"
                            aria-label="Open menu"
                        >
                            <Menu className="h-5 w-5" />
                        </button>

                        <div className="flex-1 lg:max-w-md relative group">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
                            <form onSubmit={handleSearch}>
                                <Input
                                    type="text"
                                    placeholder="Search intelligence index... (⌘K)"
                                    className="w-full bg-black/5 dark:bg-white/5 border-none pl-11 h-11 rounded-2xl focus:ring-1 focus:ring-primary/40 placeholder:text-muted-foreground/40 font-medium transition-all"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </form>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleTheme}
                            className="w-10 h-10 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-all text-muted-foreground hover:text-foreground"
                        >
                            {isDark ? (
                                <Sun className="h-5 w-5 text-amber-500" />
                            ) : (
                                <Moon className="h-5 w-5 text-indigo-600" />
                            )}
                        </Button>

                        <Button
                            variant="ghost"
                            size="icon"
                            className="w-10 h-10 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 relative text-muted-foreground hover:text-foreground transition-all"
                        >
                            <Bell className="h-5 w-5" />
                            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-primary rounded-full border-2 border-background" />
                        </Button>

                        <div className="w-px h-6 bg-border/40 dark:bg-border/50 mx-2 hidden sm:block" />

                        <Link href="/dashboard/upload">
                            <Button className="hidden sm:flex items-center gap-2 bg-ai-gradient hover:opacity-90 shadow-ai border-none rounded-xl h-11 px-5 font-bold transition-transform hover:scale-105 active:scale-95">
                                <Upload className="h-4 w-4" />
                                <span>Upload</span>
                            </Button>
                        </Link>
                    </div>
                </header>

                {/* Page Content - Scrolling handled by individual pages */}
                <main className="flex-1 overflow-hidden relative">
                    {children}
                </main>
            </div>
        </div>
    );
}
