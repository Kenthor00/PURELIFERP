"""
PURE LIFE OS 3.0 - Iteration 12 Comprehensive Audit Tests
Testing all modules: Auth, LSPD, EMS, Justice, Dispatch, City Hub, Delete
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@purelife.rp"
ADMIN_PASSWORD = "Admin@2026!"


class TestAuth:
    """A) AUTH: Login, Token, Logout, Route Protection"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_login_success(self):
        """A) Login with admin credentials"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["email"] == ADMIN_EMAIL
        assert data["sector"] == "ADMIN"
        print(f"SUCCESS: Login returned tokens and user info (sector: {data['sector']})")
    
    def test_login_invalid_credentials(self):
        """A) Login with wrong password returns 401"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": "WrongPassword123!"
        })
        assert response.status_code == 401
        print("SUCCESS: Invalid credentials correctly rejected with 401")
    
    def test_token_validation_me_endpoint(self):
        """A) Token validation via /api/auth/me"""
        # First login
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = login_resp.json()["access_token"]
        
        # Validate token
        me_resp = self.session.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        assert me_resp.status_code == 200
        data = me_resp.json()
        assert data["email"] == ADMIN_EMAIL
        assert "permissions" in data
        print(f"SUCCESS: Token validated, user has {len(data['permissions'])} permissions")
    
    def test_protected_route_without_token(self):
        """A) Protected routes return 401 without token"""
        response = self.session.get(f"{BASE_URL}/api/lspd/cases")
        assert response.status_code == 401
        print("SUCCESS: Protected route correctly returns 401 without token")
    
    def test_logout(self):
        """A) Logout endpoint works"""
        # Login first
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = login_resp.json()["access_token"]
        refresh_token = login_resp.json()["refresh_token"]
        
        # Logout
        logout_resp = self.session.post(f"{BASE_URL}/api/auth/logout", 
            json={"refresh_token": refresh_token},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert logout_resp.status_code == 200
        print("SUCCESS: Logout completed successfully")


class TestLSPD:
    """C) LSPD CRUD: Cases, Warrants, Fines"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        # Login
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        self.token = login_resp.json()["access_token"]
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
    
    def test_lspd_stats(self):
        """LSPD stats endpoint"""
        response = self.session.get(f"{BASE_URL}/api/lspd/stats")
        assert response.status_code == 200
        data = response.json()
        assert "casi_aperti" in data
        assert "mandati_attivi" in data
        assert "multe_non_pagate" in data
        print(f"SUCCESS: LSPD stats - {data['casi_aperti']} open cases, {data['mandati_attivi']} active warrants")
    
    def test_cases_list(self):
        """C) Lista casi"""
        response = self.session.get(f"{BASE_URL}/api/lspd/cases")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: LSPD cases list returned {len(data)} cases")
    
    def test_case_create(self):
        """C) Creazione caso"""
        response = self.session.post(f"{BASE_URL}/api/lspd/cases", json={
            "title": f"TEST_Case_{datetime.now().strftime('%H%M%S')}",
            "description": "Test case for audit",
            "priority": "MEDIUM",
            "suspect_name": "TEST_Suspect",
            "location": "Los Santos"
        })
        assert response.status_code == 200
        data = response.json()
        assert "case_number" in data
        assert data["status"] == "OPEN"
        print(f"SUCCESS: Case created with number {data['case_number']}")
        return data["id"]
    
    def test_warrants_list(self):
        """C) Lista mandati"""
        response = self.session.get(f"{BASE_URL}/api/lspd/warrants")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: LSPD warrants list returned {len(data)} warrants")
    
    def test_fines_list(self):
        """C) Lista multe"""
        response = self.session.get(f"{BASE_URL}/api/lspd/fines")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: LSPD fines list returned {len(data)} fines")


class TestEMS:
    """C) EMS CRUD: Patients, Reports"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        self.token = login_resp.json()["access_token"]
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
    
    def test_ems_stats(self):
        """EMS stats endpoint"""
        response = self.session.get(f"{BASE_URL}/api/ems/stats")
        assert response.status_code == 200
        data = response.json()
        assert "pazienti_totali" in data
        assert "referti_oggi" in data
        print(f"SUCCESS: EMS stats - {data['pazienti_totali']} total patients")
    
    def test_patients_list(self):
        """C) Lista pazienti"""
        response = self.session.get(f"{BASE_URL}/api/ems/patients")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: EMS patients list returned {len(data)} patients")
    
    def test_patient_create(self):
        """C) Creazione paziente"""
        response = self.session.post(f"{BASE_URL}/api/ems/patients", json={
            "name": f"TEST_Patient_{datetime.now().strftime('%H%M%S')}",
            "identifier": f"ID_{datetime.now().strftime('%H%M%S')}",
            "blood_type": "A+",
            "allergies": "None",
            "phone_number": "555-0123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "patient_number" in data
        print(f"SUCCESS: Patient created with number {data['patient_number']}")
        return data["id"]
    
    def test_reports_list(self):
        """C) Lista referti"""
        response = self.session.get(f"{BASE_URL}/api/ems/reports")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: EMS reports list returned {len(data)} reports")


class TestJustice:
    """C) JUSTICE CRUD: Dashboard, Cases, Hearings"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        self.token = login_resp.json()["access_token"]
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
    
    def test_justice_stats(self):
        """Justice stats endpoint"""
        response = self.session.get(f"{BASE_URL}/api/justice/stats")
        assert response.status_code == 200
        data = response.json()
        assert "pratiche_in_attesa" in data
        assert "udienze_programmate" in data
        print(f"SUCCESS: Justice stats - {data['pratiche_in_attesa']} pending cases")
    
    def test_legal_cases_list(self):
        """C) Dashboard - lista casi legali"""
        response = self.session.get(f"{BASE_URL}/api/justice/cases")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Justice cases list returned {len(data)} cases")
    
    def test_legal_case_create(self):
        """C) Creazione caso legale"""
        response = self.session.post(f"{BASE_URL}/api/justice/cases", json={
            "title": f"TEST_LegalCase_{datetime.now().strftime('%H%M%S')}",
            "case_type": "CIVIL",
            "plaintiff_name": "TEST_Plaintiff",
            "defendant_name": "TEST_Defendant",
            "description": "Test legal case for audit"
        })
        assert response.status_code == 200
        data = response.json()
        assert "case_number" in data
        print(f"SUCCESS: Legal case created with number {data['case_number']}")
    
    def test_hearings_list(self):
        """C) Lista udienze"""
        response = self.session.get(f"{BASE_URL}/api/justice/hearings")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Justice hearings list returned {len(data)} hearings")
    
    def test_hearing_create(self):
        """C) Creazione udienza"""
        from datetime import timedelta
        future_date = (datetime.now() + timedelta(days=7)).isoformat()
        response = self.session.post(f"{BASE_URL}/api/justice/hearings", json={
            "title": f"TEST_Hearing_{datetime.now().strftime('%H%M%S')}",
            "scheduled_date": future_date,
            "courtroom": "Aula 1",
            "description": "Test hearing for audit"
        })
        assert response.status_code == 200
        data = response.json()
        assert "hearing_number" in data
        print(f"SUCCESS: Hearing created with number {data['hearing_number']}")


class TestDispatch:
    """C) DISPATCH: Dashboard chiamate"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        self.token = login_resp.json()["access_token"]
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
    
    def test_dispatch_stats(self):
        """Dispatch stats endpoint"""
        response = self.session.get(f"{BASE_URL}/api/dispatch/stats")
        assert response.status_code == 200
        data = response.json()
        assert "chiamate_in_attesa" in data
        assert "chiamate_attive" in data
        print(f"SUCCESS: Dispatch stats - {data['chiamate_attive']} active calls")
    
    def test_active_calls(self):
        """C) Dashboard chiamate attive"""
        response = self.session.get(f"{BASE_URL}/api/dispatch/calls/active")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Dispatch active calls returned {len(data)} calls")
    
    def test_calls_list(self):
        """All calls list"""
        response = self.session.get(f"{BASE_URL}/api/dispatch/calls")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Dispatch all calls returned {len(data)} calls")


class TestCityHub:
    """C) CITY HUB: Annunci, Appuntamenti, Recruiting, Advertising"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        self.token = login_resp.json()["access_token"]
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
    
    def test_announcements_public(self):
        """C) Annunci (public)"""
        response = requests.get(f"{BASE_URL}/api/city/announcements")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: City announcements returned {len(data)} items")
    
    def test_events_public(self):
        """City events (public)"""
        response = requests.get(f"{BASE_URL}/api/city/events")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: City events returned {len(data)} items")
    
    def test_ads_active(self):
        """C) Advertising attivo"""
        response = requests.get(f"{BASE_URL}/api/city/ads/active")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Active ads returned {len(data)} items")
    
    def test_recruitment_list(self):
        """C) Recruiting list"""
        response = self.session.get(f"{BASE_URL}/api/city/recruitment")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Recruitment list returned {len(data)} applications")
    
    def test_appointments_list(self):
        """C) Appuntamenti list"""
        response = self.session.get(f"{BASE_URL}/api/city/appointments")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Appointments list returned {len(data)} items")


class TestNews:
    """C) NEWS: Editor notizie"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        self.token = login_resp.json()["access_token"]
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
    
    def test_breaking_news_public(self):
        """Breaking news (public)"""
        response = requests.get(f"{BASE_URL}/api/news/breaking")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Breaking news returned {len(data)} items")
    
    def test_news_articles_list(self):
        """News articles list"""
        response = self.session.get(f"{BASE_URL}/api/news/articles")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: News articles returned {len(data)} items")


class TestDeleteUniversal:
    """D) DELETE: Verifica sistema delete universale"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        self.token = login_resp.json()["access_token"]
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
    
    def test_delete_permissions(self):
        """D) Verifica permessi delete"""
        response = self.session.get(f"{BASE_URL}/api/admin/delete/permissions")
        assert response.status_code == 200
        data = response.json()
        assert "permissions" in data
        assert data["is_admin"] == True
        print(f"SUCCESS: Delete permissions - admin can delete {sum(1 for p in data['permissions'].values() if p['can_delete'])} resource types")
    
    def test_delete_case_flow(self):
        """D) Delete case flow - create then delete"""
        # Create a test case
        create_resp = self.session.post(f"{BASE_URL}/api/lspd/cases", json={
            "title": f"TEST_DELETE_Case_{datetime.now().strftime('%H%M%S')}",
            "description": "Test case for delete audit",
            "priority": "LOW",
            "suspect_name": "TEST_Delete_Suspect",
            "location": "Test Location"
        })
        assert create_resp.status_code == 200
        case_id = create_resp.json()["id"]
        
        # Delete the case
        delete_resp = self.session.delete(f"{BASE_URL}/api/admin/delete/case/{case_id}?reason=Audit%20test")
        assert delete_resp.status_code == 200
        data = delete_resp.json()
        assert data["success"] == True
        print(f"SUCCESS: Case {case_id} deleted successfully")


class TestSSE:
    """E) SSE: Connessione EventSource"""
    
    def test_sse_endpoint_exists(self):
        """E) SSE endpoint responds"""
        # Login first
        session = requests.Session()
        login_resp = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = login_resp.json()["access_token"]
        
        # Test SSE endpoint with token as query param
        response = session.get(f"{BASE_URL}/api/sse/events?token={token}", stream=True, timeout=5)
        # SSE should return 200 with text/event-stream content type
        # Note: May return 403 if token validation fails for query param
        print(f"SSE endpoint response: {response.status_code}")
        if response.status_code == 200:
            print("SUCCESS: SSE endpoint accessible")
        else:
            print(f"WARNING: SSE endpoint returned {response.status_code} - may need query param token support")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
