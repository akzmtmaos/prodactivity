from django.shortcuts import render
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from .models import Reviewer
from .serializers import ReviewerSerializer

# Create your views here.

class ReviewerListCreateView(generics.ListCreateAPIView):
    serializer_class = ReviewerSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Reviewer.objects.filter(user=self.request.user)
        return queryset

class ReviewerRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ReviewerSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Reviewer.objects.filter(user=self.request.user)
