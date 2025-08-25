# Generated manually to fix task_category schema

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tasks', '0009_add_subject_area_field'),
    ]

    operations = [
        # Remove the old subject_area column if it exists
        migrations.RunSQL(
            "ALTER TABLE tasks_task DROP COLUMN IF EXISTS subject_area;",
            reverse_sql="-- No reverse SQL needed"
        ),
        # Ensure task_category column exists and is properly configured
        migrations.RunSQL(
            """
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                              WHERE table_name='tasks_task' AND column_name='task_category') THEN
                    ALTER TABLE tasks_task ADD COLUMN task_category VARCHAR(50);
                END IF;
            END $$;
            """,
            reverse_sql="-- No reverse SQL needed"
        ),
    ]
