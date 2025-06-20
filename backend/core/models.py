# This file contains models for core app, including TermsAndConditions for CMS management via admin.
from django.db import models

class TermsAndConditions(models.Model):
    content = models.TextField(verbose_name="Terms and Conditions Content", help_text="The content of the Terms and Conditions shown to users.")
    last_updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Terms and Conditions (Last updated: {self.last_updated:%Y-%m-%d %H:%M})" 