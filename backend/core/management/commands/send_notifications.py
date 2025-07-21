from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from core.models import Notification
from tasks.models import Task
from schedule.models import Event
from django.contrib.auth.models import User

class Command(BaseCommand):
    help = 'Send notifications for due/overdue tasks and upcoming events.'

    def handle(self, *args, **options):
        now = timezone.now()
        soon = now + timedelta(hours=24)

        for user in User.objects.all():
            # Tasks due soon (within 24h, not completed, not overdue)
            due_soon_tasks = Task.objects.filter(user=user, completed=False, due_date__gt=now.date(), due_date__lte=soon.date())
            for task in due_soon_tasks:
                Notification.objects.get_or_create(
                    user=user,
                    type='task_due',
                    task=task,
                    defaults={
                        'message': f'Task "{task.title}" is due soon!',
                    }
                )

            # Tasks overdue (not completed)
            overdue_tasks = Task.objects.filter(user=user, completed=False, due_date__lt=now.date())
            for task in overdue_tasks:
                Notification.objects.get_or_create(
                    user=user,
                    type='task_overdue',
                    task=task,
                    defaults={
                        'message': f'Task "{task.title}" is overdue!',
                    }
                )

            # Events starting soon (within 24h)
            upcoming_events = Event.objects.filter(user=user, start_time__gt=now, start_time__lte=soon)
            for event in upcoming_events:
                Notification.objects.get_or_create(
                    user=user,
                    type='event_upcoming',
                    event=event,
                    defaults={
                        'message': f'Event "{event.title}" starts soon!',
                    }
                )

        self.stdout.write(self.style.SUCCESS('Notifications sent for due/overdue tasks and upcoming events.')) 