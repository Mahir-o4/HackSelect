import asyncio
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from pydantic import BaseModel, Field
from typing import Literal

from app.config.settings import GEMINI_API_KEY


# ----------------------------------------------------------------
# Pydantic schema for structured LLM output
# ----------------------------------------------------------------

class DimensionComparisonOutput(BaseModel):
    dimension: str
    team_a:    str
    team_b:    str
    edge:      str = Field(
        description="Which team has the advantage — use the actual team name or 'tie'"
    )


class CompareOutput(BaseModel):
    dimensions:      list[DimensionComparisonOutput] = Field(
        description="Per-dimension breakdown comparing both teams"
    )
    overall_summary: str = Field(
        description="Neutral 3-4 sentence holistic analysis of both teams"
    )
    recommendation:  str = Field(
        description="Which team to select and why, without fully discarding the other"
    )
    confidence:      Literal["high", "medium", "low"] = Field(
        description="How confident the analysis is based on available data"
    )


# ----------------------------------------------------------------
# Compare Service
# ----------------------------------------------------------------

class CompareService:

    def __init__(self):
        self.available_models = [
            "gemini-3.1-flash-lite-preview",
            "gemini-3-flash-preview",
            "gemini-2.5-flash-lite",
            "gemini-2.5-flash",
        ]
        self.current_model_index = 0

        self.parser = JsonOutputParser(pydantic_object=CompareOutput)

        self.prompt = ChatPromptTemplate.from_messages([
            (
                "system",
                """You are an expert evaluator for a student hackathon selection committee.
You will be given structured summaries of two teams.
Your job is to compare them across these dimensions:
- Technical Skills
- Experience
- Education
- Projects
- GitHub Activity
- Hackathon Readiness
- Team Strengths
- Team Weaknesses
- Motivation & Qualities

For each dimension, analyse both teams fairly.
For the edge field — use the ACTUAL TEAM NAME of the winning team, or "tie" if equal.

Rules:
- Be analytical, fair, and concise
- The recommendation should suggest one team but acknowledge the other's strengths
- Never completely dismiss either team
- Confidence is "high" if both teams have rich data, "medium" if partial, "low" if data is thin
- Return ONLY valid JSON matching the schema. No explanation, no markdown, no extra text.

{format_instructions}"""
            ),
            (
                "human",
                "Compare these two teams:\n\n{compare_data}"
            )
        ])

    def _get_llm(self, model_name: str):
        return ChatGoogleGenerativeAI(
            model=model_name,
            google_api_key=GEMINI_API_KEY,
            temperature=0.3,
        )

    def _format_compare_data(
        self,
        team_a_name: str,
        team_a_summary: dict,
        team_b_name: str,
        team_b_summary: dict,
    ) -> str:
        """Format both team summaries into a single prompt string."""

        def format_team(name: str, summary: dict) -> str:
            lines = [f"TEAM: {name}"]
            lines.append(f"Overall: {summary.get('team_summary', 'N/A')}")
            lines.append(
                f"Strengths: {', '.join(summary.get('strengths', []))}")
            lines.append(
                f"Weaknesses: {', '.join(summary.get('weaknesses', []))}")
            lines.append(f"Verdict: {summary.get('selection_verdict', 'N/A')}")
            lines.append("")

            for m in summary.get("members", []):
                lines.append(f"  Member: {m.get('name', 'Unknown')}")
                lines.append(f"    Summary:    {m.get('summary', 'N/A')}")
                lines.append(
                    f"    Skills:     {', '.join(m.get('skills', []))}")
                lines.append(
                    f"    Projects:   {', '.join(m.get('projects', []))}")
                lines.append(f"    Education:  {m.get('education', 'N/A')}")
                lines.append(f"    Experience: {m.get('experience', 'N/A')}")
                lines.append(
                    f"    Qualities:  {', '.join(m.get('qualities', []))}")
                lines.append(
                    f"    GitHub:     {', '.join(m.get('github_highlights', []))}")
                lines.append(
                    f"    Hackathon ready: {m.get('hackathon_ready', False)}")
                lines.append("")

            return "\n".join(lines)

        return (
            "=== TEAM A ===\n"
            + format_team(team_a_name, team_a_summary)
            + "\n=== TEAM B ===\n"
            + format_team(team_b_name, team_b_summary)
        )

    # ---------------------------
    # Public API
    # ---------------------------

    async def compare_teams(
        self,
        team_a_name:    str,
        team_a_summary: dict,
        team_b_name:    str,
        team_b_summary: dict,
    ) -> dict | None:
        """
        Compares two teams using LLM with model fallback chain.
        Returns structured comparison dict or None if all models fail.
        """

        compare_data = self._format_compare_data(
            team_a_name, team_a_summary,
            team_b_name, team_b_summary,
        )

        for _ in range(len(self.available_models)):
            model_name = self.available_models[self.current_model_index]

            try:
                llm = self._get_llm(model_name)
                chain = self.prompt | llm | self.parser

                print(f"[CompareService] Using model: {model_name}")

                result = await asyncio.wait_for(
                    asyncio.get_running_loop().run_in_executor(
                        None,
                        chain.invoke,
                        {
                            "compare_data":        compare_data,
                            "format_instructions": self.parser.get_format_instructions(),
                        }
                    ),
                    timeout=60.0
                )

                return result


            except asyncio.TimeoutError:
                print(
                    f"[CompareService] Timeout with {model_name}. Switching model...")
                self.current_model_index = (
                    self.current_model_index + 1) % len(self.available_models)
                continue

            except Exception as e:
                error_str = str(e)
                if "RESOURCE_EXHAUSTED" in error_str or "429" in error_str:
                    print(f"[CompareService] Model {model_name} quota exhausted. Switching model...")
                    if self.current_model_index == 0:
                        print("[CompareService] TOTAL QUOTA EXHAUSTION. Sleeping 60s...")
                        await asyncio.sleep(60)
                    await asyncio.sleep(1)
                else:
                    print(f"[CompareService] Error with {model_name}. Switching model...")
                self.current_model_index = (self.current_model_index + 1) % len(self.available_models)
                continue

        print("[CompareService] CRITICAL: All models failed for comparison")
        return None
