"""
PURE LIFE OS - Iteration 20 Phase 2 Tests
Testing: Agenda CRUD, Reminder Scheduler, Audit Log, LSPD Audit Integration, CityPulse POI
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@purelife.rp"
ADMIN_PASSWORD = "Admin@2026!"


class TestAuth:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()["access_token"]
    
    def test_admin_login(self, auth_token):
        """Test admin login returns valid token"""
        assert auth_token is not None
        assert len(auth_token) > 0
        print("SUCCESS: Admin login successful")


class TestAppointmentsCRUD:
    """Appointments CRUD tests - Phase 2 Agenda System"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_get_appointments_week(self, headers):
        """Test GET /api/appointments/week - Week view"""
        response = requests.get(f"{BASE_URL}/api/appointments/week", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "start_date" in data
        assert "end_date" in data
        assert "days" in data
        assert len(data["days"]) == 7  # 7 days in a week
        print(f"SUCCESS: Week view returns {len(data['days'])} days")
    
    def test_create_appointment(self, headers):
        """Test POST /api/appointments - Create appointment"""
        scheduled_at = (datetime.utcnow() + timedelta(days=1)).strftime("%Y-%m-%dT10:00:00Z")
        payload = {
            "title": "TEST_Iteration20_Appointment",
            "description": "Test appointment for iteration 20",
            "appointment_type": "meeting",
            "scheduled_at": scheduled_at,
            "duration_minutes": 60,
            "location": "Test Location",
            "reminder_settings": {"t_24h": True, "t_1h": True, "t_15m": True}
        }
        response = requests.post(f"{BASE_URL}/api/appointments", json=payload, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "TEST_Iteration20_Appointment"
        assert data["appointment_type"] == "meeting"
        assert data["duration_minutes"] == 60
        assert data["reminder_settings"]["t_24h"] == True
        print(f"SUCCESS: Created appointment ID {data['id']}")
        return data["id"]
    
    def test_get_appointment_by_id(self, headers):
        """Test GET /api/appointments/{id} - Get single appointment"""
        # First create an appointment
        scheduled_at = (datetime.utcnow() + timedelta(days=2)).strftime("%Y-%m-%dT14:00:00Z")
        create_response = requests.post(f"{BASE_URL}/api/appointments", json={
            "title": "TEST_GetById_Appointment",
            "appointment_type": "interview",
            "scheduled_at": scheduled_at,
            "duration_minutes": 30
        }, headers=headers)
        assert create_response.status_code == 200
        apt_id = create_response.json()["id"]
        
        # Get by ID
        response = requests.get(f"{BASE_URL}/api/appointments/{apt_id}", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == apt_id
        assert data["title"] == "TEST_GetById_Appointment"
        print(f"SUCCESS: Retrieved appointment ID {apt_id}")
    
    def test_update_appointment(self, headers):
        """Test PUT /api/appointments/{id} - Update appointment"""
        # First create an appointment
        scheduled_at = (datetime.utcnow() + timedelta(days=3)).strftime("%Y-%m-%dT09:00:00Z")
        create_response = requests.post(f"{BASE_URL}/api/appointments", json={
            "title": "TEST_ToUpdate_Appointment",
            "appointment_type": "meeting",
            "scheduled_at": scheduled_at,
            "duration_minutes": 45
        }, headers=headers)
        assert create_response.status_code == 200
        apt_id = create_response.json()["id"]
        
        # Update
        update_response = requests.put(f"{BASE_URL}/api/appointments/{apt_id}", json={
            "title": "TEST_Updated_Appointment",
            "duration_minutes": 90,
            "location": "Updated Location"
        }, headers=headers)
        assert update_response.status_code == 200
        data = update_response.json()
        assert data["title"] == "TEST_Updated_Appointment"
        assert data["duration_minutes"] == 90
        assert data["location"] == "Updated Location"
        print(f"SUCCESS: Updated appointment ID {apt_id}")
    
    def test_cancel_appointment(self, headers):
        """Test DELETE /api/appointments/{id} - Cancel appointment"""
        # First create an appointment
        scheduled_at = (datetime.utcnow() + timedelta(days=4)).strftime("%Y-%m-%dT16:00:00Z")
        create_response = requests.post(f"{BASE_URL}/api/appointments", json={
            "title": "TEST_ToCancel_Appointment",
            "appointment_type": "meeting",
            "scheduled_at": scheduled_at,
            "duration_minutes": 30
        }, headers=headers)
        assert create_response.status_code == 200
        apt_id = create_response.json()["id"]
        
        # Cancel
        cancel_response = requests.delete(f"{BASE_URL}/api/appointments/{apt_id}?reason=Test%20cancellation", headers=headers)
        assert cancel_response.status_code == 200
        data = cancel_response.json()
        assert "message" in data
        print(f"SUCCESS: Cancelled appointment ID {apt_id}")
    
    def test_confirm_appointment(self, headers):
        """Test POST /api/appointments/{id}/confirm - Confirm appointment"""
        # First create an appointment
        scheduled_at = (datetime.utcnow() + timedelta(days=5)).strftime("%Y-%m-%dT11:00:00Z")
        create_response = requests.post(f"{BASE_URL}/api/appointments", json={
            "title": "TEST_ToConfirm_Appointment",
            "appointment_type": "hearing",
            "scheduled_at": scheduled_at,
            "duration_minutes": 60
        }, headers=headers)
        assert create_response.status_code == 200
        apt_id = create_response.json()["id"]
        
        # Confirm
        confirm_response = requests.post(f"{BASE_URL}/api/appointments/{apt_id}/confirm", headers=headers)
        assert confirm_response.status_code == 200
        data = confirm_response.json()
        assert "message" in data
        print(f"SUCCESS: Confirmed appointment ID {apt_id}")
    
    def test_calendar_month_view(self, headers):
        """Test GET /api/appointments/calendar/{year}/{month} - Month view"""
        now = datetime.utcnow()
        response = requests.get(f"{BASE_URL}/api/appointments/calendar/{now.year}/{now.month}", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "year" in data
        assert "month" in data
        assert "days" in data
        print(f"SUCCESS: Month view for {data['year']}/{data['month']}")


class TestAuditLog:
    """Audit Log tests - Phase 2 Audit System"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_get_audit_log(self, headers):
        """Test GET /api/admin/audit - Get audit log"""
        response = requests.get(f"{BASE_URL}/api/admin/audit?limit=20", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Retrieved {len(data)} audit log entries")
    
    def test_audit_log_contains_login_success(self, headers):
        """Test audit log contains login_success action"""
        response = requests.get(f"{BASE_URL}/api/admin/audit?limit=50", headers=headers)
        assert response.status_code == 200
        data = response.json()
        actions = [entry["action"] for entry in data]
        assert "login_success" in actions
        print("SUCCESS: Audit log contains login_success action")
    
    def test_audit_log_contains_appointment_create(self, headers):
        """Test audit log contains appointment_create action"""
        # First create an appointment to ensure there's an entry
        scheduled_at = (datetime.utcnow() + timedelta(days=6)).strftime("%Y-%m-%dT10:00:00Z")
        requests.post(f"{BASE_URL}/api/appointments", json={
            "title": "TEST_AuditLog_Appointment",
            "appointment_type": "meeting",
            "scheduled_at": scheduled_at,
            "duration_minutes": 30
        }, headers=headers)
        
        # Check audit log
        response = requests.get(f"{BASE_URL}/api/admin/audit?limit=50", headers=headers)
        assert response.status_code == 200
        data = response.json()
        actions = [entry["action"] for entry in data]
        assert "appointment_create" in actions
        print("SUCCESS: Audit log contains appointment_create action")
    
    def test_audit_log_entry_structure(self, headers):
        """Test audit log entry has correct structure"""
        response = requests.get(f"{BASE_URL}/api/admin/audit?limit=1", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) > 0
        entry = data[0]
        assert "id" in entry
        assert "action" in entry
        assert "description" in entry
        assert "user_email" in entry
        assert "timestamp" in entry
        print("SUCCESS: Audit log entry has correct structure")


class TestLSPDAuditIntegration:
    """LSPD routes with audit log integration tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_create_case_logs_audit(self, headers):
        """Test creating a case logs to audit"""
        # Create case
        case_response = requests.post(f"{BASE_URL}/api/lspd/cases", json={
            "title": "TEST_Iteration20_Case",
            "description": "Test case for audit log",
            "priority": "medium",
            "suspect_name": "Test Suspect",
            "location": "Test Location"
        }, headers=headers)
        assert case_response.status_code == 200
        case_id = case_response.json()["id"]
        
        # Check audit log
        audit_response = requests.get(f"{BASE_URL}/api/admin/audit?limit=10", headers=headers)
        assert audit_response.status_code == 200
        data = audit_response.json()
        actions = [entry["action"] for entry in data]
        assert "case_create" in actions
        print(f"SUCCESS: Case creation (ID {case_id}) logged to audit")
    
    def test_create_warrant_logs_audit(self, headers):
        """Test creating a warrant logs to audit"""
        # Create warrant
        warrant_response = requests.post(f"{BASE_URL}/api/lspd/warrants", json={
            "suspect_name": "TEST_Iteration20_Suspect",
            "suspect_identifier": "TEST20",
            "reason": "Test warrant for audit log"
        }, headers=headers)
        assert warrant_response.status_code == 200
        warrant_id = warrant_response.json()["id"]
        
        # Check audit log
        audit_response = requests.get(f"{BASE_URL}/api/admin/audit?limit=10", headers=headers)
        assert audit_response.status_code == 200
        data = audit_response.json()
        actions = [entry["action"] for entry in data]
        assert "warrant_create" in actions
        print(f"SUCCESS: Warrant creation (ID {warrant_id}) logged to audit")
    
    def test_create_fine_logs_audit(self, headers):
        """Test creating a fine logs to audit"""
        # Create fine
        fine_response = requests.post(f"{BASE_URL}/api/lspd/fines", json={
            "citizen_name": "TEST_Iteration20_Citizen",
            "citizen_identifier": "TEST20",
            "amount": 250,
            "reason": "Test fine for audit log"
        }, headers=headers)
        assert fine_response.status_code == 200
        fine_id = fine_response.json()["id"]
        
        # Check audit log
        audit_response = requests.get(f"{BASE_URL}/api/admin/audit?limit=10", headers=headers)
        assert audit_response.status_code == 200
        data = audit_response.json()
        actions = [entry["action"] for entry in data]
        assert "fine_create" in actions
        print(f"SUCCESS: Fine creation (ID {fine_id}) logged to audit")


class TestCityPulsePOI:
    """CityPulse POI tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_get_poi_categories(self, headers):
        """Test GET /api/poi/categories - Get POI categories"""
        response = requests.get(f"{BASE_URL}/api/poi/categories", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "categories" in data
        print(f"SUCCESS: Retrieved {len(data['categories'])} POI categories")
    
    def test_get_poi_list(self, headers):
        """Test GET /api/poi - Get POI list"""
        response = requests.get(f"{BASE_URL}/api/poi", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Retrieved {len(data)} POIs")
    
    def test_create_poi(self, headers):
        """Test POST /api/poi - Create POI"""
        payload = {
            "name": "TEST_Iteration20_POI",
            "category": "altro",
            "description": "Test POI for iteration 20",
            "x_percent": 50.0,
            "y_percent": 50.0,
            "is_public": True
        }
        response = requests.post(f"{BASE_URL}/api/poi", json=payload, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "TEST_Iteration20_POI"
        print(f"SUCCESS: Created POI ID {data['id']}")
        return data["id"]


class TestReminderSystem:
    """Reminder system tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_test_reminder_endpoint(self, headers):
        """Test POST /api/appointments/test-reminder/{id} - Test reminder"""
        # First create an appointment
        scheduled_at = (datetime.utcnow() + timedelta(days=7)).strftime("%Y-%m-%dT10:00:00Z")
        create_response = requests.post(f"{BASE_URL}/api/appointments", json={
            "title": "TEST_Reminder_Appointment",
            "appointment_type": "meeting",
            "scheduled_at": scheduled_at,
            "duration_minutes": 30
        }, headers=headers)
        assert create_response.status_code == 200
        apt_id = create_response.json()["id"]
        
        # Test reminder
        reminder_response = requests.post(f"{BASE_URL}/api/appointments/test-reminder/{apt_id}?reminder_type=t_15m", headers=headers)
        assert reminder_response.status_code == 200
        data = reminder_response.json()
        assert "message" in data
        assert data["websocket_sent"] == True
        print(f"SUCCESS: Test reminder sent for appointment ID {apt_id}")


class TestHealthAndStats:
    """Health and stats endpoints"""
    
    def test_health_endpoint(self):
        """Test GET /api/health - Health check"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] in ["ok", "degraded"]
        assert data["backend"] == "ok"
        print(f"SUCCESS: Health check - status: {data['status']}")
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_admin_stats(self, headers):
        """Test GET /api/admin/stats - Admin stats"""
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "totalUsers" in data or "total_users" in data
        print(f"SUCCESS: Admin stats retrieved")
    
    def test_lspd_stats(self, headers):
        """Test GET /api/lspd/stats - LSPD stats"""
        response = requests.get(f"{BASE_URL}/api/lspd/stats", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "casi_aperti" in data
        print(f"SUCCESS: LSPD stats - casi_aperti: {data['casi_aperti']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
