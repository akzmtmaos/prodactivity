from django.urls import path
from .views import ReviewerListCreateView, ReviewerRetrieveUpdateDestroyView
from .ai_views import AIAutomaticReviewerView, FileUploadExtractView

urlpatterns = [
    path('', ReviewerListCreateView.as_view(), name='reviewer-list-create'),
    path('<int:pk>/', ReviewerRetrieveUpdateDestroyView.as_view(), name='reviewer-detail'),
    path('ai/generate/', AIAutomaticReviewerView.as_view(), name='ai-generate-reviewer'),
    path('upload/extract/', FileUploadExtractView.as_view(), name='file-upload-extract'),
    # path('trash/reviewers/', deleted_reviewers, name='deleted-reviewers'),
] 