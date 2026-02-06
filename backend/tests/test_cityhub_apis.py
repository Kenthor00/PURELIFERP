"""
PURE LIFE OS - City Hub API Tests
Tests for Recruitment, Appointments, Announcements, and Advertising modules
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@purelife.rp"
ADMIN_PASSWORD = "Admin@2026!"


class TestHealthAndSetup:
    """Basic health checks"""
    
    def test_health_endpoint(self):
        """Test /api/health returns OK"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        print(f"✓ Health check passed: {data}")


class TestAuthentication:
    """Authentication tests"""
    
    def test_admin_login(self):
        """Test admin login returns token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["sector"] == "ADMIN"
        print(f"✓ Admin login successful: sector={data['sector']}, game_name={data.get('game_name')}")
        return data["access_token"]


class TestRecruitmentAPI:
    """Recruitment module API tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Authentication failed")
    
    def test_get_available_sectors(self, auth_token):
        """GET /api/recruitment/available-sectors - Returns available sectors for recruitment"""
        response = requests.get(
            f"{BASE_URL}/api/recruitment/available-sectors",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "sectors" in data
        assert len(data["sectors"]) > 0
        # Verify expected sectors
        sector_values = [s["value"] for s in data["sectors"]]
        assert "LSPD" in sector_values
        assert "EMS" in sector_values
        assert "GOV" in sector_values
        print(f"✓ Available sectors: {sector_values}")
    
    def test_create_application(self, auth_token):
        """POST /api/recruitment/apply - Create a recruitment application"""
        response = requests.post(
            f"{BASE_URL}/api/recruitment/apply",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "target_sector": "LSPD",
                "motivation": "TEST_Voglio entrare nella polizia per servire la comunità",
                "experience": "TEST_Ho esperienza in altri server RP",
                "availability": "Sera e weekend",
                "additional_info": "TEST_Application for testing"
            }
        )
        # Admin might not be able to apply (business logic), or it should succeed
        if response.status_code == 200:
            data = response.json()
            assert data["target_sector"] == "LSPD"
            assert data["status"] == "pending"
            assert "id" in data
            print(f"✓ Application created: id={data['id']}, status={data['status']}")
            return data["id"]
        elif response.status_code == 400:
            # Expected if admin can't apply or already has pending application
            print(f"✓ Application rejected as expected: {response.json().get('detail')}")
        else:
            print(f"Application response: {response.status_code} - {response.text}")
    
    def test_get_my_applications(self, auth_token):
        """GET /api/recruitment/my-applications - Get user's applications"""
        response = requests.get(
            f"{BASE_URL}/api/recruitment/my-applications",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ My applications count: {len(data)}")
    
    def test_get_sector_applications(self, auth_token):
        """GET /api/recruitment/sector/{sector} - Get applications for a sector (admin)"""
        response = requests.get(
            f"{BASE_URL}/api/recruitment/sector/LSPD",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ LSPD sector applications: {len(data)}")
    
    def test_get_recruitment_stats(self, auth_token):
        """GET /api/recruitment/stats - Get recruitment statistics"""
        response = requests.get(
            f"{BASE_URL}/api/recruitment/stats",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "pending" in data
        assert "reviewing" in data
        assert "accepted" in data
        assert "rejected" in data
        print(f"✓ Recruitment stats: pending={data['pending']}, accepted={data['accepted']}")


class TestAppointmentsAPI:
    """Appointments module API tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Authentication failed")
    
    def test_create_appointment_request(self, auth_token):
        """POST /api/appointments/request - Create an appointment request"""
        response = requests.post(
            f"{BASE_URL}/api/appointments/request",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "target_sector": "GOV",
                "subject": "TEST_Richiesta incontro per licenza",
                "description": "TEST_Vorrei discutere della mia richiesta di licenza commerciale",
                "preferred_date": (datetime.now() + timedelta(days=7)).isoformat(),
                "preferred_time": "pomeriggio",
                "urgency": "normal"
            }
        )
        if response.status_code == 200:
            data = response.json()
            assert data["target_sector"] == "GOV"
            assert data["status"] == "pending"
            assert "id" in data
            print(f"✓ Appointment created: id={data['id']}, status={data['status']}")
            return data["id"]
        else:
            print(f"Appointment response: {response.status_code} - {response.text}")
            # Should succeed for admin
            assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    
    def test_get_my_requests(self, auth_token):
        """GET /api/appointments/my-requests - Get user's appointment requests"""
        response = requests.get(
            f"{BASE_URL}/api/appointments/my-requests",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ My appointment requests: {len(data)}")
    
    def test_get_sector_appointments(self, auth_token):
        """GET /api/appointments/sector/{sector} - Get appointments for a sector"""
        response = requests.get(
            f"{BASE_URL}/api/appointments/sector/GOV",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GOV sector appointments: {len(data)}")
    
    def test_get_sector_calendar(self, auth_token):
        """GET /api/appointments/calendar/{sector} - Get sector calendar"""
        response = requests.get(
            f"{BASE_URL}/api/appointments/calendar/GOV",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GOV calendar entries: {len(data)}")
    
    def test_get_appointment_stats(self, auth_token):
        """GET /api/appointments/stats - Get appointment statistics"""
        response = requests.get(
            f"{BASE_URL}/api/appointments/stats",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "pending" in data
        assert "accepted" in data
        assert "completed" in data
        print(f"✓ Appointment stats: pending={data['pending']}, completed={data['completed']}")


class TestAnnouncementsAPI:
    """Announcements module API tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Authentication failed")
    
    def test_get_categories(self):
        """GET /api/announcements/categories - Get announcement categories (public)"""
        response = requests.get(f"{BASE_URL}/api/announcements/categories")
        assert response.status_code == 200
        data = response.json()
        assert "categories" in data
        assert len(data["categories"]) > 0
        cat_values = [c["value"] for c in data["categories"]]
        assert "lavoro" in cat_values
        assert "vendita" in cat_values
        print(f"✓ Categories: {cat_values}")
    
    def test_get_public_announcements(self):
        """GET /api/announcements/public - Get public announcements (no auth required)"""
        response = requests.get(f"{BASE_URL}/api/announcements/public")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Public announcements: {len(data)}")
    
    def test_create_announcement(self, auth_token):
        """POST /api/announcements/create - Create an announcement"""
        response = requests.post(
            f"{BASE_URL}/api/announcements/create",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "title": "TEST_Cerco lavoro come autista",
                "description": "TEST_Sono disponibile per lavori di trasporto e consegne",
                "category": "lavoro",
                "contact_info": "555-1234",
                "location": "Los Santos",
                "duration_days": 30
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "TEST_Cerco lavoro come autista"
        assert data["category"] == "lavoro"
        assert data["status"] == "pending"
        assert "id" in data
        print(f"✓ Announcement created: id={data['id']}, status={data['status']}")
        return data["id"]
    
    def test_get_my_announcements(self, auth_token):
        """GET /api/announcements/my-announcements - Get user's announcements"""
        response = requests.get(
            f"{BASE_URL}/api/announcements/my-announcements",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ My announcements: {len(data)}")
    
    def test_get_pending_announcements(self, auth_token):
        """GET /api/announcements/pending - Get pending announcements (moderator)"""
        response = requests.get(
            f"{BASE_URL}/api/announcements/pending",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Pending announcements: {len(data)}")
    
    def test_get_announcement_stats(self, auth_token):
        """GET /api/announcements/stats - Get announcement statistics"""
        response = requests.get(
            f"{BASE_URL}/api/announcements/stats",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "pending" in data
        assert "approved" in data
        assert "by_category" in data
        print(f"✓ Announcement stats: pending={data['pending']}, approved={data['approved']}")


class TestAdvertisingAPI:
    """Advertising module API tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Authentication failed")
    
    def test_get_positions(self):
        """GET /api/advertising/positions - Get available ad positions (public)"""
        response = requests.get(f"{BASE_URL}/api/advertising/positions")
        assert response.status_code == 200
        data = response.json()
        assert "positions" in data
        assert len(data["positions"]) > 0
        pos_values = [p["value"] for p in data["positions"]]
        assert "homepage_banner" in pos_values
        assert "sidebar" in pos_values
        print(f"✓ Ad positions: {pos_values}")
    
    def test_request_ad_slot(self, auth_token):
        """POST /api/advertising/request - Request an advertising slot"""
        response = requests.post(
            f"{BASE_URL}/api/advertising/request",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "business_name": "TEST_Los Santos Customs",
                "title": "TEST_Sconto 20% su tutte le modifiche!",
                "description": "TEST_Offerta valida fino a fine mese",
                "image_url": "https://example.com/banner.jpg",
                "link_url": "https://example.com",
                "position": "homepage_banner",
                "duration_days": 7
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["business_name"] == "TEST_Los Santos Customs"
        assert data["position"] == "homepage_banner"
        assert data["status"] == "pending"
        assert "id" in data
        print(f"✓ Ad slot requested: id={data['id']}, status={data['status']}")
        return data["id"]
    
    def test_get_my_slots(self, auth_token):
        """GET /api/advertising/my-slots - Get user's ad slots"""
        response = requests.get(
            f"{BASE_URL}/api/advertising/my-slots",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ My ad slots: {len(data)}")
    
    def test_get_pending_slots(self, auth_token):
        """GET /api/advertising/pending - Get pending ad slots (admin/GOV)"""
        response = requests.get(
            f"{BASE_URL}/api/advertising/pending",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Pending ad slots: {len(data)}")
    
    def test_get_my_stats(self, auth_token):
        """GET /api/advertising/my-stats - Get user's ad statistics"""
        response = requests.get(
            f"{BASE_URL}/api/advertising/my-stats",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "active_slots" in data
        assert "total_views" in data
        assert "total_clicks" in data
        print(f"✓ My ad stats: active={data['active_slots']}, views={data['total_views']}")
    
    def test_get_all_stats(self, auth_token):
        """GET /api/advertising/all-stats - Get all ad statistics (admin/GOV)"""
        response = requests.get(
            f"{BASE_URL}/api/advertising/all-stats",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "pending" in data
        assert "active" in data
        assert "total_views" in data
        print(f"✓ All ad stats: pending={data['pending']}, active={data['active']}")


class TestModerationWorkflows:
    """Test moderation workflows for announcements and advertising"""
    
    @pytest.fixture
    def auth_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Authentication failed")
    
    def test_moderate_announcement_approve(self, auth_token):
        """Test announcement moderation workflow - approve"""
        # First create an announcement
        create_response = requests.post(
            f"{BASE_URL}/api/announcements/create",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "title": "TEST_MODERATE_Annuncio da approvare",
                "description": "TEST_Questo annuncio sarà approvato",
                "category": "servizi",
                "duration_days": 7
            }
        )
        assert create_response.status_code == 200
        announcement_id = create_response.json()["id"]
        
        # Now moderate (approve)
        moderate_response = requests.put(
            f"{BASE_URL}/api/announcements/{announcement_id}/moderate",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "status": "approved",
                "notes": "TEST_Approvato per testing"
            }
        )
        assert moderate_response.status_code == 200
        data = moderate_response.json()
        assert data["status"] == "approved"
        assert data["moderator_notes"] == "TEST_Approvato per testing"
        print(f"✓ Announcement {announcement_id} approved successfully")
        
        # Verify it appears in public
        public_response = requests.get(f"{BASE_URL}/api/announcements/public")
        assert public_response.status_code == 200
        public_data = public_response.json()
        approved_ids = [a["id"] for a in public_data]
        assert announcement_id in approved_ids
        print(f"✓ Approved announcement visible in public list")
    
    def test_approve_ad_slot(self, auth_token):
        """Test ad slot approval workflow"""
        # First create an ad slot request
        create_response = requests.post(
            f"{BASE_URL}/api/advertising/request",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "business_name": "TEST_APPROVE_Business",
                "title": "TEST_Ad to approve",
                "image_url": "https://example.com/test.jpg",
                "position": "sidebar",
                "duration_days": 7
            }
        )
        assert create_response.status_code == 200
        slot_id = create_response.json()["id"]
        
        # Approve the slot
        approve_response = requests.put(
            f"{BASE_URL}/api/advertising/{slot_id}/approve",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "notes": "TEST_Approved for testing"
            }
        )
        assert approve_response.status_code == 200
        data = approve_response.json()
        assert data["status"] == "active"
        print(f"✓ Ad slot {slot_id} approved and activated")
    
    def test_reject_ad_slot(self, auth_token):
        """Test ad slot rejection workflow"""
        # First create an ad slot request
        create_response = requests.post(
            f"{BASE_URL}/api/advertising/request",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "business_name": "TEST_REJECT_Business",
                "title": "TEST_Ad to reject",
                "image_url": "https://example.com/test.jpg",
                "position": "footer",
                "duration_days": 7
            }
        )
        assert create_response.status_code == 200
        slot_id = create_response.json()["id"]
        
        # Reject the slot
        reject_response = requests.put(
            f"{BASE_URL}/api/advertising/{slot_id}/reject",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "notes": "TEST_Rejected for testing - inappropriate content"
            }
        )
        assert reject_response.status_code == 200
        data = reject_response.json()
        assert data["status"] == "rejected"
        print(f"✓ Ad slot {slot_id} rejected successfully")


class TestAppointmentWorkflows:
    """Test appointment handling workflows"""
    
    @pytest.fixture
    def auth_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Authentication failed")
    
    def test_handle_appointment_accept(self, auth_token):
        """Test appointment accept workflow"""
        # Create appointment
        create_response = requests.post(
            f"{BASE_URL}/api/appointments/request",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "target_sector": "LSPD",
                "subject": "TEST_HANDLE_Richiesta incontro",
                "description": "TEST_Appuntamento da accettare",
                "urgency": "normal"
            }
        )
        assert create_response.status_code == 200
        appointment_id = create_response.json()["id"]
        
        # Accept the appointment
        scheduled_date = (datetime.now() + timedelta(days=3)).isoformat()
        handle_response = requests.put(
            f"{BASE_URL}/api/appointments/{appointment_id}/handle",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "status": "accepted",
                "notes": "TEST_Confermato per il giorno indicato",
                "scheduled_date": scheduled_date
            }
        )
        assert handle_response.status_code == 200
        data = handle_response.json()
        assert data["status"] == "accepted"
        print(f"✓ Appointment {appointment_id} accepted")
    
    def test_cancel_appointment(self, auth_token):
        """Test appointment cancellation"""
        # Create appointment
        create_response = requests.post(
            f"{BASE_URL}/api/appointments/request",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "target_sector": "EMS",
                "subject": "TEST_CANCEL_Appuntamento da annullare",
                "description": "TEST_Questo appuntamento sarà annullato",
                "urgency": "low"
            }
        )
        assert create_response.status_code == 200
        appointment_id = create_response.json()["id"]
        
        # Cancel the appointment
        cancel_response = requests.post(
            f"{BASE_URL}/api/appointments/{appointment_id}/cancel",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert cancel_response.status_code == 200
        print(f"✓ Appointment {appointment_id} cancelled")


class TestRecruitmentWorkflows:
    """Test recruitment review workflows"""
    
    @pytest.fixture
    def auth_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Authentication failed")
    
    def test_review_application(self, auth_token):
        """Test application review workflow"""
        # First check if there are any pending applications
        sector_response = requests.get(
            f"{BASE_URL}/api/recruitment/sector/LSPD?status=pending",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert sector_response.status_code == 200
        applications = sector_response.json()
        
        if len(applications) > 0:
            app_id = applications[0]["id"]
            
            # Review the application
            review_response = requests.put(
                f"{BASE_URL}/api/recruitment/{app_id}/review",
                headers={"Authorization": f"Bearer {auth_token}"},
                json={
                    "status": "reviewing",
                    "notes": "TEST_In fase di valutazione"
                }
            )
            assert review_response.status_code == 200
            data = review_response.json()
            assert data["status"] == "reviewing"
            print(f"✓ Application {app_id} set to reviewing")
        else:
            print("✓ No pending applications to review (expected)")


class TestCleanup:
    """Cleanup test data"""
    
    @pytest.fixture
    def auth_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Authentication failed")
    
    def test_cleanup_test_announcements(self, auth_token):
        """Delete TEST_ prefixed announcements"""
        # Get my announcements
        response = requests.get(
            f"{BASE_URL}/api/announcements/my-announcements",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        if response.status_code == 200:
            announcements = response.json()
            deleted = 0
            for ann in announcements:
                if ann["title"].startswith("TEST_"):
                    del_response = requests.delete(
                        f"{BASE_URL}/api/announcements/{ann['id']}",
                        headers={"Authorization": f"Bearer {auth_token}"}
                    )
                    if del_response.status_code == 200:
                        deleted += 1
            print(f"✓ Cleaned up {deleted} test announcements")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
