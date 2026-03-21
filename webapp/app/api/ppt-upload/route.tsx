import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Papa from "papaparse";

interface CSVRow {
    teamid: string;
    ppturl: string;
}

export const POST = async (req: NextRequest) => {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;
        const hackathonId = formData.get("hackathonId") as string | null;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
        }

        if (!hackathonId) {
            return NextResponse.json({ error: "hackathonId is required." }, { status: 400 });
        }

        const text = await file.text();

        const { data, errors } = Papa.parse<CSVRow>(text, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (header) =>
                header.trim().toLowerCase().replace(/[_\-\s]/g, ""),
        });

        if (errors.length > 0) {
            return NextResponse.json(
                { error: "CSV parsing failed", details: errors },
                { status: 400 }
            );
        }

        let totalUpserted = 0;
        let totalSkipped = 0;

        for (const row of data) {
            const teamId = row["teamid"]?.trim();
            const pptUrl = row["ppturl"]?.trim();

            if (!teamId || !pptUrl) {
                totalSkipped++;
                continue;
            }

            const team = await prisma.team.findFirst({
                where: { teamId, hackathonId },
            });

            if (!team) {
                totalSkipped++;
                continue;
            }

            await prisma.pptSubmission.upsert({
                where: { teamId },
                update: {
                    fileUrl: pptUrl,
                    classifiedAt: null,
                },
                create: {
                    teamId,
                    fileUrl: pptUrl,
                    categories: [],
                },
            });

            totalUpserted++;
        }

        console.log("Parsed rows:", data);
        console.log("hackathonId received:", hackathonId);

        return NextResponse.json(
            { success: true, totalUpserted, totalSkipped },
            { status: 200 }
        );
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
};

export const GET = async (req: NextRequest) => {
    try {
        const hackathonId = req.nextUrl.searchParams.get("hackathonId");

        if (!hackathonId) {
            return NextResponse.json({ error: "hackathonId is required." }, { status: 400 });
        }

        const submissions = await prisma.pptSubmission.findMany({
            where: { team: { hackathonId } },
            include: {
                team: true,
                assignment: {
                    include: { judge: true },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(
            { success: true, data: submissions },
            { status: 200 }
        );
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
};