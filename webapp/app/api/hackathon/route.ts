import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const POST = async (req: NextRequest) => {
    try {
        const { name } = await req.json()

        if (!name) {
            return NextResponse.json(
                {
                    error: "Hackathon name is required"
                },
                {
                    status: 400
                }
            )
        }

        const hackathon = await prisma.hackathon.create({
            data: { name }
        })

        return NextResponse.json(
            {
                success: true,
                hackathonId: hackathon.id,
            },
            {
                status: 201
            }
        )

    } catch (err) {
        console.error(err)
        return NextResponse.json(
            {
                error: "Internal Server Error"
            },
            {
                status: 500
            }
        )
    }
}

export const GET = async (req: NextRequest) => {
    try {
        const hackathon = await prisma.hackathon.findMany({
            include: {
                teams: true
            }
        })

        return NextResponse.json(
            {
                success: true,
                data: hackathon
            },
            {
                status: 200
            }
        )

    }catch(err){
        console.error(err)
        return NextResponse.json(
            {
                error: "Internal Server Error"
            },
            {
                status: 500
            }
        )
    }
}