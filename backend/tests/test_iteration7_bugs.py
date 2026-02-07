"""
Test suite for Iteration 7 - Bug fixes and new features
Tests:
1. Login with admin credentials
2. Presence status update to ONLINE
3. User list on /admin/users (12 users)
4. Duplicate email error message
5. Duplicate badge error message
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@purelife.rp"
ADMIN_PASSWORD = "Admin@2026!"


class TestLoginAndPresence:
    """Test login flow and presence status"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json().get("access_token")
    
    def test_login_success(self):
        """Test login with admin credentials returns correct data"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["email"] == ADMIN_EMAIL
        assert data["sector"] == "ADMIN"
        assert data["grade"] == "Super Admin"
        assert data["hierarchy_level"] == 10
        assert data["user_id"] == 1
    
    def test_login_redirects_admin_to_admin_page(self):
        """Test that admin user should redirect to /admin (frontend logic)"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify sector is ADMIN (frontend uses this to redirect)
        assert data["sector"] == "ADMIN"
    
    def test_presence_update_to_online(self, auth_token):
        """Test presence status can be updated to ONLINE"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.put(
            f"{BASE_URL}/api/chat/presence",
            json={"status": "online"},
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "online"
        assert data["user_id"] == 1
        assert data["game_name"] == "SuperAdmin"
    
    def test_presence_get_me(self, auth_token):
        """Test getting current user's presence status"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # First set to online
        requests.put(
            f"{BASE_URL}/api/chat/presence",
            json={"status": "online"},
            headers=headers
        )
        
        # Then get
        response = requests.get(
            f"{BASE_URL}/api/chat/presence/me",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "online"


class TestUserList:
    """Test user list functionality"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json().get("access_token")
    
    def test_user_list_returns_12_users(self, auth_token):
        """Test /api/users/all/list returns 12 users"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/users/all/list",
            headers=headers
        )
        
        assert response.status_code == 200
        users = response.json()
        
        assert len(users) == 12, f"Expected 12 users, got {len(users)}"
    
    def test_user_list_contains_admin(self, auth_token):
        """Test user list contains admin user with correct data"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/users/all/list",
            headers=headers
        )
        
        assert response.status_code == 200
        users = response.json()
        
        admin_user = next((u for u in users if u["email"] == ADMIN_EMAIL), None)
        assert admin_user is not None, "Admin user not found in list"
        
        assert admin_user["sector"] == "ADMIN"
        assert admin_user["grade"] == "Super Admin"
        assert admin_user["hierarchy_level"] == 10
    
    def test_user_list_contains_lspd_users(self, auth_token):
        """Test user list contains LSPD users with grades"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/users/all/list",
            headers=headers
        )
        
        assert response.status_code == 200
        users = response.json()
        
        lspd_users = [u for u in users if u["sector"] == "LSPD"]
        assert len(lspd_users) >= 2, f"Expected at least 2 LSPD users, got {len(lspd_users)}"
        
        # Check that grades are not empty
        for user in lspd_users:
            assert user["grade"] != "", f"LSPD user {user['email']} has empty grade"
    
    def test_user_response_structure(self, auth_token):
        """Test user response has all required fields"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/users/all/list",
            headers=headers
        )
        
        assert response.status_code == 200
        users = response.json()
        
        required_fields = [
            "id", "email", "game_name", "sector", "grade",
            "hierarchy_level", "is_sector_chief", "badge_number",
            "department", "is_active", "is_locked", "presence",
            "last_login", "created_at"
        ]
        
        for user in users:
            for field in required_fields:
                assert field in user, f"Missing field '{field}' in user {user.get('email', 'unknown')}"


class TestDuplicateErrors:
    """Test duplicate email and badge error messages"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json().get("access_token")
    
    def test_duplicate_email_error(self, auth_token):
        """Test creating user with duplicate email returns specific error"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/users/create",
            json={
                "email": ADMIN_EMAIL,  # Duplicate email
                "password": "Test@2026!",
                "game_name": "Test User",
                "sector": "LSPD",
                "hierarchy_level": 1
            },
            headers=headers
        )
        
        assert response.status_code == 409
        data = response.json()
        
        assert "Email già registrata" in data["detail"], f"Expected 'Email già registrata', got: {data['detail']}"
    
    def test_duplicate_badge_error(self, auth_token):
        """Test creating user with duplicate badge returns specific error"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # First, get an existing badge number
        users_response = requests.get(
            f"{BASE_URL}/api/users/all/list",
            headers=headers
        )
        users = users_response.json()
        
        existing_badge = None
        for user in users:
            if user.get("badge_number"):
                existing_badge = user["badge_number"]
                break
        
        if not existing_badge:
            # Create a user with a badge first
            create_response = requests.post(
                f"{BASE_URL}/api/users/create",
                json={
                    "email": "test_badge_iter7@purelife.rp",
                    "password": "Test@2026!",
                    "game_name": "Badge Test",
                    "sector": "LSPD",
                    "hierarchy_level": 1,
                    "badge_number": "TEST_BADGE_001"
                },
                headers=headers
            )
            if create_response.status_code == 201:
                existing_badge = "TEST_BADGE_001"
            else:
                pytest.skip("Could not create test user with badge")
        
        # Now try to create with duplicate badge
        response = requests.post(
            f"{BASE_URL}/api/users/create",
            json={
                "email": "test_dup_badge_iter7@purelife.rp",
                "password": "Test@2026!",
                "game_name": "Dup Badge Test",
                "sector": "LSPD",
                "hierarchy_level": 1,
                "badge_number": existing_badge
            },
            headers=headers
        )
        
        assert response.status_code == 409
        data = response.json()
        
        assert "Matricola già in uso" in data["detail"], f"Expected 'Matricola già in uso', got: {data['detail']}"


class TestLogoAndAssets:
    """Test logo and static assets"""
    
    def test_logo_file_accessible(self):
        """Test logo.png is accessible"""
        response = requests.get(f"{BASE_URL}/logo.png")
        
        # Should return 200 or redirect to static file
        assert response.status_code in [200, 304], f"Logo not accessible: {response.status_code}"
    
    def test_health_endpoint(self):
        """Test health endpoint is working"""
        response = requests.get(f"{BASE_URL}/api/health")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "ok"
        assert data["backend"] == "ok"
        assert data["db"]["status"] == "ok"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
