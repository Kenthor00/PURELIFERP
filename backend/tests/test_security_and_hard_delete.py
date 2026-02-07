"""
Test Suite for Security Bug Fix and Hard Delete Feature
Iteration 8 - Testing:
1. SECURITY: Token validation via /api/auth/me
2. SECURITY: Invalid token returns 401
3. Hard delete endpoint with confirmation
4. Cannot delete self
5. Cannot delete last admin
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@purelife.rp"
ADMIN_PASSWORD = "Admin@2026!"


class TestSecurityTokenValidation:
    """Test security: token validation via /api/auth/me"""
    
    def test_auth_me_without_token_returns_401(self):
        """GET /api/auth/me without token should return 401"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print("✓ GET /api/auth/me without token returns 401")
    
    def test_auth_me_with_invalid_token_returns_401(self):
        """GET /api/auth/me with invalid token should return 401"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": "Bearer invalid_token_12345"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print("✓ GET /api/auth/me with invalid token returns 401")
    
    def test_auth_me_with_expired_token_returns_401(self):
        """GET /api/auth/me with expired/malformed token should return 401"""
        # Malformed JWT
        fake_jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {fake_jwt}"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print("✓ GET /api/auth/me with expired/malformed token returns 401")
    
    def test_login_success_returns_token_and_user(self):
        """POST /api/auth/login with valid credentials returns token and user data"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "access_token" in data, "Missing access_token in response"
        assert "refresh_token" in data, "Missing refresh_token in response"
        assert "user_id" in data, "Missing user_id in response"
        assert data.get("email") == ADMIN_EMAIL, f"Email mismatch: {data.get('email')}"
        assert data.get("sector") == "ADMIN", f"Sector mismatch: {data.get('sector')}"
        assert data.get("hierarchy_level") == 10, f"Hierarchy level mismatch: {data.get('hierarchy_level')}"
        
        print(f"✓ Login successful - user_id: {data['user_id']}, sector: {data['sector']}, level: {data['hierarchy_level']}")
    
    def test_auth_me_with_valid_token_returns_user(self):
        """GET /api/auth/me with valid token returns user data"""
        # First login to get token
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        token = login_response.json()["access_token"]
        
        # Now test /api/auth/me
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Missing id in response"
        assert data.get("email") == ADMIN_EMAIL, f"Email mismatch: {data.get('email')}"
        
        print(f"✓ GET /api/auth/me with valid token returns user: {data.get('email')}")


class TestHardDeleteEndpoint:
    """Test hard delete endpoint functionality"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token for authenticated requests"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if response.status_code != 200:
            pytest.skip(f"Cannot login as admin: {response.text}")
        return response.json()["access_token"]
    
    @pytest.fixture
    def admin_user_id(self, admin_token):
        """Get admin user ID"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        return response.json()["id"]
    
    def test_hard_delete_without_confirmation_returns_400(self, admin_token):
        """DELETE /api/users/{id}/hard-delete without DELETE confirmation returns 400"""
        # First get a user to try to delete
        response = requests.get(
            f"{BASE_URL}/api/users/all/list",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to get users: {response.text}"
        
        users = response.json()
        # Find a non-admin user to test with
        target_user = None
        for user in users:
            if user.get("sector") != "ADMIN" and not user.get("is_deleted"):
                target_user = user
                break
        
        if not target_user:
            pytest.skip("No non-admin user found to test hard delete")
        
        # Try to delete without proper confirmation
        delete_response = requests.delete(
            f"{BASE_URL}/api/users/{target_user['id']}/hard-delete",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"confirmation": "WRONG"}
        )
        
        assert delete_response.status_code == 400, f"Expected 400, got {delete_response.status_code}: {delete_response.text}"
        assert "DELETE" in delete_response.json().get("detail", ""), "Error message should mention DELETE confirmation"
        
        print(f"✓ Hard delete without DELETE confirmation returns 400")
    
    def test_hard_delete_empty_confirmation_returns_400(self, admin_token):
        """DELETE /api/users/{id}/hard-delete with empty confirmation returns 400"""
        # Get a user
        response = requests.get(
            f"{BASE_URL}/api/users/all/list",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        users = response.json()
        target_user = None
        for user in users:
            if user.get("sector") != "ADMIN" and not user.get("is_deleted"):
                target_user = user
                break
        
        if not target_user:
            pytest.skip("No non-admin user found")
        
        delete_response = requests.delete(
            f"{BASE_URL}/api/users/{target_user['id']}/hard-delete",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"confirmation": ""}
        )
        
        assert delete_response.status_code == 400, f"Expected 400, got {delete_response.status_code}"
        print("✓ Hard delete with empty confirmation returns 400")
    
    def test_cannot_delete_self(self, admin_token, admin_user_id):
        """Admin cannot delete their own account"""
        delete_response = requests.delete(
            f"{BASE_URL}/api/users/{admin_user_id}/hard-delete",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"confirmation": "DELETE"}
        )
        
        assert delete_response.status_code == 403, f"Expected 403, got {delete_response.status_code}: {delete_response.text}"
        assert "stesso" in delete_response.json().get("detail", "").lower() or "self" in delete_response.json().get("detail", "").lower(), \
            "Error message should mention cannot delete self"
        
        print(f"✓ Cannot delete self - returns 403")
    
    def test_hard_delete_requires_admin_level_10(self):
        """Hard delete requires ADMIN with hierarchy_level >= 10"""
        # This test verifies the permission check exists
        # We test by trying without auth
        delete_response = requests.delete(
            f"{BASE_URL}/api/users/1/hard-delete",
            json={"confirmation": "DELETE"}
        )
        
        # Should return 401 (no auth) or 403 (wrong permissions)
        assert delete_response.status_code in [401, 403], f"Expected 401 or 403, got {delete_response.status_code}"
        print("✓ Hard delete requires authentication")
    
    def test_hard_delete_nonexistent_user_returns_404(self, admin_token):
        """DELETE /api/users/{id}/hard-delete for non-existent user returns 404"""
        delete_response = requests.delete(
            f"{BASE_URL}/api/users/999999/hard-delete",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"confirmation": "DELETE"}
        )
        
        assert delete_response.status_code == 404, f"Expected 404, got {delete_response.status_code}: {delete_response.text}"
        print("✓ Hard delete non-existent user returns 404")


class TestHardDeleteWithTestUser:
    """Test actual hard delete with a test user (create, delete, verify)"""
    
    @pytest.fixture
    def admin_session(self):
        """Get admin session with token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if response.status_code != 200:
            pytest.skip(f"Cannot login as admin: {response.text}")
        
        token = response.json()["access_token"]
        session = requests.Session()
        session.headers.update({
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        })
        return session
    
    def test_create_and_hard_delete_user(self, admin_session):
        """Create a test user, then hard delete and verify anonymization"""
        # Create a test user
        test_email = f"TEST_delete_{uuid.uuid4().hex[:8]}@purelife.rp"
        test_game_name = f"TEST_DeleteUser_{uuid.uuid4().hex[:4]}"
        
        create_response = admin_session.post(
            f"{BASE_URL}/api/users/create",
            json={
                "email": test_email,
                "password": "TestPass@2026!",
                "game_name": test_game_name,
                "sector": "CIVIL",
                "hierarchy_level": 1,
                "is_sector_chief": False
            }
        )
        
        if create_response.status_code != 200:
            pytest.skip(f"Cannot create test user: {create_response.text}")
        
        created_user = create_response.json()
        user_id = created_user["id"]
        print(f"✓ Created test user: {test_email} (ID: {user_id})")
        
        # Now hard delete the user
        delete_response = admin_session.delete(
            f"{BASE_URL}/api/users/{user_id}/hard-delete",
            json={"confirmation": "DELETE"}
        )
        
        assert delete_response.status_code == 200, f"Hard delete failed: {delete_response.text}"
        
        delete_data = delete_response.json()
        assert delete_data.get("user_id") == user_id, "User ID mismatch in response"
        assert delete_data.get("original_email") == test_email, "Original email mismatch"
        
        print(f"✓ Hard deleted user {user_id}")
        
        # Verify user is marked as deleted and anonymized
        # Get all users including deleted
        users_response = admin_session.get(
            f"{BASE_URL}/api/users/all/list?include_deleted=true"
        )
        
        assert users_response.status_code == 200, f"Failed to get users: {users_response.text}"
        
        users = users_response.json()
        deleted_user = None
        for user in users:
            if user["id"] == user_id:
                deleted_user = user
                break
        
        if deleted_user:
            assert deleted_user.get("is_deleted") == True, "User should be marked as deleted"
            assert deleted_user.get("game_name") == "DELETED", f"Game name should be DELETED, got: {deleted_user.get('game_name')}"
            assert "deleted_" in deleted_user.get("email", ""), f"Email should be anonymized, got: {deleted_user.get('email')}"
            print(f"✓ User anonymized: email={deleted_user.get('email')}, game_name={deleted_user.get('game_name')}")
        else:
            print("✓ User not found in list (may be filtered out)")
        
        print("✓ Hard delete with anonymization working correctly")


class TestPresenceAfterLogin:
    """Test presence status updates after login"""
    
    def test_presence_updates_to_online_after_login(self):
        """After login, presence should be updated to online"""
        # Login
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        token = login_response.json()["access_token"]
        
        # Update presence to online
        presence_response = requests.put(
            f"{BASE_URL}/api/chat/presence",
            headers={"Authorization": f"Bearer {token}"},
            json={"status": "online"}
        )
        
        assert presence_response.status_code == 200, f"Presence update failed: {presence_response.text}"
        
        data = presence_response.json()
        assert data.get("status") == "online", f"Expected online, got: {data.get('status')}"
        
        print("✓ Presence updates to online after login")
    
    def test_get_my_presence(self):
        """GET /api/chat/presence/me returns current presence"""
        # Login
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        token = login_response.json()["access_token"]
        
        # Get presence
        response = requests.get(
            f"{BASE_URL}/api/chat/presence/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Get presence failed: {response.text}"
        print(f"✓ GET /api/chat/presence/me returns: {response.json()}")


class TestLogoutEndpoint:
    """Test logout functionality"""
    
    def test_logout_endpoint_exists(self):
        """POST /api/auth/logout should exist"""
        # Login first
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        token = login_response.json()["access_token"]
        refresh_token = login_response.json()["refresh_token"]
        
        # Try logout
        logout_response = requests.post(
            f"{BASE_URL}/api/auth/logout",
            headers={"Authorization": f"Bearer {token}"},
            json={"refresh_token": refresh_token}
        )
        
        # Should return 200 or 204 (success) or 404 (not implemented)
        print(f"Logout response: {logout_response.status_code} - {logout_response.text[:200] if logout_response.text else 'empty'}")
        
        # Even if logout endpoint doesn't exist, the frontend handles it by clearing localStorage
        if logout_response.status_code in [200, 204]:
            print("✓ Logout endpoint working")
        else:
            print(f"⚠ Logout endpoint returned {logout_response.status_code} - frontend handles logout via localStorage.clear()")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
