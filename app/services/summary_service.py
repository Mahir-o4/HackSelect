import asyncio
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from pydantic import BaseModel, Field
from typing import Optional
from google.api_core import exceptions
import json

from app.config.settings import GEMINI_API_KEY

# ----------------------------------------------------------------
# Pydantic schema for structured output
# ----------------------------------------------------------------

class MemberSummary(BaseModel):
    name:              str
    summary:           str          = Field(description="2-3 sentence professional summary")
    skills:            list[str]    = Field(description="All technical and soft skills")
    projects:          list[str]    = Field(description="Notable projects with brief descriptions")
    education:         Optional[str] = Field(description="Education background")
    experience:        Optional[str] = Field(description="Work or internship experience summary")
    qualities:         list[str]    = Field(description="Stand-out personal or professional qualities")
    github_highlights: list[str]    = Field(description="Notable GitHub activity, top repos, languages")
    hackathon_ready:   bool         = Field(description="True if this member seems well-suited for a hackathon")


class TeamSummaryOutput(BaseModel):
    team_name:         str
    team_summary:      str       = Field(description="Overall team analysis in 3-4 sentences")
    strengths:         list[str] = Field(description="Top team-level strengths")
    weaknesses:        list[str] = Field(description="Gaps or weaknesses in the team")
    selection_verdict: str       = Field(description="Should this team be selected? Why?")
    members:           list[MemberSummary]


# ----------------------------------------------------------------
# Summary Service
# ----------------------------------------------------------------

class SummaryService:

    def __init__(self):
        self.available_models = [
            "gemini-2.0-flash-lite",
            "gemini-2.0-flash",
            "gemini-1.5-flash",
            "gemini-1.5-pro"
        ]
        self.current_model_index = 0

        self.parser = JsonOutputParser(pydantic_object=TeamSummaryOutput)

        self.prompt = ChatPromptTemplate.from_messages([
            (
                "system",
                """You are an expert technical evaluator for a student hackathon selection committee.
You will be given data about a team — resume text for each member and their GitHub repository activity.
Your job is to produce a structured JSON summary of the team and each individual member.

Be analytical, concise, and fair. Focus on technical depth, project quality, and hackathon readiness.
Return ONLY valid JSON matching the schema. No explanation, no markdown, no extra text.

{format_instructions}"""
            ),
            (
                "human",
                "Here is the team data:\n\n{team_data}"
            )
        ])

    def _get_llm(self, model_name: str):
        return ChatGoogleGenerativeAI(
            model=model_name,
            google_api_key=GEMINI_API_KEY,
            temperature=0.3,
        )

    # ---------------------------
    # Public API
    # ---------------------------

    async def summarize_team(
        self,
        team_name: str,
        members:   list[dict],
    ) -> dict | None:
        """
        Attempts to summarize using the current model.
        If quota is hit, switches models and retries immediately.
        """
        team_data = self._format_team_data(team_name, members)

        for _ in range(len(self.available_models)):
            model_name = self.available_models[self.current_model_index]

            try:
                llm   = self._get_llm(model_name)
                chain = self.prompt | llm | self.parser

                result = await asyncio.get_running_loop().run_in_executor(
                    None,
                    chain.invoke,
                    {
                        "team_data":           team_data,
                        "format_instructions": self.parser.get_format_instructions(),
                    }
                )

                return result

            except exceptions.ResourceExhausted:
                print(f"[SummaryService] Model {model_name} quota exhausted. Switching...")
                self.current_model_index = (self.current_model_index + 1) % len(self.available_models)

                if self.current_model_index == 0:
                    print("[SummaryService] TOTAL QUOTA EXHAUSTION. Sleeping 60s...")
                    await asyncio.sleep(60)

                await asyncio.sleep(1)
                continue

            except Exception as e:
                print(f"[SummaryService] Unexpected error for {team_name} with {model_name}: {e}")
                self.current_model_index = (self.current_model_index + 1) % len(self.available_models)
                continue

        print(f"[SummaryService] CRITICAL: All models failed for team {team_name}")
        return None

    async def summarize_all_teams(
        self,
        hackathon_id: str,
        db,
    ) -> dict:
        """
        Fetches all teams for a hackathon, runs summarize_team()
        concurrently with a semaphore limit, saves results to DB one at a time.
        Returns { generated, skipped, failed, teams }
        """

        teams       = await db.team.find_many(
            where={"hackathonId": hackathon_id},
            include={
                "participant": True,
                "teamSummary": True,
            }
        )
        resume_rows = await db.resume.find_many()
        repo_rows   = await db.githubrepo.find_many()

        if not teams:
            return {"generated": 0, "skipped": 0, "failed": 0, "teams": []}

        # Build lookup maps once, reused across all teams
        resume_map = {r.participantId: r.rawText for r in resume_rows if r.rawText}

        repo_map: dict[int, list] = {}
        for r in repo_rows:
            repo_map.setdefault(r.participantId, []).append({
                "name":     r.name,
                "language": r.language,
                "stars":    r.stars  or 0,
                "is_fork":  r.isFork or False,
            })

        generated, skipped, failed = [], [], []

        # Limit to 3 concurrent LLM calls to avoid hammering Gemini API
        semaphore = asyncio.Semaphore(3)

        async def process_team(team):
            async with semaphore:

                if team.teamSummary:
                    skipped.append(team.teamId)
                    return

                members = [
                    {
                        "name":            p.name,
                        "resume_raw_text": resume_map.get(p.participantId),
                        "repos":           repo_map.get(p.participantId, []),
                    }
                    for p in team.participant
                ]

                if not members:
                    skipped.append(team.teamId)
                    return

                print(f"  [summary] Generating for {team.teamName or team.teamId}...")

                result = await self.summarize_team(
                    team_name=team.teamName or team.teamId,
                    members=members,
                )

                if not result:
                    failed.append(team.teamId)
                    return

                await db.teamsummary.upsert(
                    where={"teamId": team.teamId},
                    data={
                        "create": {"teamId": team.teamId, "summaryText": json.dumps(result)},
                        "update": {"summaryText": json.dumps(result)},
                    }
                )

                generated.append(team.teamId)
                print(f"  [summary] Saved — {team.teamName or team.teamId}")

        # Run all teams concurrently, max 3 at a time
        await asyncio.gather(*[process_team(team) for team in teams])

        return {
            "generated": len(generated),
            "skipped":   len(skipped),
            "failed":    len(failed),
            "teams":     generated,
        }

    # ---------------------------
    # Internal helpers
    # ---------------------------

    def _format_team_data(self, team_name: str, members: list[dict]) -> str:
        lines = [f"TEAM NAME: {team_name}\n"]

        for i, m in enumerate(members, 1):
            lines.append(f"--- Member {i}: {m['name']} ---")
            resume = m.get("resume_raw_text")
            if resume:
                lines.append(f"RESUME:\n{resume[:3000]}")
            else:
                lines.append("RESUME: Not available")

            repos = m.get("repos", [])
            if repos:
                lines.append("GITHUB REPOS:")
                for r in repos[:10]:
                    fork_tag = " [fork]" if r.get("is_fork") else ""
                    lang     = r.get("language") or "unknown"
                    stars    = r.get("stars") or 0
                    lines.append(f"  - {r['name']}{fork_tag} | {lang} | ★{stars}")
            else:
                lines.append("GITHUB REPOS: None available")

            lines.append("")

        return "\n".join(lines)