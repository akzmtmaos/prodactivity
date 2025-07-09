from django.contrib import admin
from .models import Event

@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ('title', 'user', 'start_time', 'end_time')
    list_filter = ('user', 'start_time')
    search_fields = ('title', 'description', 'user__username')
