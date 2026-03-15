import { Button } from "@/components/ui/button";
import { signOutAction } from "@/actions/signOut.action";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

const DashboardPage = async() => {
    // Route Protection without proxy (proxy will be added at the end)
    
    /*const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        redirect("/auth/signin")
    }*/

    return (
        <div className="h-screen w-screen flex flex-col gap-5 justify-center items-center text-6xl font-bold text-amber-900">
            DASHBOARD NI**A
            <Button
                onClick={signOutAction}
                className="text-3xl font-extrabold p-8">LogOut!</Button>
        </div>
    )
}

export default DashboardPage;