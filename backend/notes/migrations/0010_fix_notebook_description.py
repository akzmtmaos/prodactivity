# Generated manually to fix description column issue
from django.db import migrations

class Migration(migrations.Migration):

    dependencies = [
        ('notes', '0009_remove_notebook_unused_fields'),
    ]

    operations = [
        # Remove columns if they still exist (migration 0009 should have removed them, but just in case)
        # Use DO block to check if column exists before trying to modify it
        migrations.RunSQL(
            sql="""
            DO $$ 
            BEGIN
                -- Make description nullable if it exists
                IF EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name='notes_notebook' AND column_name='description') THEN
                    ALTER TABLE notes_notebook ALTER COLUMN description DROP NOT NULL;
                END IF;
            END $$;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),
        # Drop columns if they exist
        migrations.RunSQL(
            sql="ALTER TABLE notes_notebook DROP COLUMN IF EXISTS description;",
            reverse_sql=migrations.RunSQL.noop,
        ),
        migrations.RunSQL(
            sql="ALTER TABLE notes_notebook DROP COLUMN IF EXISTS notebook_type;",
            reverse_sql=migrations.RunSQL.noop,
        ),
        migrations.RunSQL(
            sql="ALTER TABLE notes_notebook DROP COLUMN IF EXISTS urgency_level;",
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]

