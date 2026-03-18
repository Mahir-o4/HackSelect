import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendBulkEmails } from "@/lib/mail";

export const POST = async (req: NextRequest) => {
    try {
        const { hackathonId } = await req.json();

        if (!hackathonId) {
            return NextResponse.json({ error: "hackathonId is required" }, { status: 400 });
        }

        const participants = await prisma.participant.findMany({
            where: {
                team: { hackathonId }
            },
            select: {
                name: true,
                email: true,
            }
        });

        const validParticipants = participants
            .filter((p): p is { name: string; email: string } => p.email !== null);

        if (!validParticipants.length) {
            return NextResponse.json({ error: "No participants found" }, { status: 404 });
        }

        await sendBulkEmails(validParticipants);

        return NextResponse.json({ success: true, sent: participants.length });

    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
};