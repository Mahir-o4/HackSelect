import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const GET = async (req: NextRequest, { params }: { params: Promise<{ hackathonId: string; teamId: string }> }) => {
    try {
        const { hackathonId, teamId } = await params

        if (!hackathonId || !teamId) {
            return NextResponse.json(
                {
                    error: "hackathonId and teamId required"
                },
                {
                    status: 400
                }
            )
        }

        const team = await prisma.team.findFirst({
            where: {
                teamId,
                hackathonId
            },
            include: {
                participant: {
                    include: {
                        githubProfile: true,
                        resume: true,
                        memberScore: true,
                    }
                },
                teamResult: true,
                teamFeature: true,
                teamSummary: true,
            }
        })

        if (!team) {
            return NextResponse.json(
                {
                    error: "Team not found"
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