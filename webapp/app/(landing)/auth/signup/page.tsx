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
import { signUpEmailAction } from "@/actions/signUpEmail.action"
import { toast } from "sonner"
import Link from "next/link"

const SignUp = () => {
    const [isPending, setIsPending] = useState(false)
    const router = useRouter()

    const handleSubmit = async (evt: React.FormEvent<HTMLFormElement>) => {
        evt.preventDefault();
        setIsPending(true)

        const formData = new FormData(evt.currentTarget);
        const { error } = await signUpEmailAction(formData);

        if (error) {
            toast.error(error);
            setIsPending(false);
        } else {
            toast.success("SignUp complete. You're all set.");
            router.push("/dashboard");
        }
    }

    return (
        <div className="w-screen h-screen flex justify-center items-center">
            <Card className="w-full max-w-sm">
                <CardHeader>
                    <CardTitle>Signup to your account</CardTitle>
                    <CardDescription>
                        Enter your name & email below to Create and Signup to your account
                    </CardDescription>
                    <CardAction>
                        <Link href="/auth/signin">
                            <Button variant="link">Sign In</Button>
                        </Link>
                    </CardAction>
                </CardHeader>

                <CardContent>
                    <form id="signup-form" onSubmit={handleSubmit}>
                        <div className="flex flex-col gap-6">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    type="name"
                                    name="name"
                                    placeholder="Glenn Quagmire"
                                />
                            </div>

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
                                </div>
                                <Input id="password" type="password" name="password" />
                            </div>
                        </div>
                    </form>
                </CardContent>

                <CardFooter className="flex-col gap-2">
                    <Button
                        type="submit"
                        form="signup-form"
                        className="w-full"
                        disabled={isPending}>
                        {isPending ? "Signing Up..." : "Sign Up"}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}

export default SignUp;