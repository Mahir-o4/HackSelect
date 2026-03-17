# app/services/summary_service.py

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from pydantic import BaseModel, Field
from typing import Optional
import json

from app.config.settings import GEMINI_API_KEY


# ----------------------------------------------------------------
# Pydantic schema for structured output
# ----------------------------------------------------------------

class MemberSummary(BaseModel):
    name:            str
    summary:         str            = Field(description="2-3 sentence professional summary")
    skills:          list[str]      = Field(description="All technical and soft skills")
    projects:        list[str]      = Field(description="Notable projects with brief descriptions")
    education:       Optional[str]  = Field(description="Education background")
    experience:      Optional[str]  = Field(description="Work or internship experience summary")
    qualities:       list[str]      = Field(description="Stand-out personal or professional qualities")
    github_highlights: list[str]    = Field(description="Notable GitHub activity, top repos, languages")
    hackathon_ready: bool           = Field(description="True if this member seems well-suited for a hackathon")

class TeamSummaryOutput(BaseModel):
    team_name:          str
    team_summary:       str         = Field(description="Overall team analysis in 3-4 sentences")
    strengths:          list[str]   = Field(description="Top team-level strengths")
    weaknesses:         list[str]   = Field(description="Gaps or weaknesses in the team")
    selection_verdict:  str         = Field(description="Should this team be selected? Why?")
    members:            list[MemberSummary]


# ----------------------------------------------------------------
# Summary Service
# ----------------------------------------------------------------

class SummaryService:

    def __init__(self):
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-2.0-flash",
            google_api_key=GEMINI_API_KEY,
            temperature=0.3,
        )

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

        self.chain = self.prompt | self.llm | self.parser

    # ---------------------------
    # Public API
    # ---------------------------

    def summarize_team(
        self,
        team_name: str,
        members:   list[dict],   # each dict has name, resume_raw_text, repos
    ) -> dict | None:
        """
        members: [
            {
                "name":            str,
                "resume_raw_text": str | None,
                "repos":           [ { "name", "language", "stars", "is_fork" } ]
            },
            ...
        ]
        Returns the full TeamSummaryOutput as a dict, or None on failure.
        """

        team_data = self._format_team_data(team_name, members)

        try:
            result = self.chain.invoke({
                "team_data":           team_data,
                "format_instructions": self.parser.get_format_instructions(),
            })
            return result
        except Exception as e:
            print(f"[SummaryService] LLM failed for team {team_name}: {e}")
            return None

    # ---------------------------
    # Internal helpers
    # ---------------------------

    def _format_team_data(self, team_name: str, members: list[dict]) -> str:
        """
        Formats all member data into a clean readable string for the LLM.
        Keeps it concise to avoid token bloat.
        """

        lines = [f"TEAM NAME: {team_name}\n"]

        for i, m in enumerate(members, 1):
            lines.append(f"--- Member {i}: {m['name']} ---")

            # Resume text — trim to 3000 chars to save tokens
            resume = m.get("resume_raw_text")
            if resume:
                lines.append(f"RESUME:\n{resume[:3000]}")
            else:
                lines.append("RESUME: Not available")

            # GitHub repos
            repos = m.get("repos", [])
            if repos:
                lines.append("GITHUB REPOS:")
                for r in repos[:10]:   # cap at 10 repos per member
                    fork_tag = " [fork]" if r.get("is_fork") else ""
                    lang     = r.get("language") or "unknown"
                    stars    = r.get("stars") or 0
                    lines.append(f"  - {r['name']}{fork_tag} | {lang} | ★{stars}")
            else:
                lines.append("GITHUB REPOS: None available")

            lines.append("")  # blank line between members

        return "\n".join(lines)