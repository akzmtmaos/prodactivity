from django.contrib import admin
from .models import Task, ProductivityLog, Subtask

@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ('title', 'user', 'due_date', 'priority', 'completed', 'category')
    list_filter = ('priority', 'completed', 'category', 'due_date')
    search_fields = ('title', 'description', 'user__username')

@admin.register(ProductivityLog)
class ProductivityLogAdmin(admin.ModelAdmin):
    list_display = ('user', 'period_type', 'period_start', 'period_end', 'status', 'completion_rate', 'total_tasks', 'completed_tasks', 'logged_at')
    list_filter = ('period_type', 'status', 'period_start', 'logged_at')
    search_fields = ('user__username', 'status')
    ordering = ('-period_start', '-logged_at')
    date_hierarchy = 'period_start' 


@admin.register(Subtask)
class SubtaskAdmin(admin.ModelAdmin):
    list_display = ('title', 'task', 'completed', 'created_at')
    list_filter = ('completed', 'created_at')
    search_fields = ('title', 'task__title', 'task__user__username')