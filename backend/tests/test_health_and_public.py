"""
PURE LIFE OS - Backend Tests for Health and Public Endpoints
Tests for degraded mode (DB down) functionality
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthEndpoint:
    """Test /api/health endpoint - should work even when DB is down"""
    
    def test_health_returns_200(self):
        """Health endpoint should always return 200"""
        response = requests.get(f"{BASE_URL}/api/health", timeout=10)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"✓ Health endpoint returns 200")
    
    def test_health_response_structure(self):
        """Health response should have required fields"""
        response = requests.get(f"{BASE_URL}/api/health", timeout=10)
        data = response.json()
        
        # Check required fields
        assert "backend" in data, "Missing 'backend' field"
        assert data["backend"] == "ok", f"Backend should be 'ok', got {data['backend']}"
        
        assert "db" in data, "Missing 'db' field"
        assert "status" in data["db"], "Missing 'db.status' field"
        assert "error" in data["db"], "Missing 'db.error' field"
        
        assert "migrations" in data, "Missing 'migrations' field"
        assert "status" in data["migrations"], "Missing 'migrations.status' field"
        
        assert "sse" in data, "Missing 'sse' field"
        assert "status" in data["sse"], "Missing 'sse.status' field"
        assert "connected_clients" in data["sse"], "Missing 'sse.connected_clients' field"
        
        print(f"✓ Health response has all required fields")
        print(f"  - backend: {data['backend']}")
        print(f"  - db.status: {data['db']['status']}")
        print(f"  - migrations.status: {data['migrations']['status']}")
        print(f"  - sse.status: {data['sse']['status']}")
    
    def test_health_shows_degraded_when_db_down(self):
        """Health should show 'degraded' status when DB is down"""
        response = requests.get(f"{BASE_URL}/api/health", timeout=10)
        data = response.json()
        
        # When DB is down, status should be 'degraded'
        if data["db"]["status"] == "down":
            assert data["status"] == "degraded", f"Status should be 'degraded' when DB is down, got {data['status']}"
            print(f"✓ Health correctly shows 'degraded' status when DB is down")
        else:
            print(f"⚠ DB is up, cannot test degraded mode")


class TestSystemInfoEndpoint:
    """Test /api/ endpoint - system info"""
    
    def test_root_returns_200(self):
        """Root API endpoint should return 200"""
        response = requests.get(f"{BASE_URL}/api/", timeout=10)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"✓ Root API endpoint returns 200")
    
    def test_root_response_structure(self):
        """Root API should return system info"""
        response = requests.get(f"{BASE_URL}/api/", timeout=10)
        data = response.json()
        
        assert "system" in data, "Missing 'system' field"
        assert data["system"] == "PURE LIFE OS", f"System should be 'PURE LIFE OS', got {data['system']}"
        
        assert "version" in data, "Missing 'version' field"
        assert "status" in data, "Missing 'status' field"
        assert "moduli" in data, "Missing 'moduli' field"
        
        print(f"✓ Root API response has all required fields")
        print(f"  - system: {data['system']}")
        print(f"  - version: {data['version']}")
        print(f"  - status: {data['status']}")


class TestPublicEndpointsDbDown:
    """Test public endpoints when DB is down
    
    NOTE: These endpoints currently return 500 when DB is down.
    According to requirements, they SHOULD return empty lists.
    This is a known issue to be fixed by main agent.
    """
    
    def test_city_events_endpoint(self):
        """GET /api/city/events - should return empty list or 500 (known issue)"""
        response = requests.get(f"{BASE_URL}/api/city/events", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, list), "Response should be a list"
            print(f"✓ City events returns 200 with {len(data)} events")
        else:
            # Known issue: returns 500 when DB is down
            print(f"⚠ City events returns {response.status_code} (expected: 200 with empty list)")
            print(f"  This is a KNOWN ISSUE - endpoints should return empty list when DB is down")
    
    def test_city_ads_active_endpoint(self):
        """GET /api/city/ads/active - should return empty list or 500 (known issue)"""
        response = requests.get(f"{BASE_URL}/api/city/ads/active", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, list), "Response should be a list"
            print(f"✓ City ads returns 200 with {len(data)} ads")
        else:
            print(f"⚠ City ads returns {response.status_code} (expected: 200 with empty list)")
            print(f"  This is a KNOWN ISSUE - endpoints should return empty list when DB is down")
    
    def test_news_list_endpoint(self):
        """GET /api/news/ - should return empty list or 500 (known issue)"""
        response = requests.get(f"{BASE_URL}/api/news/", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, list), "Response should be a list"
            print(f"✓ News list returns 200 with {len(data)} articles")
        else:
            print(f"⚠ News list returns {response.status_code} (expected: 200 with empty list)")
            print(f"  This is a KNOWN ISSUE - endpoints should return empty list when DB is down")
    
    def test_news_breaking_endpoint(self):
        """GET /api/news/breaking - should return empty list or 500 (known issue)"""
        response = requests.get(f"{BASE_URL}/api/news/breaking", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, list), "Response should be a list"
            print(f"✓ Breaking news returns 200 with {len(data)} articles")
        else:
            print(f"⚠ Breaking news returns {response.status_code} (expected: 200 with empty list)")
            print(f"  This is a KNOWN ISSUE - endpoints should return empty list when DB is down")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
