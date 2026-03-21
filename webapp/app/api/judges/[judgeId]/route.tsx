import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const GET = async (
    req: NextRequest,
    { params }: { params: Promise<{ judgeId: string }> }
) => {
    try {
        const { judgeId } = await params;

        const judge = await prisma.judge.findUnique({
            where: { id: judgeId },
            include: {
                assignments: {
                    include: {
                        ppt: {
                            include: {
                                team: {
                                    include: {
                                        participant: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!judge) {
            return NextResponse.json(
                { error: "Judge not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { success: true, data: judge },
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

export const DELETE = async (
    req: NextRequest,
    { params }: { params: Promise<{ judgeId: string }> }
) => {
    try {
        const { judgeId } = await params;

        await prisma.judge.delete({
            where: { id: judgeId },
        });

        return NextResponse.json(
            { success: true, message: "Judge deleted" },
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