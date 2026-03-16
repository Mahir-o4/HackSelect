"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { signInEmailAction } from "@/actions/signInEmail.action"
import Link from "next/link"
import ParticlesBackground from "@/components/landing/ParticlesBackground"
import Navbar from "@/components/layout/Navbar"
import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"

const SignIn = () => {
    const [isPending, setIsPending] = useState(false)
    const router = useRouter()

    const handleSubmit = async (evt: React.FormEvent<HTMLFormElement>) => {
        evt.preventDefault()
        setIsPending(true)
        const formData = new FormData(evt.currentTarget)
        const { error } = await signInEmailAction(formData)
        if (error) {
            toast.error(error)
            setIsPending(false)
        } else {
            toast.success("Login successful. Good to have you back.")
            router.push("/dashboard")
        }
    }

    return (
        <div className="w-screen h-screen flex justify-center items-center overflow-hidden relative">
            <Navbar type="secondary" link={{ label: "Go Home", href: "/" }} />
            <ParticlesBackground />

            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="relative z-10 w-full max-w-sm px-4"
            >
                {/* Brand mark */}
                <div className="flex items-center justify-center gap-1.5 mb-8">
                    <span className="text-base font-bold text-foreground">Hack</span>
                    <span className="text-base font-bold text-accent">Select</span>
                </div>

                {/* Card */}
                <div className="card-elevated rounded-2xl p-8">

                    {/* Header */}
                    <div className="mb-7">
                        <h1 className="text-2xl font-bold text-foreground mb-1.5">Welcome back</h1>
                        <p className="text-sm text-muted-foreground">
                            Sign in to your account to continue
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="email" className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                                Email
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                name="email"
                                placeholder="you@example.com"
                                className="h-11 bg-muted/40 border-border/60 focus:border-foreground/30 transition-colors"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password" className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                                    Password
                                </Label>
                                <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                                    Forgot password?
                                </a>
                            </div>
                            <Input
                                id="password"
                                type="password"
                                name="password"
                                className="h-11 bg-muted/40 border-border/60 focus:border-foreground/30 transition-colors"
                            />
                        </div>

                        <Button
                            type="submit"
                            variant="hero"
                            disabled={isPending}
                            className="w-full h-11 mt-1 font-medium"
                        >
                            {isPending ? "Signing in…" : (
                                <span className="flex items-center gap-2">
                                    Sign In <ArrowRight className="w-4 h-4" />
                                </span>
                            )}
                        </Button>
                    </form>

                    {/* Footer */}
                    <p className="text-center text-sm text-muted-foreground mt-6">
                        No account?{" "}
                        <Link href="/auth/signup" className="text-foreground font-medium hover:text-accent transition-colors">
                            Sign up
                        </Link>
                    </p>
                </div>
            </motion.div>
        </div>
    )
}

export default SignIn