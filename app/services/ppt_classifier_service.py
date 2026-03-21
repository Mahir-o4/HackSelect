import io
import re
import requests
import pdfplumber

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from pydantic import BaseModel, Field
from typing import Literal

from app.config.settings import GEMINI_API_KEY


# ----------------------------------------------------------------
# Fixed domain categories
# ----------------------------------------------------------------

CATEGORIES = [
    "AI/ML",
    "Web Development",
    "IoT & Embedded Systems",
    "Data Science",
    "Cybersecurity",
    "Blockchain",
    "Mobile Development",
    "Cloud & DevOps",
    "Robotics",
    "Game Development",
    "Healthcare Tech",
    "EdTech",
    "FinTech",
    "Sustainability & CleanTech",
    "Social Impact",
    "AR/VR",
]

CategoryLiteral = Literal[
    "AI/ML",
    "Web Development",
    "IoT & Embedded Systems",
    "Data Science",
    "Cybersecurity",
    "Blockchain",
    "Mobile Development",
    "Cloud & DevOps",
    "Robotics",
    "Game Development",
    "Healthcare Tech",
    "EdTech",
    "FinTech",
    "Sustainability & CleanTech",
    "Social Impact",
    "AR/VR",
]


# ----------------------------------------------------------------
# Pydantic output schema
# ----------------------------------------------------------------

class PPTClassificationOutput(BaseModel):
    categories: list[CategoryLiteral] = Field(
        description=(
            "List of relevant domain categories for this project. "
            "Pick all that genuinely apply from the fixed list. "
            "Do not add categories not in the list."
        )
    )
    reasoning: str = Field(
        description="1-2 sentence explanation of why these categories were chosen"
    )
    confidence: Literal["high", "medium", "low"] = Field(
        description=(
            "high = content is clear and domain is obvious, "
            "medium = some ambiguity, "
            "low = content is vague or insufficient"
        )
    )
    total_score: float = Field(
        ge=0, le=100,
        description=(
            "Overall project score out of 100 based on: "
            "uniqueness(15) + tech_stack(15) + complexity(15) + "
            "feasibility(10) + impact(15) + presentation(10) + "
            "innovation(10) + market_potential(10). "
            "Think through each dimension internally, apply the weights, "
            "and return only the final sum as a float. "
            "Do not return individual dimension scores."
        )
    )


# ----------------------------------------------------------------
# PPT Classifier Service
# ----------------------------------------------------------------

class PPTClassifierService:

    MODEL_CHAIN = [
        "gemini-3.1-flash-lite-preview",
        "gemini-2.5-flash-lite",        
        "gemini-2.5-flash",
    ]

    def __init__(self):
        self._model_index = 0
        self.parser       = JsonOutputParser(pydantic_object=PPTClassificationOutput)

        self.prompt = ChatPromptTemplate.from_messages([
            (
                "system",
                """You are a technical evaluator and domain classifier for a student hackathon selection committee.
You will be given extracted text from a team's project proposal PDF.

Your job has two parts:

PART 1 — Domain Classification:
Classify the project into one or more relevant domains from the fixed list.
Rules:
- Only use categories from the fixed list — never invent new ones
- Pick ALL categories that genuinely apply
- If content is too vague, return ["Other"] and set confidence to "low"

Fixed categories: {categories}

PART 2 — Project Scoring:
Internally evaluate the project across 8 dimensions, each out of 10:
  uniqueness       — how original and novel is the idea
  tech_stack       — how advanced and appropriate the tech stack is
  complexity       — how technically challenging the project is
  feasibility      — how realistic it is to build in a hackathon
  impact           — how significant the real-world impact is
  presentation     — how clear and structured the proposal is
  innovation       — how creatively the problem is approached
  market_potential — how viable this is as a real product

Then compute total_score out of 100 using these weights:
  uniqueness(15) + tech_stack(15) + complexity(15) + feasibility(10)
  + impact(15) + presentation(10) + innovation(10) + market_potential(10)

Scoring guidelines:
- Think through each dimension carefully before scoring
- Reserve 9-10 for truly exceptional work — 5 means average student quality
- Base scores only on what is written — do not assume missing details
- If a dimension cannot be assessed, score it 4
- Return ONLY the final total_score as a float — do not return individual scores

Return ONLY valid JSON matching the schema. No explanation, no markdown, no extra text.

{format_instructions}"""
            ),
            (
                "human",
                "Here is the project proposal text:\n\n{ppt_text}"
            )
        ])

    # ---------------------------
    # Public API
    # ---------------------------

    def classify(self, ppt_url: str) -> dict | None:
        """
        Full pipeline for a single PPT:
          1. Download PDF from Google Drive
          2. Extract raw text
          3. Classify into categories + score via Gemini
        Returns:
          {
            "categories":  list[str],
            "total_score": float,
          }
        or None if any step fails.
        """

        raw_text = self._fetch_and_extract(ppt_url)
        if not raw_text:
            return None

        result = self._classify_text(raw_text)
        if not result:
            return None

        return {
            "categories":  result["categories"],
            "total_score": result["total_score"],
        }

    # ---------------------------
    # Internal helpers
    # ---------------------------

    def _extract_drive_id(self, url: str) -> str | None:
        match = re.search(r"/file/d/([a-zA-Z0-9_-]+)", url)
        return match.group(1) if match else None

    def _fetch_and_extract(self, ppt_url: str) -> str | None:
        """Download PDF from Google Drive and extract raw text using pdfplumber."""

        file_id = self._extract_drive_id(ppt_url)
        if not file_id:
            print(f"[PPTClassifier] Could not extract file ID from URL: {ppt_url}")
            return None

        download_url = f"https://drive.google.com/uc?export=download&id={file_id}"

        try:
            response = requests.get(download_url, timeout=15)
            response.raise_for_status()
        except requests.RequestException as e:
            print(f"[PPTClassifier] Failed to fetch PDF: {e}")
            return None

        try:
            with pdfplumber.open(io.BytesIO(response.content)) as pdf:
                pages    = [page.extract_text() or "" for page in pdf.pages]
                raw_text = "\n".join(pages).strip()
        except Exception as e:
            print(f"[PPTClassifier] Failed to extract text from PDF: {e}")
            return None

        if not raw_text:
            print(f"[PPTClassifier] PDF appears empty or image-based: {ppt_url}")
            return None

        print(f"[PPTClassifier] Extracted {len(raw_text)} characters from PDF.")
        return raw_text

    def _build_chain(self):
        model = self.MODEL_CHAIN[self._model_index]
        print(f"[PPTClassifier] Using model: {model}")
        llm   = ChatGoogleGenerativeAI(
            model          = model,
            google_api_key = GEMINI_API_KEY,
            temperature    = 0,
        )
        return self.prompt | llm | self.parser

    def _fallback(self) -> bool:
        """Advance to next model. Returns True if available, False if all exhausted."""
        if self._model_index < len(self.MODEL_CHAIN) - 1:
            self._model_index += 1
            return True
        return False

    def _classify_text(self, raw_text: str) -> dict | None:
        """
        Send extracted text to Gemini and get structured classification back.
        Uses sticky model fallback — same pattern as ResumeService.
        Truncates to 5000 chars to stay within token limits.
        """

        truncated = raw_text[:5000]

        while True:
            try:
                chain  = self._build_chain()
                result = chain.invoke({
                    "ppt_text":            truncated,
                    "categories":          ", ".join(CATEGORIES),
                    "format_instructions": self.parser.get_format_instructions(),
                })
                return result

            except Exception as e:
                error_str = str(e)

                if "RESOURCE_EXHAUSTED" in error_str or "429" in error_str:
                    current = self.MODEL_CHAIN[self._model_index]

                    if self._fallback():
                        print(f"[PPTClassifier] {current} rate limited. "
                              f"Switching to {self.MODEL_CHAIN[self._model_index]}...")
                        continue
                    else:
                        print("[PPTClassifier] All models rate limited. Giving up.")
                        return None

                print(f"[PPTClassifier] LLM classification failed: {e}")
                return None