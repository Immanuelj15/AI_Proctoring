import json
import logging
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.push_subscription import PushSubscription

logger = logging.getLogger("ai_proctor.push_service")

def send_web_push(subscription: PushSubscription, payload: Dict[str, Any], db: Session) -> bool:
    """
    Sends a Web Push notification to a single PushSubscription using VAPID.
    Automatically removes invalid/expired subscriptions (HTTP 410 or 404).
    """
    try:
        from pywebpush import webpush, WebPushException
    except ImportError:
        logger.warning("pywebpush is not installed. Push delivery simulated: %s", payload)
        return True

    subscription_info = {
        "endpoint": subscription.endpoint,
        "keys": {
            "p256dh": subscription.p256dh,
            "auth": subscription.auth
        }
    }

    vapid_claims = {
        "sub": settings.VAPID_CLAIMS_SUB
    }

    try:
        webpush(
            subscription_info=subscription_info,
            data=json.dumps(payload),
            vapid_private_key=settings.VAPID_PRIVATE_KEY,
            vapid_claims=vapid_claims
        )
        logger.info("Successfully sent push notification to endpoint %s", subscription.endpoint[:40])
        return True
    except WebPushException as ex:
        logger.warning("WebPushException for endpoint %s: %s", subscription.endpoint[:40], ex)
        # HTTP 410 (Gone) or 404 indicates subscription expired or unregistered
        response = getattr(ex, "response", None)
        if response is not None and response.status_code in (404, 410):
            logger.info("Pruning expired push subscription %s", subscription.id)
            try:
                db.delete(subscription)
                db.commit()
            except Exception as del_err:
                logger.error("Failed to delete expired subscription: %s", del_err)
        return False
    except Exception as exc:
        logger.error("Unexpected error sending web push: %s", exc)
        return False

def send_notification_to_user(user_id: int, payload: Dict[str, Any], db: Session) -> int:
    """
    Dispatches a push notification to all active browser subscriptions for a specific user.
    """
    subscriptions: List[PushSubscription] = db.query(PushSubscription).filter(
        PushSubscription.user_id == user_id
    ).all()

    success_count = 0
    for sub in subscriptions:
        if send_web_push(sub, payload, db):
            success_count += 1
    return success_count

def broadcast_notification(payload: Dict[str, Any], db: Session) -> int:
    """
    Broadcasts a push notification to all stored subscriptions.
    """
    subscriptions: List[PushSubscription] = db.query(PushSubscription).all()
    success_count = 0
    for sub in subscriptions:
        if send_web_push(sub, payload, db):
            success_count += 1
    return success_count
