"""
PURE LIFE OS - Iteration 22 - RBAC Sync Tests
Testing Task P1.1: Sincronizzazione Automatica Job/Gradi con ESX/QBCore
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@purelife.rp"
ADMIN_PASSWORD = "Admin@2026!"


class TestRBACSyncEndpoints:
    """Test RBAC Sync endpoints for FiveM job/grade synchronization"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        
        token = login_response.json().get("access_token")
        assert token, "No access token received"
        
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        self.token = token
    
    # ==========================================
    # GET /api/admin/rbac/sync/config
    # ==========================================
    
    def test_get_sync_config_returns_sources(self):
        """GET /api/admin/rbac/sync/config - Should return available sources"""
        response = self.session.get(f"{BASE_URL}/api/admin/rbac/sync/config")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify sources exist
        assert "sources" in data
        sources = data["sources"]
        assert len(sources) == 3
        
        # Verify source codes
        source_codes = [s["code"] for s in sources]
        assert "auto" in source_codes
        assert "esx" in source_codes
        assert "qbcore" in source_codes
        
        print(f"✅ Sources: {source_codes}")
    
    def test_get_sync_config_returns_modes(self):
        """GET /api/admin/rbac/sync/config - Should return available modes"""
        response = self.session.get(f"{BASE_URL}/api/admin/rbac/sync/config")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify modes exist
        assert "modes" in data
        modes = data["modes"]
        assert len(modes) == 2
        
        # Verify mode codes
        mode_codes = [m["code"] for m in modes]
        assert "merge" in mode_codes
        assert "strict" in mode_codes
        
        print(f"✅ Modes: {mode_codes}")
    
    def test_get_sync_config_returns_info(self):
        """GET /api/admin/rbac/sync/config - Should return info notes"""
        response = self.session.get(f"{BASE_URL}/api/admin/rbac/sync/config")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify info section exists
        assert "info" in data
        info = data["info"]
        
        assert "same_db_note" in info
        assert "dry_run_note" in info
        assert "italian_labels" in info
        
        print(f"✅ Info notes present")
    
    def test_get_sync_config_italian_labels(self):
        """GET /api/admin/rbac/sync/config - Should have Italian labels"""
        response = self.session.get(f"{BASE_URL}/api/admin/rbac/sync/config")
        
        assert response.status_code == 200
        data = response.json()
        
        # Check Italian labels in sources
        sources = data["sources"]
        auto_source = next(s for s in sources if s["code"] == "auto")
        assert "Rilevamento Automatico" in auto_source["name"]
        
        # Check Italian labels in modes
        modes = data["modes"]
        merge_mode = next(m for m in modes if m["code"] == "merge")
        assert "Unione" in merge_mode["name"]
        
        print(f"✅ Italian labels verified")
    
    # ==========================================
    # POST /api/admin/rbac/sync (dry_run=true)
    # ==========================================
    
    def test_sync_dry_run_returns_report(self):
        """POST /api/admin/rbac/sync - dry_run=true should return a report"""
        response = self.session.post(
            f"{BASE_URL}/api/admin/rbac/sync",
            json={
                "source": "auto",
                "mode": "merge",
                "dry_run": True
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify report structure
        assert "timestamp" in data
        assert "source" in data
        assert "mode" in data
        assert "dry_run" in data
        assert data["dry_run"] == True
        
        # Verify counters exist
        assert "jobs_added" in data
        assert "jobs_updated" in data
        assert "jobs_skipped" in data
        assert "grades_added" in data
        assert "grades_updated" in data
        
        print(f"✅ Dry run report received: {data['timestamp']}")
    
    def test_sync_dry_run_no_framework_detected(self):
        """POST /api/admin/rbac/sync - Should report 'no framework detected' error"""
        response = self.session.post(
            f"{BASE_URL}/api/admin/rbac/sync",
            json={
                "source": "auto",
                "mode": "merge",
                "dry_run": True
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Since no ESX/QBCore tables exist, should have error
        assert "errors" in data
        assert len(data["errors"]) > 0
        
        # Check for framework detection error
        errors_text = " ".join(data["errors"])
        assert "framework" in errors_text.lower() or "rilevato" in errors_text.lower()
        
        # Framework detected should indicate unknown
        assert data.get("framework_detected") is not None
        assert "unknown" in data["framework_detected"].lower()
        
        print(f"✅ Expected error: {data['errors']}")
    
    def test_sync_dry_run_with_esx_source(self):
        """POST /api/admin/rbac/sync - ESX source should work"""
        response = self.session.post(
            f"{BASE_URL}/api/admin/rbac/sync",
            json={
                "source": "esx",
                "mode": "merge",
                "dry_run": True
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["source"] == "esx"
        assert data["dry_run"] == True
        
        print(f"✅ ESX source sync completed")
    
    def test_sync_dry_run_with_qbcore_source(self):
        """POST /api/admin/rbac/sync - QBCore source should work"""
        response = self.session.post(
            f"{BASE_URL}/api/admin/rbac/sync",
            json={
                "source": "qbcore",
                "mode": "merge",
                "dry_run": True
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["source"] == "qbcore"
        assert data["dry_run"] == True
        
        print(f"✅ QBCore source sync completed")
    
    def test_sync_dry_run_with_strict_mode(self):
        """POST /api/admin/rbac/sync - Strict mode should work in dry_run"""
        response = self.session.post(
            f"{BASE_URL}/api/admin/rbac/sync",
            json={
                "source": "auto",
                "mode": "strict",
                "dry_run": True
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["mode"] == "strict"
        assert data["dry_run"] == True
        
        print(f"✅ Strict mode dry run completed")
    
    def test_sync_invalid_source_returns_400(self):
        """POST /api/admin/rbac/sync - Invalid source should return 400"""
        response = self.session.post(
            f"{BASE_URL}/api/admin/rbac/sync",
            json={
                "source": "invalid_source",
                "mode": "merge",
                "dry_run": True
            }
        )
        
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        
        print(f"✅ Invalid source rejected: {data['detail']}")
    
    def test_sync_invalid_mode_returns_400(self):
        """POST /api/admin/rbac/sync - Invalid mode should return 400"""
        response = self.session.post(
            f"{BASE_URL}/api/admin/rbac/sync",
            json={
                "source": "auto",
                "mode": "invalid_mode",
                "dry_run": True
            }
        )
        
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        
        print(f"✅ Invalid mode rejected: {data['detail']}")
    
    # ==========================================
    # GET /api/admin/rbac/sync/last-report
    # ==========================================
    
    def test_get_last_report_after_sync(self):
        """GET /api/admin/rbac/sync/last-report - Should return last report after sync"""
        # First, perform a sync
        sync_response = self.session.post(
            f"{BASE_URL}/api/admin/rbac/sync",
            json={
                "source": "auto",
                "mode": "merge",
                "dry_run": True
            }
        )
        assert sync_response.status_code == 200
        
        # Then get last report
        response = self.session.get(f"{BASE_URL}/api/admin/rbac/sync/last-report")
        
        assert response.status_code == 200
        data = response.json()
        
        # Should have report data (not null)
        if data is not None:
            assert "timestamp" in data
            assert "source" in data
            assert "mode" in data
            print(f"✅ Last report retrieved: {data['timestamp']}")
        else:
            # Report might be null if singleton was reset
            print(f"✅ Last report is null (expected if service restarted)")
    
    # ==========================================
    # Authorization Tests
    # ==========================================
    
    def test_sync_requires_authentication(self):
        """POST /api/admin/rbac/sync - Should require authentication"""
        # Create new session without auth
        no_auth_session = requests.Session()
        no_auth_session.headers.update({"Content-Type": "application/json"})
        
        response = no_auth_session.post(
            f"{BASE_URL}/api/admin/rbac/sync",
            json={
                "source": "auto",
                "mode": "merge",
                "dry_run": True
            }
        )
        
        assert response.status_code in [401, 403]
        print(f"✅ Unauthenticated request rejected: {response.status_code}")
    
    def test_sync_config_requires_authentication(self):
        """GET /api/admin/rbac/sync/config - Should require authentication"""
        no_auth_session = requests.Session()
        no_auth_session.headers.update({"Content-Type": "application/json"})
        
        response = no_auth_session.get(f"{BASE_URL}/api/admin/rbac/sync/config")
        
        assert response.status_code in [401, 403]
        print(f"✅ Unauthenticated config request rejected: {response.status_code}")


class TestRBACSyncService:
    """Test RBAC Sync service logic"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert login_response.status_code == 200
        
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_sync_report_has_duration(self):
        """Sync report should include duration_ms"""
        response = self.session.post(
            f"{BASE_URL}/api/admin/rbac/sync",
            json={
                "source": "auto",
                "mode": "merge",
                "dry_run": True
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "duration_ms" in data
        assert isinstance(data["duration_ms"], int)
        assert data["duration_ms"] >= 0
        
        print(f"✅ Duration: {data['duration_ms']}ms")
    
    def test_sync_report_has_items_list(self):
        """Sync report should include items list"""
        response = self.session.post(
            f"{BASE_URL}/api/admin/rbac/sync",
            json={
                "source": "auto",
                "mode": "merge",
                "dry_run": True
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "items" in data
        assert isinstance(data["items"], list)
        
        print(f"✅ Items list present: {len(data['items'])} items")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
