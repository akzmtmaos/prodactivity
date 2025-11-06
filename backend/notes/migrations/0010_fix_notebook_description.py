# Generated manually to fix description column issue
from django.db import migrations

class Migration(migrations.Migration):

    dependencies = [
        ('notes', '0009_remove_notebook_unused_fields'),
    ]

    operations = [
        # First, make description nullable if it still exists
        migrations.RunSQL(
            sql="ALTER TABLE notes_notebook ALTER COLUMN description DROP NOT NULL;",
            reverse_sql="ALTER TABLE notes_notebook ALTER COLUMN description SET NOT NULL;",
        ),
        # Then remove the column if it exists
        migrations.RunSQL(
            sql="ALTER TABLE notes_notebook DROP COLUMN IF EXISTS description;",
            reverse_sql=migrations.RunSQL.noop,
        ),
        # Also handle notebook_type and urgency_level if they still exist
        migrations.RunSQL(
            sql="ALTER TABLE notes_notebook DROP COLUMN IF EXISTS notebook_type;",
            reverse_sql=migrations.RunSQL.noop,
        ),
        migrations.RunSQL(
            sql="ALTER TABLE notes_notebook DROP COLUMN IF EXISTS urgency_level;",
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]

