from rest_framework import generics, permissions, status
from rest_framework.response import Response
from .models import Notification
from .serializers import NotificationSerializer
from rest_framework.views import APIView
from .models import TermsAndConditions
from .serializers import TermsAndConditionsSerializer
from django.http import JsonResponse

class LatestTermsAndConditionsView(APIView):
    def get(self, request):
        terms = TermsAndConditions.objects.order_by('-last_updated').first()
        if not terms:
            return Response({'detail': 'Terms and Conditions not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = TermsAndConditionsSerializer(terms)
        return Response(serializer.data)

class NotificationListView(generics.ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

class NotificationMarkReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            notification = Notification.objects.get(pk=pk, user=request.user)
            notification.is_read = True
            notification.save()
            return Response({'status': 'marked as read'})
        except Notification.DoesNotExist:
            return Response({'error': 'Notification not found'}, status=status.HTTP_404_NOT_FOUND) 

class HealthCheckView(APIView):
    """Simple health check endpoint"""
    permission_classes = []  # No authentication required
    
    def get(self, request):
        return Response({
            'status': 'ok',
            'message': 'Prodactivity API is running',
            'version': '1.0.0',
            'endpoints': {
                'api': '/api/',
                'admin': '/admin/',
                'token': '/api/token/',
                'notes': '/api/notes/',
                'decks': '/api/decks/',
                'tasks': '/api/tasks/',
                'reviewers': '/api/reviewers/',
            }
        }) 