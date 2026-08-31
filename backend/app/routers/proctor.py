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

manager = ConnectionManager()

@router.websocket("/stream")
async def proctoring_stream(websocket: WebSocket, db: Session = Depends(get_db)):
    """
    Real-Time Client Proctoring Telemetry Stream
    Payload format:
    {
      "session_id": "UUID",
      "timestamp": 1724800000,
      "metrics": {
        "face_present": true,
        "face_count": 1,
        "gaze_on_screen": true,
        "tab_switches_delta": 0
      },
      "current_suspicion_delta": 0.0,
      "event_type": "OFF_SCREEN_GAZE" (optional)
    }
    """
    session_id = websocket.query_params.get("session_id", "default-session")
    await manager.connect(websocket, session_id)

    try:
        while True:
            data_str = await websocket.receive_text()
            data = json.loads(data_str)

            session_id = data.get("session_id", session_id)
            metrics = data.get("metrics", {})
            suspicion_delta = float(data.get("current_suspicion_delta", 0.0))
            event_type_str = data.get("event_type")

            # Record event in DB if suspicion increment > 0 or event_type specified
            if suspicion_delta > 0 or event_type_str:
                event_enum = ProctorEventType.OFF_SCREEN_GAZE
                if event_type_str and event_type_str in ProctorEventType.__members__:
                    event_enum = ProctorEventType[event_type_str]
                elif not metrics.get("face_present"):
                    event_enum = ProctorEventType.FACE_ABSENT
                elif metrics.get("face_count", 1) > 1:
                    event_enum = ProctorEventType.MULTIPLE_FACES
                elif not metrics.get("gaze_on_screen"):
                    event_enum = ProctorEventType.OFF_SCREEN_GAZE
                elif metrics.get("tab_switches_delta", 0) > 0:
                    event_enum = ProctorEventType.TAB_SWITCH

                event_record = ProctorEvent(
                    session_id=session_id,
                    event_type=event_enum,
                    suspicion_increment=suspicion_delta,
                )
                db.add(event_record)

                # Update cumulative session suspicion score
                session_obj = db.query(ExamSession).filter(ExamSession.id == session_id).first()
                if session_obj:
                    session_obj.suspicion_score = min(100.0, (session_obj.suspicion_score or 0.0) + suspicion_delta)
                    if session_obj.suspicion_score >= 100.0:
                        session_obj.status = SessionStatus.DISQUALIFIED

                db.commit()

            # Broadcast updated telemetry to connected session monitors
            await manager.broadcast_to_session(session_id, {
                "status": "ack",
                "session_id": session_id,
                "metrics": metrics,
                "processed_delta": suspicion_delta
            })

    except WebSocketDisconnect:
        manager.disconnect(websocket, session_id)
    except Exception as e:
        manager.disconnect(websocket, session_id)
