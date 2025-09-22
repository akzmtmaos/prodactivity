from django.core.management.base import BaseCommand
from core.models import AIConfiguration
from core.utils import get_default_prompts

class Command(BaseCommand):
    help = 'Set up default AI configurations for the application'

    def handle(self, *args, **options):
        default_prompts = get_default_prompts()
        created_count = 0
        updated_count = 0

        for config_type, config_data in default_prompts.items():
            config, created = AIConfiguration.objects.get_or_create(
                config_type=config_type,
                defaults={
                    'title': config_data['title'],
                    'description': config_data['description'],
                    'prompt_template': config_data['prompt_template'],
                    'is_active': True
                }
            )
            
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'Created AI configuration: {config.title}')
                )
            else:
                # Update existing configuration if it's different
                if (config.title != config_data['title'] or 
                    config.description != config_data['description'] or
                    config.prompt_template != config_data['prompt_template']):
                    
                    config.title = config_data['title']
                    config.description = config_data['description']
                    config.prompt_template = config_data['prompt_template']
                    config.is_active = True
                    config.save()
                    
                    updated_count += 1
                    self.stdout.write(
                        self.style.WARNING(f'Updated AI configuration: {config.title}')
                    )
                else:
                    self.stdout.write(
                        self.style.SUCCESS(f'AI configuration already exists: {config.title}')
                    )

        self.stdout.write(
            self.style.SUCCESS(
                f'\nSetup complete! Created {created_count} new configurations, updated {updated_count} existing ones.'
            )
        )