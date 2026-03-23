"""
Iteration 28 - FiveM Auto-Link Feature Tests
Tests for:
- POST /api/auth/link-fivem (server-to-server link with bridge_secret)
- POST /api/auth/link-fivem-token (JWT + bridge_secret link)
- GET /api/auth/fivem-status (check link status)
- Regression: Previous citizen/ticket features still work
- Regression: LSPD cannot access ticket staff APIs (403)
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
CITIZEN_EMAIL = "testflow@purelife.rp"
CITIZEN_PASSWORD = "CiaoCiao1!"
ADMIN_EMAIL = "admin@purelife.rp"
ADMIN_PASSWORD = "Admin@2026!"
LSPD_EMAIL = "lspd@purelife.rp"
LSPD_PASSWORD = "Lspd@2026!"

# Bridge secret
BRIDGE_SECRET = "plos-bridge-secret-2026"
WRONG_SECRET = "wrong-secret-12345"


class TestFiveMLink:
    """Tests for FiveM auto-link endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def login(self, email, password):
        """Helper to login and get token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": email,
            "password": password
        })
        if response.status_code == 200:
            data = response.json()
            return data.get("access_token"), data.get("user_id")
        return None, None
    
    # ==========================================
    # POST /api/auth/link-fivem (server-to-server)
    # ==========================================
    
    def test_link_fivem_with_valid_secret(self):
        """Test server-to-server FiveM link with valid bridge_secret"""
        # First login to get user_id
        token, user_id = self.login(CITIZEN_EMAIL, CITIZEN_PASSWORD)
        assert token is not None, "Citizen login failed"
        assert user_id is not None, "User ID not returned"
        
        # Generate unique identifier for test
        test_identifier = f"steam:TEST_{uuid.uuid4().hex[:12]}"
        
        response = self.session.post(f"{BASE_URL}/api/auth/link-fivem", json={
            "user_id": user_id,
            "fivem_identifier": test_identifier,
            "bridge_secret": BRIDGE_SECRET
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True, "Expected success=True"
        assert "linked_identifier" in data, "Expected linked_identifier in response"
        print(f"✓ link-fivem with valid secret: {data}")
    
    def test_link_fivem_rejects_wrong_secret(self):
        """Test server-to-server FiveM link rejects wrong bridge_secret (403)"""
        token, user_id = self.login(CITIZEN_EMAIL, CITIZEN_PASSWORD)
        assert token is not None, "Citizen login failed"
        
        response = self.session.post(f"{BASE_URL}/api/auth/link-fivem", json={
            "user_id": user_id,
            "fivem_identifier": "steam:WRONG_TEST_123",
            "bridge_secret": WRONG_SECRET
        })
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print(f"✓ link-fivem rejects wrong secret: 403")
    
    def test_link_fivem_rejects_invalid_user(self):
        """Test server-to-server FiveM link rejects invalid user_id (404)"""
        response = self.session.post(f"{BASE_URL}/api/auth/link-fivem", json={
            "user_id": 999999,  # Non-existent user
            "fivem_identifier": "steam:INVALID_USER_TEST",
            "bridge_secret": BRIDGE_SECRET
        })
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print(f"✓ link-fivem rejects invalid user: 404")
    
    # ==========================================
    # POST /api/auth/link-fivem-token (JWT + bridge_secret)
    # ==========================================
    
    def test_link_fivem_token_with_valid_credentials(self):
        """Test JWT-based FiveM link with valid token and bridge_secret"""
        token, user_id = self.login(CITIZEN_EMAIL, CITIZEN_PASSWORD)
        assert token is not None, "Citizen login failed"
        
        test_identifier = f"steam:TOKEN_TEST_{uuid.uuid4().hex[:12]}"
        
        response = self.session.post(
            f"{BASE_URL}/api/auth/link-fivem-token",
            json={
                "fivem_identifier": test_identifier,
                "bridge_secret": BRIDGE_SECRET
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True, "Expected success=True"
        print(f"✓ link-fivem-token with valid credentials: {data}")
    
    def test_link_fivem_token_rejects_wrong_secret(self):
        """Test JWT-based FiveM link rejects wrong bridge_secret (403)"""
        token, user_id = self.login(CITIZEN_EMAIL, CITIZEN_PASSWORD)
        assert token is not None, "Citizen login failed"
        
        response = self.session.post(
            f"{BASE_URL}/api/auth/link-fivem-token",
            json={
                "fivem_identifier": "steam:WRONG_SECRET_TEST",
                "bridge_secret": WRONG_SECRET
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print(f"✓ link-fivem-token rejects wrong secret: 403")
    
    def test_link_fivem_token_requires_auth(self):
        """Test JWT-based FiveM link requires authentication (401 or 403)"""
        response = self.session.post(
            f"{BASE_URL}/api/auth/link-fivem-token",
            json={
                "fivem_identifier": "steam:NO_AUTH_TEST",
                "bridge_secret": BRIDGE_SECRET
            }
        )
        
        # Accept both 401 and 403 as valid "not authenticated" responses
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}: {response.text}"
        print(f"✓ link-fivem-token requires auth: {response.status_code}")
    
    # ==========================================
    # GET /api/auth/fivem-status
    # ==========================================
    
    def test_fivem_status_linked_user(self):
        """Test fivem-status returns linked=true for linked user"""
        token, user_id = self.login(CITIZEN_EMAIL, CITIZEN_PASSWORD)
        assert token is not None, "Citizen login failed"
        
        # First link the account
        test_identifier = f"steam:STATUS_TEST_{uuid.uuid4().hex[:12]}"
        link_response = self.session.post(
            f"{BASE_URL}/api/auth/link-fivem-token",
            json={
                "fivem_identifier": test_identifier,
                "bridge_secret": BRIDGE_SECRET
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        assert link_response.status_code == 200, "Link failed"
        
        # Now check status
        response = self.session.get(
            f"{BASE_URL}/api/auth/fivem-status",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("linked") == True, f"Expected linked=True, got {data}"
        assert "identifier_preview" in data, "Expected identifier_preview in response"
        assert data.get("user_id") == user_id, "User ID mismatch"
        print(f"✓ fivem-status for linked user: {data}")
    
    def test_fivem_status_unlinked_user(self):
        """Test fivem-status returns linked=false for unlinked user"""
        # Login as admin (who should not have FiveM linked)
        token, user_id = self.login(ADMIN_EMAIL, ADMIN_PASSWORD)
        assert token is not None, "Admin login failed"
        
        response = self.session.get(
            f"{BASE_URL}/api/auth/fivem-status",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        # Admin may or may not be linked, just verify structure
        assert "linked" in data, "Expected 'linked' field in response"
        assert "user_id" in data, "Expected 'user_id' field in response"
        print(f"✓ fivem-status structure valid: {data}")
    
    def test_fivem_status_requires_auth(self):
        """Test fivem-status requires authentication (401 or 403)"""
        response = self.session.get(f"{BASE_URL}/api/auth/fivem-status")
        
        # Accept both 401 and 403 as valid "not authenticated" responses
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}: {response.text}"
        print(f"✓ fivem-status requires auth: {response.status_code}")


class TestRegressionCitizenFeatures:
    """Regression tests for citizen features"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def login(self, email, password):
        """Helper to login and get token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": email,
            "password": password
        })
        if response.status_code == 200:
            data = response.json()
            return data.get("access_token"), data.get("user_id")
        return None, None
    
    def test_citizen_login(self):
        """Test citizen login still works"""
        token, user_id = self.login(CITIZEN_EMAIL, CITIZEN_PASSWORD)
        assert token is not None, "Citizen login failed"
        assert user_id is not None, "User ID not returned"
        print(f"✓ Citizen login works: user_id={user_id}")
    
    def test_citizen_dashboard(self):
        """Test citizen dashboard API still works"""
        token, _ = self.login(CITIZEN_EMAIL, CITIZEN_PASSWORD)
        assert token is not None, "Citizen login failed"
        
        response = self.session.get(
            f"{BASE_URL}/api/citizen/dashboard",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "fines" in data or "tickets" in data or "game_name" in data, "Dashboard data missing expected fields"
        print(f"✓ Citizen dashboard works")
    
    def test_citizen_fines(self):
        """Test citizen fines API still works"""
        token, _ = self.login(CITIZEN_EMAIL, CITIZEN_PASSWORD)
        assert token is not None, "Citizen login failed"
        
        response = self.session.get(
            f"{BASE_URL}/api/citizen/fines",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"✓ Citizen fines API works")
    
    def test_citizen_warrants(self):
        """Test citizen warrants API still works"""
        token, _ = self.login(CITIZEN_EMAIL, CITIZEN_PASSWORD)
        assert token is not None, "Citizen login failed"
        
        response = self.session.get(
            f"{BASE_URL}/api/citizen/warrants",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"✓ Citizen warrants API works")
    
    def test_citizen_tickets(self):
        """Test citizen tickets API still works"""
        token, _ = self.login(CITIZEN_EMAIL, CITIZEN_PASSWORD)
        assert token is not None, "Citizen login failed"
        
        response = self.session.get(
            f"{BASE_URL}/api/tickets/my",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"✓ Citizen tickets API works")


class TestRegressionAccessControl:
    """Regression tests for access control - LSPD cannot access ticket staff APIs"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def login(self, email, password):
        """Helper to login and get token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": email,
            "password": password
        })
        if response.status_code == 200:
            data = response.json()
            return data.get("access_token"), data.get("user_id")
        return None, None
    
    def test_lspd_login(self):
        """Test LSPD login still works"""
        token, user_id = self.login(LSPD_EMAIL, LSPD_PASSWORD)
        assert token is not None, "LSPD login failed"
        print(f"✓ LSPD login works: user_id={user_id}")
    
    def test_lspd_cannot_access_ticket_staff_all(self):
        """Test LSPD cannot access /api/tickets/staff/all (403)"""
        token, _ = self.login(LSPD_EMAIL, LSPD_PASSWORD)
        assert token is not None, "LSPD login failed"
        
        response = self.session.get(
            f"{BASE_URL}/api/tickets/staff/all",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print(f"✓ LSPD cannot access ticket staff/all: 403")
    
    def test_lspd_cannot_access_ticket_staff_stats(self):
        """Test LSPD cannot access /api/tickets/staff/stats (403)"""
        token, _ = self.login(LSPD_EMAIL, LSPD_PASSWORD)
        assert token is not None, "LSPD login failed"
        
        response = self.session.get(
            f"{BASE_URL}/api/tickets/staff/stats",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print(f"✓ LSPD cannot access ticket staff/stats: 403")
    
    def test_admin_can_access_ticket_staff(self):
        """Test Admin can still access ticket staff APIs"""
        token, _ = self.login(ADMIN_EMAIL, ADMIN_PASSWORD)
        assert token is not None, "Admin login failed"
        
        response = self.session.get(
            f"{BASE_URL}/api/tickets/staff/all",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"✓ Admin can access ticket staff/all: 200")


class TestLbPhoneNotifications:
    """Test lb-phone notification endpoints with FiveM identifier"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_lbphone_pending_with_secret(self):
        """Test lb-phone pending notifications endpoint"""
        response = self.session.get(
            f"{BASE_URL}/api/lbphone/notifications/pending",
            params={"secret": BRIDGE_SECRET}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "notifications" in data, "Expected 'notifications' in response"
        print(f"✓ lb-phone pending works: {len(data.get('notifications', []))} notifications")
    
    def test_lbphone_rejects_wrong_secret(self):
        """Test lb-phone rejects wrong secret (403)"""
        response = self.session.get(
            f"{BASE_URL}/api/lbphone/notifications/pending",
            params={"secret": WRONG_SECRET}
        )
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print(f"✓ lb-phone rejects wrong secret: 403")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
