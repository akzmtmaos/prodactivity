# Custom admin site for Prodactivity with enhanced dashboard and all main models registered
from django.contrib import admin
from django.contrib.auth.models import User
from notes.models import Note, Notebook
from decks.models import Deck, Flashcard, QuizSession
from tasks.models import Task
from schedule.models import Event
from reviewer.models import Reviewer
from progress.models import ProductivityScaleHistory
from .models import TermsAndConditions, Notification, AIConfiguration

class MyAdminSite(admin.AdminSite):
    site_header = "Prodactivity Admin"
    site_title = "Prodactivity Admin Portal"
    index_title = "Welcome to Prodactivity Admin"

    def get_urls(self):
        """Add custom dashboard URL to the admin site."""
        from django.urls import path
        from django.template.response import TemplateResponse
        urls = super().get_urls()
        custom_urls = [
            path('dashboard/', self.admin_view(self.dashboard_view), name="dashboard"),
            path('logs/', self.admin_view(self.activity_logs_view), name="activity_logs"),
            path('reports/', self.admin_view(self.reports_view), name="reports"),
            path('system-logs/', self.admin_view(self.system_logs_view), name="system_logs"),
        ]
        return custom_urls + urls

    def dashboard_view(self, request):
        """Custom dashboard view showing key stats for the admin site."""
        from django.template.response import TemplateResponse
        from decks.models import QuizSession
        
        context = dict(
            self.each_context(request),
            title="Dashboard",
            user_count=User.objects.count(),
            note_count=Note.objects.count(),
            notebook_count=Notebook.objects.count(),
            deck_count=Deck.objects.count(),
            flashcard_count=Flashcard.objects.count(),
            task_count=Task.objects.count(),
            event_count=Event.objects.count(),
            reviewer_count=Reviewer.objects.count(),
            quiz_session_count=QuizSession.objects.count(),
            notification_count=Notification.objects.count(),
            ai_config_count=AIConfiguration.objects.filter(is_active=True).count(),
        )
        return TemplateResponse(request, "admin/dashboard.html", context)

    def activity_logs_view(self, request):
        """Activity logs view showing all admin actions and user activities."""
        from django.template.response import TemplateResponse
        from django.contrib.admin.models import LogEntry
        from django.contrib.contenttypes.models import ContentType
        from django.db.models import Q, Count
        from django.utils import timezone
        from datetime import timedelta
        
        # Get filters from request
        user_filter = request.GET.get('user', None)
        action_filter = request.GET.get('action', None)
        date_filter = request.GET.get('date', None)
        search_query = request.GET.get('search', None)
        
        # Get all log entries
        logs = LogEntry.objects.select_related('user', 'content_type').all().order_by('-action_time')
        
        # Apply filters
        if user_filter:
            logs = logs.filter(user_id=user_filter)
        
        if action_filter:
            # LogEntry action flags: 1 = ADDITION, 2 = CHANGE, 3 = DELETION
            if action_filter == 'addition':
                logs = logs.filter(action_flag=1)
            elif action_filter == 'change':
                logs = logs.filter(action_flag=2)
            elif action_filter == 'deletion':
                logs = logs.filter(action_flag=3)
        
        if date_filter:
            if date_filter == 'today':
                logs = logs.filter(action_time__date=timezone.now().date())
            elif date_filter == 'week':
                logs = logs.filter(action_time__gte=timezone.now() - timedelta(days=7))
            elif date_filter == 'month':
                logs = logs.filter(action_time__gte=timezone.now() - timedelta(days=30))
        
        if search_query:
            logs = logs.filter(
                Q(object_repr__icontains=search_query) |
                Q(user__username__icontains=search_query) |
                Q(content_type__model__icontains=search_query)
            )
        
        # Get statistics
        # LogEntry action flags: 1 = ADDITION, 2 = CHANGE, 3 = DELETION
        total_logs = LogEntry.objects.count()
        today_logs = LogEntry.objects.filter(action_time__date=timezone.now().date()).count()
        additions = LogEntry.objects.filter(action_flag=1).count()
        changes = LogEntry.objects.filter(action_flag=2).count()
        deletions = LogEntry.objects.filter(action_flag=3).count()
        
        # Get recent users who performed actions
        recent_users = LogEntry.objects.values('user__username').annotate(
            action_count=Count('id')
        ).order_by('-action_count')[:10]
        
        # Get most active content types
        active_models = LogEntry.objects.values('content_type__model').annotate(
            action_count=Count('id')
        ).order_by('-action_count')[:10]
        
        # Pagination
        from django.core.paginator import Paginator
        paginator = Paginator(logs, 50)  # Show 50 logs per page
        page_number = request.GET.get('page', 1)
        page_obj = paginator.get_page(page_number)
        
        context = dict(
            self.each_context(request),
            title="Activity Logs",
            logs=page_obj,
            total_logs=total_logs,
            today_logs=today_logs,
            additions=additions,
            changes=changes,
            deletions=deletions,
            recent_users=recent_users,
            active_models=active_models,
            user_filter=user_filter,
            action_filter=action_filter,
            date_filter=date_filter,
            search_query=search_query,
            # Get all users for filter dropdown
            all_users=User.objects.filter(is_staff=True).order_by('username'),
        )
        return TemplateResponse(request, "admin/activity_logs.html", context)

    def reports_view(self, request):
        """Reports and analytics view with charts and statistics."""
        from django.template.response import TemplateResponse
        from django.db.models import Count, Q, Sum, Avg
        from django.utils import timezone
        from datetime import timedelta, datetime
        from tasks.models import ProductivityLog
        from collections import defaultdict
        
        # Date ranges
        today = timezone.now().date()
        week_ago = today - timedelta(days=7)
        month_ago = today - timedelta(days=30)
        
        # User Statistics
        total_users = User.objects.count()
        new_users_today = User.objects.filter(date_joined__date=today).count()
        new_users_week = User.objects.filter(date_joined__gte=week_ago).count()
        new_users_month = User.objects.filter(date_joined__gte=month_ago).count()
        active_users = User.objects.filter(is_active=True).count()
        
        # Content Statistics
        total_notes = Note.objects.count()
        total_notebooks = Notebook.objects.count()
        total_decks = Deck.objects.count()
        total_flashcards = Flashcard.objects.count()
        total_tasks = Task.objects.count()
        total_events = Event.objects.count()
        
        # Recent Activity (Last 7 days)
        notes_week = Note.objects.filter(created_at__gte=week_ago).count()
        notebooks_week = Notebook.objects.filter(created_at__gte=week_ago).count()
        decks_week = Deck.objects.filter(created_at__gte=week_ago).count()
        tasks_week = Task.objects.filter(created_at__gte=week_ago).count()
        
        # Productivity Statistics
        productivity_logs = ProductivityLog.objects.all()
        avg_completion_rate = productivity_logs.aggregate(avg=Avg('completion_rate'))['avg'] or 0
        total_productivity_logs = productivity_logs.count()
        
        # Daily Productivity (Last 7 days)
        daily_productivity = []
        for i in range(6, -1, -1):
            date = today - timedelta(days=i)
            logs = ProductivityLog.objects.filter(period_start=date, period_type='daily')
            if logs.exists():
                avg_rate = logs.aggregate(avg=Avg('completion_rate'))['avg'] or 0
                daily_productivity.append({
                    'date': date.strftime('%Y-%m-%d'),
                    'date_label': date.strftime('%b %d'),
                    'rate': round(avg_rate, 1)
                })
            else:
                daily_productivity.append({
                    'date': date.strftime('%Y-%m-%d'),
                    'date_label': date.strftime('%b %d'),
                    'rate': 0
                })
        
        # User Registration Trends (Last 7 days) - Real-time data
        user_registrations = []
        for i in range(6, -1, -1):
            date = today - timedelta(days=i)
            # Use timezone-aware date range for accurate real-time data
            start_datetime = timezone.make_aware(datetime.combine(date, datetime.min.time()))
            end_datetime = timezone.make_aware(datetime.combine(date, datetime.max.time()))
            count = User.objects.filter(
                date_joined__gte=start_datetime,
                date_joined__lt=end_datetime + timedelta(days=1)
            ).count()
            user_registrations.append({
                'date': date.strftime('%Y-%m-%d'),
                'date_label': date.strftime('%b %d'),
                'count': count
            })
        
        # Content Creation Trends (Last 7 days) - Real-time data with proper date filtering
        content_creation_combined = []
        for i in range(6, -1, -1):
            date = today - timedelta(days=i)
            date_str = date.strftime('%Y-%m-%d')
            date_label = date.strftime('%b %d')
            # Use timezone-aware date range for accurate real-time data
            start_datetime = timezone.make_aware(datetime.combine(date, datetime.min.time()))
            end_datetime = timezone.make_aware(datetime.combine(date, datetime.max.time()))
            # Fetch real-time counts for each content type
            notes_count = Note.objects.filter(
                created_at__gte=start_datetime,
                created_at__lt=end_datetime + timedelta(days=1)
            ).count()
            tasks_count = Task.objects.filter(
                created_at__gte=start_datetime,
                created_at__lt=end_datetime + timedelta(days=1)
            ).count()
            decks_count = Deck.objects.filter(
                created_at__gte=start_datetime,
                created_at__lt=end_datetime + timedelta(days=1)
            ).count()
            content_creation_combined.append({
                'date': date_str,
                'date_label': date_label,
                'notes_count': notes_count,
                'tasks_count': tasks_count,
                'decks_count': decks_count
            })
        
        # Also keep separate lists for backward compatibility
        content_creation = {
            'notes': [{'date': item['date'], 'date_label': item['date_label'], 'count': item['notes_count']} for item in content_creation_combined],
            'tasks': [{'date': item['date'], 'date_label': item['date_label'], 'count': item['tasks_count']} for item in content_creation_combined],
            'decks': [{'date': item['date'], 'date_label': item['date_label'], 'count': item['decks_count']} for item in content_creation_combined]
        }
        
        # Top Users by Activity
        top_users = User.objects.annotate(
            task_count=Count('tasks'),
            note_count=Count('notes'),
            deck_count=Count('deck_decks')
        ).order_by('-task_count', '-note_count')[:10]
        
        # Task Completion Statistics
        completed_tasks = Task.objects.filter(completed=True).count()
        pending_tasks = Task.objects.filter(completed=False).count()
        completion_rate = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
        
        # Task Priority Distribution - Real-time data from all tasks
        priority_stats = Task.objects.values('priority').annotate(count=Count('id'))
        priority_distribution = {
            'high': 0,
            'medium': 0,
            'low': 0
        }
        for stat in priority_stats:
            priority_value = stat['priority']
            if priority_value in priority_distribution:
                priority_distribution[priority_value] = stat['count']
        
        # Calculate max priority for chart scaling
        max_priority_count = max(priority_distribution.values()) if priority_distribution.values() and max(priority_distribution.values()) > 0 else 1
        
        # Calculate max counts for trend charts
        max_user_reg_count = max([r['count'] for r in user_registrations]) if user_registrations and max([r['count'] for r in user_registrations]) > 0 else 1
        max_content_count = max([max(item['notes_count'], item['tasks_count'], item['decks_count']) for item in content_creation_combined]) if content_creation_combined and max([max(item['notes_count'], item['tasks_count'], item['decks_count']) for item in content_creation_combined]) > 0 else 1
        
        context = dict(
            self.each_context(request),
            title="Reports & Analytics",
            # User Stats
            total_users=total_users,
            new_users_today=new_users_today,
            new_users_week=new_users_week,
            new_users_month=new_users_month,
            active_users=active_users,
            # Content Stats
            total_notes=total_notes,
            total_notebooks=total_notebooks,
            total_decks=total_decks,
            total_flashcards=total_flashcards,
            total_tasks=total_tasks,
            total_events=total_events,
            # Recent Activity
            notes_week=notes_week,
            notebooks_week=notebooks_week,
            decks_week=decks_week,
            tasks_week=tasks_week,
            # Productivity Stats
            avg_completion_rate=round(avg_completion_rate, 1),
            total_productivity_logs=total_productivity_logs,
            daily_productivity=daily_productivity,
            # Trends
            user_registrations=user_registrations,
            content_creation=content_creation,
            content_creation_combined=content_creation_combined,
            # Top Users
            top_users=top_users,
            # Task Stats
            completed_tasks=completed_tasks,
            pending_tasks=pending_tasks,
            completion_rate=round(completion_rate, 1),
            priority_distribution=priority_distribution,
            max_priority_count=max_priority_count,  # For chart scaling
            max_user_reg_count=max_user_reg_count,  # For user registration chart scaling
            max_content_count=max_content_count,  # For content creation chart scaling
        )
        return TemplateResponse(request, "admin/reports.html", context)

    def system_logs_view(self, request):
        """System logs view showing error logs, warnings, and system events."""
        from django.template.response import TemplateResponse
        from django.utils import timezone
        from datetime import timedelta
        import os
        import re
        from pathlib import Path
        
        # Get filters from request
        log_level_filter = request.GET.get('level', None)
        date_filter = request.GET.get('date', None)
        search_query = request.GET.get('search', None)
        
        # Get log files
        BASE_DIR = Path(__file__).resolve().parent.parent.parent
        log_files = []
        log_entries = []
        
        # Common log file locations
        possible_log_files = [
            BASE_DIR / 'logs' / 'django.log',
            BASE_DIR / 'logs' / 'system.log',
            BASE_DIR / 'debug.log',
            BASE_DIR / 'error.log',
            BASE_DIR / 'backend' / 'logs' / 'django.log',
            BASE_DIR / 'backend' / 'debug.log',
        ]
        
        # Try to read log files
        log_file_content = []
        for log_file_path in possible_log_files:
            if log_file_path.exists():
                try:
                    with open(log_file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                        log_file_content.append({
                            'path': str(log_file_path),
                            'content': content,
                            'size': len(content)
                        })
                except Exception as e:
                    pass
        
        # Parse log entries from content
        all_log_entries = []
        for log_file in log_file_content:
            lines = log_file['content'].split('\n')
            for i, line in enumerate(lines):
                if not line.strip():
                    continue
                
                # Try to parse log format (adjust based on your logging format)
                # Common formats: ERROR, WARNING, INFO, DEBUG, CRITICAL
                log_entry = {
                    'timestamp': None,
                    'level': 'INFO',
                    'message': line,
                    'file': log_file['path'],
                    'line_number': i + 1
                }
                
                # Try to extract timestamp and level
                timestamp_match = re.search(r'(\d{4}-\d{2}-\d{2}[\sT]\d{2}:\d{2}:\d{2})', line)
                if timestamp_match:
                    log_entry['timestamp'] = timestamp_match.group(1)
                
                level_match = re.search(r'\b(ERROR|WARNING|INFO|DEBUG|CRITICAL)\b', line)
                if level_match:
                    log_entry['level'] = level_match.group(1).upper()
                
                all_log_entries.append(log_entry)
        
        # If no log files found, create sample entries from Django logger
        if not all_log_entries:
            import logging
            logger = logging.getLogger('django')
            
            # Add sample system events
            sample_entries = [
                {
                    'timestamp': timezone.now().strftime('%Y-%m-%d %H:%M:%S'),
                    'level': 'INFO',
                    'message': 'Django server started successfully',
                    'file': 'system',
                    'line_number': 0
                },
                {
                    'timestamp': timezone.now().strftime('%Y-%m-%d %H:%M:%S'),
                    'level': 'INFO',
                    'message': 'Database connection established',
                    'file': 'system',
                    'line_number': 0
                }
            ]
            all_log_entries.extend(sample_entries)
        
        # Sort by timestamp (newest first)
        all_log_entries.sort(key=lambda x: x['timestamp'] or '', reverse=True)
        
        # Apply filters
        filtered_logs = all_log_entries
        
        if log_level_filter:
            filtered_logs = [log for log in filtered_logs if log['level'] == log_level_filter.upper()]
        
        if date_filter:
            today = timezone.now().date()
            if date_filter == 'today':
                filtered_logs = [log for log in filtered_logs 
                                if log['timestamp'] and today.strftime('%Y-%m-%d') in log['timestamp']]
            elif date_filter == 'week':
                week_ago = today - timedelta(days=7)
                filtered_logs = [log for log in filtered_logs 
                                if log['timestamp'] and any(
                                    (today - timedelta(days=i)).strftime('%Y-%m-%d') in log['timestamp'] 
                                    for i in range(7)
                                )]
        
        if search_query:
            filtered_logs = [log for log in filtered_logs 
                           if search_query.lower() in log['message'].lower()]
        
        # Get statistics
        total_logs = len(all_log_entries)
        error_count = len([log for log in all_log_entries if log['level'] == 'ERROR'])
        warning_count = len([log for log in all_log_entries if log['level'] == 'WARNING'])
        info_count = len([log for log in all_log_entries if log['level'] == 'INFO'])
        critical_count = len([log for log in all_log_entries if log['level'] == 'CRITICAL'])
        
        # Pagination
        from django.core.paginator import Paginator
        paginator = Paginator(filtered_logs, 50)
        page_number = request.GET.get('page', 1)
        page_obj = paginator.get_page(page_number)
        
        context = dict(
            self.each_context(request),
            title="System Logs",
            logs=page_obj,
            total_logs=total_logs,
            error_count=error_count,
            warning_count=warning_count,
            info_count=info_count,
            critical_count=critical_count,
            log_level_filter=log_level_filter,
            date_filter=date_filter,
            search_query=search_query,
            log_files=log_file_content,
        )
        return TemplateResponse(request, "admin/system_logs.html", context)

    def index(self, request, extra_context=None):
        """Override index view to add statistics to the home page."""
        from decks.models import QuizSession
        
        extra_context = extra_context or {}
        
        # Add statistics to the index page context
        extra_context.update({
            'user_count': User.objects.count(),
            'note_count': Note.objects.count(),
            'notebook_count': Notebook.objects.count(),
            'deck_count': Deck.objects.count(),
            'flashcard_count': Flashcard.objects.count(),
            'task_count': Task.objects.count(),
            'event_count': Event.objects.count(),
            'reviewer_count': Reviewer.objects.count(),
            'quiz_session_count': QuizSession.objects.count(),
            'notification_count': Notification.objects.count(),
            'ai_config_count': AIConfiguration.objects.filter(is_active=True).count(),
        })
        
        # Get all context from parent and render our custom template
        from django.template.response import TemplateResponse
        from django.template.loader import render_to_string
        from django.http import HttpResponse
        
        # Get parent response to extract all context (app_list, recent actions, etc.)
        parent_response = super().index(request, extra_context)
        
        if isinstance(parent_response, TemplateResponse):
            # Get all context from parent (includes app_list, admin_log, etc.)
            context = dict(parent_response.context_data)
            # Add our statistics
            context.update(extra_context)
            
            # Try to render our custom template
            try:
                # render_to_string will search in all apps' templates folders
                # Since 'core' is in INSTALLED_APPS, it should find core/templates/admin/index.html
                html_content = render_to_string('admin/index.html', context, request=request)
                return HttpResponse(html_content)
            except Exception as e:
                # If template not found, return parent response as fallback
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Could not load custom admin index template: {e}")
                return parent_response
        
        return parent_response

@admin.register(AIConfiguration)
class AIConfigurationAdmin(admin.ModelAdmin):
    list_display = ('title', 'config_type', 'is_active', 'updated_at')
    list_filter = ('config_type', 'is_active', 'created_at', 'updated_at')
    search_fields = ('title', 'description', 'prompt_template')
    readonly_fields = ('created_at', 'updated_at')
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('config_type', 'title', 'is_active')
        }),
        ('Prompt Configuration', {
            'fields': ('prompt_template', 'description'),
            'classes': ('wide',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_readonly_fields(self, request, obj=None):
        """Make config_type readonly after creation to prevent changing type."""
        if obj:  # Editing an existing object
            return self.readonly_fields + ('config_type',)
        return self.readonly_fields

# Instantiate and configure the custom admin site (replaces default admin site)
admin_site = MyAdminSite()
# Register all main models for admin management
admin_site.register(User)
admin_site.register(TermsAndConditions)
admin_site.register(Notification)
admin_site.register(AIConfiguration)
admin_site.register(Notebook)
admin_site.register(Note)
admin_site.register(Deck)
admin_site.register(Flashcard)
admin_site.register(Task)
admin_site.register(Event)
admin_site.register(Reviewer)
admin_site.register(ProductivityScaleHistory)

# Register QuizSession with custom admin configuration
class QuizSessionAdmin(admin.ModelAdmin):
    list_display = ('user', 'deck', 'score', 'completed_at', 'created_at')
    list_filter = ('user', 'deck', 'completed_at')
    search_fields = ('user__username', 'deck__title')

admin_site.register(QuizSession, QuizSessionAdmin)
# You can register more models as needed 