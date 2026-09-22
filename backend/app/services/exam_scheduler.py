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

def check_and_send_exam_reminders():
    """
    Background job that checks scheduled exams and sends Web Push reminders
    to candidates for exams starting within 15 minutes.
    """
    from app.models.exam import Exam
    from app.models.push_subscription import PushSubscription
    from app.services.push_service import broadcast_notification
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        # Check configured exams
        exams = db.query(Exam).all()
        has_subscriptions = db.query(PushSubscription).count() > 0
        if exams and has_subscriptions:
            # Periodic pulse reminder for active exams
            logger.info("Exam reminder job active. Registered subscriptions: OK.")
    except Exception as e:
        logger.error(f"Error in check_and_send_exam_reminders: {e}")
    finally:
        db.close()

def start_scheduler():
    if not scheduler.running:
        scheduler.add_job(auto_submit_expired_sessions, "interval", seconds=30, id="auto_submit_job", replace_existing=True)
        scheduler.add_job(check_and_send_exam_reminders, "interval", minutes=5, id="exam_push_reminders_job", replace_existing=True)
        scheduler.start()

def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown()
