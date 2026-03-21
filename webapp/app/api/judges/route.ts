import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const POST = async (req: NextRequest) => {
    try {
        const { hackathonId, judges } = await req.json();

        if (!hackathonId) {
            return NextResponse.json(
                { error: "hackathonId is required" },
                { status: 400 }
            );
        }

        if (!judges || !Array.isArray(judges) || judges.length === 0) {
            return NextResponse.json(
                { error: "At least one judge is required" },
                { status: 400 }
            );
        }

        const created = await prisma.judge.createMany({
            data: judges.map((j: { name: string; email: string; specialisations: string[] }) => ({
                name: j.name,
                email: j.email,
                specialisations: j.specialisations,
                hackathonId,
            })),
        });

        return NextResponse.json(
            { success: true, count: created.count },
            { status: 201 }
        );
    } catch (err) {
        console.error(err);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
};

export const GET = async (req: NextRequest) => {
    try {
        const hackathonId = req.nextUrl.searchParams.get("hackathonId");

        if (!hackathonId) {
            return NextResponse.json(
                { error: "hackathonId is required" },
                { status: 400 }
            );
        }

        const judges = await prisma.judge.findMany({
            where: { hackathonId },
            include: {
                assignments: {
                    include: {
                        ppt: {
                            include: {
                                team: true,
                            },
                        },
                    },
                },
            },
            orderBy: { createdAt: "asc" },
        });

        return NextResponse.json(
            { success: true, data: judges },
            { status: 200 }
        );
    } catch (err) {
        console.error(err);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
};