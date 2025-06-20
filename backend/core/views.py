from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import TermsAndConditions
from .serializers import TermsAndConditionsSerializer

class LatestTermsAndConditionsView(APIView):
    def get(self, request):
        terms = TermsAndConditions.objects.order_by('-last_updated').first()
        if not terms:
            return Response({'detail': 'Terms and Conditions not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = TermsAndConditionsSerializer(terms)
        return Response(serializer.data) 