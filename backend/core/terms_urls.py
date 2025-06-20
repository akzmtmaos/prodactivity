from django.urls import path
from .views import LatestTermsAndConditionsView

urlpatterns = [
    path('latest/', LatestTermsAndConditionsView.as_view(), name='latest-terms'),
] 