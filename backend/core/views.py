from rest_framework import generics, permissions, status
from rest_framework.response import Response
from .models import Notification
from .serializers import NotificationSerializer
from rest_framework.views import APIView
from .models import TermsAndConditions
from .serializers import TermsAndConditionsSerializer
from django.http import JsonResponse
from django.contrib.auth.models import User
from .email_utils import send_share_notification_email

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

class NotificationCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """
        Create a new notification. This will automatically:
        - Save to Django database
        - Sync to Supabase (via signal)
        - Send email notification (via signal)
        """
        serializer = NotificationSerializer(data=request.data)
        if serializer.is_valid():
            # Set user to current authenticated user
            notification = serializer.save(user=request.user)
            # Email will be sent automatically via signal in models.py
            return Response(NotificationSerializer(notification).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

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

class SendShareEmailView(APIView):
    """Send email notification when an item is shared"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        try:
            shared_user_id = request.data.get('shared_user_id')
            item_type = request.data.get('item_type')
            item_id = request.data.get('item_id')
            item_title = request.data.get('item_title')
            permission_level = request.data.get('permission_level', 'view')
            shared_by_username = request.data.get('shared_by_username', 'Someone')

            if not all([shared_user_id, item_type, item_id, item_title]):
                return Response({
                    'error': 'Missing required fields: shared_user_id, item_type, item_id, item_title'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Get the shared user from Supabase profile (since we're using Supabase for profiles)
            # We'll need to query Supabase or use a different approach
            # For now, we'll use the user_id to get email from Django User if it exists
            try:
                # Try to get user by ID (assuming Supabase user_id maps to Django user)
                shared_user = User.objects.get(id=int(shared_user_id))
            except (User.DoesNotExist, ValueError):
                # If user doesn't exist in Django, we can't send email
                # In production, you'd query Supabase profiles table
                return Response({
                    'error': 'User not found',
                    'message': 'Email notification skipped (user not in Django database)'
                }, status=status.HTTP_404_NOT_FOUND)

            # Send email notification
            success = send_share_notification_email(
                shared_user=shared_user,
                item_type=item_type,
                item_id=item_id,
                item_title=item_title,
                permission_level=permission_level,
                shared_by_username=shared_by_username
            )

            if success:
                return Response({
                    'status': 'success',
                    'message': 'Email notification sent successfully'
                })
            else:
                return Response({
                    'status': 'warning',
                    'message': 'Email notification could not be sent (email may not be configured)'
                }, status=status.HTTP_200_OK)  # Still return 200 as sharing succeeded

        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error sending share email notification: {str(e)}")
            return Response({
                'error': 'Failed to send email notification',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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