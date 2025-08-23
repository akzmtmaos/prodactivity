#!/usr/bin/env python3
"""
Test script to debug Progress page APIs
"""

import requests
import json
import os
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8000"
API_BASE = f"{BASE_URL}/api"

def get_auth_headers():
    """Get authentication headers from localStorage or environment"""
    # Try to get token from environment first
    token = os.getenv('ACCESS_TOKEN')
    if token:
        return {'Authorization': f'Bearer {token}'}
    
    # If no token in environment, you'll need to login first
    print("No access token found. Please login first and set ACCESS_TOKEN environment variable.")
    return None

def test_user_level():
    """Test the user level API"""
    print("\n=== Testing User Level API ===")
    headers = get_auth_headers()
    if not headers:
        return
    
    try:
        response = requests.get(f"{API_BASE}/progress/level/", headers=headers)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
            
            # Check if XP calculation is working
            current_xp = data.get('currentXP', 0)
            xp_to_next = data.get('xpToNextLevel', 1000)
            current_level = data.get('currentLevel', 1)
            
            print(f"\nXP Analysis:")
            print(f"  Current Level: {current_level}")
            print(f"  Current XP: {current_xp}")
            print(f"  XP to Next Level: {xp_to_next}")
            print(f"  Progress: {current_xp}/{xp_to_next} = {(current_xp/xp_to_next)*100:.1f}%")
            
        else:
            print(f"Error: {response.text}")
            
    except Exception as e:
        print(f"Exception: {e}")

def test_user_stats():
    """Test the user stats API"""
    print("\n=== Testing User Stats API ===")
    headers = get_auth_headers()
    if not headers:
        return
    
    try:
        response = requests.get(f"{API_BASE}/progress/stats/", headers=headers)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
        else:
            print(f"Error: {response.text}")
            
    except Exception as e:
        print(f"Exception: {e}")

def test_today_productivity():
    """Test today's productivity API"""
    print("\n=== Testing Today's Productivity API ===")
    headers = get_auth_headers()
    if not headers:
        return
    
    try:
        today = datetime.now().strftime('%Y-%m-%d')
        url = f"{API_BASE}/progress/productivity/?view=daily&date={today}"
        response = requests.get(url, headers=headers)
        print(f"URL: {url}")
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
        else:
            print(f"Error: {response.text}")
            
    except Exception as e:
        print(f"Exception: {e}")

def test_productivity_logs():
    """Test productivity logs API"""
    print("\n=== Testing Productivity Logs API ===")
    headers = get_auth_headers()
    if not headers:
        return
    
    try:
        # Test daily logs for current month
        current_month = datetime.now().strftime('%Y-%m-01')
        url = f"{API_BASE}/progress/productivity_logs/?view=daily&date={current_month}"
        response = requests.get(url, headers=headers)
        print(f"Daily Logs URL: {url}")
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Daily Logs Response: {json.dumps(data, indent=2)}")
            print(f"Number of daily logs: {len(data)}")
        else:
            print(f"Error: {response.text}")
            
        # Test weekly logs
        current_year = datetime.now().strftime('%Y-01-01')
        url = f"{API_BASE}/progress/productivity_logs/?view=weekly&date={current_year}"
        response = requests.get(url, headers=headers)
        print(f"\nWeekly Logs URL: {url}")
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Weekly Logs Response: {json.dumps(data, indent=2)}")
            print(f"Number of weekly logs: {len(data)}")
        else:
            print(f"Error: {response.text}")
            
    except Exception as e:
        print(f"Exception: {e}")

def test_streaks():
    """Test streaks API"""
    print("\n=== Testing Streaks API ===")
    headers = get_auth_headers()
    if not headers:
        return
    
    try:
        response = requests.get(f"{API_BASE}/progress/streaks/", headers=headers)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
        else:
            print(f"Error: {response.text}")
            
    except Exception as e:
        print(f"Exception: {e}")

def main():
    """Run all tests"""
    print("Progress Page API Debug Tests")
    print("=" * 50)
    
    # Test all APIs
    test_user_level()
    test_user_stats()
    test_today_productivity()
    test_productivity_logs()
    test_streaks()
    
    print("\n" + "=" * 50)
    print("Tests completed!")

if __name__ == "__main__":
    main()
