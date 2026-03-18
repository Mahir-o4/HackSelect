from fastapi import APIRouter
from pydantic import BaseModel, field_validator,model_validator, Field
from typing import Annotated

from app.services.selection_service import run_autoselect, save_selection


router = APIRouter(prefix="/teams", tags=["Selection"])


# ----------------------------------------------------------------
# Request models
# ----------------------------------------------------------------

class AutoSelectRequest(BaseModel):
    max_teams:        Annotated[int,   Field(gt=0,  description="Max Teams to be selected in the Hackathon")] 
    beginner_pct:     Annotated[float, Field(ge=0,  description="Percentage of beginner team",     examples=[0.0, 0.1, 0.2])]
    intermediate_pct: Annotated[float, Field(ge=0,  description="Percentage of intermediate team", examples=[0.0, 0.1, 0.2])]
    advanced_pct:     Annotated[float, Field(ge=0,  description="Percentage of advanced team",     examples=[0.0, 0.1, 0.2])]

    @model_validator(mode="after")
    def percentages_must_sum_to_one(self):
        total = round(self.beginner_pct + self.intermediate_pct + self.advanced_pct, 6)
        if total != 1.0:
            raise ValueError(f"beginner_pct + intermediate_pct + advanced_pct must sum to 1.0, got {total}")
        return self


class SaveSelectionRequest(BaseModel):
    selected_team_ids: list[str]


# ----------------------------------------------------------------
# Routes
# ----------------------------------------------------------------

@router.post("/{hackathon_id}/autoselect")
async def autoselect_teams(hackathon_id: str, body: AutoSelectRequest):
    """
    Auto-selects teams based on level quotas and teamScore ranking.
    Shortfalls in one level are redistributed to adjacent levels.
    Persists selected state to DB and returns the selected team list.
    """

    result = await run_autoselect(
        hackathon_id=hackathon_id,
        max_teams=body.max_teams,
        beginner_pct=body.beginner_pct,
        intermediate_pct=body.intermediate_pct,
        advanced_pct=body.advanced_pct,
    )

    return {
        "status":         "ok",
        "message":        result["message"],
        "total_selected": result["total_selected"],
        "breakdown":      result["breakdown"],
        "selected":       result["selected"],
    }


@router.put("/{hackathon_id}/selection")
async def save_final_selection(hackathon_id: str, body: SaveSelectionRequest):
    """
    Saves the final manually reviewed selection.
    Sets selected = True for all teams in selected_team_ids,
    selected = False for all others in the hackathon.
    """

    result = await save_selection(
        hackathon_id=hackathon_id,
        selected_team_ids=body.selected_team_ids,
    )

    return {
        "status":           "ok",
        "message":          result["message"],
        "total_selected":   result["total_selected"],
        "total_unselected": result["total_unselected"],
    }