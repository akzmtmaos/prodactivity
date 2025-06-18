from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('notes', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='note',
            name='last_visited',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ] 