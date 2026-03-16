import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const GET = async (req: NextRequest, { params }: { params: { participantId: number } }) => {
    try {
        const { participantId } = await params
        const id = Number(participantId)

        if (!id) {
            return NextResponse.json(
                {
                    error: "participantId is required"
                },
                {
                    status: 400
                }
            )
        }

        const participant = await prisma.participant.findUnique({
            where: { participantId: id }
        })

        if (!participant) {
            return NextResponse.json(
                {
                    error: "No Participant Available With That ID"
                },
                {
                    status: 404
                }
            )
        }

        return NextResponse.json(
            {
                success: true,
                data: participant
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