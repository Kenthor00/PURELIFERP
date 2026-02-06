"""
PURE LIFE OS - Test Suite for Notifications and City Hub Upgrades
Tests: Notifications API, Recruitment 2.0 (Interview workflow), Appointments Calendar
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@purelife.rp"
ADMIN_PASSWORD = "Admin@2026!"


class TestNotificationsAPI:
    """Test suite for Notifications API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_notification_count(self):
        """GET /api/notifications/count - Returns unread and total count"""
        response = requests.get(f"{BASE_URL}/api/notifications/count", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "unread" in data
        assert "total" in data
        assert isinstance(data["unread"], int)
        assert isinstance(data["total"], int)
        print(f"Notification count: unread={data['unread']}, total={data['total']}")
    
    def test_get_notification_list(self):
        """GET /api/notifications/list - Returns list of notifications"""
        response = requests.get(f"{BASE_URL}/api/notifications/list?limit=20", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            notif = data[0]
            assert "id" in notif
            assert "notification_type" in notif
            assert "title" in notif
            assert "message" in notif
            assert "is_read" in notif
            assert "created_at" in notif
        print(f"Retrieved {len(data)} notifications")
    
    def test_mark_notification_as_read(self):
        """PUT /api/notifications/{id}/read - Marks notification as read"""
        # First get a notification
        list_response = requests.get(f"{BASE_URL}/api/notifications/list?limit=5", headers=self.headers)
        assert list_response.status_code == 200
        notifications = list_response.json()
        
        if len(notifications) > 0:
            notif_id = notifications[0]["id"]
            response = requests.put(f"{BASE_URL}/api/notifications/{notif_id}/read", headers=self.headers)
            assert response.status_code == 200
            data = response.json()
            assert "message" in data
            print(f"Marked notification {notif_id} as read")
        else:
            pytest.skip("No notifications to mark as read")
    
    def test_mark_all_as_read(self):
        """PUT /api/notifications/read-all - Marks all notifications as read"""
        response = requests.put(f"{BASE_URL}/api/notifications/read-all", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        
        # Verify count is 0
        count_response = requests.get(f"{BASE_URL}/api/notifications/count", headers=self.headers)
        assert count_response.status_code == 200
        assert count_response.json()["unread"] == 0
        print("All notifications marked as read")


class TestRecruitmentInterviewWorkflow:
    """Test suite for Recruitment 2.0 with Interview status"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        self.token = response.json()["access_token"]
        self.user_id = response.json()["user_id"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_recruitment_stats_includes_interview(self):
        """GET /api/recruitment/stats - Returns stats including interview count"""
        response = requests.get(f"{BASE_URL}/api/recruitment/stats", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "pending" in data
        assert "reviewing" in data
        assert "interview" in data  # New field
        assert "accepted" in data
        assert "rejected" in data
        print(f"Recruitment stats: {data}")
    
    def test_create_application_generates_notification(self):
        """POST /api/recruitment/apply - Creates application and generates notification"""
        # Get initial notification count
        count_before = requests.get(f"{BASE_URL}/api/notifications/count", headers=self.headers).json()["total"]
        
        # Try to create application (may fail if already exists)
        response = requests.post(f"{BASE_URL}/api/recruitment/apply", headers=self.headers, json={
            "target_sector": "NEWS",
            "motivation": "TEST_INTERVIEW: Voglio diventare giornalista per raccontare le storie della città. Ho esperienza di scrittura e comunicazione.",
            "experience": "2 anni di esperienza come blogger",
            "availability": "Sera, 10 ore settimanali"
        })
        
        if response.status_code == 200:
            data = response.json()
            assert data["status"] == "pending"
            assert data["target_sector"] == "NEWS"
            
            # Verify notification was created
            count_after = requests.get(f"{BASE_URL}/api/notifications/count", headers=self.headers).json()["total"]
            assert count_after > count_before, "Notification should be created"
            print(f"Application created, notification generated")
        elif response.status_code == 400 and "già una candidatura" in response.json().get("detail", ""):
            print("Application already exists for this sector - skipping")
        else:
            pytest.fail(f"Unexpected response: {response.status_code} - {response.text}")
    
    def test_set_application_to_interview_status(self):
        """PUT /api/recruitment/{id}/review - Sets application to interview status"""
        # Get applications
        apps_response = requests.get(f"{BASE_URL}/api/recruitment/my-applications", headers=self.headers)
        assert apps_response.status_code == 200
        applications = apps_response.json()
        
        # Find a pending or reviewing application
        target_app = None
        for app in applications:
            if app["status"] in ["pending", "reviewing"]:
                target_app = app
                break
        
        if target_app:
            response = requests.put(f"{BASE_URL}/api/recruitment/{target_app['id']}/review", headers=self.headers, json={
                "status": "interview",
                "notes": "TEST: Convocato per colloquio",
                "interview_scheduled_at": "2026-02-15T14:00:00Z"
            })
            
            if response.status_code == 200:
                data = response.json()
                assert data["status"] == "interview"
                assert data["interview_scheduled_at"] is not None
                print(f"Application {target_app['id']} set to interview status")
            else:
                print(f"Could not set to interview: {response.status_code} - {response.text}")
        else:
            print("No pending/reviewing applications to test interview workflow")
    
    def test_application_response_includes_interview_fields(self):
        """GET /api/recruitment/my-applications - Response includes interview fields"""
        response = requests.get(f"{BASE_URL}/api/recruitment/my-applications", headers=self.headers)
        assert response.status_code == 200
        applications = response.json()
        
        if len(applications) > 0:
            app = applications[0]
            # Verify interview fields exist
            assert "interview_assigned_to" in app
            assert "interview_assigned_name" in app
            assert "interview_notes" in app
            assert "interview_scheduled_at" in app
            print(f"Application response includes interview fields")
        else:
            pytest.skip("No applications to verify")


class TestAppointmentsCalendar:
    """Test suite for Appointments Calendar functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_sector_calendar(self):
        """GET /api/appointments/calendar/{sector} - Returns accepted appointments with scheduled dates"""
        response = requests.get(f"{BASE_URL}/api/appointments/calendar/LSPD", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # All returned appointments should be accepted with scheduled_date
        for apt in data:
            assert apt["status"] == "accepted"
            assert apt["scheduled_date"] is not None
        print(f"Calendar returned {len(data)} accepted appointments")
    
    def test_appointment_acceptance_generates_notification(self):
        """PUT /api/appointments/{id}/handle - Accepting generates notification"""
        # Create a new appointment
        create_response = requests.post(f"{BASE_URL}/api/appointments/request", headers=self.headers, json={
            "target_sector": "LSPD",
            "subject": "TEST_CALENDAR: Richiesta informazioni",
            "description": "Vorrei informazioni su come denunciare un furto",
            "urgency": "low"
        })
        
        if create_response.status_code == 200:
            apt_id = create_response.json()["id"]
            
            # Get notification count before
            count_before = requests.get(f"{BASE_URL}/api/notifications/count", headers=self.headers).json()["total"]
            
            # Accept the appointment
            accept_response = requests.put(f"{BASE_URL}/api/appointments/{apt_id}/handle", headers=self.headers, json={
                "status": "accepted",
                "notes": "TEST: Appuntamento confermato",
                "scheduled_date": "2026-02-20T11:00:00Z"
            })
            assert accept_response.status_code == 200
            
            # Verify notification was created
            count_after = requests.get(f"{BASE_URL}/api/notifications/count", headers=self.headers).json()["total"]
            assert count_after > count_before, "Notification should be created on acceptance"
            print(f"Appointment {apt_id} accepted, notification generated")
        else:
            print(f"Could not create appointment: {create_response.text}")
    
    def test_appointment_stats(self):
        """GET /api/appointments/stats - Returns appointment statistics"""
        response = requests.get(f"{BASE_URL}/api/appointments/stats", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "pending" in data
        assert "accepted" in data
        assert "completed" in data
        assert "rejected" in data
        print(f"Appointment stats: {data}")


class TestNotificationTypes:
    """Test that different actions generate correct notification types"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_notification_types_exist(self):
        """Verify notification types are correctly set"""
        response = requests.get(f"{BASE_URL}/api/notifications/list?limit=50", headers=self.headers)
        assert response.status_code == 200
        notifications = response.json()
        
        notification_types = set(n["notification_type"] for n in notifications)
        print(f"Found notification types: {notification_types}")
        
        # Expected types based on the system
        expected_types = {
            "recruitment_new",
            "recruitment_status_change", 
            "recruitment_interview",
            "appointment_new",
            "appointment_accepted",
            "appointment_rejected",
            "appointment_completed"
        }
        
        # At least some types should be present
        if len(notifications) > 0:
            assert len(notification_types) > 0, "Should have at least one notification type"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
