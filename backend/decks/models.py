from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

class Deck(models.Model):
    title = models.CharField(max_length=255)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='deck_decks')
    parent = models.ForeignKey('self', null=True, blank=True, on_delete=models.CASCADE, related_name='subdecks')
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    progress = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = ['title', 'user', 'parent']
        ordering = ['title']

    def __str__(self):
        return f"{self.title} ({self.user.username})"

    @property
    def flashcard_count(self):
        return self.flashcards.count()

class Flashcard(models.Model):
    deck = models.ForeignKey(Deck, on_delete=models.CASCADE, related_name='flashcards')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='deck_flashcards')
    front = models.TextField()
    back = models.TextField()
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.front[:30]}... ({self.deck.title})"