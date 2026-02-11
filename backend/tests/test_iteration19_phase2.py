"""
PURE LIFE OS - Iteration 19 Phase 2 Tests
Testing: Appointments CRUD, Calendar views, NUI Handshake DEV mode, Rate Limit Stats
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@purelife.rp"
ADMIN_PASSWORD = "Admin@2026!"

# NUI DEV mode codes
NUI_DEV_CODES = ["test-lspd", "test-ems", "test-civil"]


class TestAuth:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        return data["access_token"]
    
    def test_admin_login(self, admin_token):
        """Test admin login returns valid token"""
        assert admin_token is not None
        assert len(admin_token) > 0
        print(f"✓ Admin login successful, token length: {len(admin_token)}")


class TestAppointmentsCRUD:
    """Appointments CRUD operations"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, admin_token):
        """Auth headers"""
        return {"Authorization": f"Bearer {admin_token}"}
    
    def test_get_appointments_list(self, headers):
        """GET /appointments - List appointments"""
        response = requests.get(f"{BASE_URL}/api/appointments", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /appointments returned {len(data)} appointments")
    
    def test_create_appointment(self, headers):
        """POST /appointments - Create new appointment"""
        # Schedule for tomorrow
        tomorrow = datetime.now() + timedelta(days=1)
        scheduled_at = tomorrow.replace(hour=10, minute=0, second=0, microsecond=0).isoformat()
        
        payload = {
            "title": "TEST_Riunione Fase 2",
            "description": "Test appuntamento per iteration 19",
            "appointment_type": "meeting",
            "scheduled_at": scheduled_at,
            "duration_minutes": 60,
            "location": "Sala Riunioni A",
            "reminder_settings": {"t_24h": True, "t_1h": True, "t_15m": False},
            "is_private": False
        }
        
        response = requests.post(f"{BASE_URL}/api/appointments", json=payload, headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data["title"] == "TEST_Riunione Fase 2"
        assert data["appointment_type"] == "meeting"
        assert data["duration_minutes"] == 60
        assert data["location"] == "Sala Riunioni A"
        assert "id" in data
        
        print(f"✓ Created appointment ID: {data['id']}")
        return data["id"]
    
    def test_get_appointment_by_id(self, headers):
        """GET /appointments/{id} - Get single appointment"""
        # First create one
        tomorrow = datetime.now() + timedelta(days=2)
        scheduled_at = tomorrow.replace(hour=14, minute=30, second=0, microsecond=0).isoformat()
        
        create_response = requests.post(f"{BASE_URL}/api/appointments", json={
            "title": "TEST_Appuntamento Singolo",
            "scheduled_at": scheduled_at,
            "duration_minutes": 30,
            "appointment_type": "meeting"
        }, headers=headers)
        assert create_response.status_code == 200
        apt_id = create_response.json()["id"]
        
        # Now get it
        response = requests.get(f"{BASE_URL}/api/appointments/{apt_id}", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data["id"] == apt_id
        assert data["title"] == "TEST_Appuntamento Singolo"
        print(f"✓ GET /appointments/{apt_id} returned correct data")
    
    def test_update_appointment(self, headers):
        """PUT /appointments/{id} - Update appointment"""
        # Create first
        tomorrow = datetime.now() + timedelta(days=3)
        scheduled_at = tomorrow.replace(hour=9, minute=0, second=0, microsecond=0).isoformat()
        
        create_response = requests.post(f"{BASE_URL}/api/appointments", json={
            "title": "TEST_Da Modificare",
            "scheduled_at": scheduled_at,
            "duration_minutes": 45,
            "appointment_type": "meeting"
        }, headers=headers)
        assert create_response.status_code == 200
        apt_id = create_response.json()["id"]
        
        # Update it
        update_payload = {
            "title": "TEST_Modificato",
            "duration_minutes": 90,
            "location": "Nuova Location"
        }
        
        response = requests.put(f"{BASE_URL}/api/appointments/{apt_id}", json=update_payload, headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data["title"] == "TEST_Modificato"
        assert data["duration_minutes"] == 90
        assert data["location"] == "Nuova Location"
        print(f"✓ PUT /appointments/{apt_id} updated successfully")
    
    def test_delete_appointment(self, headers):
        """DELETE /appointments/{id} - Cancel appointment"""
        # Create first
        tomorrow = datetime.now() + timedelta(days=4)
        scheduled_at = tomorrow.replace(hour=16, minute=0, second=0, microsecond=0).isoformat()
        
        create_response = requests.post(f"{BASE_URL}/api/appointments", json={
            "title": "TEST_Da Cancellare",
            "scheduled_at": scheduled_at,
            "duration_minutes": 30,
            "appointment_type": "meeting"
        }, headers=headers)
        assert create_response.status_code == 200
        apt_id = create_response.json()["id"]
        
        # Delete it
        response = requests.delete(f"{BASE_URL}/api/appointments/{apt_id}?reason=Test%20cancellazione", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "message" in data
        print(f"✓ DELETE /appointments/{apt_id} cancelled successfully")
    
    def test_confirm_appointment(self, headers):
        """POST /appointments/{id}/confirm - Confirm appointment"""
        # Create first
        tomorrow = datetime.now() + timedelta(days=5)
        scheduled_at = tomorrow.replace(hour=11, minute=0, second=0, microsecond=0).isoformat()
        
        create_response = requests.post(f"{BASE_URL}/api/appointments", json={
            "title": "TEST_Da Confermare",
            "scheduled_at": scheduled_at,
            "duration_minutes": 60,
            "appointment_type": "hearing"
        }, headers=headers)
        assert create_response.status_code == 200
        apt_id = create_response.json()["id"]
        
        # Confirm it
        response = requests.post(f"{BASE_URL}/api/appointments/{apt_id}/confirm", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "message" in data
        print(f"✓ POST /appointments/{apt_id}/confirm successful")


class TestCalendarViews:
    """Calendar week/month views"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, admin_token):
        """Auth headers"""
        return {"Authorization": f"Bearer {admin_token}"}
    
    def test_get_week_view(self, headers):
        """GET /appointments/week - Week calendar view"""
        response = requests.get(f"{BASE_URL}/api/appointments/week", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "start_date" in data
        assert "end_date" in data
        assert "days" in data
        assert isinstance(data["days"], dict)
        # Should have 7 days
        assert len(data["days"]) == 7
        print(f"✓ GET /appointments/week returned week from {data['start_date']} to {data['end_date']}")
    
    def test_get_month_view(self, headers):
        """GET /appointments/calendar/{year}/{month} - Month calendar view"""
        now = datetime.now()
        year = now.year
        month = now.month
        
        response = requests.get(f"{BASE_URL}/api/appointments/calendar/{year}/{month}", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data["year"] == year
        assert data["month"] == month
        assert "days" in data
        assert isinstance(data["days"], dict)
        print(f"✓ GET /appointments/calendar/{year}/{month} returned month view")
    
    def test_get_week_view_with_date(self, headers):
        """GET /appointments/week?date=... - Week view for specific date"""
        # Get week for next month
        next_month = datetime.now() + timedelta(days=35)
        date_param = next_month.strftime("%Y-%m-%dT00:00:00")
        
        response = requests.get(f"{BASE_URL}/api/appointments/week?date={date_param}", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "start_date" in data
        assert "days" in data
        print(f"✓ GET /appointments/week with date param returned week starting {data['start_date']}")


class TestReminderSystem:
    """Reminder test endpoint"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, admin_token):
        """Auth headers"""
        return {"Authorization": f"Bearer {admin_token}"}
    
    def test_reminder_test_endpoint(self, headers):
        """POST /appointments/test-reminder/{id} - Test reminder"""
        # Create appointment first
        tomorrow = datetime.now() + timedelta(days=1)
        scheduled_at = tomorrow.replace(hour=15, minute=0, second=0, microsecond=0).isoformat()
        
        create_response = requests.post(f"{BASE_URL}/api/appointments", json={
            "title": "TEST_Reminder Test",
            "scheduled_at": scheduled_at,
            "duration_minutes": 30,
            "appointment_type": "meeting"
        }, headers=headers)
        assert create_response.status_code == 200
        apt_id = create_response.json()["id"]
        
        # Test reminder
        response = requests.post(f"{BASE_URL}/api/appointments/test-reminder/{apt_id}?reminder_type=t_15m", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "message" in data
        assert data["websocket_sent"] == True
        # Discord may not be configured, so discord_sent can be False
        print(f"✓ POST /appointments/test-reminder/{apt_id} - WebSocket: {data['websocket_sent']}, Discord: {data['discord_sent']}")


class TestNUIHandshakeDev:
    """NUI Handshake DEV mode tests"""
    
    def test_handshake_dev_lspd(self):
        """POST /nui/handshake/dev - LSPD test code"""
        response = requests.post(
            f"{BASE_URL}/api/nui/handshake/dev",
            json={"code": "test-lspd"},
            headers={"X-Dev-Mode": "true"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data["success"] == True
        assert "access_token" in data
        assert "refresh_token" in data
        assert "user" in data
        assert data["user"]["sector"] == "LSPD"
        assert data["user"]["name"] == "Officer Test"
        print(f"✓ NUI handshake DEV (test-lspd) - User: {data['user']['name']}, Sector: {data['user']['sector']}")
    
    def test_handshake_dev_ems(self):
        """POST /nui/handshake/dev - EMS test code"""
        response = requests.post(
            f"{BASE_URL}/api/nui/handshake/dev",
            json={"code": "test-ems"},
            headers={"X-Dev-Mode": "true"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data["success"] == True
        assert data["user"]["sector"] == "EMS"
        assert data["user"]["name"] == "Medic Test"
        print(f"✓ NUI handshake DEV (test-ems) - User: {data['user']['name']}, Sector: {data['user']['sector']}")
    
    def test_handshake_dev_civil(self):
        """POST /nui/handshake/dev - Civil test code"""
        response = requests.post(
            f"{BASE_URL}/api/nui/handshake/dev",
            json={"code": "test-civil"},
            headers={"X-Dev-Mode": "true"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data["success"] == True
        assert data["user"]["sector"] == "CIVIL"
        assert data["user"]["name"] == "Citizen Test"
        print(f"✓ NUI handshake DEV (test-civil) - User: {data['user']['name']}, Sector: {data['user']['sector']}")
    
    def test_handshake_dev_invalid_code(self):
        """POST /nui/handshake/dev - Invalid code returns 401"""
        response = requests.post(
            f"{BASE_URL}/api/nui/handshake/dev",
            json={"code": "invalid-code"},
            headers={"X-Dev-Mode": "true"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ NUI handshake DEV with invalid code returns 401")
    
    def test_handshake_dev_without_header(self):
        """POST /nui/handshake/dev - Without X-Dev-Mode header returns 403"""
        response = requests.post(
            f"{BASE_URL}/api/nui/handshake/dev",
            json={"code": "test-lspd"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ NUI handshake DEV without X-Dev-Mode header returns 403")


class TestRateLimitStats:
    """Rate limit stats endpoint"""
    
    def test_rate_limit_stats(self):
        """GET /nui/rate-limit/stats - Get rate limiter stats"""
        response = requests.get(f"{BASE_URL}/api/nui/rate-limit/stats")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "active_ips" in data
        assert "blocked_ips" in data
        assert isinstance(data["active_ips"], int)
        assert isinstance(data["blocked_ips"], int)
        print(f"✓ GET /nui/rate-limit/stats - Active IPs: {data['active_ips']}, Blocked: {data['blocked_ips']}")


class TestPOIRegression:
    """POI CRUD regression tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, admin_token):
        """Auth headers"""
        return {"Authorization": f"Bearer {admin_token}"}
    
    def test_poi_categories(self, headers):
        """GET /poi/categories - Get POI categories"""
        response = requests.get(f"{BASE_URL}/api/poi/categories", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "categories" in data
        assert len(data["categories"]) > 0
        print(f"✓ GET /poi/categories returned {len(data['categories'])} categories")
    
    def test_poi_list(self, headers):
        """GET /poi - List POIs"""
        response = requests.get(f"{BASE_URL}/api/poi", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /poi returned {len(data)} POIs")
    
    def test_poi_crud(self, headers):
        """POI Create, Read, Update, Delete"""
        # Create
        create_payload = {
            "name": "TEST_POI Iteration 19",
            "category": "governo",
            "x_percent": 50.0,
            "y_percent": 50.0,
            "description": "Test POI for iteration 19"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/poi", json=create_payload, headers=headers)
        assert create_response.status_code == 200, f"Create failed: {create_response.text}"
        poi_id = create_response.json()["id"]
        print(f"✓ Created POI ID: {poi_id}")
        
        # Read
        get_response = requests.get(f"{BASE_URL}/api/poi/{poi_id}", headers=headers)
        assert get_response.status_code == 200, f"Get failed: {get_response.text}"
        assert get_response.json()["name"] == "TEST_POI Iteration 19"
        print(f"✓ GET /poi/{poi_id} returned correct data")
        
        # Update
        update_response = requests.put(f"{BASE_URL}/api/poi/{poi_id}", json={
            "name": "TEST_POI Updated",
            "description": "Updated description"
        }, headers=headers)
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        assert update_response.json()["name"] == "TEST_POI Updated"
        print(f"✓ PUT /poi/{poi_id} updated successfully")
        
        # Delete
        delete_response = requests.delete(f"{BASE_URL}/api/poi/{poi_id}", headers=headers)
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
        print(f"✓ DELETE /poi/{poi_id} successful")


class TestAppointmentTypes:
    """Test different appointment types"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, admin_token):
        """Auth headers"""
        return {"Authorization": f"Bearer {admin_token}"}
    
    def test_create_hearing_appointment(self, headers):
        """Create hearing type appointment"""
        tomorrow = datetime.now() + timedelta(days=6)
        scheduled_at = tomorrow.replace(hour=10, minute=0, second=0, microsecond=0).isoformat()
        
        response = requests.post(f"{BASE_URL}/api/appointments", json={
            "title": "TEST_Udienza Tribunale",
            "appointment_type": "hearing",
            "scheduled_at": scheduled_at,
            "duration_minutes": 120,
            "location": "Aula 1 - Tribunale"
        }, headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data["appointment_type"] == "hearing"
        print(f"✓ Created hearing appointment ID: {data['id']}")
    
    def test_create_interview_appointment(self, headers):
        """Create interview type appointment"""
        tomorrow = datetime.now() + timedelta(days=7)
        scheduled_at = tomorrow.replace(hour=14, minute=0, second=0, microsecond=0).isoformat()
        
        response = requests.post(f"{BASE_URL}/api/appointments", json={
            "title": "TEST_Colloquio Candidato",
            "appointment_type": "interview",
            "scheduled_at": scheduled_at,
            "duration_minutes": 60,
            "location": "Sala Colloqui LSPD"
        }, headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data["appointment_type"] == "interview"
        print(f"✓ Created interview appointment ID: {data['id']}")
    
    def test_create_training_appointment(self, headers):
        """Create training type appointment"""
        tomorrow = datetime.now() + timedelta(days=8)
        scheduled_at = tomorrow.replace(hour=8, minute=0, second=0, microsecond=0).isoformat()
        
        response = requests.post(f"{BASE_URL}/api/appointments", json={
            "title": "TEST_Addestramento Reclute",
            "appointment_type": "training",
            "scheduled_at": scheduled_at,
            "duration_minutes": 240,
            "location": "Campo Addestramento"
        }, headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data["appointment_type"] == "training"
        print(f"✓ Created training appointment ID: {data['id']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
