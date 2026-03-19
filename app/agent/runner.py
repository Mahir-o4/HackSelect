from langgraph.prebuilt import create_react_agent
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage

from app.agent.schema import DB_SCHEMA
from app.agent.tools import execute_sql
from app.config.settings import GEMINI_API_KEY


# ----------------------------------------------------------------
# System prompt base
# ----------------------------------------------------------------

BASE_PROMPT = """You are a helpful AI assistant for a hackathon management platform.
You have access to a PostgreSQL database scoped to a specific hackathon.

When a user asks a question:
1. Think about which tables you need
2. Write a correct SQL SELECT query using the schema below
3. ALWAYS filter by the scoped hackathon ID provided below — never return data from other hackathons
4. Call execute_sql with the query
5. Interpret the results and respond in clear, friendly, human-readable language
6. If results are empty, tell the user clearly and suggest why

Guidelines:
- Always be conversational, warm, and detailed in your responses
- Never expose raw SQL, row data, or internal IDs to the user — always summarise naturally
- When showing scores, always explain what they mean:
    gI = GitHub score (0-1) — measures activity, repos, languages
    rI = Resume score (0-1) — measures skills, projects, experience
    cI = Composite score (0-1) — weighted combination of gI and rI
- When referencing teams or participants, always use their names not their IDs
- If the user asks something outside the scope of this hackathon, politely redirect them
- If data is missing for a participant (no GitHub, no resume), mention it naturally

{schema}

-- ---------------------------------------------------------------
-- SCOPE
-- ---------------------------------------------------------------
-- This conversation is strictly scoped to hackathon ID: '{hackathon_id}'
-- EVERY query that touches team, participant, or any related table
-- MUST include one of these filters:
--   WHERE t."hackathonId" = '{hackathon_id}'
--   WHERE h.id = '{hackathon_id}'
-- Never query or return data from any other hackathon.
-- ---------------------------------------------------------------
"""

# ----------------------------------------------------------------
# Agent class
# ----------------------------------------------------------------


class HackathonAgent:

    all_models = [
        "gemini-3.1-flash-lite-preview",
        "gemini-3-flash-preview",
        "gemini-2.5-flash-lite",
        "gemini-2.5-flash",
    ]

    def __init__(self, hackathon_id: str):
        self.hackathon_id = hackathon_id
        self.current_model_index = 0
        self.prompt = BASE_PROMPT.format(
            schema=DB_SCHEMA,
            hackathon_id=hackathon_id
        )

    @property
    def current_model(self) -> str:
        return self.all_models[self.current_model_index]
    

    @property
    def models_exhausted(self) -> bool:
        return self.current_model_index >= len(self.all_models)
    
    def switch_model(self) -> bool:
        """
        Advances to the next model in the fallback chain.
        Returns True if a next model is available, False if all exhausted.
        """
        self.current_model_index += 1
        if self.models_exhausted:
            print("[HackathonAgent] CRITICAL: All models exhausted.")
            return False
        print(f"[HackathonAgent] → Switched to model: {self.current_model}")
        return True

    def build(self):
        """Builds and returns a LangGraph ReAct agent with the current model."""

        print(f"[HackathonAgent] Building agent with model: {self.current_model}")

        llm = ChatGoogleGenerativeAI(
            model          = self.current_model,
            google_api_key = GEMINI_API_KEY,
            temperature    = 0.3,
        )

        return create_react_agent(
            model  = llm,
            tools  = [execute_sql],
            prompt = SystemMessage(content=self.prompt),
        )

