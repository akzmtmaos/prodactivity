# Generated by Django 5.2.3 on 2025-07-07 14:38

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('decks', '0002_deck_progress'),
    ]

    operations = [
        migrations.AddField(
            model_name='deck',
            name='deleted_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='deck',
            name='is_deleted',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='flashcard',
            name='deleted_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='flashcard',
            name='is_deleted',
            field=models.BooleanField(default=False),
        ),
    ]
