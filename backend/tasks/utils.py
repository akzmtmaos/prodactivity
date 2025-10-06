from django.utils import timezone
from datetime import datetime, timedelta

def get_user_local_date():
    """
    Get the current date in the user's local timezone.
    Uses the system's local timezone.
    """
    # Use system's local timezone
    return timezone.now().date()

def get_user_local_date_from_request(request):
    """
    Get the current date based on the user's timezone from request headers.
    Falls back to UTC+8 if no timezone info is available.
    """
    # Check if timezone info is provided in request headers
    timezone_offset = request.headers.get('X-Timezone-Offset')
    
    if timezone_offset:
        try:
            # Convert offset from minutes to hours
            # getTimezoneOffset() returns positive for timezones behind UTC
            offset_hours = -int(timezone_offset) / 60
            
            # Add offset hours to UTC time
            utc_now = timezone.now()
            local_now = utc_now + timedelta(hours=offset_hours)
            return local_now.date()
        except (ValueError, TypeError) as e:
            print(f"Error processing timezone offset: {e}")
            pass
    
    # Fallback to system timezone
    return get_user_local_date() 