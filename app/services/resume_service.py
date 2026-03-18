import re
import io
import time
import requests
import pdfplumber

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from pydantic import BaseModel, Field
from typing import Optional

from app.config.settings import GEMINI_API_KEY


# ----------------------------------------------------------------
# Model fallback chain — ordered by priority
# Primary has the most RPD, fallbacks are used sparingly
# Once a model is rate limited it is skipped for the rest of the run
# ----------------------------------------------------------------

MODEL_CHAIN = [
    "gemini-3.1-flash-lite-preview",    # Primary   — 15 RPM, 500 RPD
    "gemini-2.5-flash-lite",            # Fallback 1 — 10 RPM,  20 RPD
    "gemini-2.5-flash",                 # Fallback 2 —  5 RPM,  20 RPD
]


# ----------------------------------------------------------------
# Pydantic schema for structured extraction
# All fields optional — resumes won't always have everything
# ----------------------------------------------------------------

class ResumeExtraction(BaseModel):
    skills: list[str] = Field(
        default_factory=list,
        description="List of technical and non-technical skills"
    )
    years_of_experience: Optional[float] = Field(
        default=None,
        description="Total years of professional or internship experience. Estimate if not explicit."
    )
    num_projects: Optional[int] = Field(
        default=None,
        description="Number of distinct projects mentioned"
    )
    has_hackathon_experience: bool = Field(
        default=False,
        description="True if the resume mentions any hackathon participation or wins"
    )
    has_open_source_contributions: bool = Field(
        default=False,
        description="True if the resume mentions open source contributions"
    )
    education_level: Optional[str] = Field(
        default=None,
        description="Highest education level: 'high_school', 'undergraduate', 'postgraduate', or 'phd'"
    )
    has_certifications: bool = Field(
        default=False,
        description="True if any certifications are mentioned"
    )
    leadership_or_management: bool = Field(
        default=False,
        description="True if the person has held any leadership or management roles"
    )


# ----------------------------------------------------------------
# Resume Service
# ----------------------------------------------------------------

class ResumeService:

    MAX_SKILLS     = 20
    MAX_EXPERIENCE = 10
    MAX_PROJECTS   = 10

    EDUCATION_SCORE = {
        "high_school":   0.25,
        "undergraduate": 0.60,
        "postgraduate":  0.85,
        "phd":           1.00,
    }

    def __init__(self):
        self.parser = JsonOutputParser(pydantic_object=ResumeExtraction)

        self.prompt = ChatPromptTemplate.from_messages([
            (
                "system",
                """You are an expert resume parser for a hackathon screening system.
Extract structured information from the resume text provided.
Be generous in your interpretation — if something is implied, include it.
If a field cannot be determined from the resume, use the default value.
Return ONLY valid JSON matching the schema. No explanation, no markdown, no extra text.

{format_instructions}"""
            ),
            (
                "human",
                "Here is the resume text:\n\n{resume_text}"
            )
        ])

        # current_model_index is shared across all calls in this service instance
        # When a model gets rate limited it increments and stays incremented (sticky)
        self._model_index = 0
        self._build_chain()

    def _build_chain(self):
        """Build the LangChain chain for the current model."""
        model = MODEL_CHAIN[self._model_index]
        self._llm = ChatGoogleGenerativeAI(
            google_api_key=GEMINI_API_KEY,
            model=model,
            temperature=0,
        )
        self._chain = self.prompt | self._llm | self.parser
        print(f"[ResumeService] Using model: {model}")

    def _fallback(self):
        """
        Advance to the next model in the chain.
        Returns True if a fallback is available, False if all models exhausted.
        """
        if self._model_index < len(MODEL_CHAIN) - 1:
            self._model_index += 1
            self._build_chain()
            return True
        return False

    # ---------------------------
    # Public API
    # ---------------------------

    def process_resume(self, resume_url: str) -> dict | None:
        """
        Full pipeline for a single resume:
            1. Fetch PDF from Google Drive
            2. Extract raw text
            3. Parse via Gemini (with sticky model fallback)
            4. Compute r_i score
        Returns:
            {
                "raw_text":     str,
                "parsed_json":  dict,
                "resume_score": float
            }
        or None if any step fails.
        """

        raw_text = self._fetch_and_extract(resume_url)
        if not raw_text:
            return None

        parsed = self._parse_resume(raw_text)
        if not parsed:
            return None

        score = self._compute_ri(parsed)

        return {
            "raw_text":     raw_text,
            "parsed_json":  parsed,
            "resume_score": score,
        }

    # ---------------------------
    # Internal helpers
    # ---------------------------

    def _extract_drive_id(self, url: str) -> str | None:
        match = re.search(r"/file/d/([a-zA-Z0-9_-]+)", url)
        return match.group(1) if match else None

    def _fetch_and_extract(self, resume_url: str) -> str | None:
        """Fetch PDF from Google Drive and extract raw text using pdfplumber."""

        file_id = self._extract_drive_id(resume_url)
        if not file_id:
            print(f"[ResumeService] Could not extract file ID from URL: {resume_url}")
            return None

        download_url = f"https://drive.google.com/uc?export=download&id={file_id}"

        try:
            response = requests.get(download_url, timeout=15)
            response.raise_for_status()
        except requests.RequestException as e:
            print(f"[ResumeService] Failed to fetch PDF: {e}")
            return None

        try:
            with pdfplumber.open(io.BytesIO(response.content)) as pdf:
                pages = [page.extract_text() or "" for page in pdf.pages]
                raw_text = "\n".join(pages).strip()
        except Exception as e:
            print(f"[ResumeService] Failed to extract text from PDF: {e}")
            return None

        if not raw_text:
            print(f"[ResumeService] PDF appears to be empty or image-based: {resume_url}")
            return None

        return raw_text

    def _parse_resume(self, raw_text: str) -> dict | None:
        """
        Send resume text to Gemini and get structured JSON back.
        On rate limit — switch to next model in chain (sticky).
        On last model rate limited — wait the suggested time and retry once.
        """

        while True:
            try:
                result = self._chain.invoke({
                    "resume_text":         raw_text,
                    "format_instructions": self.parser.get_format_instructions(),
                })
                return result

            except Exception as e:
                error_str = str(e)

                if "RESOURCE_EXHAUSTED" in error_str or "429" in error_str:
                    current_model = MODEL_CHAIN[self._model_index]

                    if self._fallback():
                        # Switched to next model — retry immediately
                        print(
                            f"[ResumeService] {current_model} rate limited. "
                            f"Switching to {MODEL_CHAIN[self._model_index]}..."
                        )
                        continue

                    else:
                        # All models exhausted — wait suggested time and retry once
                        match = re.search(r"retry in ([\d.]+)s", error_str)
                        wait  = float(match.group(1)) + 2 if match else 30
                        print(
                            f"[ResumeService] All models rate limited. "
                            f"Waiting {wait:.0f}s before final retry..."
                        )
                        time.sleep(wait)

                        # Reset to primary for next resume after this wait
                        self._model_index = 0
                        self._build_chain()

                        try:
                            return self._chain.invoke({
                                "resume_text":         raw_text,
                                "format_instructions": self.parser.get_format_instructions(),
                            })
                        except Exception as final_e:
                            print(f"[ResumeService] Final retry failed: {final_e}")
                            return None

                else:
                    # Non-rate-limit error — don't retry
                    print(f"[ResumeService] LLM parsing failed: {e}")
                    return None

    def _compute_ri(self, parsed: dict) -> float:
        """
        Compute normalised Resume Score (Ri) from extracted fields.

        Component weights (sum to 1.0):
            skills diversity    0.25
            projects            0.25
            experience          0.20
            hackathon           0.15
            open source         0.10
            education           0.05
        """

        skills_count     = len(parsed.get("skills", []))
        skills_score     = min(skills_count / self.MAX_SKILLS, 1.0)

        num_projects     = parsed.get("num_projects") or 0
        projects_score   = min(num_projects / self.MAX_PROJECTS, 1.0)

        years_exp        = parsed.get("years_of_experience") or 0
        experience_score = min(years_exp / self.MAX_EXPERIENCE, 1.0)

        hackathon_score  = 1.0 if parsed.get("has_hackathon_experience")       else 0.0
        oss_score        = 1.0 if parsed.get("has_open_source_contributions")   else 0.0

        edu_level        = parsed.get("education_level") or "high_school"
        edu_score        = self.EDUCATION_SCORE.get(edu_level, 0.25)

        R_i = (
            0.25 * skills_score     +
            0.25 * projects_score   +
            0.20 * experience_score +
            0.15 * hackathon_score  +
            0.10 * oss_score        +
            0.05 * edu_score
        )

        return round(R_i, 6)