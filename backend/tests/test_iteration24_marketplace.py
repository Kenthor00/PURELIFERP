"""
Test Iteration 24 - Marketplace Module
Tests for: listings CRUD, moderation, interests, statistics
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@purelife.rp"
ADMIN_PASSWORD = "Admin@2026!"


class TestMarketplaceAuth:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        """Auth headers for requests"""
        return {"Authorization": f"Bearer {admin_token}"}
    
    def test_admin_login(self):
        """Test admin login works"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["email"] == ADMIN_EMAIL


class TestMarketplaceCategories:
    """Category endpoint tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}"}
    
    def test_get_categories(self, auth_headers):
        """Test GET /api/marketplace/categories returns all categories"""
        response = requests.get(
            f"{BASE_URL}/api/marketplace/categories",
            headers=auth_headers
        )
        assert response.status_code == 200
        categories = response.json()
        assert isinstance(categories, list)
        assert len(categories) == 4
        
        # Verify category structure
        codes = [c["code"] for c in categories]
        assert "vehicles" in codes
        assert "real_estate" in codes
        assert "jobs" in codes
        assert "services" in codes
        
        # Verify each category has required fields
        for cat in categories:
            assert "code" in cat
            assert "name" in cat
            assert "name_short" in cat
            assert "color" in cat
            assert "description" in cat


class TestMarketplaceListings:
    """Listing CRUD tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}"}
    
    def test_list_listings_empty_or_populated(self, auth_headers):
        """Test GET /api/marketplace returns listings list"""
        response = requests.get(
            f"{BASE_URL}/api/marketplace",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "listings" in data
        assert "total" in data
        assert "page" in data
        assert "page_size" in data
        assert isinstance(data["listings"], list)
    
    def test_create_listing_vehicles(self, auth_headers):
        """Test POST /api/marketplace - Create vehicle listing"""
        payload = {
            "title": "TEST_Vendo BMW M3 2024 - Test Iteration 24",
            "description": "Bellissima BMW M3 2024, pochi km, perfette condizioni. Vendo per cambio auto.",
            "category": "vehicles",
            "price": 150000,
            "price_negotiable": True,
            "contact_phone": "555-1234",
            "contact_email": "test@example.com",
            "location": "Los Santos, Vinewood"
        }
        response = requests.post(
            f"{BASE_URL}/api/marketplace",
            json=payload,
            headers=auth_headers
        )
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert data["title"] == payload["title"]
        assert data["category"] == "vehicles"
        assert data["status"] == "pending"  # New listings start as pending
        assert data["price"] == 150000
        assert data["price_negotiable"] == True
        assert "id" in data
        
        # Store for later tests
        TestMarketplaceListings.created_listing_id = data["id"]
    
    def test_create_listing_real_estate(self, auth_headers):
        """Test POST /api/marketplace - Create real estate listing"""
        payload = {
            "title": "TEST_Affitto appartamento centro - Test Iteration 24",
            "description": "Appartamento 3 locali in centro città, luminoso e ben arredato. Disponibile subito.",
            "category": "real_estate",
            "price": 2500,
            "price_negotiable": False,
            "location": "Los Santos, Downtown"
        }
        response = requests.post(
            f"{BASE_URL}/api/marketplace",
            json=payload,
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["category"] == "real_estate"
        assert data["status"] == "pending"
        TestMarketplaceListings.real_estate_listing_id = data["id"]
    
    def test_create_listing_jobs(self, auth_headers):
        """Test POST /api/marketplace - Create job listing"""
        payload = {
            "title": "TEST_Cerco meccanico esperto - Test Iteration 24",
            "description": "Officina cerca meccanico con esperienza minima 2 anni. Ottima retribuzione.",
            "category": "jobs",
            "price": None,
            "price_negotiable": True,
            "location": "Los Santos, Industrial"
        }
        response = requests.post(
            f"{BASE_URL}/api/marketplace",
            json=payload,
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["category"] == "jobs"
        assert data["price_display"] == "Su richiesta"
        TestMarketplaceListings.job_listing_id = data["id"]
    
    def test_create_listing_services(self, auth_headers):
        """Test POST /api/marketplace - Create service listing"""
        payload = {
            "title": "TEST_Servizio taxi 24/7 - Test Iteration 24",
            "description": "Offro servizio taxi professionale 24 ore su 24. Prezzi competitivi.",
            "category": "services",
            "price": 50,
            "price_negotiable": True,
            "contact_phone": "555-TAXI"
        }
        response = requests.post(
            f"{BASE_URL}/api/marketplace",
            json=payload,
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["category"] == "services"
        TestMarketplaceListings.service_listing_id = data["id"]
    
    def test_create_listing_validation_title_too_short(self, auth_headers):
        """Test validation: title must be at least 5 chars"""
        payload = {
            "title": "ABC",  # Too short
            "description": "This is a valid description with more than 20 characters.",
            "category": "vehicles"
        }
        response = requests.post(
            f"{BASE_URL}/api/marketplace",
            json=payload,
            headers=auth_headers
        )
        assert response.status_code == 422
    
    def test_create_listing_validation_description_too_short(self, auth_headers):
        """Test validation: description must be at least 20 chars"""
        payload = {
            "title": "Valid Title Here",
            "description": "Too short",  # Less than 20 chars
            "category": "vehicles"
        }
        response = requests.post(
            f"{BASE_URL}/api/marketplace",
            json=payload,
            headers=auth_headers
        )
        assert response.status_code == 422
    
    def test_get_listing_detail(self, auth_headers):
        """Test GET /api/marketplace/{id} - Get listing detail"""
        listing_id = getattr(TestMarketplaceListings, 'created_listing_id', None)
        if not listing_id:
            pytest.skip("No listing created")
        
        response = requests.get(
            f"{BASE_URL}/api/marketplace/{listing_id}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == listing_id
        assert "title" in data
        assert "description" in data
        assert "seller_name" in data
        assert "views_count" in data
    
    def test_get_listing_not_found(self, auth_headers):
        """Test GET /api/marketplace/{id} - Non-existent listing returns 404"""
        response = requests.get(
            f"{BASE_URL}/api/marketplace/999999",
            headers=auth_headers
        )
        assert response.status_code == 404
    
    def test_list_my_listings(self, auth_headers):
        """Test GET /api/marketplace?my_listings=true - Filter own listings"""
        response = requests.get(
            f"{BASE_URL}/api/marketplace?my_listings=true",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "listings" in data
        # All returned listings should be owned by current user
        for listing in data["listings"]:
            assert listing["is_owner"] == True
    
    def test_list_by_category(self, auth_headers):
        """Test GET /api/marketplace?category=vehicles - Filter by category"""
        response = requests.get(
            f"{BASE_URL}/api/marketplace?category=vehicles&my_listings=true",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        for listing in data["listings"]:
            assert listing["category"] == "vehicles"


class TestMarketplaceModeration:
    """Moderation endpoint tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}"}
    
    def test_get_pending_listings(self, auth_headers):
        """Test GET /api/marketplace/moderation/pending - Get pending listings"""
        response = requests.get(
            f"{BASE_URL}/api/marketplace/moderation/pending",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "listings" in data
        assert "total" in data
        # All returned listings should be pending
        for listing in data["listings"]:
            assert listing["status"] == "pending"
    
    def test_approve_listing(self, auth_headers):
        """Test POST /api/marketplace/{id}/moderate - Approve listing"""
        listing_id = getattr(TestMarketplaceListings, 'created_listing_id', None)
        if not listing_id:
            pytest.skip("No listing created")
        
        response = requests.post(
            f"{BASE_URL}/api/marketplace/{listing_id}/moderate",
            json={"action": "approve"},
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["action"] == "approve"
        assert data["listing_status"] == "active"
        
        # Verify listing is now active
        verify_response = requests.get(
            f"{BASE_URL}/api/marketplace/{listing_id}",
            headers=auth_headers
        )
        assert verify_response.status_code == 200
        assert verify_response.json()["status"] == "active"
    
    def test_reject_listing(self, auth_headers):
        """Test POST /api/marketplace/{id}/moderate - Reject listing"""
        listing_id = getattr(TestMarketplaceListings, 'real_estate_listing_id', None)
        if not listing_id:
            pytest.skip("No listing created")
        
        response = requests.post(
            f"{BASE_URL}/api/marketplace/{listing_id}/moderate",
            json={"action": "reject", "reason": "Test rejection reason"},
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["action"] == "reject"
        assert data["listing_status"] == "removed"
    
    def test_moderate_invalid_action(self, auth_headers):
        """Test moderation with invalid action returns 422"""
        listing_id = getattr(TestMarketplaceListings, 'job_listing_id', None)
        if not listing_id:
            pytest.skip("No listing created")
        
        response = requests.post(
            f"{BASE_URL}/api/marketplace/{listing_id}/moderate",
            json={"action": "invalid_action"},
            headers=auth_headers
        )
        assert response.status_code == 422


class TestMarketplaceInterests:
    """Interest endpoint tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}"}
    
    def test_express_interest_own_listing_fails(self, auth_headers):
        """Test cannot express interest on own listing"""
        listing_id = getattr(TestMarketplaceListings, 'created_listing_id', None)
        if not listing_id:
            pytest.skip("No listing created")
        
        response = requests.post(
            f"{BASE_URL}/api/marketplace/{listing_id}/interest",
            json={"message": "I am interested!"},
            headers=auth_headers
        )
        # Should fail because admin owns this listing
        assert response.status_code == 400
        assert "tuoi annunci" in response.json()["detail"].lower() or "your" in response.json()["detail"].lower()
    
    def test_get_listing_interests_as_owner(self, auth_headers):
        """Test GET /api/marketplace/{id}/interests - Owner can see interests"""
        listing_id = getattr(TestMarketplaceListings, 'created_listing_id', None)
        if not listing_id:
            pytest.skip("No listing created")
        
        response = requests.get(
            f"{BASE_URL}/api/marketplace/{listing_id}/interests",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestMarketplaceStats:
    """Statistics endpoint tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}"}
    
    def test_get_stats_summary(self, auth_headers):
        """Test GET /api/marketplace/stats/summary - Get marketplace stats"""
        response = requests.get(
            f"{BASE_URL}/api/marketplace/stats/summary",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify stats structure
        assert "total_active" in data
        assert "pending_moderation" in data
        assert "by_category" in data
        assert "my_listings" in data
        assert "unread_interests" in data
        
        # Values should be integers
        assert isinstance(data["total_active"], int)
        assert isinstance(data["pending_moderation"], int)
        assert isinstance(data["my_listings"], int)
    
    def test_get_permissions(self, auth_headers):
        """Test GET /api/marketplace/permissions/me - Get user permissions"""
        response = requests.get(
            f"{BASE_URL}/api/marketplace/permissions/me",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Admin should have all permissions
        assert "MARKET_CREATE" in data
        assert "MARKET_VIEW" in data
        assert "MARKET_MODERATE" in data


class TestMarketplaceDelete:
    """Delete and sold endpoint tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}"}
    
    def test_mark_as_sold(self, auth_headers):
        """Test POST /api/marketplace/{id}/sold - Mark listing as sold"""
        listing_id = getattr(TestMarketplaceListings, 'created_listing_id', None)
        if not listing_id:
            pytest.skip("No listing created")
        
        response = requests.post(
            f"{BASE_URL}/api/marketplace/{listing_id}/sold",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        
        # Verify listing is now sold
        verify_response = requests.get(
            f"{BASE_URL}/api/marketplace/{listing_id}",
            headers=auth_headers
        )
        assert verify_response.json()["status"] == "sold"
    
    def test_delete_listing(self, auth_headers):
        """Test DELETE /api/marketplace/{id} - Delete listing"""
        listing_id = getattr(TestMarketplaceListings, 'service_listing_id', None)
        if not listing_id:
            pytest.skip("No listing created")
        
        response = requests.delete(
            f"{BASE_URL}/api/marketplace/{listing_id}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        
        # Verify listing is now removed
        verify_response = requests.get(
            f"{BASE_URL}/api/marketplace/{listing_id}",
            headers=auth_headers
        )
        assert verify_response.json()["status"] == "removed"
    
    def test_delete_nonexistent_listing(self, auth_headers):
        """Test DELETE /api/marketplace/{id} - Non-existent returns 404"""
        response = requests.delete(
            f"{BASE_URL}/api/marketplace/999999",
            headers=auth_headers
        )
        assert response.status_code == 404


class TestMarketplaceCleanup:
    """Cleanup test data"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}"}
    
    def test_cleanup_test_listings(self, auth_headers):
        """Cleanup: Delete all TEST_ prefixed listings"""
        # Get all my listings
        response = requests.get(
            f"{BASE_URL}/api/marketplace?my_listings=true&page_size=50",
            headers=auth_headers
        )
        if response.status_code == 200:
            listings = response.json().get("listings", [])
            for listing in listings:
                if listing["title"].startswith("TEST_"):
                    requests.delete(
                        f"{BASE_URL}/api/marketplace/{listing['id']}",
                        headers=auth_headers
                    )
        assert True  # Cleanup always passes
