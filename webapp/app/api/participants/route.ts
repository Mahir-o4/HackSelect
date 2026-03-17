import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const GET = async (req: NextRequest) => {
    try {
        const participants = await prisma.participant.findMany({
            include: {
                team: true // we can include other fields according to our needs
            }
        })

        return NextResponse.json(
            {
                success: true,
                data: participants
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