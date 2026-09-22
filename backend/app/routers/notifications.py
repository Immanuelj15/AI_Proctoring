from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.core.config import settings
from app.models.push_subscription import PushSubscription
from app.schemas.notification import (
    PushSubscriptionCreate,
    PushSubscriptionUnsubscribe,
    TestReminderRequest,
    VapidPublicKeyResponse
)
from app.services.push_service import send_web_push, send_notification_to_user

router = APIRouter(prefix="/api/v1/notifications", tags=["Notifications & PWA"])

@router.get("/vapid-public-key", response_model=VapidPublicKeyResponse)
def get_vapid_public_key():
    """
    Returns the VAPID public key for frontend push subscription initialization.
    """
    return {"public_key": settings.VAPID_PUBLIC_KEY}

@router.post("/subscribe", status_code=status.HTTP_201_CREATED)
def subscribe(payload: PushSubscriptionCreate, db: Session = Depends(get_db)):
    """
    Registers a browser Web Push subscription for exam reminders.
    If endpoint already exists, updates keys and last_active_at.
    """
    existing = db.query(PushSubscription).filter(
        PushSubscription.endpoint == payload.endpoint
    ).first()

    if existing:
        existing.p256dh = payload.p256dh
        existing.auth = payload.auth
        existing.user_id = payload.user_id or existing.user_id
        existing.user_agent = payload.user_agent or existing.user_agent
        existing.last_active_at = datetime.utcnow()
        db.commit()
        db.refresh(existing)
        return {"status": "updated", "id": existing.id}

    new_sub = PushSubscription(
        endpoint=payload.endpoint,
        p256dh=payload.p256dh,
        auth=payload.auth,
        user_id=payload.user_id,
        user_agent=payload.user_agent,
        created_at=datetime.utcnow(),
        last_active_at=datetime.utcnow()
    )
    db.add(new_sub)
    db.commit()
    db.refresh(new_sub)
    return {"status": "created", "id": new_sub.id}

@router.post("/unsubscribe")
def unsubscribe(payload: PushSubscriptionUnsubscribe, db: Session = Depends(get_db)):
    """
    Unregisters a Web Push subscription.
    """
    sub = db.query(PushSubscription).filter(
        PushSubscription.endpoint == payload.endpoint
    ).first()

    if sub:
        db.delete(sub)
        db.commit()
        return {"status": "unsubscribed"}

    return {"status": "not_found"}

@router.post("/test-reminder")
def send_test_reminder(req: TestReminderRequest, db: Session = Depends(get_db)):
    """
    Dispatches an instant exam reminder notification to test end-to-end push delivery.
    """
    payload = {
        "title": req.title or "Exam Starting Soon ⏱️",
        "body": req.body or "Your Database Management Systems exam starts in 15 minutes. Tap to enter the verification room.",
        "url": req.url or f"/exam/{req.exam_id or 1}",
        "tag": "exam-reminder"
    }

    if req.endpoint:
        sub = db.query(PushSubscription).filter(
            PushSubscription.endpoint == req.endpoint
        ).first()
        if not sub:
            # Ephemeral subscription instance for direct test
            raise HTTPException(status_code=404, detail="Subscription endpoint not registered.")
        sent = send_web_push(sub, payload, db)
        return {"status": "sent" if sent else "failed", "endpoint": sub.endpoint[:30]}

    if req.user_id:
        count = send_notification_to_user(req.user_id, payload, db)
        return {"status": "dispatched", "delivered_count": count}

    # If no target specified, dispatch to the most recent subscription
    latest_sub = db.query(PushSubscription).order_by(PushSubscription.last_active_at.desc()).first()
    if latest_sub:
        sent = send_web_push(latest_sub, payload, db)
        return {"status": "sent" if sent else "failed", "recipient_id": latest_sub.id}

    return {"status": "no_subscriptions_found"}
