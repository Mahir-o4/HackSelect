"use client"

import { Button } from "@/components/ui/button"
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { signInEmailAction } from "@/actions/signInEmail.action"
import Link from "next/link"
import ParticlesBackground from "@/components/landing/ParticlesBackground"

const SignIn = () => {
    const [isPending, setIsPending] = useState(false)
    const router = useRouter()

    const handleSubmit = async (evt: React.FormEvent<HTMLFormElement>) => {
        evt.preventDefault();
        setIsPending(true)

        const formData = new FormData(evt.currentTarget);
        const { error } = await signInEmailAction(formData);

        if (error) {
            toast.error(error);
            setIsPending(false);
        } else {
            toast.success("Login successful. Good to have you back.");
            router.push("/dashboard");
        }
    }

    return (

        <div className="w-screen h-screen flex justify-center items-center">
        <ParticlesBackground></ParticlesBackground>
            <Card className="w-full max-w-sm">
                <CardHeader>
                    <CardTitle>Signin to your account</CardTitle>
                    <CardDescription>
                        Enter your email below to login to your account
                    </CardDescription>
                    <CardAction>
                        <Link href="/auth/signup">
                            <Button variant="link">Sign Up</Button>
                        </Link>
                    </CardAction>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} id="signin-form">
                        <div className="flex flex-col gap-6">
                            <div className="grid gap-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    name="email"
                                    placeholder="m@example.com"
                                />
                            </div>
                            <div className="grid gap-2">
                                <div className="flex items-center">
                                    <Label htmlFor="password">Password</Label>
                                    <a
                                        href="#"
                                        className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                                    >
                                        Forgot your password?
                                    </a>
                                </div>
                                <Input id="password" type="password" name="password" />
                            </div>
                        </div>
                    </form>
                </CardContent>
                <CardFooter className="flex-col gap-2">
                    <Button
                        type="submit"
                        form="signin-form"
                        disabled={isPending}
                        className="w-full">
                        {isPending ? "Signing In..." : "Sign In"}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}

export default SignIn;