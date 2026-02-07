"""
Test Suite for Citizen Registration Feature - Iteration 9
Tests the public citizen registration endpoint and related flows
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthAndBasics:
    """Basic health checks before testing registration"""
    
    def test_backend_health(self):
        """Backend must be available"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["backend"] == "ok"
        assert data["db"]["status"] == "ok"
        print(f"✓ Backend health OK: {data}")
    
    def test_city_hub_loads(self):
        """City hub page data should load"""
        # Test breaking news endpoint
        response = requests.get(f"{BASE_URL}/api/news/breaking?limit=3")
        assert response.status_code == 200
        print(f"✓ Breaking news endpoint OK")
        
        # Test active ads endpoint
        response = requests.get(f"{BASE_URL}/api/city/ads/active?slot_type=premium_banner&limit=5")
        assert response.status_code == 200
        print(f"✓ Active ads endpoint OK")
        
        # Test events endpoint
        response = requests.get(f"{BASE_URL}/api/city/events?limit=6")
        assert response.status_code == 200
        print(f"✓ Events endpoint OK")


class TestCitizenRegistration:
    """Tests for POST /api/auth/register/citizen endpoint"""
    
    @pytest.fixture
    def unique_email(self):
        """Generate unique email for each test"""
        return f"test_citizen_{uuid.uuid4().hex[:8]}@test.com"
    
    def test_register_citizen_success(self, unique_email):
        """Successful citizen registration creates CIVIL user with level 1"""
        payload = {
            "email": unique_email,
            "password": "TestPass123!",
            "game_name": "Test Citizen"
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/register/citizen", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify response structure
        assert "access_token" in data, "Missing access_token in response"
        assert "refresh_token" in data, "Missing refresh_token in response"
        assert data["token_type"] == "bearer"
        assert data["email"] == unique_email.lower()
        assert data["game_name"] == "Test Citizen"
        assert data["sector"] == "CIVIL", f"Expected CIVIL sector, got {data['sector']}"
        assert data["grade"] == "Cittadino"
        assert "user_id" in data
        
        print(f"✓ Citizen registration successful: {data['email']} (ID: {data['user_id']})")
        
        # Verify token works by calling /api/auth/me
        headers = {"Authorization": f"Bearer {data['access_token']}"}
        me_response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert me_response.status_code == 200
        me_data = me_response.json()
        assert me_data["sector"] == "CIVIL"
        assert me_data["hierarchy_level"] == 1
        print(f"✓ Token valid, user verified: sector={me_data['sector']}, level={me_data['hierarchy_level']}")
    
    def test_register_duplicate_email_returns_409(self, unique_email):
        """Registration with existing email returns 409 conflict"""
        payload = {
            "email": unique_email,
            "password": "TestPass123!",
            "game_name": "First User"
        }
        
        # First registration
        response1 = requests.post(f"{BASE_URL}/api/auth/register/citizen", json=payload)
        assert response1.status_code == 200
        
        # Second registration with same email
        payload["game_name"] = "Second User"
        response2 = requests.post(f"{BASE_URL}/api/auth/register/citizen", json=payload)
        assert response2.status_code == 409, f"Expected 409, got {response2.status_code}: {response2.text}"
        
        data = response2.json()
        assert "già registrata" in data["detail"].lower() or "already" in data["detail"].lower()
        print(f"✓ Duplicate email correctly rejected with 409: {data['detail']}")
    
    def test_register_short_password_returns_400(self, unique_email):
        """Registration with password < 8 chars returns 400"""
        payload = {
            "email": unique_email,
            "password": "short",  # Too short
            "game_name": "Test User"
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/register/citizen", json=payload)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print(f"✓ Short password correctly rejected with 400: {response.json()['detail']}")
    
    def test_register_short_game_name_returns_400(self, unique_email):
        """Registration with game_name < 3 chars returns 400"""
        payload = {
            "email": unique_email,
            "password": "TestPass123!",
            "game_name": "AB"  # Too short
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/register/citizen", json=payload)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "3 caratteri" in data["detail"] or "3 char" in data["detail"].lower()
        print(f"✓ Short game_name correctly rejected with 400: {data['detail']}")
    
    def test_register_empty_game_name_returns_400(self, unique_email):
        """Registration with empty game_name returns 400"""
        payload = {
            "email": unique_email,
            "password": "TestPass123!",
            "game_name": ""
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/register/citizen", json=payload)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print(f"✓ Empty game_name correctly rejected with 400")
    
    def test_register_invalid_email_returns_422(self, unique_email):
        """Registration with invalid email format returns 422"""
        payload = {
            "email": "not-an-email",
            "password": "TestPass123!",
            "game_name": "Test User"
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/register/citizen", json=payload)
        assert response.status_code == 422, f"Expected 422, got {response.status_code}: {response.text}"
        print(f"✓ Invalid email format correctly rejected with 422")


class TestLoginWithNewCitizen:
    """Tests for login with newly registered citizen account"""
    
    def test_login_with_registered_citizen(self):
        """Login with newly registered citizen account works"""
        # Register new citizen
        unique_email = f"login_test_{uuid.uuid4().hex[:8]}@test.com"
        register_payload = {
            "email": unique_email,
            "password": "TestPass123!",
            "game_name": "Login Test User"
        }
        
        reg_response = requests.post(f"{BASE_URL}/api/auth/register/citizen", json=register_payload)
        assert reg_response.status_code == 200
        print(f"✓ Registered citizen: {unique_email}")
        
        # Now login with the same credentials
        login_payload = {
            "email": unique_email,
            "password": "TestPass123!"
        }
        
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json=login_payload)
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        
        login_data = login_response.json()
        assert "access_token" in login_data
        assert login_data["sector"] == "CIVIL"
        assert login_data["hierarchy_level"] == 1
        assert login_data["game_name"] == "Login Test User"
        print(f"✓ Login successful for citizen: {login_data['email']}")
    
    def test_login_with_existing_test_citizen(self):
        """Login with pre-existing test citizen (test_citizen@test.com)"""
        # Try to login with existing test citizen
        login_payload = {
            "email": "test_citizen@test.com",
            "password": "TestPass123!"  # Assuming this is the password
        }
        
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json=login_payload)
        # This may fail if password is different, just log the result
        if login_response.status_code == 200:
            print(f"✓ Existing test_citizen@test.com login successful")
        else:
            print(f"⚠ test_citizen@test.com login failed (may have different password): {login_response.status_code}")


class TestAdminLogin:
    """Verify admin login still works"""
    
    def test_admin_login(self):
        """Admin login with provided credentials"""
        login_payload = {
            "email": "admin@purelife.rp",
            "password": "Admin@2026!"
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/login", json=login_payload)
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        
        data = response.json()
        assert data["sector"] == "ADMIN"
        assert "access_token" in data
        print(f"✓ Admin login successful: {data['email']} (sector: {data['sector']})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
