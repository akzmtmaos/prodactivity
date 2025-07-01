from django.urls import path
from .views import ReviewerListCreateView, ReviewerRetrieveUpdateDestroyView

urlpatterns = [
    path('', ReviewerListCreateView.as_view(), name='reviewer-list-create'),
    path('<int:pk>/', ReviewerRetrieveUpdateDestroyView.as_view(), name='reviewer-detail'),
] 