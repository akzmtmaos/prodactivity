from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
from .models import Follow, Profile
from django.db.models import Q, Count, F


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def follow_user(request, username):
    """
    Follow a user by username
    POST /api/accounts/follow/{username}/
    """
    try:
        user_to_follow = User.objects.get(username=username)
        
        # Can't follow yourself
        if user_to_follow == request.user:
            return Response({
                'success': False,
                'message': 'You cannot follow yourself'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if already following
        follow, created = Follow.objects.get_or_create(
            follower=request.user,
            following=user_to_follow,
            defaults={'is_active': True}
        )
        
        if not created:
            # Already exists, just activate if it was deactivated
            if not follow.is_active:
                follow.is_active = True
                follow.save()
                return Response({
                    'success': True,
                    'message': f'Now following {username}',
                    'following': True
                })
            else:
                return Response({
                    'success': False,
                    'message': f'Already following {username}',
                    'following': True
                }, status=status.HTTP_400_BAD_REQUEST)
        
        # TODO: Sync to Supabase (implement later)
        # try:
        #     sync_follow_to_supabase(follow)
        # except Exception as e:
        #     print(f"⚠️ Failed to sync follow to Supabase: {e}")
        
        return Response({
            'success': True,
            'message': f'Now following {username}',
            'following': True
        })
        
    except User.DoesNotExist:
        return Response({
            'success': False,
            'message': 'User not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'success': False,
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def unfollow_user(request, username):
    """
    Unfollow a user by username
    POST /api/accounts/unfollow/{username}/
    """
    try:
        user_to_unfollow = User.objects.get(username=username)
        
        try:
            follow = Follow.objects.get(
                follower=request.user,
                following=user_to_unfollow,
                is_active=True
            )
            follow.is_active = False
            follow.save()
            
            # TODO: Sync to Supabase (implement later)
            # try:
            #     update_follow_in_supabase(follow)
            # except Exception as e:
            #     print(f"⚠️ Failed to sync unfollow to Supabase: {e}")
            
            return Response({
                'success': True,
                'message': f'Unfollowed {username}',
                'following': False
            })
        except Follow.DoesNotExist:
            return Response({
                'success': False,
                'message': f'Not following {username}',
                'following': False
            }, status=status.HTTP_400_BAD_REQUEST)
            
    except User.DoesNotExist:
        return Response({
            'success': False,
            'message': 'User not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'success': False,
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_follow_status(request, username):
    """
    Check if current user is following another user
    GET /api/accounts/follow-status/{username}/
    """
    try:
        user_to_check = User.objects.get(username=username)
        is_following = Follow.objects.filter(
            follower=request.user,
            following=user_to_check,
            is_active=True
        ).exists()
        
        return Response({
            'following': is_following
        })
    except User.DoesNotExist:
        return Response({
            'success': False,
            'message': 'User not found'
        }, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_profile(request, username):
    """
    Get user profile by username (public profile view)
    GET /api/accounts/profile/{username}/
    """
    try:
        profile_user = User.objects.select_related('profile').get(username=username)
        profile = profile_user.profile
        
        # Get avatar URL
        avatar_url = None
        if profile.avatar:
            request_scheme = request.scheme
            request_host = request.get_host()
            avatar_url = f"{request_scheme}://{request_host}{profile.avatar.url}"
        
        # Check if current user is following this user
        is_following = False
        if request.user.is_authenticated:
            is_following = Follow.objects.filter(
                follower=request.user,
                following=profile_user,
                is_active=True
            ).exists()
        
        # Get followers and following counts
        followers_count = profile.followers_count
        following_count = profile.following_count
        
        return Response({
            'id': profile_user.id,
            'username': profile_user.username,
            'email': profile_user.email if request.user == profile_user else None,  # Only show email to self
            'avatar': avatar_url,
            'bio': profile.bio or '',
            'school': profile.school or '',
            'year': profile.year or '',
            'course': profile.course or '',
            'followers_count': followers_count,
            'following_count': following_count,
            'is_following': is_following,
            'is_own_profile': request.user == profile_user,
            'date_joined': profile_user.date_joined,
            'email_verified': profile.email_verified,
        })
    except User.DoesNotExist:
        return Response({
            'success': False,
            'message': 'User not found'
        }, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_followers(request, username=None):
    """
    Get followers list for a user
    GET /api/accounts/followers/ (own followers)
    GET /api/accounts/followers/{username}/ (another user's followers)
    """
    try:
        if username:
            target_user = User.objects.get(username=username)
        else:
            target_user = request.user
        
        followers = Follow.objects.filter(
            following=target_user,
            is_active=True
        ).select_related('follower', 'follower__profile').order_by('-created_at')
        
        followers_list = []
        for follow in followers:
            follower = follow.follower
            profile = follower.profile
            
            # Get avatar URL
            avatar_url = None
            if profile.avatar:
                request_scheme = request.scheme
                request_host = request.get_host()
                avatar_url = f"{request_scheme}://{request_host}{profile.avatar.url}"
            
            # Check if current user is following this follower
            is_following_back = False
            if request.user.is_authenticated and request.user != follower:
                is_following_back = Follow.objects.filter(
                    follower=request.user,
                    following=follower,
                    is_active=True
                ).exists()
            
            followers_list.append({
                'id': follower.id,
                'username': follower.username,
                'avatar': avatar_url,
                'bio': profile.bio or '',
                'school': profile.school or '',
                'year': profile.year or '',
                'course': profile.course or '',
                'is_following': is_following_back,
                'followed_at': follow.created_at,
            })
        
        return Response({
            'followers': followers_list,
            'count': len(followers_list)
        })
    except User.DoesNotExist:
        return Response({
            'success': False,
            'message': 'User not found'
        }, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_following(request, username=None):
    """
    Get following list for a user
    GET /api/accounts/following/ (own following)
    GET /api/accounts/following/{username}/ (another user's following)
    """
    try:
        if username:
            target_user = User.objects.get(username=username)
        else:
            target_user = request.user
        
        following = Follow.objects.filter(
            follower=target_user,
            is_active=True
        ).select_related('following', 'following__profile').order_by('-created_at')
        
        following_list = []
        for follow in following:
            following_user = follow.following
            profile = following_user.profile
            
            # Get avatar URL
            avatar_url = None
            if profile.avatar:
                request_scheme = request.scheme
                request_host = request.get_host()
                avatar_url = f"{request_scheme}://{request_host}{profile.avatar.url}"
            
            following_list.append({
                'id': following_user.id,
                'username': following_user.username,
                'avatar': avatar_url,
                'bio': profile.bio or '',
                'school': profile.school or '',
                'year': profile.year or '',
                'course': profile.course or '',
                'followed_at': follow.created_at,
            })
        
        return Response({
            'following': following_list,
            'count': len(following_list)
        })
    except User.DoesNotExist:
        return Response({
            'success': False,
            'message': 'User not found'
        }, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search_users(request):
    """
    Search users by username
    GET /api/accounts/search-users/?q=username
    """
    try:
        query = request.GET.get('q', '').strip()
        
        if not query or len(query) < 2:
            return Response({
                'users': [],
                'count': 0
            })
        
        users = User.objects.filter(
            username__icontains=query
        ).exclude(id=request.user.id)[:20]  # Limit to 20 results
        
        users_list = []
        for user in users:
            # Get or create profile
            profile, created = Profile.objects.get_or_create(user=user)
            
            # Get avatar URL
            avatar_url = None
            if profile.avatar:
                try:
                    request_scheme = request.scheme
                    request_host = request.get_host()
                    avatar_url = f"{request_scheme}://{request_host}{profile.avatar.url}"
                except Exception as e:
                    print(f"Error generating avatar URL for user {user.id}: {e}")
                    avatar_url = None
            
            # Check if current user is following this user
            is_following = False
            try:
                is_following = Follow.objects.filter(
                    follower=request.user,
                    following=user,
                    is_active=True
                ).exists()
            except Exception as e:
                print(f"Error checking follow status for user {user.id}: {e}")
            
            users_list.append({
                'id': user.id,
                'username': user.username,
                'email': user.email,  # Include email for display
                'avatar': avatar_url,
                'bio': getattr(profile, 'bio', None) or '',
                'school': getattr(profile, 'school', None) or '',
                'year': getattr(profile, 'year', None) or '',
                'course': getattr(profile, 'course', None) or '',
                'is_following': is_following,
            })
        
        return Response({
            'users': users_list,
            'count': len(users_list)
        })
    except Exception as e:
        print(f"Error in search_users: {e}")
        import traceback
        traceback.print_exc()
        return Response({
            'success': False,
            'message': str(e),
            'users': [],
            'count': 0
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# TODO: Supabase sync functions (to be implemented later)
# def sync_follow_to_supabase(follow):
#     """Sync follow relationship to Supabase"""
#     pass
#
# def update_follow_in_supabase(follow):
#     """Update follow relationship in Supabase"""
#     pass

