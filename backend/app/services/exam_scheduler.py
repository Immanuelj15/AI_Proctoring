import logging
from datetime import datetime, timezone
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.database.database import SessionLocal
from app.models.session import ExamSession, SessionStatus

logger = logging.getLogger("exam_scheduler")
scheduler = AsyncIOScheduler()

def auto_submit_expired_sessions():
    """
    Background job checking active exam sessions and marking expired sessions as SUBMITTED / EXPIRED.
    """
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        expired_sessions = db.query(ExamSession).filter(
            ExamSession.status == SessionStatus.ACTIVE,
            ExamSession.expires_at <= now
        ).all()

        for session in expired_sessions:
            session.status = SessionStatus.EXPIRED
            session.submitted_at = now
            logger.info(f"Auto-submitted expired session ID #{session.id} for Student #{session.student_id}")

        if expired_sessions:
            db.commit()
    except Exception as e:
        logger.error(f"Error in auto_submit_expired_sessions: {e}")
        db.rollback()
    finally:
        db.close()

def start_scheduler():
    if not scheduler.running:
        scheduler.add_job(auto_submit_expired_sessions, "interval", seconds=30, id="auto_submit_job", replace_existing=True)
        scheduler.start()

def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown()
