import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const GET = async (req: NextRequest) => {
    try {
        const { searchParams } = new URL(req.url)
        const hackathonId = searchParams.get("hackathonId")

        if (!hackathonId) {
            return NextResponse.json(
                {
                    error: "hackathonId required!"
                },
                {
                    status: 400
                }
            )
        }

        const teams = await prisma.team.findMany({
            where: { hackathonId },
            include: {
                // we can include other fields according to our needs
                hackathon: true,
                teamResult: true,
                participant: {
                    include: {
                        memberScore: true
                    }
                }
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