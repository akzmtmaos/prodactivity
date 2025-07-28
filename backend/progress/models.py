from django.db import models
from django.contrib.auth.models import User

# Create your models here.

class ProductivityScaleHistory(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    period_type = models.CharField(max_length=10)
    period_start = models.DateField()
    period_end = models.DateField()
    completion_rate = models.FloatField(default=0.0)
    total_tasks = models.IntegerField(default=0)
    completed_tasks = models.IntegerField(default=0)
    status = models.CharField(max_length=32, default='No Tasks')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username} - {self.period_type} - {self.status}"
