from django.contrib.auth.models import User
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.db import IntegrityError

from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate

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
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
            },
        })
    else:
        return Response({'message': 'Invalid credentials'}, status=401)