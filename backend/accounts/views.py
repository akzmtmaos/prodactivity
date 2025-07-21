from django.contrib.auth.models import User
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from django.db import IntegrityError

from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from rest_framework.permissions import IsAuthenticated
from .models import Profile
from .serializers import ProfileSerializer

@api_view(['POST'])
def register(request):
    data = request.data
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')

    if not username or not email or not password:
        return Response({'success': False, 'message': 'All fields are required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.create_user(username=username, email=email, password=password)
        user.save()
        return Response({'success': True, 'message': 'Account created successfully!'}, status=status.HTTP_201_CREATED)
    except IntegrityError:
        return Response({'success': False, 'message': 'Username or email already exists'}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
def login_view(request):
    email = request.data.get('email')
    password = request.data.get('password')

    if email is None or password is None:
        return Response({'message': 'Email and password required.'}, status=400)

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response({'message': 'Invalid credentials'}, status=401)

    if user.check_password(password):
        refresh = RefreshToken.for_user(user)
        avatar_url = None
        if hasattr(user, 'profile') and user.profile.avatar:
            request_scheme = request.scheme
            request_host = request.get_host()
            avatar_url = f"{request_scheme}://{request_host}{user.profile.avatar.url}"
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'avatar': avatar_url,
            },
        })
    else:
        return Response({'message': 'Invalid credentials'}, status=401)


@api_view(['PATCH', 'PUT'])
@permission_classes([IsAuthenticated])
def update_avatar(request):
    user = request.user
    try:
        profile = user.profile
    except Profile.DoesNotExist:
        return Response({'error': 'Profile not found.'}, status=404)
    serializer = ProfileSerializer(profile, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        avatar_url = None
        if profile.avatar:
            request_scheme = request.scheme
            request_host = request.get_host()
            avatar_url = f"{request_scheme}://{request_host}{profile.avatar.url}"
        return Response({'avatar': avatar_url}, status=200)
    return Response(serializer.errors, status=400)