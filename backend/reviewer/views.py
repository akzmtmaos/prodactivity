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
        # Use select_related to fetch source_note, source_notebook, and nested notebook in a single query
        queryset = Reviewer.objects.filter(
            user=self.request.user, 
            is_deleted=False
        ).select_related('source_note', 'source_note__notebook', 'source_notebook')
        return queryset

class ReviewerRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ReviewerSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Use select_related to fetch source_note, source_notebook, and nested notebook in a single query
        return Reviewer.objects.filter(
            user=self.request.user
        ).select_related('source_note', 'source_note__notebook', 'source_notebook')

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
        
        # Handle is_deleted field
        is_deleted = request.data.get('is_deleted', None)
        if is_deleted is not None:
            reviewer.is_deleted = is_deleted
            reviewer.deleted_at = None if not is_deleted else timezone.now()
            reviewer.save()
            print(f"[DEBUG] Reviewer {reviewer.id} updated: is_deleted={reviewer.is_deleted}, deleted_at={reviewer.deleted_at}")
        
        # Handle is_favorite field
        is_favorite = request.data.get('is_favorite', None)
        if is_favorite is not None:
            reviewer.is_favorite = is_favorite
            reviewer.save()
            print(f"[DEBUG] Reviewer {reviewer.id} updated: is_favorite={reviewer.is_favorite}")
        
        # Handle best_score field (only update if new score is higher)
        new_score = request.data.get('best_score', None)
        new_score_correct = request.data.get('best_score_correct', None)
        new_score_total = request.data.get('best_score_total', None)
        
        if new_score is not None:
            if reviewer.best_score is None or new_score > reviewer.best_score:
                reviewer.best_score = new_score
                reviewer.best_score_correct = new_score_correct
                reviewer.best_score_total = new_score_total
                reviewer.save()
                print(f"[DEBUG] Reviewer {reviewer.id} updated: best_score={reviewer.best_score}, correct={reviewer.best_score_correct}/{reviewer.best_score_total}")
        
        # Handle other fields using serializer
        serializer = self.get_serializer(reviewer, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        return Response(serializer.data)
