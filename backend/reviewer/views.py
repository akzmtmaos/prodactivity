from django.shortcuts import render
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from .models import Reviewer
from .serializers import ReviewerSerializer
from django.utils import timezone
from rest_framework.response import Response

# Create your views here.

class ReviewerListCreateView(generics.ListCreateAPIView):
    serializer_class = ReviewerSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Reviewer.objects.filter(user=self.request.user, is_deleted=False)
        return queryset

class ReviewerRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ReviewerSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Reviewer.objects.filter(user=self.request.user)

    def destroy(self, request, *args, **kwargs):
        reviewer = self.get_object()
        if reviewer.is_deleted:
            reviewer.delete()
            return Response(status=204)
        reviewer.is_deleted = True
        reviewer.deleted_at = timezone.now()
        reviewer.save()
        return Response(status=204)

    def partial_update(self, request, *args, **kwargs):
        reviewer = self.get_object()
        print(f"[DEBUG] PATCH /api/reviewers/{reviewer.id}/ - data: {request.data}")
        is_deleted = request.data.get('is_deleted', None)
        if is_deleted is not None:
            reviewer.is_deleted = is_deleted
            reviewer.deleted_at = None if not is_deleted else timezone.now()
            reviewer.save()
            print(f"[DEBUG] Reviewer {reviewer.id} updated: is_deleted={reviewer.is_deleted}, deleted_at={reviewer.deleted_at}")
        serializer = self.get_serializer(reviewer)
        return Response(serializer.data)
