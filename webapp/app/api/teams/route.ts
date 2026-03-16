import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const GET = async (req: NextRequest) => {
    try {
        const teams = await prisma.team.findMany({
            include: {
                participant: true, // we can include other fields according to our needs
            }
        })

        return NextResponse.json(
            {
                success: true,
                data: teams
            },
            {
                status: 200
            }
        )
    } catch (err) {
        console.error(err)

        return NextResponse.json(
            {
                error: "Internal Server Error!"
            },
            {
                status: 500
            }
        )
    }
}