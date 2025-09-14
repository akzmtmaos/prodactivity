import json
import csv
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from notes.models import Notebook, Note
from datetime import datetime

class Command(BaseCommand):
    help = 'Export notebooks and notes data for Supabase migration'

    def add_arguments(self, parser):
        parser.add_argument(
            '--output-dir',
            type=str,
            default='./migration_data',
            help='Directory to save exported data files'
        )
        parser.add_argument(
            '--format',
            type=str,
            choices=['json', 'csv', 'sql'],
            default='sql',
            help='Output format for the exported data'
        )

    def handle(self, *args, **options):
        output_dir = options['output_dir']
        format_type = options['format']
        
        # Create output directory if it doesn't exist
        import os
        os.makedirs(output_dir, exist_ok=True)
        
        self.stdout.write('Starting data export...')
        
        # Export user mapping
        self.export_user_mapping(output_dir, format_type)
        
        # Export notebooks
        self.export_notebooks(output_dir, format_type)
        
        # Export notes
        self.export_notes(output_dir, format_type)
        
        self.stdout.write(
            self.style.SUCCESS(f'Data export completed! Files saved to {output_dir}')
        )

    def export_user_mapping(self, output_dir, format_type):
        """Export user mapping between Django and Supabase"""
        self.stdout.write('Exporting user mapping...')
        
        users = User.objects.all()
        user_mapping = []
        
        for user in users:
            user_mapping.append({
                'django_id': user.id,
                'django_username': user.username,
                'django_email': user.email,
                'supabase_user_id': None,  # Will be filled manually
                'notes': f'Replace with actual Supabase user ID for {user.username}'
            })
        
        if format_type == 'json':
            with open(f'{output_dir}/user_mapping.json', 'w') as f:
                json.dump(user_mapping, f, indent=2)
        elif format_type == 'csv':
            with open(f'{output_dir}/user_mapping.csv', 'w', newline='') as f:
                if user_mapping:
                    writer = csv.DictWriter(f, fieldnames=user_mapping[0].keys())
                    writer.writeheader()
                    writer.writerows(user_mapping)
        elif format_type == 'sql':
            with open(f'{output_dir}/user_mapping.sql', 'w') as f:
                f.write('-- User mapping between Django and Supabase\n')
                f.write('-- Replace the supabase_user_id values with actual Supabase user IDs\n\n')
                for user in user_mapping:
                    f.write(f"-- Django ID {user['django_id']}: {user['django_username']} ({user['django_email']})\n")
                    f.write(f"-- Supabase ID: [REPLACE WITH ACTUAL SUPABASE USER ID]\n\n")
        
        self.stdout.write(f'  - Exported {len(user_mapping)} users')

    def export_notebooks(self, output_dir, format_type):
        """Export notebooks data"""
        self.stdout.write('Exporting notebooks...')
        
        notebooks = Notebook.objects.all()
        notebooks_data = []
        
        for notebook in notebooks:
            notebooks_data.append({
                'id': notebook.id,
                'name': notebook.name,
                'user_id': notebook.user.id,  # Django user ID
                'notebook_type': notebook.notebook_type,
                'urgency_level': notebook.urgency_level,
                'description': notebook.description,
                'created_at': notebook.created_at.isoformat(),
                'updated_at': notebook.updated_at.isoformat(),
                'is_archived': notebook.is_archived,
                'archived_at': notebook.archived_at.isoformat() if notebook.archived_at else None
            })
        
        if format_type == 'json':
            with open(f'{output_dir}/notebooks.json', 'w') as f:
                json.dump(notebooks_data, f, indent=2)
        elif format_type == 'csv':
            with open(f'{output_dir}/notebooks.csv', 'w', newline='') as f:
                if notebooks_data:
                    writer = csv.DictWriter(f, fieldnames=notebooks_data[0].keys())
                    writer.writeheader()
                    writer.writerows(notebooks_data)
        elif format_type == 'sql':
            with open(f'{output_dir}/notebooks.sql', 'w') as f:
                f.write('-- Notebooks data for Supabase migration\n')
                f.write('-- Replace user_id values with actual Supabase user IDs\n\n')
                
                for notebook in notebooks_data:
                    f.write(f"INSERT INTO notebooks (id, name, user_id, notebook_type, urgency_level, description, created_at, updated_at, is_archived, archived_at) VALUES (\n")
                    f.write(f"  {notebook['id']},\n")
                    f.write(f"  '{notebook['name'].replace(\"'\", \"''\")}',\n")
                    f.write(f"  '[REPLACE_WITH_SUPABASE_USER_ID]', -- Django user ID: {notebook['user_id']}\n")
                    f.write(f"  '{notebook['notebook_type']}',\n")
                    f.write(f"  '{notebook['urgency_level']}',\n")
                    f.write(f"  '{notebook['description'].replace(\"'\", \"''\")}',\n")
                    f.write(f"  '{notebook['created_at']}',\n")
                    f.write(f"  '{notebook['updated_at']}',\n")
                    f.write(f"  {str(notebook['is_archived']).lower()},\n")
                    f.write(f"  {'NULL' if notebook['archived_at'] is None else f\"'{notebook['archived_at']}'\"}\n")
                    f.write(f");\n\n")
        
        self.stdout.write(f'  - Exported {len(notebooks_data)} notebooks')

    def export_notes(self, output_dir, format_type):
        """Export notes data"""
        self.stdout.write('Exporting notes...')
        
        notes = Note.objects.all()
        notes_data = []
        
        for note in notes:
            notes_data.append({
                'id': note.id,
                'title': note.title,
                'content': note.content,
                'notebook_id': note.notebook.id,
                'user_id': note.user.id,  # Django user ID
                'note_type': note.note_type,
                'priority': note.priority,
                'is_urgent': note.is_urgent,
                'tags': note.tags,
                'created_at': note.created_at.isoformat(),
                'updated_at': note.updated_at.isoformat(),
                'is_deleted': note.is_deleted,
                'deleted_at': note.deleted_at.isoformat() if note.deleted_at else None,
                'is_archived': note.is_archived,
                'archived_at': note.archived_at.isoformat() if note.archived_at else None,
                'last_visited': note.last_visited.isoformat() if note.last_visited else None
            })
        
        if format_type == 'json':
            with open(f'{output_dir}/notes.json', 'w') as f:
                json.dump(notes_data, f, indent=2)
        elif format_type == 'csv':
            with open(f'{output_dir}/notes.csv', 'w', newline='') as f:
                if notes_data:
                    writer = csv.DictWriter(f, fieldnames=notes_data[0].keys())
                    writer.writeheader()
                    writer.writerows(notes_data)
        elif format_type == 'sql':
            with open(f'{output_dir}/notes.sql', 'w') as f:
                f.write('-- Notes data for Supabase migration\n')
                f.write('-- Replace user_id values with actual Supabase user IDs\n\n')
                
                for note in notes_data:
                    f.write(f"INSERT INTO notes (id, title, content, notebook_id, user_id, note_type, priority, is_urgent, tags, created_at, updated_at, is_deleted, deleted_at, is_archived, archived_at, last_visited) VALUES (\n")
                    f.write(f"  {note['id']},\n")
                    f.write(f"  '{note['title'].replace(\"'\", \"''\")}',\n")
                    f.write(f"  '{note['content'].replace(\"'\", \"''\")}',\n")
                    f.write(f"  {note['notebook_id']},\n")
                    f.write(f"  '[REPLACE_WITH_SUPABASE_USER_ID]', -- Django user ID: {note['user_id']}\n")
                    f.write(f"  '{note['note_type']}',\n")
                    f.write(f"  '{note['priority']}',\n")
                    f.write(f"  {str(note['is_urgent']).lower()},\n")
                    f.write(f"  '{note['tags'].replace(\"'\", \"''\")}',\n")
                    f.write(f"  '{note['created_at']}',\n")
                    f.write(f"  '{note['updated_at']}',\n")
                    f.write(f"  {str(note['is_deleted']).lower()},\n")
                    f.write(f"  {'NULL' if note['deleted_at'] is None else f\"'{note['deleted_at']}'\"},\n")
                    f.write(f"  {str(note['is_archived']).lower()},\n")
                    f.write(f"  {'NULL' if note['archived_at'] is None else f\"'{note['archived_at']}'\"},\n")
                    f.write(f"  {'NULL' if note['last_visited'] is None else f\"'{note['last_visited']}'\"}\n")
                    f.write(f");\n\n")
        
        self.stdout.write(f'  - Exported {len(notes_data)} notes')

    def get_user_stats(self):
        """Get statistics about the data to be exported"""
        total_users = User.objects.count()
        total_notebooks = Notebook.objects.count()
        total_notes = Note.objects.count()
        
        self.stdout.write(f'Data to be exported:')
        self.stdout.write(f'  - Users: {total_users}')
        self.stdout.write(f'  - Notebooks: {total_notebooks}')
        self.stdout.write(f'  - Notes: {total_notes}')
        
        return {
            'users': total_users,
            'notebooks': total_notebooks,
            'notes': total_notes
        }
