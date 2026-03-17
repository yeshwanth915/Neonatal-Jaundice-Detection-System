#!/usr/bin/env python3
"""
Test script to verify server accessibility from different endpoints
"""
import requests
import time

def test_endpoint(name, url):
    """Test a single endpoint"""
    try:
        print(f"Testing {name}: {url}")
        response = requests.get(f"{url}/health", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ {name}: SUCCESS - {data.get('model_type', 'Unknown model')}")
            return True
        else:
            print(f"❌ {name}: HTTP {response.status_code}")
            return False
    except requests.exceptions.Timeout:
        print(f"❌ {name}: TIMEOUT")
        return False
    except requests.exceptions.ConnectionError:
        print(f"❌ {name}: CONNECTION FAILED")
        return False
    except Exception as e:
        print(f"❌ {name}: ERROR - {e}")
        return False

def main():
    print("🔍 Testing Neonatal Jaundice API Server Connections")
    print("=" * 50)
    
    endpoints = [
        ("Localhost", "http://localhost:8000"),
        ("127.0.0.1", "http://127.0.0.1:8000"),
        ("Android Emulator", "http://10.0.2.2:8000"),
        ("Android Emulator Alt", "http://10.0.3.2:8000"),
        ("Original IP", "http://10.170.189.195:8000"),
        ("Home Network 1", "http://192.168.1.100:8000"),
        ("Home Network 2", "http://192.168.0.100:8000"),
    ]
    
    working_endpoints = []
    
    for name, url in endpoints:
        if test_endpoint(name, url):
            working_endpoints.append((name, url))
        time.sleep(0.5)  # Brief pause between tests
    
    print("\n" + "=" * 50)
    print("📊 SUMMARY")
    print("=" * 50)
    
    if working_endpoints:
        print(f"✅ Found {len(working_endpoints)} working endpoint(s):")
        for name, url in working_endpoints:
            print(f"   • {name}: {url}")
        
        print(f"\n🎯 RECOMMENDATION:")
        print(f"   Use: {working_endpoints[0][1]}")
        print(f"   Platform: {'Android' if '10.0.2.2' in working_endpoints[0][1] else 'iOS/Desktop'}")
        
    else:
        print("❌ NO WORKING ENDPOINTS FOUND")
        print("\n🔧 TROUBLESHOOTING:")
        print("1. Make sure the backend server is running")
        print("2. Run: python jaundice_ml/start_server.py")
        print("3. Check if port 8000 is blocked by firewall")
        print("4. Try running server with: python -m uvicorn api.app:app --host 0.0.0.0 --port 8000")

if __name__ == "__main__":
    main()
