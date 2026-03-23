"""
PURE LIFE OS - Iteration 26 Tests
Testing new citizen features:
- Citizen Dashboard API
- Citizen Fines API
- Citizen Warrants API
- Tickets System (create, list, reply, staff management)
- lb-phone Notifications API
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
CITIZEN_EMAIL = "testflow@purelife.rp"
CITIZEN_PASSWORD = "CiaoCiao1!"
ADMIN_EMAIL = "admin@purelife.rp"
ADMIN_PASSWORD = "Admin@2026!"
LSPD_EMAIL = "lspd@purelife.rp"
LSPD_PASSWORD = "Lspd@2026!"
LBPHONE_SECRET = "plos-bridge-secret-2026"


class TestCitizenAuth:
    """Test citizen login and redirect"""
    
    def test_citizen_login_success(self):
        """Citizen login should succeed and return token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CITIZEN_EMAIL,
            "password": CITIZEN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data.get("sector") in ["CIVIL", "CITIZEN"]
        print(f"Citizen login OK - sector: {data.get('sector')}")
    
    def test_admin_login_success(self):
        """Admin login should succeed"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data.get("sector") == "ADMIN"
        print(f"Admin login OK - sector: {data.get('sector')}")


class TestCitizenDashboard:
    """Test citizen dashboard API"""
    
    @pytest.fixture
    def citizen_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CITIZEN_EMAIL,
            "password": CITIZEN_PASSWORD
        })
        return response.json().get("access_token")
    
    def test_citizen_dashboard_returns_stats(self, citizen_token):
        """GET /api/citizen/dashboard should return citizen stats"""
        response = requests.get(
            f"{BASE_URL}/api/citizen/dashboard",
            headers={"Authorization": f"Bearer {citizen_token}"}
        )
        assert response.status_code == 200, f"Dashboard failed: {response.text}"
        data = response.json()
        
        # Verify structure
        assert "game_name" in data
        assert "fines" in data
        assert "warrants" in data
        assert "tickets" in data
        assert "documents" in data
        assert "marketplace" in data
        
        # Verify fines structure
        assert "pending_count" in data["fines"]
        assert "pending_total" in data["fines"]
        
        # Verify warrants structure
        assert "active_count" in data["warrants"]
        
        # Verify tickets structure
        assert "open_count" in data["tickets"]
        
        print(f"Dashboard OK - game_name: {data['game_name']}, fines: {data['fines']['pending_count']}, warrants: {data['warrants']['active_count']}, tickets: {data['tickets']['open_count']}")


class TestCitizenFines:
    """Test citizen fines API"""
    
    @pytest.fixture
    def citizen_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CITIZEN_EMAIL,
            "password": CITIZEN_PASSWORD
        })
        return response.json().get("access_token")
    
    def test_get_my_fines(self, citizen_token):
        """GET /api/citizen/fines should return user fines"""
        response = requests.get(
            f"{BASE_URL}/api/citizen/fines",
            headers={"Authorization": f"Bearer {citizen_token}"}
        )
        assert response.status_code == 200, f"Fines failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"Fines OK - count: {len(data)}")
    
    def test_get_my_fines_filtered_unpaid(self, citizen_token):
        """GET /api/citizen/fines?status=unpaid should return unpaid fines"""
        response = requests.get(
            f"{BASE_URL}/api/citizen/fines?status=unpaid",
            headers={"Authorization": f"Bearer {citizen_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # All returned fines should be unpaid
        for fine in data:
            assert fine.get("is_paid") == False
        print(f"Unpaid fines OK - count: {len(data)}")
    
    def test_get_my_fines_filtered_paid(self, citizen_token):
        """GET /api/citizen/fines?status=paid should return paid fines"""
        response = requests.get(
            f"{BASE_URL}/api/citizen/fines?status=paid",
            headers={"Authorization": f"Bearer {citizen_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # All returned fines should be paid
        for fine in data:
            assert fine.get("is_paid") == True
        print(f"Paid fines OK - count: {len(data)}")


class TestCitizenWarrants:
    """Test citizen warrants API"""
    
    @pytest.fixture
    def citizen_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CITIZEN_EMAIL,
            "password": CITIZEN_PASSWORD
        })
        return response.json().get("access_token")
    
    def test_get_my_warrants(self, citizen_token):
        """GET /api/citizen/warrants should return user warrants"""
        response = requests.get(
            f"{BASE_URL}/api/citizen/warrants",
            headers={"Authorization": f"Bearer {citizen_token}"}
        )
        assert response.status_code == 200, f"Warrants failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"Warrants OK - count: {len(data)}")


class TestCitizenProfile:
    """Test citizen profile API"""
    
    @pytest.fixture
    def citizen_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CITIZEN_EMAIL,
            "password": CITIZEN_PASSWORD
        })
        return response.json().get("access_token")
    
    def test_get_citizen_profile(self, citizen_token):
        """GET /api/citizen/profile should return citizen profile"""
        response = requests.get(
            f"{BASE_URL}/api/citizen/profile",
            headers={"Authorization": f"Bearer {citizen_token}"}
        )
        assert response.status_code == 200, f"Profile failed: {response.text}"
        data = response.json()
        
        assert "id" in data
        assert "email" in data
        assert "game_name" in data
        assert "sector" in data
        assert "fines_stats" in data
        
        print(f"Profile OK - email: {data['email']}, game_name: {data['game_name']}")


class TestTicketsSystem:
    """Test tickets/assistenza system"""
    
    @pytest.fixture
    def citizen_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CITIZEN_EMAIL,
            "password": CITIZEN_PASSWORD
        })
        return response.json().get("access_token")
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json().get("access_token")
    
    def test_create_ticket(self, citizen_token):
        """POST /api/tickets/create should create a new ticket"""
        response = requests.post(
            f"{BASE_URL}/api/tickets/create",
            json={
                "subject": "TEST_Richiesta assistenza test",
                "message": "Questo e' un ticket di test per verificare il sistema",
                "category": "generale",
                "priority": "normal"
            },
            headers={"Authorization": f"Bearer {citizen_token}"}
        )
        assert response.status_code == 200, f"Create ticket failed: {response.text}"
        data = response.json()
        
        assert "id" in data
        assert "ticket_number" in data
        assert data["ticket_number"].startswith("TK-")
        assert data["status"] == "open"
        
        print(f"Create ticket OK - {data['ticket_number']}")
        return data["id"]
    
    def test_get_my_tickets(self, citizen_token):
        """GET /api/tickets/my should return user tickets"""
        response = requests.get(
            f"{BASE_URL}/api/tickets/my",
            headers={"Authorization": f"Bearer {citizen_token}"}
        )
        assert response.status_code == 200, f"Get my tickets failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"My tickets OK - count: {len(data)}")
    
    def test_staff_get_all_tickets(self, admin_token):
        """GET /api/tickets/staff/all should return all tickets for staff"""
        response = requests.get(
            f"{BASE_URL}/api/tickets/staff/all",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Staff get all tickets failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"Staff all tickets OK - count: {len(data)}")
    
    def test_staff_get_ticket_stats(self, admin_token):
        """GET /api/tickets/staff/stats should return ticket statistics"""
        response = requests.get(
            f"{BASE_URL}/api/tickets/staff/stats",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Staff stats failed: {response.text}"
        data = response.json()
        
        assert "open" in data
        assert "in_progress" in data
        assert "resolved" in data
        assert "closed" in data
        assert "urgent" in data
        
        print(f"Staff stats OK - open: {data['open']}, in_progress: {data['in_progress']}")
    
    def test_ticket_reply_flow(self, citizen_token, admin_token):
        """Test full ticket reply flow: create -> citizen reply -> staff reply"""
        # Create ticket
        create_resp = requests.post(
            f"{BASE_URL}/api/tickets/create",
            json={
                "subject": "TEST_Ticket per test reply",
                "message": "Messaggio iniziale del ticket",
                "category": "documenti",
                "priority": "high"
            },
            headers={"Authorization": f"Bearer {citizen_token}"}
        )
        assert create_resp.status_code == 200
        ticket_id = create_resp.json()["id"]
        
        # Staff reply
        staff_reply = requests.post(
            f"{BASE_URL}/api/tickets/{ticket_id}/reply",
            json={"message": "Risposta dello staff al ticket"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert staff_reply.status_code == 200, f"Staff reply failed: {staff_reply.text}"
        assert staff_reply.json()["is_staff_reply"] == True
        
        # Citizen reply
        citizen_reply = requests.post(
            f"{BASE_URL}/api/tickets/{ticket_id}/reply",
            json={"message": "Grazie per la risposta!"},
            headers={"Authorization": f"Bearer {citizen_token}"}
        )
        assert citizen_reply.status_code == 200, f"Citizen reply failed: {citizen_reply.text}"
        assert citizen_reply.json()["is_staff_reply"] == False
        
        print(f"Ticket reply flow OK - ticket_id: {ticket_id}")
    
    def test_ticket_status_update(self, citizen_token, admin_token):
        """Test ticket status update by staff"""
        # Create ticket
        create_resp = requests.post(
            f"{BASE_URL}/api/tickets/create",
            json={
                "subject": "TEST_Ticket per test status",
                "message": "Test status update",
                "category": "altro",
                "priority": "normal"
            },
            headers={"Authorization": f"Bearer {citizen_token}"}
        )
        assert create_resp.status_code == 200
        ticket_id = create_resp.json()["id"]
        
        # Update status to in_progress
        status_resp = requests.put(
            f"{BASE_URL}/api/tickets/{ticket_id}/status",
            json={"status": "in_progress"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert status_resp.status_code == 200, f"Status update failed: {status_resp.text}"
        
        # Update status to resolved
        status_resp2 = requests.put(
            f"{BASE_URL}/api/tickets/{ticket_id}/status",
            json={"status": "resolved"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert status_resp2.status_code == 200
        
        print(f"Ticket status update OK - ticket_id: {ticket_id}")
    
    def test_citizen_cannot_update_status(self, citizen_token):
        """Citizen should not be able to update ticket status"""
        # First create a ticket
        create_resp = requests.post(
            f"{BASE_URL}/api/tickets/create",
            json={
                "subject": "TEST_Ticket status test",
                "message": "Test",
                "category": "generale",
                "priority": "normal"
            },
            headers={"Authorization": f"Bearer {citizen_token}"}
        )
        ticket_id = create_resp.json()["id"]
        
        # Try to update status as citizen
        status_resp = requests.put(
            f"{BASE_URL}/api/tickets/{ticket_id}/status",
            json={"status": "closed"},
            headers={"Authorization": f"Bearer {citizen_token}"}
        )
        assert status_resp.status_code == 403, f"Citizen should not update status: {status_resp.text}"
        print("Citizen cannot update status - OK (403)")


class TestLBPhoneNotifications:
    """Test lb-phone notification queue API"""
    
    def test_get_pending_notifications(self):
        """GET /api/lbphone/notifications/pending should return pending notifications"""
        response = requests.get(
            f"{BASE_URL}/api/lbphone/notifications/pending",
            params={"secret": LBPHONE_SECRET, "limit": 10}
        )
        assert response.status_code == 200, f"Get pending failed: {response.text}"
        data = response.json()
        
        assert "count" in data
        assert "notifications" in data
        assert isinstance(data["notifications"], list)
        
        print(f"Pending notifications OK - count: {data['count']}")
    
    def test_get_pending_notifications_invalid_secret(self):
        """GET /api/lbphone/notifications/pending with invalid secret should fail"""
        response = requests.get(
            f"{BASE_URL}/api/lbphone/notifications/pending",
            params={"secret": "invalid-secret", "limit": 10}
        )
        assert response.status_code == 403, f"Should reject invalid secret: {response.text}"
        print("Invalid secret rejected - OK (403)")
    
    def test_mark_notifications_sent(self):
        """POST /api/lbphone/notifications/mark-sent should mark notifications as sent"""
        # First get pending notifications
        pending_resp = requests.get(
            f"{BASE_URL}/api/lbphone/notifications/pending",
            params={"secret": LBPHONE_SECRET, "limit": 5}
        )
        pending = pending_resp.json()
        
        if pending["count"] > 0:
            # Mark first notification as sent
            ids_to_mark = [pending["notifications"][0]["id"]]
            mark_resp = requests.post(
                f"{BASE_URL}/api/lbphone/notifications/mark-sent",
                params={"secret": LBPHONE_SECRET},
                json=ids_to_mark
            )
            assert mark_resp.status_code == 200, f"Mark sent failed: {mark_resp.text}"
            data = mark_resp.json()
            assert data["marked"] == 1
            print(f"Mark sent OK - marked: {data['marked']}")
        else:
            # No pending notifications, test with empty list
            mark_resp = requests.post(
                f"{BASE_URL}/api/lbphone/notifications/mark-sent",
                params={"secret": LBPHONE_SECRET},
                json=[]
            )
            assert mark_resp.status_code == 200
            assert mark_resp.json()["marked"] == 0
            print("Mark sent OK - no notifications to mark")
    
    def test_notification_stats(self):
        """GET /api/lbphone/notifications/stats should return stats"""
        response = requests.get(
            f"{BASE_URL}/api/lbphone/notifications/stats",
            params={"secret": LBPHONE_SECRET}
        )
        assert response.status_code == 200, f"Stats failed: {response.text}"
        data = response.json()
        
        assert "pending" in data
        assert "sent" in data
        assert "total" in data
        
        print(f"Notification stats OK - pending: {data['pending']}, sent: {data['sent']}, total: {data['total']}")


class TestCitizenAccessControl:
    """Test that citizen cannot access staff-only endpoints"""
    
    @pytest.fixture
    def citizen_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CITIZEN_EMAIL,
            "password": CITIZEN_PASSWORD
        })
        return response.json().get("access_token")
    
    def test_citizen_cannot_access_staff_tickets(self, citizen_token):
        """Citizen should not access /api/tickets/staff/all"""
        response = requests.get(
            f"{BASE_URL}/api/tickets/staff/all",
            headers={"Authorization": f"Bearer {citizen_token}"}
        )
        assert response.status_code == 403, f"Citizen should not access staff tickets: {response.text}"
        print("Citizen cannot access staff tickets - OK (403)")
    
    def test_citizen_cannot_access_staff_stats(self, citizen_token):
        """Citizen should not access /api/tickets/staff/stats"""
        response = requests.get(
            f"{BASE_URL}/api/tickets/staff/stats",
            headers={"Authorization": f"Bearer {citizen_token}"}
        )
        assert response.status_code == 403, f"Citizen should not access staff stats: {response.text}"
        print("Citizen cannot access staff stats - OK (403)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
