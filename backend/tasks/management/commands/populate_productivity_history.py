from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth.models import User
from tasks.models import Task, ProductivityLog
from datetime import datetime, timedelta
from calendar import monthrange
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Populate historical productivity data for all users'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days-back',
            type=int,
            default=30,
            help='Number of days back to populate (default: 30)'
        )
        parser.add_argument(
            '--user',
            type=str,
            help='Specific username to populate data for'
        )

    def handle(self, *args, **options):
        days_back = options['days_back']
        specific_user = options.get('user')
        
        self.stdout.write(f"Starting productivity history population for {days_back} days back...")
        
        # Get users to process
        if specific_user:
            try:
                users = [User.objects.get(username=specific_user)]
            except User.DoesNotExist:
                self.stdout.write(self.style.ERROR(f"User '{specific_user}' not found"))
                return
        else:
            users = User.objects.all()
        
        total_logs_created = 0
        
        for user in users:
            self.stdout.write(f"Processing user: {user.username}")
            user_logs_created = self.populate_user_history(user, days_back)
            total_logs_created += user_logs_created
            self.stdout.write(f"  Created {user_logs_created} logs for {user.username}")
        
        self.stdout.write(
            self.style.SUCCESS(f"Successfully created {total_logs_created} productivity logs")
        )

    def populate_user_history(self, user, days_back):
        today = timezone.now().date()
        logs_created = 0
        
        # Populate daily logs
        for i in range(days_back):
            target_date = today - timedelta(days=i)
            logs_created += self.create_daily_log(user, target_date)
        
        # Populate weekly logs for the past weeks
        weeks_back = max(1, days_back // 7)
        for i in range(weeks_back):
            week_start = today - timedelta(days=today.weekday() + (i * 7))
            week_end = week_start + timedelta(days=6)
            logs_created += self.create_weekly_log(user, week_start, week_end)
        
        # Populate monthly logs for the past months
        months_back = max(1, days_back // 30)
        for i in range(months_back):
            if today.month - i <= 0:
                year = today.year - 1
                month = 12 + (today.month - i)
            else:
                year = today.year
                month = today.month - i
            
            month_start = datetime(year, month, 1).date()
            month_end = datetime(year, month, monthrange(year, month)[1]).date()
            logs_created += self.create_monthly_log(user, month_start, month_end)
        
        return logs_created

    def create_daily_log(self, user, date):
        # Check if log already exists
        existing_log = ProductivityLog.objects.filter(
            user=user,
            period_type='daily',
            period_start=date,
            period_end=date
        ).first()
        
        if existing_log:
            return 0
        
        # Calculate productivity for this day
        tasks = Task.all_objects.filter(user=user, due_date=date)
        non_deleted = tasks.filter(is_deleted=False)
        deleted_completed = tasks.filter(is_deleted=True, was_completed_on_delete=True)
        
        total_tasks = non_deleted.count() + deleted_completed.count()
        completed_tasks = non_deleted.filter(completed=True).count() + deleted_completed.count()
        
        if total_tasks == 0:
            completion_rate = 0
            status = 'No Tasks'
        else:
            completion_rate = (completed_tasks / total_tasks) * 100
            if completion_rate >= 90:
                status = 'Highly Productive'
            elif completion_rate >= 70:
                status = 'Productive'
            elif completion_rate >= 40:
                status = 'Moderately Productive'
            else:
                status = 'Low Productivity'
        
        # Create the log
        ProductivityLog.objects.create(
            user=user,
            period_type='daily',
            period_start=date,
            period_end=date,
            completion_rate=completion_rate,
            total_tasks=total_tasks,
            completed_tasks=completed_tasks,
            status=status
        )
        
        return 1

    def create_weekly_log(self, user, week_start, week_end):
        # Check if log already exists
        existing_log = ProductivityLog.objects.filter(
            user=user,
            period_type='weekly',
            period_start=week_start,
            period_end=week_end
        ).first()
        
        if existing_log:
            return 0
        
        # Calculate productivity for this week
        tasks = Task.all_objects.filter(user=user, due_date__range=(week_start, week_end))
        non_deleted = tasks.filter(is_deleted=False)
        deleted_completed = tasks.filter(is_deleted=True, was_completed_on_delete=True)
        
        total_tasks = non_deleted.count() + deleted_completed.count()
        completed_tasks = non_deleted.filter(completed=True).count() + deleted_completed.count()
        
        if total_tasks == 0:
            completion_rate = 0
            status = 'No Tasks'
        else:
            completion_rate = (completed_tasks / total_tasks) * 100
            if completion_rate >= 90:
                status = 'Highly Productive'
            elif completion_rate >= 70:
                status = 'Productive'
            elif completion_rate >= 40:
                status = 'Moderately Productive'
            else:
                status = 'Low Productivity'
        
        # Create the log
        ProductivityLog.objects.create(
            user=user,
            period_type='weekly',
            period_start=week_start,
            period_end=week_end,
            completion_rate=completion_rate,
            total_tasks=total_tasks,
            completed_tasks=completed_tasks,
            status=status
        )
        
        return 1

    def create_monthly_log(self, user, month_start, month_end):
        # Check if log already exists
        existing_log = ProductivityLog.objects.filter(
            user=user,
            period_type='monthly',
            period_start=month_start,
            period_end=month_end
        ).first()
        
        if existing_log:
            return 0
        
        # Calculate productivity for this month
        tasks = Task.all_objects.filter(user=user, due_date__range=(month_start, month_end))
        non_deleted = tasks.filter(is_deleted=False)
        deleted_completed = tasks.filter(is_deleted=True, was_completed_on_delete=True)
        
        total_tasks = non_deleted.count() + deleted_completed.count()
        completed_tasks = non_deleted.filter(completed=True).count() + deleted_completed.count()
        
        if total_tasks == 0:
            completion_rate = 0
            status = 'No Tasks'
        else:
            completion_rate = (completed_tasks / total_tasks) * 100
            if completion_rate >= 90:
                status = 'Highly Productive'
            elif completion_rate >= 70:
                status = 'Productive'
            elif completion_rate >= 40:
                status = 'Moderately Productive'
            else:
                status = 'Low Productivity'
        
        # Create the log
        ProductivityLog.objects.create(
            user=user,
            period_type='monthly',
            period_start=month_start,
            period_end=month_end,
            completion_rate=completion_rate,
            total_tasks=total_tasks,
            completed_tasks=completed_tasks,
            status=status
        )
        
        return 1 