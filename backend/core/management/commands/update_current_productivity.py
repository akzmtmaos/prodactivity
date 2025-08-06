from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from tasks.models import Task, ProductivityLog
from django.utils import timezone
from datetime import timedelta, date

class Command(BaseCommand):
    help = 'Update productivity logs for current periods (current week/month)'

    def handle(self, *args, **options):
        self.stdout.write('Updating current period productivity logs...')
        
        today = timezone.localdate()
        users = User.objects.all()
        
        for user in users:
            self.stdout.write(f'\nProcessing user: {user.username}')
            
            # Update current week
            current_week_start = today - timedelta(days=today.weekday())
            current_week_end = current_week_start + timedelta(days=6)
            
            self.stdout.write(f'Current week: {current_week_start} to {current_week_end}')
            
            # Get tasks for current week
            tasks = Task.all_objects.filter(user=user, due_date__range=(current_week_start, current_week_end))
            non_deleted = tasks.filter(is_deleted=False)
            deleted_completed = tasks.filter(is_deleted=True, was_completed_on_delete=True)
            
            total_tasks = non_deleted.count() + deleted_completed.count()
            completed_tasks = non_deleted.filter(completed=True).count() + deleted_completed.count()
            
            if total_tasks == 0:
                completion_rate = 0
                status = 'No Tasks'
            else:
                completion_rate = completed_tasks / total_tasks * 100
                if completion_rate >= 90:
                    status = 'Highly Productive'
                elif completion_rate >= 70:
                    status = 'Productive'
                elif completion_rate >= 40:
                    status = 'Needs Improvement'
                else:
                    status = 'Low Productivity'
            
            # Update or create weekly log
            log, created = ProductivityLog.objects.get_or_create(
                user=user,
                period_type='weekly',
                period_start=current_week_start,
                period_end=current_week_end,
                defaults={
                    'completion_rate': completion_rate,
                    'total_tasks': total_tasks,
                    'completed_tasks': completed_tasks,
                    'status': status
                }
            )
            
            if not created:
                log.completion_rate = completion_rate
                log.total_tasks = total_tasks
                log.completed_tasks = completed_tasks
                log.status = status
                log.save()
                self.stdout.write(f'  Updated weekly log: {total_tasks} tasks, {completion_rate:.1f}%, {status}')
            else:
                self.stdout.write(f'  Created weekly log: {total_tasks} tasks, {completion_rate:.1f}%, {status}')
            
            # Update current month
            current_month_start = today.replace(day=1)
            if today.month == 12:
                current_month_end = today.replace(year=today.year+1, month=1, day=1) - timedelta(days=1)
            else:
                current_month_end = today.replace(month=today.month+1, day=1) - timedelta(days=1)
            
            self.stdout.write(f'Current month: {current_month_start} to {current_month_end}')
            
            # Get tasks for current month
            tasks = Task.all_objects.filter(user=user, due_date__range=(current_month_start, current_month_end))
            non_deleted = tasks.filter(is_deleted=False)
            deleted_completed = tasks.filter(is_deleted=True, was_completed_on_delete=True)
            
            total_tasks = non_deleted.count() + deleted_completed.count()
            completed_tasks = non_deleted.filter(completed=True).count() + deleted_completed.count()
            
            if total_tasks == 0:
                completion_rate = 0
                status = 'No Tasks'
            else:
                completion_rate = completed_tasks / total_tasks * 100
                if completion_rate >= 90:
                    status = 'Highly Productive'
                elif completion_rate >= 70:
                    status = 'Productive'
                elif completion_rate >= 40:
                    status = 'Needs Improvement'
                else:
                    status = 'Low Productivity'
            
            # Update or create monthly log
            log, created = ProductivityLog.objects.get_or_create(
                user=user,
                period_type='monthly',
                period_start=current_month_start,
                period_end=current_month_end,
                defaults={
                    'completion_rate': completion_rate,
                    'total_tasks': total_tasks,
                    'completed_tasks': completed_tasks,
                    'status': status
                }
            )
            
            if not created:
                log.completion_rate = completion_rate
                log.total_tasks = total_tasks
                log.completed_tasks = completed_tasks
                log.status = status
                log.save()
                self.stdout.write(f'  Updated monthly log: {total_tasks} tasks, {completion_rate:.1f}%, {status}')
            else:
                self.stdout.write(f'  Created monthly log: {total_tasks} tasks, {completion_rate:.1f}%, {status}')
        
        self.stdout.write(self.style.SUCCESS('\nSuccessfully updated current period productivity logs!'))