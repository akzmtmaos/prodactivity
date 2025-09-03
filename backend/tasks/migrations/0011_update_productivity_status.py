from django.db import migrations

def update_productivity_status(apps, schema_editor):
    """Update existing productivity status from 'Needs Improvement' to 'Moderately Productive'"""
    ProductivityLog = apps.get_model('tasks', 'ProductivityLog')
    
    # Update all existing records with 'Needs Improvement' status
    updated_count = ProductivityLog.objects.filter(status='Needs Improvement').update(status='Moderately Productive')
    print(f"Updated {updated_count} productivity logs from 'Needs Improvement' to 'Moderately Productive'")

def reverse_update_productivity_status(apps, schema_editor):
    """Reverse the update: change 'Moderately Productive' back to 'Needs Improvement'"""
    ProductivityLog = apps.get_model('tasks', 'ProductivityLog')
    
    # Update all existing records with 'Moderately Productive' status back to 'Needs Improvement'
    updated_count = ProductivityLog.objects.filter(status='Moderately Productive').update(status='Needs Improvement')
    print(f"Reverted {updated_count} productivity logs from 'Moderately Productive' to 'Needs Improvement'")

class Migration(migrations.Migration):
    dependencies = [
        ('tasks', '0010_fix_task_category_schema'),
    ]

    operations = [
        migrations.RunPython(update_productivity_status, reverse_update_productivity_status),
    ]
