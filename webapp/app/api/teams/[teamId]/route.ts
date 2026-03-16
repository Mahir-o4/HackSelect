import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const GET = async (req: NextRequest, { params }: { params: { teamId: string } }) => {
    try {
        const { teamId } = await params

        if (!teamId) {
            return NextResponse.json(
                {
                    error: "teamID is required"
                },
                {
                    status: 400
                }
            )
        }

        const team = await prisma.team.findUnique({
            where: { teamId },
            include: {
                participant: true
            }
        })

        if (!team) {
            return NextResponse.json(
                {
                    error: "No team found with that Team ID"
                },
                {
                    status: 404
                }
            )
        }

        return NextResponse.json(
            {
                success: true,
                data: team
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