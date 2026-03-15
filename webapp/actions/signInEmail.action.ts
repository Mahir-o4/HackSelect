"use server"

import { auth } from "@/lib/auth"
import { headers } from "next/headers"

export const signInEmailAction = async (formData: FormData) => {

    const email = String(formData.get("email"))
    if (!email) {
        return {
            error: "Please Enter Your Email."
        }
    }

    const password = String(formData.get("password"))
    if (!password) {
        return {
            error: "Please Enter Your Password."
        }
    }

    try {
        await auth.api.signInEmail({
            headers: await headers(),
            body: {
                email,
                password
            }
        })

        return {
            error: null
        }
    } catch (err) {
        if (err instanceof Error) {
            return {
                error: err.message
            }
        }

        return {
            error: "Internal Server Error!"
        }
    }
}