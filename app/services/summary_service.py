import asyncio
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from pydantic import BaseModel, Field
from typing import Optional



from app.config.settings import GEMINI_API_KEY

# ----------------------------------------------------------------
# Pydantic schema for structured output
# ----------------------------------------------------------------


class MemberSummary(BaseModel):
    name:              str
    summary:           str = Field(
        description="2-3 sentence professional summary")
    skills:            list[str] = Field(
        description="All technical and soft skills")
    projects:          list[str] = Field(
        description="Notable projects with brief descriptions")
    education:         Optional[str] = Field(
        description="Education background")
    experience:        Optional[str] = Field(
        description="Work or internship experience summary")
    qualities:         list[str] = Field(
        description="Stand-out personal or professional qualities")
    github_highlights: list[str] = Field(
        description="Notable GitHub activity, top repos, languages")
    hackathon_ready:   bool = Field(
        description="True if this member seems well-suited for a hackathon")


class TeamSummaryOutput(BaseModel):
    team_name:         str
    team_summary:      str = Field(
        description="Overall team analysis in 3-4 sentences")
    strengths:         list[str] = Field(
        description="Top team-level strengths")
    weaknesses:        list[str] = Field(
        description="Gaps or weaknesses in the team")
    selection_verdict: str = Field(
        description="Should this team be selected? Why?")
    members:           list[MemberSummary]


# ----------------------------------------------------------------
# Summary Service
# ----------------------------------------------------------------

class SummaryService:

    def __init__(self):
        self.available_models = [
            "gemini-3.1-flash-lite-preview",
            "gemini-3-flash-preview",
            "gemini-2.5-flash-lite",
            "gemini-2.5-flash",
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
                llm = self._get_llm(model_name)
                chain = self.prompt | llm | self.parser

                print(
                    f"[SummaryService] Using model: {model_name} for {team_name}")

                result = await asyncio.wait_for(
                    asyncio.get_running_loop().run_in_executor(
                        None,
                        chain.invoke,
                        {
                            "team_data":           team_data,
                            "format_instructions": self.parser.get_format_instructions(),
                        }
                    ),
                    timeout=60.0
                )

                return result

            except asyncio.TimeoutError:
                print(
                    f"[SummaryService] Timeout for {team_name} with {model_name}. Switching model...")
                self.current_model_index = (
                    self.current_model_index + 1) % len(self.available_models)
                continue

            except Exception as e:
                error_str = str(e)
                if "RESOURCE_EXHAUSTED" in error_str or "429" in error_str:
                    print(f"[SummaryService] Model {model_name} quota exhausted. Switching model...")
                    if self.current_model_index == 0:
                        print("[SummaryService] TOTAL QUOTA EXHAUSTION. Sleeping 60s...")
                        await asyncio.sleep(60)
                    await asyncio.sleep(1)
                else:
                    print(f"[SummaryService] Error with {model_name}. Switching model...")
                self.current_model_index = (self.current_model_index + 1) % len(self.available_models)
                continue

        print(f"[SummaryService] CRITICAL: All models failed for team {team_name}")
        return None

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
                    lang = r.get("language") or "unknown"
                    stars = r.get("stars") or 0
                    lines.append(
                        f"  - {r['name']}{fork_tag} | {lang} | ★{stars}")
            else:
                lines.append("GITHUB REPOS: None available")

            lines.append("")

        return "\n".join(lines)
