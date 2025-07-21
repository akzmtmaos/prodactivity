from rest_framework import generics, permissions, status
from rest_framework.response import Response
from .models import Notification
from .serializers import NotificationSerializer
from rest_framework.views import APIView
from .models import TermsAndConditions
from .serializers import TermsAndConditionsSerializer

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