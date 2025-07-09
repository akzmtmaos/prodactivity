from django.contrib import admin
from .models import Task

@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ('title', 'user', 'due_date', 'priority', 'completed', 'category')
    list_filter = ('priority', 'completed', 'category', 'due_date')
    search_fields = ('title', 'description', 'user__username') 