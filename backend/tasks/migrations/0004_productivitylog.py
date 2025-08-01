# Generated by Django 5.2.3 on 2025-07-22 16:48

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tasks', '0003_xplog'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='ProductivityLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('period_type', models.CharField(choices=[('daily', 'Daily'), ('weekly', 'Weekly'), ('monthly', 'Monthly')], max_length=10)),
                ('period_start', models.DateField()),
                ('period_end', models.DateField()),
                ('completion_rate', models.FloatField()),
                ('total_tasks', models.IntegerField()),
                ('completed_tasks', models.IntegerField()),
                ('status', models.CharField(max_length=32)),
                ('logged_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='productivity_logs', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-period_start'],
                'unique_together': {('user', 'period_type', 'period_start', 'period_end')},
            },
        ),
    ]
