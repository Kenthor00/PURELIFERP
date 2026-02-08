"""
PURE LIFE OS 3.0 - Iteration 11 Test Suite
Tests for: Command Palette, Admin Delete System, Cache, Performance APIs
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthAndAuth:
    """Basic health and authentication tests"""
    
    def test_health_endpoint(self):
        """Test health endpoint returns ok"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] in ["ok", "degraded"]
        assert "backend" in data
        assert "db" in data
    
    def test_admin_login(self):
        """Test admin login returns tokens"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@purelife.rp",
            "password": "Admin@2026!"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["sector"] == "ADMIN"
        return data["access_token"]


class TestAdminDeleteSystem:
    """Tests for the new Admin Delete System"""
    
    @pytest.fixture
    def auth_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@purelife.rp",
            "password": "Admin@2026!"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
    
    def test_delete_permissions_endpoint(self, auth_token):
        """Test /api/admin/delete/permissions returns permissions"""
        response = requests.get(
            f"{BASE_URL}/api/admin/delete/permissions",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "user_sector" in data
        assert "user_level" in data
        assert "is_admin" in data
        assert "permissions" in data
        
        # Admin should have all permissions
        assert data["is_admin"] == True
        assert data["user_sector"] == "ADMIN"
        
        # Check specific resource permissions
        permissions = data["permissions"]
        assert "case" in permissions
        assert permissions["case"]["can_delete"] == True
        assert permissions["case"]["name"] == "Caso"
        
        assert "warrant" in permissions
        assert permissions["warrant"]["can_delete"] == True
        
        assert "fine" in permissions
        assert permissions["fine"]["can_delete"] == True
        
        assert "patient" in permissions
        assert permissions["patient"]["can_delete"] == True
        
        assert "dispatch_call" in permissions
        assert permissions["dispatch_call"]["can_delete"] == True
        
        assert "legal_case" in permissions
        assert permissions["legal_case"]["can_delete"] == True
    
    def test_delete_permissions_unauthorized(self):
        """Test delete permissions requires auth"""
        response = requests.get(f"{BASE_URL}/api/admin/delete/permissions")
        assert response.status_code in [401, 403]


class TestCacheSystem:
    """Tests for the Cache System APIs"""
    
    @pytest.fixture
    def auth_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@purelife.rp",
            "password": "Admin@2026!"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
    
    def test_cache_stats_endpoint(self, auth_token):
        """Test /api/system/cache/stats returns cache statistics"""
        response = requests.get(
            f"{BASE_URL}/api/system/cache/stats",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify cache stats structure
        assert "cache" in data
        cache = data["cache"]
        assert "size" in cache
        assert "max_size" in cache
        assert "hits" in cache
        assert "misses" in cache
        assert "hit_rate" in cache
        
        # Verify websocket stats
        assert "websocket" in data
        ws = data["websocket"]
        assert "connected_users" in ws
        assert "total_connections" in ws
        
        # Verify SSE stats
        assert "sse" in data
        assert "connected_clients" in data["sse"]
    
    def test_cache_stats_unauthorized(self):
        """Test cache stats requires auth"""
        response = requests.get(f"{BASE_URL}/api/system/cache/stats")
        assert response.status_code in [401, 403]


class TestPerformanceSystem:
    """Tests for the Performance Monitoring APIs"""
    
    def test_performance_endpoint(self):
        """Test /api/system/performance returns metrics"""
        response = requests.get(f"{BASE_URL}/api/system/performance")
        assert response.status_code == 200
        data = response.json()
        
        # Verify performance metrics structure
        assert "api_latency_ms" in data
        assert "db_latency_ms" in data
        assert "cache" in data
        assert "websocket" in data
        assert "online_users" in data
        
        # Latency should be positive numbers
        assert isinstance(data["api_latency_ms"], (int, float))
        assert data["api_latency_ms"] >= 0


class TestLSPDModule:
    """Tests for LSPD module APIs"""
    
    @pytest.fixture
    def auth_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@purelife.rp",
            "password": "Admin@2026!"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
    
    def test_lspd_stats(self, auth_token):
        """Test LSPD stats endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/lspd/stats",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "casi_aperti" in data
        assert "mandati_attivi" in data
        assert "multe_non_pagate" in data
        assert "totale_multe" in data
    
    def test_lspd_cases_list(self, auth_token):
        """Test LSPD cases list endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/lspd/cases",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        if len(data) > 0:
            case = data[0]
            assert "id" in case
            assert "title" in case
            assert "case_number" in case
            assert "status" in case
    
    def test_lspd_warrants_list(self, auth_token):
        """Test LSPD warrants list endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/lspd/warrants",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_lspd_fines_list(self, auth_token):
        """Test LSPD fines list endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/lspd/fines",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestEMSModule:
    """Tests for EMS module APIs"""
    
    @pytest.fixture
    def auth_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@purelife.rp",
            "password": "Admin@2026!"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
    
    def test_ems_stats(self, auth_token):
        """Test EMS stats endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/ems/stats",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "pazienti_totali" in data
        assert "referti_oggi" in data
        assert "referti_totali" in data
    
    def test_ems_reports_list(self, auth_token):
        """Test EMS reports list endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/ems/reports",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestDispatchModule:
    """Tests for Dispatch module APIs"""
    
    @pytest.fixture
    def auth_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@purelife.rp",
            "password": "Admin@2026!"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
    
    def test_dispatch_stats(self, auth_token):
        """Test Dispatch stats endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/dispatch/stats",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "chiamate_in_attesa" in data
        assert "chiamate_attive" in data
        assert "chiamate_p1" in data
        assert "completate_oggi" in data
    
    def test_dispatch_active_calls(self, auth_token):
        """Test Dispatch active calls endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/dispatch/calls/active",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestJusticeModule:
    """Tests for Justice module APIs"""
    
    @pytest.fixture
    def auth_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@purelife.rp",
            "password": "Admin@2026!"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
    
    def test_justice_stats(self, auth_token):
        """Test Justice stats endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/justice/stats",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "pratiche_in_attesa" in data
        assert "udienze_programmate" in data
        assert "verdetti_oggi" in data
    
    def test_justice_cases_list(self, auth_token):
        """Test Justice cases list endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/justice/cases",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_justice_hearings_list(self, auth_token):
        """Test Justice hearings list endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/justice/hearings",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestCityHubPublic:
    """Tests for City Hub public APIs"""
    
    def test_city_events(self):
        """Test City events endpoint (public)"""
        response = requests.get(f"{BASE_URL}/api/city/events")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_breaking_news(self):
        """Test Breaking news endpoint (public)"""
        response = requests.get(f"{BASE_URL}/api/news/breaking")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_city_ads(self):
        """Test City ads endpoint (public)"""
        response = requests.get(f"{BASE_URL}/api/city/ads/active")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
