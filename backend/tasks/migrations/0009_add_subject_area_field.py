# Generated manually for adding task_category field

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tasks', '0008_add_evidence_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='task',
            name='task_category',
            field=models.CharField(
                blank=True,
                help_text='Custom task category (e.g., CAPSTONE, Math, ComProg2)',
                max_length=50,
            ),
        ),
    ]
