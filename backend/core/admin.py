# Custom admin site for Prodactivity with dashboard and all main models registered
from django.contrib import admin
from django.urls import path
from django.template.response import TemplateResponse
from django.contrib.auth.models import User
from notes.models import Note, Notebook
from decks.models import Deck, Flashcard
from tasks.models import Task
from schedule.models import Event
from reviewer.models import Reviewer
from progress.models import ProductivityScaleHistory
from .models import TermsAndConditions, Notification

class MyAdminSite(admin.AdminSite):
    site_header = "Prodactivity Admin"
    site_title = "Prodactivity Admin Portal"
    index_title = "Welcome to Prodactivity Admin"

    def get_urls(self):
        """Add custom dashboard URL to the admin site."""
        urls = super().get_urls()
        custom_urls = [
            path('dashboard/', self.admin_view(self.dashboard_view), name="dashboard"),
        ]
        return custom_urls + urls

    def dashboard_view(self, request):
        """Custom dashboard view showing key stats for the admin site."""
        context = dict(
            self.each_context(request),
            title="Dashboard",
            user_count=User.objects.count(),
            note_count=Note.objects.count(),
            deck_count=Deck.objects.count(),
            task_count=Task.objects.count(),
            event_count=Event.objects.count(),
        )
        return TemplateResponse(request, "admin/dashboard.html", context)  # Template should be at core/templates/admin/dashboard.html

# Instantiate and configure the custom admin site (replaces default admin site)
admin_site = MyAdminSite()
# Register all main models for admin management
admin_site.register(User)
admin_site.register(TermsAndConditions)
admin_site.register(Notification)
admin_site.register(Notebook)
admin_site.register(Note)
admin_site.register(Deck)
admin_site.register(Flashcard)
admin_site.register(Task)
admin_site.register(Event)
admin_site.register(Reviewer)
admin_site.register(ProductivityScaleHistory)
# You can register more models as needed 