"""
ITERATION 27 - Access Control Testing
CRITICAL: Verify LSPD/EMS/DISPATCH cannot access ticket staff APIs
Verify sidebar shows correct items for each role
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
CREDENTIALS = {
    "citizen": {"email": "testflow@purelife.rp", "password": "CiaoCiao1!", "sector": "CIVIL"},
    "admin": {"email": "admin@purelife.rp", "password": "Admin@2026!", "sector": "ADMIN"},
    "lspd": {"email": "lspd@purelife.rp", "password": "Lspd@2026!", "sector": "LSPD"},
    "ems": {"email": "ems@purelife.rp", "password": "Ems@2026!", "sector": "EMS"},
}

LBPHONE_SECRET = "plos-bridge-secret-2026"


def get_token(email, password):
    """Helper to get auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": email,
        "password": password
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    return None


class TestLSPDAccessControl:
    """CRITICAL: LSPD must NOT have access to ticket staff APIs"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.lspd_token = get_token(CREDENTIALS["lspd"]["email"], CREDENTIALS["lspd"]["password"])
        self.admin_token = get_token(CREDENTIALS["admin"]["email"], CREDENTIALS["admin"]["password"])
        self.citizen_token = get_token(CREDENTIALS["citizen"]["email"], CREDENTIALS["citizen"]["password"])
    
    def test_lspd_login_works(self):
        """LSPD can login successfully"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CREDENTIALS["lspd"]["email"],
            "password": CREDENTIALS["lspd"]["password"]
        })
        assert response.status_code == 200, f"LSPD login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        # Verify sector is LSPD
        sector = data.get("sector", "").upper()
        assert sector == "LSPD", f"Expected LSPD sector, got {sector}"
        print(f"✓ LSPD login successful, sector: {sector}")
    
    def test_lspd_cannot_access_staff_tickets_all(self):
        """CRITICAL: LSPD must get 403 from /api/tickets/staff/all"""
        assert self.lspd_token, "LSPD token not available"
        
        response = requests.get(
            f"{BASE_URL}/api/tickets/staff/all",
            headers={"Authorization": f"Bearer {self.lspd_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("✓ LSPD correctly denied access to /api/tickets/staff/all (403)")
    
    def test_lspd_cannot_access_staff_tickets_stats(self):
        """CRITICAL: LSPD must get 403 from /api/tickets/staff/stats"""
        assert self.lspd_token, "LSPD token not available"
        
        response = requests.get(
            f"{BASE_URL}/api/tickets/staff/stats",
            headers={"Authorization": f"Bearer {self.lspd_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("✓ LSPD correctly denied access to /api/tickets/staff/stats (403)")
    
    def test_admin_can_access_staff_tickets_all(self):
        """Admin CAN access /api/tickets/staff/all"""
        assert self.admin_token, "Admin token not available"
        
        response = requests.get(
            f"{BASE_URL}/api/tickets/staff/all",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✓ Admin can access /api/tickets/staff/all (200)")
    
    def test_admin_can_access_staff_tickets_stats(self):
        """Admin CAN access /api/tickets/staff/stats"""
        assert self.admin_token, "Admin token not available"
        
        response = requests.get(
            f"{BASE_URL}/api/tickets/staff/stats",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "open" in data
        assert "in_progress" in data
        print(f"✓ Admin can access /api/tickets/staff/stats: {data}")
    
    def test_citizen_cannot_access_staff_tickets(self):
        """Citizen must get 403 from staff ticket APIs"""
        assert self.citizen_token, "Citizen token not available"
        
        response = requests.get(
            f"{BASE_URL}/api/tickets/staff/all",
            headers={"Authorization": f"Bearer {self.citizen_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Citizen correctly denied access to /api/tickets/staff/all (403)")


class TestEMSAccessControl:
    """EMS must NOT have access to ticket staff APIs"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.ems_token = get_token(CREDENTIALS["ems"]["email"], CREDENTIALS["ems"]["password"])
    
    def test_ems_login_works(self):
        """EMS can login successfully"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CREDENTIALS["ems"]["email"],
            "password": CREDENTIALS["ems"]["password"]
        })
        assert response.status_code == 200, f"EMS login failed: {response.text}"
        data = response.json()
        sector = data.get("sector", "").upper()
        assert sector == "EMS", f"Expected EMS sector, got {sector}"
        print(f"✓ EMS login successful, sector: {sector}")
    
    def test_ems_cannot_access_staff_tickets_all(self):
        """EMS must get 403 from /api/tickets/staff/all"""
        assert self.ems_token, "EMS token not available"
        
        response = requests.get(
            f"{BASE_URL}/api/tickets/staff/all",
            headers={"Authorization": f"Bearer {self.ems_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("✓ EMS correctly denied access to /api/tickets/staff/all (403)")
    
    def test_ems_cannot_access_staff_tickets_stats(self):
        """EMS must get 403 from /api/tickets/staff/stats"""
        assert self.ems_token, "EMS token not available"
        
        response = requests.get(
            f"{BASE_URL}/api/tickets/staff/stats",
            headers={"Authorization": f"Bearer {self.ems_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("✓ EMS correctly denied access to /api/tickets/staff/stats (403)")


class TestCitizenFeatures:
    """Test citizen-specific features"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.citizen_token = get_token(CREDENTIALS["citizen"]["email"], CREDENTIALS["citizen"]["password"])
    
    def test_citizen_login_redirects_correctly(self):
        """Citizen login returns CIVIL sector"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CREDENTIALS["citizen"]["email"],
            "password": CREDENTIALS["citizen"]["password"]
        })
        assert response.status_code == 200
        data = response.json()
        sector = data.get("sector", "").upper()
        assert sector in ["CIVIL", "CITIZEN"], f"Expected CIVIL/CITIZEN sector, got {sector}"
        print(f"✓ Citizen login successful, sector: {sector}")
    
    def test_citizen_dashboard_loads(self):
        """Citizen dashboard API works"""
        assert self.citizen_token, "Citizen token not available"
        
        response = requests.get(
            f"{BASE_URL}/api/citizen/dashboard",
            headers={"Authorization": f"Bearer {self.citizen_token}"}
        )
        assert response.status_code == 200, f"Dashboard failed: {response.text}"
        data = response.json()
        # Should have stats sections
        assert "fines" in data or "warrants" in data or "tickets" in data
        print(f"✓ Citizen dashboard loads with stats")
    
    def test_citizen_fines_page(self):
        """Citizen fines API works"""
        assert self.citizen_token, "Citizen token not available"
        
        response = requests.get(
            f"{BASE_URL}/api/citizen/fines",
            headers={"Authorization": f"Bearer {self.citizen_token}"}
        )
        assert response.status_code == 200, f"Fines failed: {response.text}"
        print("✓ Citizen fines API works")
    
    def test_citizen_warrants_page(self):
        """Citizen warrants API works"""
        assert self.citizen_token, "Citizen token not available"
        
        response = requests.get(
            f"{BASE_URL}/api/citizen/warrants",
            headers={"Authorization": f"Bearer {self.citizen_token}"}
        )
        assert response.status_code == 200, f"Warrants failed: {response.text}"
        print("✓ Citizen warrants API works")
    
    def test_citizen_can_create_ticket(self):
        """Citizen can create a ticket"""
        assert self.citizen_token, "Citizen token not available"
        
        response = requests.post(
            f"{BASE_URL}/api/tickets/create",
            json={
                "subject": "TEST_Iteration27_Ticket",
                "message": "Test ticket from iteration 27 testing",
                "category": "generale",
                "priority": "normal"
            },
            headers={"Authorization": f"Bearer {self.citizen_token}"}
        )
        assert response.status_code == 200, f"Create ticket failed: {response.text}"
        data = response.json()
        assert "ticket_number" in data
        print(f"✓ Citizen created ticket: {data.get('ticket_number')}")
    
    def test_citizen_can_view_own_tickets(self):
        """Citizen can view their own tickets"""
        assert self.citizen_token, "Citizen token not available"
        
        response = requests.get(
            f"{BASE_URL}/api/tickets/my",
            headers={"Authorization": f"Bearer {self.citizen_token}"}
        )
        assert response.status_code == 200, f"My tickets failed: {response.text}"
        print("✓ Citizen can view own tickets")


class TestLbPhoneNotifications:
    """Test lb-phone notification APIs"""
    
    def test_pending_notifications_with_valid_secret(self):
        """GET /api/lbphone/notifications/pending works with valid secret"""
        response = requests.get(
            f"{BASE_URL}/api/lbphone/notifications/pending",
            params={"secret": LBPHONE_SECRET}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "count" in data
        assert "notifications" in data
        print(f"✓ lb-phone pending notifications: {data['count']} pending")
    
    def test_pending_notifications_with_invalid_secret(self):
        """GET /api/lbphone/notifications/pending fails with invalid secret"""
        response = requests.get(
            f"{BASE_URL}/api/lbphone/notifications/pending",
            params={"secret": "invalid-secret"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ lb-phone rejects invalid secret (403)")
    
    def test_mark_sent_works(self):
        """POST /api/lbphone/notifications/mark-sent works"""
        response = requests.post(
            f"{BASE_URL}/api/lbphone/notifications/mark-sent",
            params={"secret": LBPHONE_SECRET},
            json=[]  # Empty list is valid
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✓ lb-phone mark-sent works")
    
    def test_notification_stats(self):
        """GET /api/lbphone/notifications/stats works"""
        response = requests.get(
            f"{BASE_URL}/api/lbphone/notifications/stats",
            params={"secret": LBPHONE_SECRET}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "pending" in data
        assert "sent" in data
        assert "total" in data
        print(f"✓ lb-phone stats: pending={data['pending']}, sent={data['sent']}, total={data['total']}")


class TestAdminTicketManagement:
    """Test admin can manage tickets"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.admin_token = get_token(CREDENTIALS["admin"]["email"], CREDENTIALS["admin"]["password"])
        self.citizen_token = get_token(CREDENTIALS["citizen"]["email"], CREDENTIALS["citizen"]["password"])
    
    def test_admin_can_view_all_tickets(self):
        """Admin can view all tickets"""
        assert self.admin_token, "Admin token not available"
        
        response = requests.get(
            f"{BASE_URL}/api/tickets/staff/all",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Admin can view all tickets: {len(data)} tickets")
    
    def test_admin_can_change_ticket_status(self):
        """Admin can change ticket status"""
        assert self.admin_token, "Admin token not available"
        
        # First get a ticket
        response = requests.get(
            f"{BASE_URL}/api/tickets/staff/all",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 200
        tickets = response.json()
        
        if len(tickets) > 0:
            ticket_id = tickets[0]["id"]
            current_status = tickets[0]["status"]
            new_status = "in_progress" if current_status == "open" else "open"
            
            # Change status
            response = requests.put(
                f"{BASE_URL}/api/tickets/{ticket_id}/status",
                json={"status": new_status},
                headers={"Authorization": f"Bearer {self.admin_token}"}
            )
            assert response.status_code == 200, f"Status change failed: {response.text}"
            print(f"✓ Admin changed ticket {ticket_id} status to {new_status}")
        else:
            print("⚠ No tickets to test status change")
    
    def test_admin_can_reply_to_ticket(self):
        """Admin can reply to a ticket (sends lb-phone notification)"""
        assert self.admin_token, "Admin token not available"
        
        # Get a ticket
        response = requests.get(
            f"{BASE_URL}/api/tickets/staff/all",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        tickets = response.json()
        
        if len(tickets) > 0:
            ticket_id = tickets[0]["id"]
            
            # Reply
            response = requests.post(
                f"{BASE_URL}/api/tickets/{ticket_id}/reply",
                json={"message": "TEST_Admin reply from iteration 27"},
                headers={"Authorization": f"Bearer {self.admin_token}"}
            )
            assert response.status_code == 200, f"Reply failed: {response.text}"
            data = response.json()
            assert data.get("is_staff_reply") == True
            print(f"✓ Admin replied to ticket {ticket_id}, is_staff_reply=True")
        else:
            print("⚠ No tickets to test reply")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
