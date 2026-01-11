"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { useAuthStore } from "@/lib/stores";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { Leaf, Mail, Lock, Eye, EyeOff, ArrowRight, User, Check, Loader2 } from "lucide-react";

export default function RegisterPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const setAuth = useAuthStore((state) => state.setAuth);
    
    const registerMutation = trpc.auth.register.useMutation({
        onSuccess: (data: { user: Parameters<typeof setAuth>[0]; token: string }) => {
            setAuth(data.user, data.token);
            toast({
                title: "Success",
                description: "Account created successfully",
            });
            router.push("/dashboard");
        },
        onError: (error) => {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        },
        onSettled: () => {
            setIsLoading(false);
        },
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        registerMutation.mutate({ email, password, name });
    };

    return (
        <div className="min-h-screen bg-background flex">
            {/* Left Side - Branding */}
            <div className="hidden lg:flex lg:w-1/2 bg-foreground relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%23ffffff%22 fill-opacity=%220.02%22%3E%3Cpath d=%22M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50"></div>

                <div className="relative z-10 flex flex-col justify-center px-16 text-background">
                    {/* Logo */}
                    <div className="flex items-center gap-3 mb-12">
                        <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
                            <Leaf className="w-7 h-7 text-primary-foreground" />
                        </div>
                        <span className="text-2xl font-semibold tracking-tight">
                            DocuAI
                        </span>
                    </div>

                    <h1 className="text-4xl font-semibold mb-4 leading-tight">
                        Join us today
                    </h1>
                    <p className="text-lg text-background/70 mb-8 max-w-md leading-relaxed">
                        Sign up for free to experience intelligent document search technology with AI.
                    </p>

                    {/* Benefits */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-background/10 flex items-center justify-center">
                                <Check className="w-5 h-5 text-chart-2" />
                            </div>
                            <span className="text-background/80">
                                100 free searches per month
                            </span>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-background/10 flex items-center justify-center">
                                <Check className="w-5 h-5 text-chart-2" />
                            </div>
                            <span className="text-background/80">
                                Unlimited PDF uploads
                            </span>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-background/10 flex items-center justify-center">
                                <Check className="w-5 h-5 text-chart-2" />
                            </div>
                            <span className="text-background/80">
                                24/7 support
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side - Register Form */}
            <div className="flex-1 flex items-center justify-center p-8 lg:p-16">
                <div className="w-full max-w-[400px]">
                    {/* Mobile Logo */}
                    <div className="flex items-center gap-3 mb-8 lg:hidden">
                        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                            <Leaf className="w-5 h-5 text-primary-foreground" />
                        </div>
                        <span className="text-xl font-semibold">DocuAI</span>
                    </div>

                    {/* Welcome Text */}
                    <div className="mb-8">
                        <h2 className="text-2xl font-semibold mb-2">
                            Create an account
                        </h2>
                        <p className="text-muted-foreground">
                            Start your intelligent search journey
                        </p>
                    </div>

                    {/* Register Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Name Field */}
                        <div className="space-y-2">
                            <label htmlFor="name" className="text-sm font-medium">
                                Full name
                            </label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                <input
                                    id="name"
                                    type="text"
                                    placeholder="John Doe"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full h-12 pl-12 pr-4 bg-accent border border-border rounded-lg placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                />
                            </div>
                        </div>

                        {/* Email Field */}
                        <div className="space-y-2">
                            <label htmlFor="email" className="text-sm font-medium">
                                Email
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                <input
                                    id="email"
                                    type="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full h-12 pl-12 pr-4 bg-accent border border-border rounded-lg placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div className="space-y-2">
                            <label htmlFor="password" className="text-sm font-medium">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                <input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={8}
                                    className="w-full h-12 pl-12 pr-12 bg-accent border border-border rounded-lg placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Password must be at least 8 characters
                            </p>
                        </div>

                        {/* Terms Checkbox */}
                        <label className="flex items-start gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                required
                                className="w-4 h-4 mt-0.5 rounded border-border text-primary focus:ring-primary/20"
                            />
                            <span className="text-sm text-muted-foreground">
                                I agree to the{" "}
                                <a href="#" className="text-primary hover:text-primary/80">
                                    Terms of Service
                                </a>{" "}
                                and{" "}
                                <a href="#" className="text-primary hover:text-primary/80">
                                    Privacy Policy
                                </a>
                            </span>
                        </label>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>Creating account...</span>
                                </>
                            ) : (
                                <>
                                    <span>Create account</span>
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Login Link */}
                    <p className="mt-8 text-center text-muted-foreground">
                        Already have an account?{" "}
                        <Link href="/login" className="text-primary hover:text-primary/80 font-medium transition-colors">
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
