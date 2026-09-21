import json
from datetime import datetime, timezone
from typing import Dict, List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.dependencies.auth import get_current_user, require_role
from app.models.user import User, UserRole
from app.models.session import ExamSession, SessionStatus
from app.models.proctor_event import ProctorEvent, ProctorEventType

router = APIRouter(prefix="/api/v1/proctor", tags=["Proctoring Telemetry"])

class ConnectionManager:
    def __init__(self):
        # Maps session_id -> List of WebSockets (student + examiner monitors)
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, session_id: str):
        await websocket.accept()
        if session_id not in self.active_connections:
            self.active_connections[session_id] = []
        self.active_connections[session_id].append(websocket)

    def disconnect(self, websocket: WebSocket, session_id: str):
        if session_id in self.active_connections:
            if websocket in self.active_connections[session_id]:
                self.active_connections[session_id].remove(websocket)
            if not self.active_connections[session_id]:
                del self.active_connections[session_id]

    async def broadcast_to_session(self, session_id: str, message: dict):
        if session_id in self.active_connections:
            for connection in self.active_connections[session_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    pass
        # Also broadcast to examiner monitor connections
        if "examiner-live-monitor" in self.active_connections and session_id != "examiner-live-monitor":
            for connection in self.active_connections["examiner-live-monitor"]:
                try:
                    await connection.send_json(message)
                except Exception:
                    pass

manager = ConnectionManager()

@router.websocket("/stream")
async def proctoring_stream(websocket: WebSocket, db: Session = Depends(get_db)):
    """
    Real-Time Client Proctoring Telemetry Stream.
    Stores raw AI violations as PENDING review events.
    Never auto-penalizes or auto-disqualifies from AI flags alone.
    """
    session_id = websocket.query_params.get("session_id", "default-session")
    await manager.connect(websocket, session_id)

    try:
        while True:
            data_str = await websocket.receive_text()
            data = json.loads(data_str)

            target_session = data.get("session_id", session_id)
            metrics = data.get("metrics", {})
            suspicion_delta = float(data.get("suspicion_increment", data.get("current_suspicion_delta", 0.0)))
            event_type_str = data.get("event_type")
            command = data.get("command")  # e.g., 'WARN' or 'DISQUALIFY' from examiner

            if command:
                # Examiner manual intervention command to student
                await manager.broadcast_to_session(str(target_session), {
                    "type": "EXAMINER_COMMAND",
                    "command": command,
                    "message": data.get("message", "Examiner intervention alert.")
                })
                continue

            # Record event in DB if suspicion increment > 0 or event_type specified
            if suspicion_delta > 0 or event_type_str:
                event_enum = ProctorEventType.OFF_SCREEN_GAZE
                if event_type_str and event_type_str in ProctorEventType.__members__:
                    event_enum = ProctorEventType[event_type_str]
                elif not metrics.get("face_present", True):
                    event_enum = ProctorEventType.FACE_ABSENT
                elif metrics.get("face_count", 1) > 1:
                    event_enum = ProctorEventType.MULTIPLE_FACES
                elif not metrics.get("gaze_on_screen", True):
                    event_enum = ProctorEventType.OFF_SCREEN_GAZE
                elif metrics.get("tab_switches_delta", 0) > 0:
                    event_enum = ProctorEventType.TAB_SWITCH

                db_sess_id = int(target_session) if str(target_session).isdigit() else None
                if db_sess_id:
                    event_record = ProctorEvent(
                        session_id=str(db_sess_id),
                        event_type=event_enum,
                        suspicion_increment=suspicion_delta,
                        snapshot_url=data.get("snapshot_url"),
                        review_status="PENDING",
                        timestamp=datetime.now(timezone.utc)
                    )
                    db.add(event_record)

                    # Update provisional AI suspicion score (visible only to examiner review queue)
                    session_obj = db.query(ExamSession).filter(ExamSession.id == db_sess_id).first()
                    if session_obj:
                        session_obj.ai_suspicion_score = min(100.0, (session_obj.ai_suspicion_score or 0.0) + suspicion_delta)

                    db.commit()

            # Broadcast updated telemetry to connected session monitors
            await manager.broadcast_to_session(str(target_session), {
                "status": "ack",
                "session_id": str(target_session),
                "event_type": event_type_str or "HEARTBEAT_OK",
                "suspicion_increment": suspicion_delta,
                "metrics": metrics,
                "timestamp": data.get("timestamp")
            })

    except WebSocketDisconnect:
        manager.disconnect(websocket, session_id)
    except Exception:
        manager.disconnect(websocket, session_id)


@router.get("/sessions")
def list_monitored_sessions(db: Session = Depends(get_db)):
    """
    Returns all active and recently completed exam sessions for live examiner monitoring.
    """
    sessions = db.query(ExamSession).order_by(ExamSession.id.desc()).limit(50).all()
    output = []
    for s in sessions:
        last_event = db.query(ProctorEvent).filter(ProctorEvent.session_id == str(s.id)).order_by(ProctorEvent.timestamp.desc()).first()
        output.append({
            "sessionId": str(s.id),
            "candidateName": s.student.name if s.student else "Candidate",
            "candidateEmail": s.student.email if s.student else "",
            "examTitle": s.exam.title if s.exam else "Exam",
            "suspicionScore": round(s.confirmed_suspicion_score or 0.0, 1),
            "aiSuspicionScore": round(s.ai_suspicion_score or 0.0, 1),
            "status": s.status.value.upper(),
            "lastEvent": last_event.event_type.value if last_event else "MONITORING_ACTIVE",
            "faceCount": 1,
            "isGazeCenter": True,
            "identityVerified": bool(s.identity_verified),
            "identityConfidence": s.identity_confidence,
            "roomScanCompleted": bool(s.room_scan_completed),
            "roomScanUrl": s.room_scan_url
        })
    return output


@router.get("/sessions/{session_id}/events")
def get_session_proctor_events(session_id: int, db: Session = Depends(get_db)):
    """
    Returns timestamped proctoring violation event logs for an exam session.
    """
    events = db.query(ProctorEvent).filter(ProctorEvent.session_id == str(session_id)).order_by(ProctorEvent.timestamp.desc()).all()
    return [
        {
            "id": e.id,
            "session_id": e.session_id,
            "event_type": e.event_type.value,
            "suspicion_increment": e.suspicion_increment,
            "snapshot_url": e.snapshot_url,
            "review_status": e.review_status,
            "reviewed_by": e.reviewed_by,
            "reviewed_at": e.reviewed_at.isoformat() if e.reviewed_at else None,
            "examiner_notes": e.examiner_notes,
            "timestamp": e.timestamp.isoformat() if e.timestamp else ""
        }
        for e in events
    ]


class EventReviewRequest(BaseModel):
    decision: str  # "CONFIRM" or "DISMISS"
    notes: Optional[str] = None


@router.get("/review-queue")
def get_hybrid_review_queue(
    status_filter: Optional[str] = "PENDING",
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("examiner", "admin"))
):
    """
    Hybrid Review Queue (Examiner & Admin only):
    Retrieves flagged proctoring events awaiting human adjudication.
    Attaches room scan clip for examiner review if the session has flags.
    """
    query = db.query(ProctorEvent).order_by(ProctorEvent.timestamp.desc())
    if status_filter and status_filter.upper() != "ALL":
        query = query.filter(ProctorEvent.review_status == status_filter.upper())

    events = query.limit(100).all()
    output = []
    for e in events:
        session = e.session
        output.append({
            "id": e.id,
            "session_id": e.session_id,
            "candidate_name": session.student.name if session and session.student else "Candidate",
            "candidate_email": session.student.email if session and session.student else "",
            "exam_title": session.exam.title if session and session.exam else "Examination",
            "event_type": e.event_type.value if hasattr(e.event_type, "value") else str(e.event_type),
            "suspicion_increment": e.suspicion_increment,
            "snapshot_url": e.snapshot_url,
            "room_scan_url": session.room_scan_url if session else None,
            "review_status": e.review_status,
            "reviewed_by": e.reviewed_by,
            "reviewed_at": e.reviewed_at.isoformat() if e.reviewed_at else None,
            "examiner_notes": e.examiner_notes,
            "timestamp": e.timestamp.isoformat() if e.timestamp else "",
            "session_ai_suspicion": round(session.ai_suspicion_score or 0.0, 1) if session else 0.0,
            "session_confirmed_suspicion": round(session.confirmed_suspicion_score or 0.0, 1) if session else 0.0,
            "identity_confidence": session.identity_confidence if session else None
        })

    return output


@router.post("/events/{event_id}/review")
def review_proctor_event(
    event_id: str,
    payload: EventReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("examiner", "admin"))
):
    """
    Adjudicate an AI-flagged violation:
    - CONFIRM: Adds suspicion increment to official confirmed suspicion score.
    - DISMISS: Classifies flag as a false positive with zero score penalty.
    """
    event = db.query(ProctorEvent).filter(ProctorEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Proctor event not found.")

    decision = payload.decision.upper()
    if decision not in ["CONFIRM", "DISMISS"]:
        raise HTTPException(status_code=400, detail="Decision must be 'CONFIRM' or 'DISMISS'.")

    prev_status = event.review_status
    event.review_status = "CONFIRMED" if decision == "CONFIRM" else "DISMISSED"
    event.reviewed_by = current_user.id
    event.reviewed_at = datetime.now(timezone.utc)
    event.examiner_notes = payload.notes

    session = event.session
    if session:
        # If transitioning to CONFIRMED for first time, add to confirmed score
        if decision == "CONFIRM" and prev_status != "CONFIRMED":
            session.confirmed_suspicion_score = min(
                100.0, (session.confirmed_suspicion_score or 0.0) + event.suspicion_increment
            )
            session.suspicion_score = session.confirmed_suspicion_score
        # If transitioning from CONFIRMED to DISMISSED, subtract
        elif decision == "DISMISS" and prev_status == "CONFIRMED":
            session.confirmed_suspicion_score = max(
                0.0, (session.confirmed_suspicion_score or 0.0) - event.suspicion_increment
            )
            session.suspicion_score = session.confirmed_suspicion_score

    db.commit()

    return {
        "event_id": event.id,
        "review_status": event.review_status,
        "reviewed_by": current_user.id,
        "reviewed_at": event.reviewed_at.isoformat() if event.reviewed_at else None,
        "examiner_notes": event.examiner_notes,
        "confirmed_suspicion_score": session.confirmed_suspicion_score if session else 0.0,
        "message": f"Incident successfully {event.review_status.lower()}."
    }


