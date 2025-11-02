from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from notes.models import Note, Notebook
from decks.models import Deck
from reviewer.models import Reviewer

class Command(BaseCommand):
    help = 'Permanently delete trashed notes, decks, notebooks, and reviewers older than 30 days.'

    def handle(self, *args, **options):
        cutoff = timezone.now() - timedelta(days=30)

        # Notes
        notes_to_delete = Note.objects.filter(is_deleted=True, deleted_at__lt=cutoff)
        notes_count = notes_to_delete.count()
        notes_to_delete.delete()

        # Notebooks
        notebooks_to_delete = Notebook.objects.filter(is_deleted=True, deleted_at__lt=cutoff)
        notebooks_count = notebooks_to_delete.count()
        notebooks_to_delete.delete()

        # Decks
        decks_to_delete = Deck.objects.filter(is_deleted=True, deleted_at__lt=cutoff)
        decks_count = decks_to_delete.count()
        decks_to_delete.delete()

        # Reviewers
        reviewers_to_delete = Reviewer.objects.filter(is_deleted=True, deleted_at__lt=cutoff)
        reviewers_count = reviewers_to_delete.count()
        reviewers_to_delete.delete()

        total = notes_count + notebooks_count + decks_count + reviewers_count
        self.stdout.write(self.style.SUCCESS(
            f"✅ Purged {total} items from Trash (older than 30 days):\n"
            f"   - {notes_count} notes\n"
            f"   - {notebooks_count} notebooks\n"
            f"   - {decks_count} decks\n"
            f"   - {reviewers_count} reviewers"
        )) 