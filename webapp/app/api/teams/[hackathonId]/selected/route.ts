import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export const GET = async (req: NextRequest, { params }: { params: Promise<{ hackathonId: string }> }) => {
    try {
        const { hackathonId } = await params

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

        const selectedTeams = await prisma.team.findMany({
            where: {
                hackathonId,
                teamResult: {
                    selected: true
                }
            },
            include: {
                participant: true,
                teamResult: true
            }
        })

        if (selectedTeams.length == 0) {
            return NextResponse.json(
                {
                    error: "No selected teams found, kindly select one"
                },
                {
                    status: 404
                }
            )
        }

        return NextResponse.json(
            {
                success: true,
                data: selectedTeams
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