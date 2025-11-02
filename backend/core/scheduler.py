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
        
        scheduler.start()
        logger.info("✅ Trash auto-purge scheduler started (daily at 3:00 AM)")
        
    except Exception as e:
        logger.error(f"❌ Failed to start scheduler: {e}")

def stop_scheduler():
    """Stop the background scheduler"""
    global scheduler
    if scheduler is not None:
        scheduler.shutdown()
        logger.info("⏹️  Scheduler stopped")

