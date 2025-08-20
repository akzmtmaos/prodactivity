from django.core.management.base import BaseCommand
from core.models import AIConfiguration
from core.utils import get_default_prompts

class Command(BaseCommand):
    help = 'Set up default AI configurations in the database'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force update existing configurations',
        )

    def handle(self, *args, **options):
        default_prompts = get_default_prompts()
        
        for config_type, config_data in default_prompts.items():
            try:
                # Check if configuration already exists
                existing_config = AIConfiguration.objects.filter(config_type=config_type).first()
                
                if existing_config:
                    if options['force']:
                        # Update existing configuration
                        existing_config.title = config_data['title']
                        existing_config.prompt_template = config_data['prompt_template']
                        existing_config.description = config_data['description']
                        existing_config.save()
                        self.stdout.write(
                            self.style.SUCCESS(f'Updated existing configuration: {config_type}')
                        )
                    else:
                        self.stdout.write(
                            self.style.WARNING(f'Configuration already exists: {config_type} (use --force to update)')
                        )
                else:
                    # Create new configuration
                    AIConfiguration.objects.create(
                        config_type=config_type,
                        title=config_data['title'],
                        prompt_template=config_data['prompt_template'],
                        description=config_data['description'],
                        is_active=True
                    )
                    self.stdout.write(
                        self.style.SUCCESS(f'Created new configuration: {config_type}')
                    )
                    
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Error setting up {config_type}: {e}')
                )
        
        self.stdout.write(
            self.style.SUCCESS('AI configuration setup completed!')
        )
