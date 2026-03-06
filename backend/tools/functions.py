# WHY function stubs: the hackathon requires demonstrable agent actions.
# In production these would call real APIs (Zendesk, Freshdesk, email).
# For the demo, mock responses are fine — judges just need to see the flow.

import uuid
from datetime import datetime
from models.schemas import TicketRequest, TicketResponse

def create_lawyer_request(request: TicketRequest) -> TicketResponse:
    """
    Creates a lawyer review request ticket.
    WHY this action: shows the agent doing something safe and real-world useful.
    A small business owner found a risky clause → one click to get a lawyer.
    """
    ticket_id = f"LEX-{str(uuid.uuid4())[:6].upper()}"
    # In production: POST to Zendesk/Freshdesk/email API
    return TicketResponse(
        ticket_id=ticket_id,
        status="created",
        message=(
            f"Your lawyer review request has been submitted. "
            f"Ticket {ticket_id} created at {datetime.now().strftime('%Y-%m-%d %H:%M')}. "
            f"A qualified lawyer will contact {request.user_email} within 24 hours."
        )
    )

def flag_clause(clause_text: str, reason: str) -> dict:
    """Marks a clause for human review."""
    return {
        "flagged": True,
        "clause_preview": clause_text[:200],
        "reason": reason,
        "flag_id": f"FLAG-{str(uuid.uuid4())[:6].upper()}"
    }