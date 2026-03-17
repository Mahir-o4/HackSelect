import re
import io
import requests
import pdfplumber

from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from pydantic import BaseModel, Field
from typing import Optional

from app.config.settings import GROQ_API_KEY


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

    # Caps for normalization in compute_ri
    MAX_SKILLS      = 20
    MAX_EXPERIENCE  = 10    # years
    MAX_PROJECTS    = 10

    EDUCATION_SCORE = {
        "high_school":    0.25,
        "undergraduate":  0.60,
        "postgraduate":   0.85,
        "phd":            1.00,
    }

    def __init__(self):
        self.llm = ChatGroq(
            api_key=GROQ_API_KEY,
            model="qwen-qwq-32b",
            temperature=0,
        )

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

        self.chain = self.prompt | self.llm | self.parser

    # ---------------------------
    # Public API
    # ---------------------------

    def process_resume(self, resume_url: str) -> dict | None:
        """
        Full pipeline for a single resume:
            1. Fetch PDF from Google Drive
            2. Extract raw text
            3. Parse via Qwen
            4. Compute r_i score
        Returns:
            {
                "raw_text":     str,
                "parsed_json":  dict,
                "resume_score": float   <- r_i
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
        """
        Extract FILE_ID from a Google Drive shareable link.
        Handles:
            https://drive.google.com/file/d/FILE_ID/view?usp=sharing
        """
        match = re.search(r"/file/d/([a-zA-Z0-9_-]+)", url)
        return match.group(1) if match else None

    def _fetch_and_extract(self, resume_url: str) -> str | None:
        """
        Fetch PDF from Google Drive and extract raw text using pdfplumber.
        """

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
        Send resume text to Qwen3-32B via Groq and get structured JSON back.
        """

        try:
            result = self.chain.invoke({
                "resume_text":         raw_text,
                "format_instructions": self.parser.get_format_instructions(),
            })
            return result
        except Exception as e:
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

        # --- Skills (capped at MAX_SKILLS) ---
        skills_count  = len(parsed.get("skills", []))
        skills_score  = min(skills_count / self.MAX_SKILLS, 1.0)

        # --- Projects (capped at MAX_PROJECTS) ---
        num_projects   = parsed.get("num_projects") or 0
        projects_score = min(num_projects / self.MAX_PROJECTS, 1.0)

        # --- Experience (capped at MAX_EXPERIENCE years) ---
        years_exp        = parsed.get("years_of_experience") or 0
        experience_score = min(years_exp / self.MAX_EXPERIENCE, 1.0)

        # --- Hackathon (boolean -> float) ---
        hackathon_score = 1.0 if parsed.get("has_hackathon_experience") else 0.0

        # --- Open Source (boolean -> float) ---
        oss_score = 1.0 if parsed.get("has_open_source_contributions") else 0.0

        # --- Education ---
        edu_level = parsed.get("education_level") or "high_school"
        edu_score = self.EDUCATION_SCORE.get(edu_level, 0.25)

        R_i = (
            0.25 * skills_score     +
            0.25 * projects_score   +
            0.20 * experience_score +
            0.15 * hackathon_score  +
            0.10 * oss_score        +
            0.05 * edu_score
        )

        return round(R_i, 6)