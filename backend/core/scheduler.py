from apscheduler.schedulers.background import BackgroundScheduler
from django.core.management import call_command
import logging

logger = logging.getLogger(__name__)

scheduler = None

def purge_trash_job():
    """Job to purge trash items older than 30 days"""
    try:
        logger.info("🗑️  Running scheduled trash purge...")
        call_command('purge_trash')
        logger.info("✅ Scheduled trash purge completed")
    except Exception as e:
        logger.error(f"❌ Error during scheduled trash purge: {e}")

def send_notifications_job():
    """Job to send notifications for due/overdue tasks and upcoming events"""
    try:
        logger.info("📧 Running scheduled notifications check...")
        call_command('send_notifications')
        logger.info("✅ Scheduled notifications check completed")
    except Exception as e:
        logger.error(f"❌ Error during scheduled notifications check: {e}")

def start_scheduler():
    """Start the background scheduler for automated tasks"""
    global scheduler
    
    if scheduler is not None:
        logger.warning("⚠️  Scheduler already running, skipping initialization")
        return
    
    try:
        scheduler = BackgroundScheduler()
        
        # Run purge_trash daily at 3 AM
        scheduler.add_job(
            purge_trash_job,
            'cron',
            hour=3,
            minute=0,
            id='purge_trash_daily',
            replace_existing=True
        )
        
        # Run send_notifications every 6 hours (at 6 AM, 12 PM, 6 PM, 12 AM)
        scheduler.add_job(
            send_notifications_job,
            'cron',
            hour='6,12,18,0',
            minute=0,
            id='send_notifications_periodic',
            replace_existing=True
        )
        
        scheduler.start()
        logger.info("✅ Scheduler started:")
        logger.info("   - Trash auto-purge: Daily at 3:00 AM")
        logger.info("   - Email notifications: Every 6 hours (6 AM, 12 PM, 6 PM, 12 AM)")
        
    except Exception as e:
        logger.error(f"❌ Failed to start scheduler: {e}")

def stop_scheduler():
    """Stop the background scheduler"""
    global scheduler
    if scheduler is not None:
        scheduler.shutdown()
        logger.info("⏹️  Scheduler stopped")

