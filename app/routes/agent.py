from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from typing import Annotated
from sse_starlette.sse import EventSourceResponse
from langchain_core.messages import HumanMessage, AIMessage
import json
import uuid

from app.agent.runner import HackathonAgent

router = APIRouter(prefix="/agent", tags=["Agent"])


# ----------------------------------------------------------------
# In-memory session store
# ----------------------------------------------------------------

# {
#   "session-uuid": {
#       "hackathon_id": "hack_abc123",
#       "history":      [HumanMessage, AIMessage, ...]
#   }
# }
sessions: dict[str, dict] = {}


# ----------------------------------------------------------------
# Request model
# ----------------------------------------------------------------

class ChatRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    hackathon_id: Annotated[str, Field(
        min_length=1,
        description="Hackathon to scope this conversation to"
    )]
    session_id: str | None = Field(
        default=None,
        description="Session ID from a previous response. Omit or send null to start a new session."
    )
    message: Annotated[str, Field(
        min_length=1,
        description="User message to send to the agent"
    )]


# ----------------------------------------------------------------
# Routes
# ----------------------------------------------------------------

@router.post("/chat")
async def chat(body: ChatRequest):
    """
    Conversational agent endpoint — streams response tokens via SSE.

    On the first request, omit session_id or send null.
    The server generates one and returns it in the first SSE event:
      { "type": "meta",  "session_id": "..." }  — always first event

    Subsequent events:
      { "type": "token", "data": "..." }         — streamed token
      { "type": "done",  "data": "" }            — stream complete
      { "type": "error", "data": "..." }         — something went wrong

    Reuse the session_id on follow-up requests to maintain history.
    """

    is_new_session = body.session_id is None
    session_id = body.session_id or str(uuid.uuid4())

    if is_new_session:
        print(
            f"\n[Agent] NEW SESSION created: {session_id} for hackathon: {body.hackathon_id}")
        sessions[session_id] = {
            "hackathon_id": body.hackathon_id,
            "history":      [],
        }
    else:
        print(f"\n[Agent] EXISTING SESSION resumed: {session_id}")

        if session_id not in sessions:
            sessions[session_id] = {
                "hackathon_id": body.hackathon_id,
                "history":      [],
            }

        stored_hackathon = sessions[session_id]["hackathon_id"]
        if stored_hackathon != body.hackathon_id:
            raise HTTPException(
                status_code=400,
                detail=f"Session {session_id} belongs to hackathon {stored_hackathon}, not {body.hackathon_id}."
            )

    async def event_generator():

        # Always yield meta first
        yield {
            "data": json.dumps({
                "type":       "meta",
                "session_id": session_id,
            })
        }

        session = sessions[session_id]
        history = session["history"]
        hackathon_id = session["hackathon_id"]

        print(
            f"[Agent] Hackathon: {hackathon_id} | History: {len(history)} messages")
        print(f"[Agent] User: {body.message}")

        history.append(HumanMessage(content=body.message))

        ha = HackathonAgent(hackathon_id)
        full_response = []

        while not ha.models_exhausted:

            agent = ha.build()

            try:
                async for event in agent.astream_events(
                    {"messages": history},
                    version="v2",
                ):
                    kind = event.get("event")

                    # ── SQL query being executed ────────────────────────
                    if kind == "on_tool_start":
                        query = event.get("data", {}).get(
                            "input", {}).get("query", "")
                        if query:
                            print(f"\n[Agent] SQL QUERY:\n{query}\n")

                    # ── SQL result returned ─────────────────────────────
                    elif kind == "on_tool_end":
                        print(f"[Agent] SQL RESULT GENERATED.")

                    # ── LLM token chunk ─────────────────────────────────
                    elif kind == "on_chat_model_stream":
                        chunk = event.get("data", {}).get("chunk")

                        if not chunk or not hasattr(chunk, "content"):
                            continue

                        content = chunk.content

                        if isinstance(content, str):
                            text = content
                        elif isinstance(content, list):
                            text = "".join(
                                item.get("text", "")
                                for item in content
                                if isinstance(item, dict)
                                and item.get("type") == "text"
                            )
                        else:
                            text = ""

                        if not text:
                            continue

                        full_response.append(text)
                        yield {
                            "data": json.dumps({
                                "type": "token",
                                "data": text,
                            })
                        }

                # ── stream completed successfully ───────────────────────
                break

            except Exception as e:
                # Switch model for ANY exception — quota or otherwise
                print(f"[Agent] Error with model {ha.current_model}: \n ERROR: {e}.")
                print(f"[Agent] Switching model...")

                switched = ha.switch_model()
                full_response = []   # reset partial tokens

                if not switched:
                    print("[Agent] CRITICAL: All models exhausted.")
                    history.pop()
                    yield {
                        "data": json.dumps({
                            "type": "error",
                            "data": "All models exhausted. Try again later.",
                        })
                    }
                    return

                # switched successfully — while loop retries with new model
                continue

        # ── save completed response to session history ──────────────
        ai_response = "".join(full_response)

        if ai_response:
            history.append(AIMessage(content=ai_response))
            sessions[session_id]["history"] = history
            print(
                f"[Agent] Session {session_id} — saved. History: {len(history)} messages.")
        else:
            print(
                f"[Agent] Session {session_id} — empty response, history not updated.")

        yield {
            "data": json.dumps({
                "type": "done",
                "data": "",
            })
        }

    return EventSourceResponse(event_generator())


@router.delete("/chat/{session_id}")
async def clear_session(session_id: str):
    """Clears the conversation history for a session."""

    if session_id in sessions:
        msg_count = len(sessions[session_id]["history"])
        del sessions[session_id]
        print(
            f"[Agent] Session {session_id} cleared ({msg_count} messages removed).")
        return {"status": "ok", "message": f"Session {session_id} cleared."}

    print(f"[Agent] Clear requested for unknown session {session_id}.")
    return {"status": "ok", "message": "Session not found — nothing to clear."}


@router.get("/sessions")
async def list_sessions():
    """Returns all active session IDs and their message counts."""

    print(f"[Agent] Active sessions: {len(sessions)}")
    for sid, data in sessions.items():
        print(
            f"  {sid} — hackathon: {data['hackathon_id']} — {len(data['history'])} messages")

    return {
        "sessions": {
            sid: {
                "hackathon_id":  data["hackathon_id"],
                "message_count": len(data["history"]),
            }
            for sid, data in sessions.items()
        }
    }
