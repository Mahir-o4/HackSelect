import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const POST = async (
    req: NextRequest,
    { params }: { params: Promise<{ hackathonId: string }> }
) => {
    try {
        const { hackathonId } = await params;

        const hackathon = await prisma.hackathon.findUnique({
            where: { id: hackathonId },
        });

        if (!hackathon) {
            return NextResponse.json({ error: "Hackathon not found." }, { status: 404 });
        }

        if (hackathon.saved) {
            return NextResponse.json(
                { error: "This hackathon is already finalised." },
                { status: 400 }
            );
        }

        await prisma.hackathon.update({
            where: { id: hackathonId },
            data: { saved: true },
        });

        return NextResponse.json(
            { success: true, message: "Hackathon finalised successfully." },
            { status: 200 }
        );
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
};