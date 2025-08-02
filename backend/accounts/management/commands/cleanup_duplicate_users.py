from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.db.models import Count

class Command(BaseCommand):
    help = 'Clean up duplicate users with the same email address'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        # Find users with duplicate emails
        duplicate_emails = User.objects.values('email').annotate(
            count=Count('email')
        ).filter(count__gt=1)
        
        if not duplicate_emails:
            self.stdout.write(
                self.style.SUCCESS('No duplicate emails found!')
            )
            return
        
        self.stdout.write(f'Found {len(duplicate_emails)} duplicate email(s):')
        
        for dup in duplicate_emails:
            email = dup['email']
            count = dup['count']
            self.stdout.write(f'  {email}: {count} users')
            
            # Get all users with this email
            users = User.objects.filter(email=email).order_by('date_joined')
            
            # Keep the first user (oldest), delete the rest
            keep_user = users.first()
            delete_users = users[1:]
            
            self.stdout.write(f'    Keeping: {keep_user.username} (ID: {keep_user.id})')
            
            for user in delete_users:
                if dry_run:
                    self.stdout.write(f'    Would delete: {user.username} (ID: {user.id})')
                else:
                    self.stdout.write(f'    Deleting: {user.username} (ID: {user.id})')
                    user.delete()
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING('DRY RUN - No users were actually deleted')
            )
        else:
            self.stdout.write(
                self.style.SUCCESS('Duplicate users cleaned up successfully!')
            ) 