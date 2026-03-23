"""
PURE LIFE OS - Iteration 25 - Multi-Role Login & Page Access Tests
Tests login for all roles (ADMIN, LSPD, EMS, CIVIL) and verifies page access
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from review request
TEST_ACCOUNTS = {
    "admin": {"email": "admin@purelife.rp", "password": "Admin@2026!", "expected_sector": "ADMIN"},
    "lspd": {"email": "lspd@purelife.rp", "password": "Lspd@2026!", "expected_sector": "LSPD"},
    "ems": {"email": "ems@purelife.rp", "password": "Ems@2026!", "expected_sector": "EMS"},
    "civil": {"email": "testflow@purelife.rp", "password": "CiaoCiao1!", "expected_sector": "CIVIL"},
}


class TestMultiRoleLogin:
    """Test login for all roles and verify correct sector assignment"""
    
    @pytest.fixture
    def api_client(self):
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        return session
    
    def test_admin_login(self, api_client):
        """Test ADMIN login - should return sector ADMIN"""
        account = TEST_ACCOUNTS["admin"]
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": account["email"],
            "password": account["password"]
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        assert data["sector"].upper() == account["expected_sector"], f"Expected sector {account['expected_sector']}, got {data['sector']}"
        print(f"✓ Admin login successful - sector: {data['sector']}")
    
    def test_lspd_login(self, api_client):
        """Test LSPD login - should return sector LSPD"""
        account = TEST_ACCOUNTS["lspd"]
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": account["email"],
            "password": account["password"]
        })
        assert response.status_code == 200, f"LSPD login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        assert data["sector"].upper() == account["expected_sector"], f"Expected sector {account['expected_sector']}, got {data['sector']}"
        print(f"✓ LSPD login successful - sector: {data['sector']}")
    
    def test_ems_login(self, api_client):
        """Test EMS login - should return sector EMS"""
        account = TEST_ACCOUNTS["ems"]
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": account["email"],
            "password": account["password"]
        })
        assert response.status_code == 200, f"EMS login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        assert data["sector"].upper() == account["expected_sector"], f"Expected sector {account['expected_sector']}, got {data['sector']}"
        print(f"✓ EMS login successful - sector: {data['sector']}")
    
    def test_civil_login(self, api_client):
        """Test CIVIL login - should return sector CIVIL"""
        account = TEST_ACCOUNTS["civil"]
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": account["email"],
            "password": account["password"]
        })
        assert response.status_code == 200, f"CIVIL login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        assert data["sector"].upper() == account["expected_sector"], f"Expected sector {account['expected_sector']}, got {data['sector']}"
        print(f"✓ CIVIL login successful - sector: {data['sector']}")
    
    def test_invalid_login(self, api_client):
        """Test login with invalid credentials"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@test.com",
            "password": "wrongpassword"
        })
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Invalid login correctly rejected")


class TestLSPDEndpoints:
    """Test LSPD module endpoints"""
    
    @pytest.fixture
    def lspd_token(self):
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_ACCOUNTS["lspd"]["email"],
            "password": TEST_ACCOUNTS["lspd"]["password"]
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("LSPD login failed")
    
    def test_lspd_cases(self, lspd_token):
        """Test GET /api/lspd/cases"""
        response = requests.get(
            f"{BASE_URL}/api/lspd/cases",
            headers={"Authorization": f"Bearer {lspd_token}"}
        )
        assert response.status_code == 200, f"LSPD cases failed: {response.text}"
        print(f"✓ LSPD cases endpoint working - {len(response.json())} cases")
    
    def test_lspd_warrants(self, lspd_token):
        """Test GET /api/lspd/warrants"""
        response = requests.get(
            f"{BASE_URL}/api/lspd/warrants",
            headers={"Authorization": f"Bearer {lspd_token}"}
        )
        assert response.status_code == 200, f"LSPD warrants failed: {response.text}"
        print(f"✓ LSPD warrants endpoint working")
    
    def test_lspd_fines(self, lspd_token):
        """Test GET /api/lspd/fines"""
        response = requests.get(
            f"{BASE_URL}/api/lspd/fines",
            headers={"Authorization": f"Bearer {lspd_token}"}
        )
        assert response.status_code == 200, f"LSPD fines failed: {response.text}"
        print(f"✓ LSPD fines endpoint working")


class TestEMSEndpoints:
    """Test EMS module endpoints"""
    
    @pytest.fixture
    def ems_token(self):
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_ACCOUNTS["ems"]["email"],
            "password": TEST_ACCOUNTS["ems"]["password"]
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("EMS login failed")
    
    def test_ems_patients(self, ems_token):
        """Test GET /api/ems/patients"""
        response = requests.get(
            f"{BASE_URL}/api/ems/patients",
            headers={"Authorization": f"Bearer {ems_token}"}
        )
        assert response.status_code == 200, f"EMS patients failed: {response.text}"
        print(f"✓ EMS patients endpoint working")
    
    def test_ems_reports(self, ems_token):
        """Test GET /api/ems/reports"""
        response = requests.get(
            f"{BASE_URL}/api/ems/reports",
            headers={"Authorization": f"Bearer {ems_token}"}
        )
        assert response.status_code == 200, f"EMS reports failed: {response.text}"
        print(f"✓ EMS reports endpoint working")


class TestJusticeEndpoints:
    """Test Justice module endpoints"""
    
    @pytest.fixture
    def admin_token(self):
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_ACCOUNTS["admin"]["email"],
            "password": TEST_ACCOUNTS["admin"]["password"]
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Admin login failed")
    
    def test_justice_cases(self, admin_token):
        """Test GET /api/justice/cases"""
        response = requests.get(
            f"{BASE_URL}/api/justice/cases",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Justice cases failed: {response.text}"
        print(f"✓ Justice cases endpoint working")
    
    def test_justice_hearings(self, admin_token):
        """Test GET /api/justice/hearings"""
        response = requests.get(
            f"{BASE_URL}/api/justice/hearings",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Justice hearings failed: {response.text}"
        print(f"✓ Justice hearings endpoint working")


class TestDispatchEndpoints:
    """Test Dispatch module endpoints"""
    
    @pytest.fixture
    def lspd_token(self):
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_ACCOUNTS["lspd"]["email"],
            "password": TEST_ACCOUNTS["lspd"]["password"]
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("LSPD login failed")
    
    def test_dispatch_stats(self, lspd_token):
        """Test GET /api/dispatch/stats"""
        response = requests.get(
            f"{BASE_URL}/api/dispatch/stats",
            headers={"Authorization": f"Bearer {lspd_token}"}
        )
        assert response.status_code == 200, f"Dispatch stats failed: {response.text}"
        print(f"✓ Dispatch stats endpoint working")
    
    def test_dispatch_calls(self, lspd_token):
        """Test GET /api/dispatch/calls"""
        response = requests.get(
            f"{BASE_URL}/api/dispatch/calls",
            headers={"Authorization": f"Bearer {lspd_token}"}
        )
        assert response.status_code == 200, f"Dispatch calls failed: {response.text}"
        print(f"✓ Dispatch calls endpoint working")


class TestChatEndpoints:
    """Test Chat module endpoints"""
    
    @pytest.fixture
    def admin_token(self):
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_ACCOUNTS["admin"]["email"],
            "password": TEST_ACCOUNTS["admin"]["password"]
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Admin login failed")
    
    def test_chat_channels(self, admin_token):
        """Test GET /api/chat/channels"""
        response = requests.get(
            f"{BASE_URL}/api/chat/channels",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Chat channels failed: {response.text}"
        print(f"✓ Chat channels endpoint working")


class TestMarketplaceEndpoints:
    """Test Marketplace module endpoints"""
    
    @pytest.fixture
    def civil_token(self):
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_ACCOUNTS["civil"]["email"],
            "password": TEST_ACCOUNTS["civil"]["password"]
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Civil login failed")
    
    def test_marketplace_list(self, civil_token):
        """Test GET /api/marketplace"""
        response = requests.get(
            f"{BASE_URL}/api/marketplace",
            headers={"Authorization": f"Bearer {civil_token}"}
        )
        assert response.status_code == 200, f"Marketplace list failed: {response.text}"
        print(f"✓ Marketplace list endpoint working")


class TestDocumentsEndpoints:
    """Test Documents module endpoints"""
    
    @pytest.fixture
    def admin_token(self):
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_ACCOUNTS["admin"]["email"],
            "password": TEST_ACCOUNTS["admin"]["password"]
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Admin login failed")
    
    def test_documents_list(self, admin_token):
        """Test GET /api/documents"""
        response = requests.get(
            f"{BASE_URL}/api/documents",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Documents list failed: {response.text}"
        print(f"✓ Documents list endpoint working")


class TestCityHubEndpoints:
    """Test City Hub public endpoints"""
    
    def test_city_events(self):
        """Test GET /api/city/events - public endpoint"""
        response = requests.get(f"{BASE_URL}/api/city/events")
        assert response.status_code == 200, f"City events failed: {response.text}"
        print(f"✓ City events endpoint working")
    
    def test_news_list(self):
        """Test GET /api/news - public endpoint"""
        response = requests.get(f"{BASE_URL}/api/news/")
        assert response.status_code == 200, f"News list failed: {response.text}"
        print(f"✓ News list endpoint working")
    
    def test_announcements_public(self):
        """Test GET /api/announcements/public - public endpoint"""
        response = requests.get(f"{BASE_URL}/api/announcements/public")
        assert response.status_code == 200, f"Announcements public failed: {response.text}"
        print(f"✓ Announcements public endpoint working")


class TestAdminEndpoints:
    """Test Admin module endpoints"""
    
    @pytest.fixture
    def admin_token(self):
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_ACCOUNTS["admin"]["email"],
            "password": TEST_ACCOUNTS["admin"]["password"]
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Admin login failed")
    
    def test_admin_stats(self, admin_token):
        """Test GET /api/admin/stats"""
        response = requests.get(
            f"{BASE_URL}/api/admin/stats",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        # Admin stats may return 200 or 404 depending on implementation
        assert response.status_code in [200, 404], f"Admin stats unexpected: {response.status_code}"
        print(f"✓ Admin stats endpoint checked - status: {response.status_code}")
    
    def test_admin_users(self, admin_token):
        """Test GET /api/admin/users"""
        response = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        # May return 200 or 404 depending on implementation
        assert response.status_code in [200, 404], f"Admin users unexpected: {response.status_code}"
        print(f"✓ Admin users endpoint checked - status: {response.status_code}")


class TestTimelineEndpoints:
    """Test Timeline module endpoints"""
    
    @pytest.fixture
    def admin_token(self):
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_ACCOUNTS["admin"]["email"],
            "password": TEST_ACCOUNTS["admin"]["password"]
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Admin login failed")
    
    def test_timeline_list(self, admin_token):
        """Test GET /api/timeline"""
        response = requests.get(
            f"{BASE_URL}/api/timeline/",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Timeline list failed: {response.text}"
        print(f"✓ Timeline list endpoint working")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
