import json
from typing import Dict, List
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.database import get_db
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
    Real-Time Client Proctoring Telemetry Stream
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
                # Examiner intervention command to student
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
                    )
                    db.add(event_record)

                    # Update cumulative session suspicion score
                    session_obj = db.query(ExamSession).filter(ExamSession.id == db_sess_id).first()
                    if session_obj:
                        session_obj.suspicion_score = min(100.0, (session_obj.suspicion_score or 0.0) + suspicion_delta)
                        if session_obj.suspicion_score >= 100.0:
                            session_obj.status = SessionStatus.DISQUALIFIED

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
            "suspicionScore": round(s.suspicion_score or 0.0, 1),
            "status": s.status.value.upper(),
            "lastEvent": last_event.event_type.value if last_event else "MONITORING_ACTIVE",
            "faceCount": 1,
            "isGazeCenter": True
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
            "timestamp": e.timestamp.isoformat() if e.timestamp else ""
        }
        for e in events
    ]

