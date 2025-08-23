from django.shortcuts import render
from django.http import JsonResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.models import User
from .models import Notification, TermsAndConditions
from .serializers import NotificationSerializer, TermsAndConditionsSerializer
from rest_framework import generics
from django.utils import timezone
from datetime import timedelta

def health_check(request):
    """Health check endpoint for deployment monitoring"""
    return JsonResponse({
        'status': 'healthy',
        'timestamp': timezone.now().isoformat(),
        'service': 'prodactivity-backend'
    })

class NotificationListView(generics.ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user).order_by('-created_at')

class NotificationMarkReadView(generics.UpdateAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    def update(self, request, *args, **kwargs):
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response({'status': 'marked as read'})

class LatestTermsAndConditionsView(generics.RetrieveAPIView):
    serializer_class = TermsAndConditionsSerializer
    permission_classes = []

    def get_object(self):
        return TermsAndConditions.objects.filter(is_active=True).order_by('-created_at').first() 