# Generated manually for deck archiving functionality

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('decks', '0004_quizsession'),
    ]

    operations = [
        migrations.AddField(
            model_name='deck',
            name='is_archived',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='deck',
            name='archived_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
