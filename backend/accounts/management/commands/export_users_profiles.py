import json
import csv
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from accounts.models import Profile
from datetime import datetime

class Command(BaseCommand):
    help = 'Export users and profiles data for Supabase migration'

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
            default='json',
            help='Output format for the exported data'
        )

    def handle(self, *args, **options):
        output_dir = options['output_dir']
        format_type = options['format']
        
        # Create output directory if it doesn't exist
        import os
        os.makedirs(output_dir, exist_ok=True)
        
        self.stdout.write('Starting users and profiles export...')
        
        # Export users data
        self.export_users(output_dir, format_type)
        
        # Export profiles data
        self.export_profiles(output_dir, format_type)
        
        # Export combined user-profile data
        self.export_combined_data(output_dir, format_type)
        
        self.stdout.write(
            self.style.SUCCESS(f'Users and profiles export completed! Files saved to {output_dir}')
        )

    def export_users(self, output_dir, format_type):
        """Export users data"""
        self.stdout.write('Exporting users...')
        
        users = User.objects.all()
        users_data = []
        
        for user in users:
            users_data.append({
                'django_id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'is_active': user.is_active,
                'is_staff': user.is_staff,
                'is_superuser': user.is_superuser,
                'date_joined': user.date_joined.isoformat(),
                'last_login': user.last_login.isoformat() if user.last_login else None,
                'password_hash': user.password,  # This is the hashed password
                'supabase_user_id': None,  # Will be filled after Supabase import
                'notes': f'User: {user.username} ({user.email})'
            })
        
        if format_type == 'json':
            with open(f'{output_dir}/users.json', 'w') as f:
                json.dump(users_data, f, indent=2)
        elif format_type == 'csv':
            with open(f'{output_dir}/users.csv', 'w', newline='') as f:
                if users_data:
                    writer = csv.DictWriter(f, fieldnames=users_data[0].keys())
                    writer.writeheader()
                    writer.writerows(users_data)
        elif format_type == 'sql':
            with open(f'{output_dir}/users.sql', 'w') as f:
                f.write('-- Users data for Supabase migration\n')
                f.write('-- NOTE: This creates SQL for auth.users table\n')
                f.write('-- You will need to manually create users in Supabase Auth first\n\n')
                
                for user in users_data:
                    f.write(f"-- User: {user['username']} ({user['email']})\n")
                    f.write(f"-- Django ID: {user['django_id']}\n")
                    f.write(f"-- Password hash: {user['password_hash'][:50]}...\n")
                    f.write(f"-- Supabase ID: [TO BE FILLED AFTER CREATING USER IN SUPABASE]\n\n")
        
        self.stdout.write(f'  - Exported {len(users_data)} users')

    def export_profiles(self, output_dir, format_type):
        """Export profiles data"""
        self.stdout.write('Exporting profiles...')
        
        profiles = Profile.objects.all()
        profiles_data = []
        
        for profile in profiles:
            profiles_data.append({
                'django_user_id': profile.user.id,
                'username': profile.user.username,
                'email': profile.user.email,
                'avatar': str(profile.avatar) if profile.avatar else None,
                'email_verified': profile.email_verified,
                'email_verified_at': profile.email_verified_at.isoformat() if profile.email_verified_at else None,
                'supabase_user_id': None,  # Will be filled after Supabase import
                'notes': f'Profile for user: {profile.user.username}'
            })
        
        if format_type == 'json':
            with open(f'{output_dir}/profiles.json', 'w') as f:
                json.dump(profiles_data, f, indent=2)
        elif format_type == 'csv':
            with open(f'{output_dir}/profiles.csv', 'w', newline='') as f:
                if profiles_data:
                    writer = csv.DictWriter(f, fieldnames=profiles_data[0].keys())
                    writer.writeheader()
                    writer.writerows(profiles_data)
        elif format_type == 'sql':
            with open(f'{output_dir}/profiles.sql', 'w') as f:
                f.write('-- Profiles data for Supabase migration\n')
                f.write('-- NOTE: This creates SQL for profiles table\n')
                f.write('-- Replace supabase_user_id with actual Supabase user IDs\n\n')
                
                for profile in profiles_data:
                    f.write(f"INSERT INTO profiles (id, username, email, avatar, email_verified, email_verified_at, created_at, updated_at) VALUES (\n")
                    f.write(f"  '[REPLACE_WITH_SUPABASE_USER_ID]', -- Django user ID: {profile['django_user_id']}\n")
                    f.write(f"  '{profile['username']}',\n")
                    f.write(f"  '{profile['email']}',\n")
                    f.write(f"  {'NULL' if profile['avatar'] is None else f\"'{profile['avatar']}\"},\n")
                    f.write(f"  {str(profile['email_verified']).lower()},\n")
                    f.write(f"  {'NULL' if profile['email_verified_at'] is None else f\"'{profile['email_verified_at']}'\"},\n")
                    f.write(f"  NOW(),\n")
                    f.write(f"  NOW()\n")
                    f.write(f"); -- Profile for {profile['username']}\n\n")
        
        self.stdout.write(f'  - Exported {len(profiles_data)} profiles')

    def export_combined_data(self, output_dir, format_type):
        """Export combined user-profile data for easier mapping"""
        self.stdout.write('Exporting combined user-profile data...')
        
        users = User.objects.select_related('profile').all()
        combined_data = []
        
        for user in users:
            profile = user.profile if hasattr(user, 'profile') else None
            
            combined_data.append({
                'django_user_id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'is_active': user.is_active,
                'date_joined': user.date_joined.isoformat(),
                'last_login': user.last_login.isoformat() if user.last_login else None,
                'has_profile': profile is not None,
                'avatar': str(profile.avatar) if profile and profile.avatar else None,
                'email_verified': profile.email_verified if profile else False,
                'email_verified_at': profile.email_verified_at.isoformat() if profile and profile.email_verified_at else None,
                'supabase_user_id': None,  # Will be filled after Supabase import
                'migration_notes': f'User: {user.username} - Profile: {"Yes" if profile else "No"}'
            })
        
        if format_type == 'json':
            with open(f'{output_dir}/users_profiles_combined.json', 'w') as f:
                json.dump(combined_data, f, indent=2)
        elif format_type == 'csv':
            with open(f'{output_dir}/users_profiles_combined.csv', 'w', newline='') as f:
                if combined_data:
                    writer = csv.DictWriter(f, fieldnames=combined_data[0].keys())
                    writer.writeheader()
                    writer.writerows(combined_data)
        
        self.stdout.write(f'  - Exported {len(combined_data)} combined user-profile records')

    def get_user_stats(self):
        """Get statistics about the data to be exported"""
        total_users = User.objects.count()
        total_profiles = Profile.objects.count()
        users_with_profiles = User.objects.filter(profile__isnull=False).count()
        
        self.stdout.write(f'Data to be exported:')
        self.stdout.write(f'  - Total Users: {total_users}')
        self.stdout.write(f'  - Total Profiles: {total_profiles}')
        self.stdout.write(f'  - Users with Profiles: {users_with_profiles}')
        self.stdout.write(f'  - Users without Profiles: {total_users - users_with_profiles}')
        
        return {
            'users': total_users,
            'profiles': total_profiles,
            'users_with_profiles': users_with_profiles
        }
