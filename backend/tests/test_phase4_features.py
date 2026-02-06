"""
PURE LIFE OS - Phase 4 Features Test Suite
Tests for: Weazel News 2.0, Service Chat 2.0, Push Notifications
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_CREDS = {"email": "admin@purelife.rp", "password": "Admin@2026!"}
DIRECTOR_CREDS = {"email": "director.news@purelife.rp", "password": "News@2026!"}
REPORTER_CREDS = {"email": "reporter.news@purelife.rp", "password": "News@2026!"}


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Admin authentication failed")


@pytest.fixture(scope="module")
def director_token():
    """Get NEWS director authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=DIRECTOR_CREDS)
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Director authentication failed")


@pytest.fixture(scope="module")
def reporter_token():
    """Get NEWS reporter authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=REPORTER_CREDS)
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Reporter authentication failed")


class TestNewsV2PublicAPIs:
    """Test Weazel News 2.0 public endpoints"""
    
    def test_get_categories(self):
        """GET /api/v2/news/categories - Returns available categories"""
        response = requests.get(f"{BASE_URL}/api/v2/news/categories")
        assert response.status_code == 200
        data = response.json()
        assert "categories" in data
        assert len(data["categories"]) > 0
        # Verify category structure
        cat = data["categories"][0]
        assert "value" in cat
        assert "label" in cat
    
    def test_get_published_articles(self):
        """GET /api/v2/news/published - Returns published articles"""
        response = requests.get(f"{BASE_URL}/api/v2/news/published?limit=10")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # If articles exist, verify structure
        if len(data) > 0:
            article = data[0]
            assert "id" in article
            assert "title" in article
            assert "status" in article
            assert article["status"] == "published"
    
    def test_get_breaking_news(self):
        """GET /api/v2/news/breaking - Returns breaking news"""
        response = requests.get(f"{BASE_URL}/api/v2/news/breaking")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # All returned articles should be breaking
        for article in data:
            assert article["is_breaking"] == True
    
    def test_filter_by_category(self):
        """GET /api/v2/news/published?category=cronaca - Filter by category"""
        response = requests.get(f"{BASE_URL}/api/v2/news/published?category=cronaca")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # All returned articles should be in cronaca category
        for article in data:
            assert article["category"] == "cronaca"


class TestNewsV2NewsroomAPIs:
    """Test Weazel News 2.0 newsroom endpoints (authenticated)"""
    
    def test_reporter_create_article(self, reporter_token):
        """POST /api/v2/news/newsroom/create - Reporter creates draft"""
        headers = {"Authorization": f"Bearer {reporter_token}"}
        payload = {
            "title": "TEST_Pytest Article",
            "content": "Test content for pytest",
            "category": "cronaca"
        }
        response = requests.post(
            f"{BASE_URL}/api/v2/news/newsroom/create",
            json=payload,
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == payload["title"]
        assert data["status"] == "draft"
        assert data["author_sector"] == "NEWS"
    
    def test_reporter_get_my_articles(self, reporter_token):
        """GET /api/v2/news/newsroom/my-articles - Reporter sees own articles"""
        headers = {"Authorization": f"Bearer {reporter_token}"}
        response = requests.get(
            f"{BASE_URL}/api/v2/news/newsroom/my-articles",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_reporter_cannot_access_review_queue(self, reporter_token):
        """GET /api/v2/news/newsroom/review-queue - Reporter denied (needs Editor+)"""
        headers = {"Authorization": f"Bearer {reporter_token}"}
        response = requests.get(
            f"{BASE_URL}/api/v2/news/newsroom/review-queue",
            headers=headers
        )
        assert response.status_code == 403
        assert "Accesso negato" in response.json()["detail"]
    
    def test_reporter_cannot_access_all_articles(self, reporter_token):
        """GET /api/v2/news/newsroom/all - Reporter denied (needs Caporedattore+)"""
        headers = {"Authorization": f"Bearer {reporter_token}"}
        response = requests.get(
            f"{BASE_URL}/api/v2/news/newsroom/all",
            headers=headers
        )
        assert response.status_code == 403
        assert "Accesso negato" in response.json()["detail"]
    
    def test_director_get_stats(self, director_token):
        """GET /api/v2/news/newsroom/stats - Director can see stats"""
        headers = {"Authorization": f"Bearer {director_token}"}
        response = requests.get(
            f"{BASE_URL}/api/v2/news/newsroom/stats",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "draft" in data
        assert "review" in data
        assert "approved" in data
        assert "published" in data
        assert "breaking" in data
    
    def test_director_get_review_queue(self, director_token):
        """GET /api/v2/news/newsroom/review-queue - Director can access"""
        headers = {"Authorization": f"Bearer {director_token}"}
        response = requests.get(
            f"{BASE_URL}/api/v2/news/newsroom/review-queue",
            headers=headers
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_director_get_all_articles(self, director_token):
        """GET /api/v2/news/newsroom/all - Director can access"""
        headers = {"Authorization": f"Bearer {director_token}"}
        response = requests.get(
            f"{BASE_URL}/api/v2/news/newsroom/all",
            headers=headers
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)


class TestNewsV2Workflow:
    """Test complete article workflow: draft -> review -> approved -> published"""
    
    def test_full_workflow(self, reporter_token, director_token):
        """Test complete article workflow with RBAC"""
        reporter_headers = {"Authorization": f"Bearer {reporter_token}"}
        director_headers = {"Authorization": f"Bearer {director_token}"}
        
        # 1. Reporter creates draft
        create_resp = requests.post(
            f"{BASE_URL}/api/v2/news/newsroom/create",
            json={"title": "TEST_Workflow Article", "content": "Workflow test", "category": "politica"},
            headers=reporter_headers
        )
        assert create_resp.status_code == 200
        article_id = create_resp.json()["id"]
        assert create_resp.json()["status"] == "draft"
        
        # 2. Reporter submits for review
        submit_resp = requests.post(
            f"{BASE_URL}/api/v2/news/newsroom/{article_id}/submit-review",
            json={},
            headers=reporter_headers
        )
        assert submit_resp.status_code == 200
        assert submit_resp.json()["status"] == "review"
        
        # 3. Reporter cannot approve (RBAC check)
        approve_fail = requests.post(
            f"{BASE_URL}/api/v2/news/newsroom/{article_id}/approve",
            json={},
            headers=reporter_headers
        )
        assert approve_fail.status_code == 403
        
        # 4. Director approves
        approve_resp = requests.post(
            f"{BASE_URL}/api/v2/news/newsroom/{article_id}/approve",
            json={"notes": "Approved by pytest"},
            headers=director_headers
        )
        assert approve_resp.status_code == 200
        assert approve_resp.json()["status"] == "approved"
        
        # 5. Reporter cannot publish (RBAC check)
        publish_fail = requests.post(
            f"{BASE_URL}/api/v2/news/newsroom/{article_id}/publish",
            json={},
            headers=reporter_headers
        )
        assert publish_fail.status_code == 403
        
        # 6. Director publishes
        publish_resp = requests.post(
            f"{BASE_URL}/api/v2/news/newsroom/{article_id}/publish",
            json={},
            headers=director_headers
        )
        assert publish_resp.status_code == 200
        assert publish_resp.json()["status"] == "published"
        
        # 7. Director toggles breaking
        breaking_resp = requests.post(
            f"{BASE_URL}/api/v2/news/newsroom/{article_id}/toggle-breaking",
            headers=director_headers
        )
        assert breaking_resp.status_code == 200
        assert breaking_resp.json()["is_breaking"] == True
        
        # Cleanup - delete test article
        requests.delete(
            f"{BASE_URL}/api/v2/news/newsroom/{article_id}",
            headers=director_headers
        )


class TestServiceChatAPIs:
    """Test Service Chat 2.0 endpoints"""
    
    def test_get_channels(self, admin_token):
        """GET /api/chat/channels - Returns accessible channels"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/chat/channels", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        # Verify channel structure
        channel = data[0]
        assert "id" in channel
        assert "name" in channel
        assert "display_name" in channel
        assert "sector" in channel
    
    def test_get_my_presence(self, admin_token):
        """GET /api/chat/presence/me - Returns user's presence"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/chat/presence/me", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "user_id" in data
        assert "status" in data
        assert "game_name" in data
    
    def test_update_presence(self, admin_token):
        """PUT /api/chat/presence - Updates user's presence status"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.put(
            f"{BASE_URL}/api/chat/presence",
            json={"status": "in_service"},
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "in_service"
    
    def test_get_presence_list(self, admin_token):
        """GET /api/chat/presence - Returns online users"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/chat/presence", headers=headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_send_message(self, admin_token):
        """POST /api/chat/channels/{name}/messages - Sends message"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.post(
            f"{BASE_URL}/api/chat/channels/staff/messages",
            json={"content": "TEST_Pytest message", "message_type": "text"},
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["content"] == "TEST_Pytest message"
        assert data["message_type"] == "text"
        assert "id" in data
    
    def test_get_channel_messages(self, admin_token):
        """GET /api/chat/channels/{name}/messages - Returns messages"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(
            f"{BASE_URL}/api/chat/channels/staff/messages?limit=10",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_invalid_presence_status(self, admin_token):
        """PUT /api/chat/presence - Invalid status rejected"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.put(
            f"{BASE_URL}/api/chat/presence",
            json={"status": "invalid_status"},
            headers=headers
        )
        assert response.status_code == 400


class TestPushNotificationsAPIs:
    """Test Push Notifications endpoints"""
    
    def test_get_vapid_public_key(self):
        """GET /api/push/vapid-public-key - Returns VAPID public key"""
        response = requests.get(f"{BASE_URL}/api/push/vapid-public-key")
        assert response.status_code == 200
        data = response.json()
        assert "publicKey" in data
        assert len(data["publicKey"]) > 0
    
    def test_subscribe_push(self, admin_token):
        """POST /api/push/subscribe - Creates push subscription"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.post(
            f"{BASE_URL}/api/push/subscribe",
            json={
                "endpoint": "https://pytest-push-endpoint.example.com/test",
                "keys": {"p256dh": "test-key", "auth": "test-auth"},
                "device_name": "Pytest Device"
            },
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["device_name"] == "Pytest Device"
        assert data["is_active"] == True
    
    def test_get_subscriptions(self, admin_token):
        """GET /api/push/subscriptions - Returns user's subscriptions"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/push/subscriptions", headers=headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_unsubscribe_push(self, admin_token):
        """DELETE /api/push/unsubscribe - Removes subscription"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.delete(
            f"{BASE_URL}/api/push/unsubscribe?endpoint=https://pytest-push-endpoint.example.com/test",
            headers=headers
        )
        assert response.status_code == 200
        assert "rimossa" in response.json()["message"]


class TestTopBarMenuLinks:
    """Test that TopBar menu contains required links"""
    
    def test_news_links_in_menu(self, admin_token):
        """Verify News and Chat links work via API"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Test News public endpoint
        news_resp = requests.get(f"{BASE_URL}/api/v2/news/published")
        assert news_resp.status_code == 200
        
        # Test Chat endpoint
        chat_resp = requests.get(f"{BASE_URL}/api/chat/channels", headers=headers)
        assert chat_resp.status_code == 200
        
        # Test News editor endpoint (stats)
        editor_resp = requests.get(f"{BASE_URL}/api/v2/news/newsroom/stats", headers=headers)
        assert editor_resp.status_code == 200
