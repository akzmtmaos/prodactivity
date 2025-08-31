#!/usr/bin/env python3
"""
Test script to verify the productivity scale history fix.
This script tests the productivity_logs API to ensure it returns the correct data format.
"""

import requests
import json
from datetime import datetime

# Configuration
API_BASE_URL = 'http://localhost:8000/api'
LOGIN_URL = f'{API_BASE_URL}/accounts/login/'
PRODUCTIVITY_LOGS_URL = f'{API_BASE_URL}/progress/productivity_logs/'

def test_productivity_logs():
    """Test the productivity logs API"""
    print("=== Testing Productivity Scale History Fix ===")
    
    # Test credentials (you may need to adjust these)
    credentials = {
        'username': 'testuser',  # Replace with actual test user
        'password': 'testpass'   # Replace with actual test password
    }
    
    try:
        # Login to get token
        print("1. Logging in...")
        login_response = requests.post(LOGIN_URL, json=credentials)
        
        if login_response.status_code != 200:
            print(f"Login failed: {login_response.status_code}")
            print(f"Response: {login_response.text}")
            return
        
        token_data = login_response.json()
        access_token = token_data.get('access')
        
        if not access_token:
            print("No access token received")
            return
        
        headers = {'Authorization': f'Bearer {access_token}'}
        
        # Test daily logs for September 2025
        print("\n2. Testing daily logs for September 2025...")
        daily_url = f"{PRODUCTIVITY_LOGS_URL}?view=daily&date=2025-09-01"
        daily_response = requests.get(daily_url, headers=headers)
        
        if daily_response.status_code == 200:
            daily_data = daily_response.json()
            print(f"Daily logs response status: {daily_response.status_code}")
            print(f"Number of daily logs: {len(daily_data)}")
            
            # Look for September 1, 2025
            sept_1_data = None
            for item in daily_data:
                if item.get('date') == '2025-09-01':
                    sept_1_data = item
                    break
            
            if sept_1_data:
                print(f"Found September 1, 2025 data:")
                print(f"  Date: {sept_1_data['date']}")
                print(f"  Completion Rate: {sept_1_data['log']['completion_rate']}%")
                print(f"  Status: {sept_1_data['log']['status']}")
                print(f"  Total Tasks: {sept_1_data['log']['total_tasks']}")
                print(f"  Completed Tasks: {sept_1_data['log']['completed_tasks']}")
            else:
                print("September 1, 2025 data not found")
            
            # Show first few items for debugging
            print(f"\nFirst 3 daily logs:")
            for i, item in enumerate(daily_data[:3]):
                print(f"  {i+1}. {item.get('date')}: {item['log']['completion_rate']}% - {item['log']['status']}")
                
        else:
            print(f"Daily logs request failed: {daily_response.status_code}")
            print(f"Response: {daily_response.text}")
        
        # Test monthly logs for 2025
        print("\n3. Testing monthly logs for 2025...")
        monthly_url = f"{PRODUCTIVITY_LOGS_URL}?view=monthly&date=2025-01-01"
        monthly_response = requests.get(monthly_url, headers=headers)
        
        if monthly_response.status_code == 200:
            monthly_data = monthly_response.json()
            print(f"Monthly logs response status: {monthly_response.status_code}")
            print(f"Number of monthly logs: {len(monthly_data)}")
            
            # Show all monthly data
            print(f"\nAll monthly logs:")
            for item in monthly_data:
                month_name = datetime(2025, item['month'], 1).strftime('%B')
                print(f"  {month_name}: {item['log']['completion_rate']}% - {item['log']['status']}")
                
        else:
            print(f"Monthly logs request failed: {monthly_response.status_code}")
            print(f"Response: {monthly_response.text}")
        
        print("\n=== Test completed ===")
        
    except Exception as e:
        print(f"Error during testing: {e}")

if __name__ == "__main__":
    test_productivity_logs()
