import psycopg2
import psycopg2.extras
import os
from langchain_core.tools import tool


def _get_connection():
    """Create a direct psycopg2 connection to NeonDB."""
    return psycopg2.connect(os.environ["DATABASE_URL"])


@tool
def execute_sql(query: str) -> str:
    """
    Executes a read-only SQL SELECT query against the hackathon database.
    Use this to fetch any information about teams, participants, summaries,
    scores, GitHub profiles, or repos.
    Always returns results as a readable string.
    """

    # Hard block any write operations
    forbidden = ["insert", "update", "delete", "drop", "alter", "truncate", "create"]
    if any(word in query.lower() for word in forbidden):
        return "ERROR: Write operations are not allowed. Use SELECT only."

    try:
        conn = _get_connection()
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        cursor.execute(query)
        rows = cursor.fetchall()

        cursor.close()
        conn.close()

        if not rows:
            return "No results found for this query."

        # Format rows as readable string for the LLM
        lines = []
        for i, row in enumerate(rows, 1):
            lines.append(f"Row {i}:")
            for key, value in row.items():
                lines.append(f"  {key}: {value}")
            lines.append("")

        return "\n".join(lines)

    except psycopg2.Error as e:
        return f"SQL ERROR: {str(e)}"

    except Exception as e:
        return f"ERROR: {str(e)}"