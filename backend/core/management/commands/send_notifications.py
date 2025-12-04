from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from core.models import Notification
from tasks.models import Task
from schedule.models import Event
from django.contrib.auth.models import User

class Command(BaseCommand):
    help = 'Send notifications for due/overdue tasks and upcoming events. Emails are automatically sent when notifications are created.'

    def handle(self, *args, **options):
        now = timezone.now()
        soon = now + timedelta(hours=24)
        notifications_created = 0

        for user in User.objects.all():
            # Skip users without email addresses
            if not user.email:
                continue
            
            # Tasks due soon (within 24h, not completed, not overdue)
            due_soon_tasks = Task.objects.filter(user=user, completed=False, due_date__gt=now.date(), due_date__lte=soon.date())
            for task in due_soon_tasks:
                title = f'Task Due Soon: {task.title}'
                message = f'Task "{task.title}" is due on {task.due_date.strftime("%B %d, %Y")}. Don\'t forget to complete it!'
                
                # Check if notification already exists to avoid duplicates
                existing = Notification.objects.filter(
                    user=user,
                    notification_type='task_due',
                    title=title,
                    created_at__gte=now - timedelta(hours=1)  # Only check last hour
                ).first()
                
                if not existing:
                    notification, created = Notification.objects.get_or_create(
                        user=user,
                        notification_type='task_due',
                        title=title,
                        defaults={
                            'message': message,
                        }
                    )
                    if created:
                        notifications_created += 1
                        self.stdout.write(f'Created notification for task: {task.title}')

            # Tasks overdue (not completed)
            overdue_tasks = Task.objects.filter(user=user, completed=False, due_date__lt=now.date())
            for task in overdue_tasks:
                title = f'Overdue Task: {task.title}'
                message = f'Task "{task.title}" was due on {task.due_date.strftime("%B %d, %Y")} and is now overdue. Please complete it soon!'
                
                # Check if notification already exists to avoid duplicates
                existing = Notification.objects.filter(
                    user=user,
                    notification_type='task_due',
                    title=title,
                    created_at__gte=now - timedelta(hours=24)  # Only check last 24 hours for overdue
                ).first()
                
                if not existing:
                    notification, created = Notification.objects.get_or_create(
                        user=user,
                        notification_type='task_due',
                        title=title,
                        defaults={
                            'message': message,
                        }
                    )
                    if created:
                        notifications_created += 1
                        self.stdout.write(f'Created notification for overdue task: {task.title}')

            # Events starting soon (within 24h)
            upcoming_events = Event.objects.filter(user=user, start_time__gt=now, start_time__lte=soon)
            for event in upcoming_events:
                title = f'Upcoming Event: {event.title}'
                event_time = event.start_time.strftime("%B %d, %Y at %I:%M %p")
                message = f'Event "{event.title}" starts on {event_time}. Be prepared!'
                
                # Check if notification already exists to avoid duplicates
                existing = Notification.objects.filter(
                    user=user,
                    notification_type='general',
                    title=title,
                    created_at__gte=now - timedelta(hours=1)  # Only check last hour
                ).first()
                
                if not existing:
                    notification, created = Notification.objects.get_or_create(
                        user=user,
                        notification_type='general',
                        title=title,
                        defaults={
                            'message': message,
                        }
                    )
                    if created:
                        notifications_created += 1
                        self.stdout.write(f'Created notification for event: {event.title}')

        self.stdout.write(self.style.SUCCESS(f'Created {notifications_created} notifications. Email notifications have been sent automatically.')) 