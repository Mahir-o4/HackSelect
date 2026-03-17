import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Papa from "papaparse"

interface CSVRow {
    "teamid": string;
    "teamname": string;
    "participants": string;
    "githubusername": string;
    "linkedinurl": string;
    "resume": string;
    "phnumber": string;
    "gmail": string;
}

// do npx prisma db push after pulling this update guyz
export const POST = async (req: NextRequest) => {
    try {
        const formData = await req.formData()
        const file = formData.get("file") as File
        const hackathonId = formData.get("hackathonId") as string | null

        if (!file) {
            return NextResponse.json(
                {
                    error: "No file Uploaded."
                },
                {
                    status: 400
                }
            )
        }

        if (!hackathonId) {
            return NextResponse.json(
                {
                    error: "hackathonId is required"
                },
                {
                    status: 400
                }
            )
        }

        const text = await file.text()

        const { data, errors } = Papa.parse<CSVRow>(text, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (header) =>
                header
                    .trim() // trimming the whitespaces 
                    .replace(/([a-z])([A-Z])/g, "$1 $2") // splitting the camelCase 
                    .toLowerCase() // convert all in lower case
                    .replace(/[_\-\s]/g, ""), // replace _,-,any whitespaces with "" means nothing hahahaahhaahah
        })

        if (errors.length > 0) {
            return NextResponse.json(
                {
                    error: "CSV parsing failed",
                    details: errors
                },
                {
                    status: 400
                }
            )
        }

        // this will group the rows by teamid yee, never knew about this Map() until today haha
        const teamMap = new Map<string, CSVRow[]>();

        for (const row of data) {
            const teamId = row["teamid"]?.trim()
            if (!teamId) continue;

            if (!teamMap.has(teamId)) {
                teamMap.set(teamId, [])
            }
            teamMap.get(teamId)!.push(row);
        }

        let totalTeams = 0
        let totalParticipants = 0

        for (const [teamId, rows] of teamMap) {
            const teamName = rows[0]["teamname"]?.trim();

            await prisma.team.upsert({
                where: { teamId },
                update: { teamName, hackathonId },
                create: { teamId, teamName, hackathonId },
            });

            totalTeams++;

            for (const row of rows) {
                const name = row["participants"]?.trim();
                if (!name) continue;

                const githubUsername = row["githubusername"]?.trim() || null;
                const linkedInURL = row["linkedinurl"]?.trim() || null;
                const resumeURL = row["resume"]?.trim() || null;
                const phNumber = row["phnumber"]?.trim() || null;
                const email = row["gmail"]?.trim() || null;

                const uniqueIdentifier = email || githubUsername;

                if (!uniqueIdentifier) {
                    await prisma.participant.create({
                        data: {
                            teamId,
                            name,
                            githubUsername,
                            linkedInURL,
                            resumeURL,
                            phNumber,
                            email
                        }
                    })
                } else {
                    await prisma.participant.upsert({
                        where: { email: uniqueIdentifier },
                        update: {
                            name,
                            githubUsername,
                            linkedInURL,
                            resumeURL,
                            phNumber,
                            teamId
                        },
                        create: {
                            name,
                            githubUsername,
                            linkedInURL,
                            resumeURL,
                            phNumber,
                            email,
                            teamId
                        }
                    })
                }
                totalParticipants++;
            }
        }

        return NextResponse.json(
            {
                success: true,
                totalTeams,
                totalParticipants
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