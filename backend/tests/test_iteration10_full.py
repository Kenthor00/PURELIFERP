"""
PURE LIFE OS - Iteration 10 Full Test Suite
Tests all modules: Auth, LSPD, EMS, Justice, Dispatch
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://fivem-roleplay-7.preview.emergentagent.com')

# Test credentials
ADMIN_EMAIL = "admin@purelife.rp"
ADMIN_PASSWORD = "Admin@2026!"


class TestAuth:
    """Authentication tests"""
    
    def test_health_endpoint(self):
        """Test health endpoint returns OK"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["backend"] == "ok"
        assert data["db"]["status"] == "ok"
    
    def test_admin_login_success(self):
        """Test admin login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["sector"] == "ADMIN"
        assert data["email"] == ADMIN_EMAIL
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@email.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
    
    def test_auth_me_endpoint(self):
        """Test /auth/me returns user info"""
        # First login
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = login_res.json()["access_token"]
        
        # Get user info
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == ADMIN_EMAIL
        assert data["sector"] == "ADMIN"


class TestLSPD:
    """LSPD module tests - Cases, Warrants, Fines"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        self.token = login_res.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_lspd_stats(self):
        """Test LSPD stats endpoint"""
        response = requests.get(f"{BASE_URL}/api/lspd/stats", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "casi_aperti" in data
        assert "mandati_attivi" in data
        assert "multe_non_pagate" in data
        assert "totale_multe" in data
    
    def test_lspd_warrants_list(self):
        """Test LSPD warrants list endpoint"""
        response = requests.get(f"{BASE_URL}/api/lspd/warrants", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            warrant = data[0]
            assert "warrant_number" in warrant
            assert "suspect_name" in warrant
            assert "reason" in warrant
            assert "is_active" in warrant
    
    def test_lspd_create_warrant(self):
        """Test creating a new warrant"""
        response = requests.post(f"{BASE_URL}/api/lspd/warrants", headers=self.headers, json={
            "suspect_name": "TEST_Suspect_Warrant",
            "suspect_identifier": "TEST123",
            "reason": "Test warrant creation"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["suspect_name"] == "TEST_Suspect_Warrant"
        assert data["reason"] == "Test warrant creation"
        assert "warrant_number" in data
        assert data["is_active"] == True
    
    def test_lspd_fines_list(self):
        """Test LSPD fines list endpoint"""
        response = requests.get(f"{BASE_URL}/api/lspd/fines", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            fine = data[0]
            assert "fine_number" in fine
            assert "citizen_name" in fine
            assert "amount" in fine
            assert "is_paid" in fine
    
    def test_lspd_create_fine(self):
        """Test creating a new fine"""
        response = requests.post(f"{BASE_URL}/api/lspd/fines", headers=self.headers, json={
            "citizen_name": "TEST_Citizen_Fine",
            "citizen_identifier": "TEST456",
            "reason": "Test fine creation",
            "amount": 150.0
        })
        assert response.status_code == 200
        data = response.json()
        assert data["citizen_name"] == "TEST_Citizen_Fine"
        assert data["amount"] == 150.0
        assert "fine_number" in data
        assert data["is_paid"] == False
    
    def test_lspd_cases_list(self):
        """Test LSPD cases list endpoint"""
        response = requests.get(f"{BASE_URL}/api/lspd/cases", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestEMS:
    """EMS module tests - Patients, Reports"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        self.token = login_res.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_ems_stats(self):
        """Test EMS stats endpoint"""
        response = requests.get(f"{BASE_URL}/api/ems/stats", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "pazienti_totali" in data
        assert "referti_oggi" in data
        assert "referti_totali" in data
    
    def test_ems_patients_list(self):
        """Test EMS patients list endpoint"""
        response = requests.get(f"{BASE_URL}/api/ems/patients", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            patient = data[0]
            assert "patient_number" in patient
            assert "name" in patient
    
    def test_ems_create_patient(self):
        """Test creating a new patient"""
        response = requests.post(f"{BASE_URL}/api/ems/patients", headers=self.headers, json={
            "name": "TEST_Patient_EMS",
            "identifier": "TEST789",
            "blood_type": "O+"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "TEST_Patient_EMS"
        assert "patient_number" in data
    
    def test_ems_reports_list(self):
        """Test EMS reports list endpoint"""
        response = requests.get(f"{BASE_URL}/api/ems/reports", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            report = data[0]
            assert "report_number" in report
            assert "diagnosis" in report
            assert "treatment" in report
    
    def test_ems_create_report(self):
        """Test creating a new medical report"""
        # First get a patient ID
        patients_res = requests.get(f"{BASE_URL}/api/ems/patients", headers=self.headers)
        patients = patients_res.json()
        if len(patients) > 0:
            patient_id = patients[0]["id"]
            
            response = requests.post(f"{BASE_URL}/api/ems/reports", headers=self.headers, json={
                "patient_id": patient_id,
                "diagnosis": "TEST_Diagnosis",
                "treatment": "TEST_Treatment",
                "prescription": "TEST_Prescription",
                "notes": "TEST_Notes"
            })
            assert response.status_code == 200
            data = response.json()
            assert data["diagnosis"] == "TEST_Diagnosis"
            assert data["treatment"] == "TEST_Treatment"
            assert "report_number" in data


class TestJustice:
    """Justice module tests - Cases, Hearings"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        self.token = login_res.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_justice_stats(self):
        """Test Justice stats endpoint"""
        response = requests.get(f"{BASE_URL}/api/justice/stats", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "pratiche_in_attesa" in data
        assert "udienze_programmate" in data
        assert "verdetti_oggi" in data
    
    def test_justice_cases_list(self):
        """Test Justice cases list endpoint"""
        response = requests.get(f"{BASE_URL}/api/justice/cases", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            case = data[0]
            assert "case_number" in case
            assert "title" in case
            assert "status" in case
    
    def test_justice_create_case(self):
        """Test creating a new legal case"""
        response = requests.post(f"{BASE_URL}/api/justice/cases", headers=self.headers, json={
            "title": "TEST_Legal_Case",
            "case_type": "CIVIL",
            "plaintiff_name": "TEST_Plaintiff",
            "defendant_name": "TEST_Defendant",
            "description": "Test legal case description"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "TEST_Legal_Case"
        assert data["case_type"] == "CIVIL"
        assert "case_number" in data
    
    def test_justice_hearings_list(self):
        """Test Justice hearings list endpoint"""
        response = requests.get(f"{BASE_URL}/api/justice/hearings", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            hearing = data[0]
            assert "hearing_number" in hearing
            assert "title" in hearing
            assert "scheduled_date" in hearing


class TestDispatch:
    """Dispatch module tests - Calls"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        self.token = login_res.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_dispatch_stats(self):
        """Test Dispatch stats endpoint"""
        response = requests.get(f"{BASE_URL}/api/dispatch/stats", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "chiamate_in_attesa" in data
        assert "chiamate_attive" in data
        assert "chiamate_p1" in data
        assert "completate_oggi" in data
    
    def test_dispatch_active_calls(self):
        """Test Dispatch active calls endpoint"""
        response = requests.get(f"{BASE_URL}/api/dispatch/calls/active", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            call = data[0]
            assert "call_number" in call
            assert "priority" in call
            assert "call_type" in call
            assert "location" in call
            assert "status" in call
    
    def test_dispatch_create_call(self):
        """Test creating a new dispatch call"""
        response = requests.post(f"{BASE_URL}/api/dispatch/calls", headers=self.headers, json={
            "priority": "P3",
            "call_type": "TEST_Call_Type",
            "location": "TEST_Location",
            "description": "Test dispatch call",
            "caller_name": "TEST_Caller",
            "caller_phone": "555-TEST"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["call_type"] == "TEST_Call_Type"
        assert data["location"] == "TEST_Location"
        assert data["priority"] == "P3"
        assert "call_number" in data


class TestAdminUsers:
    """Admin user management tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        self.token = login_res.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_admin_users_list(self):
        """Test admin users list endpoint"""
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            user = data[0]
            assert "email" in user
            assert "sector" in user


class TestCityHub:
    """City Hub public endpoints tests"""
    
    def test_city_events(self):
        """Test city events endpoint (public)"""
        response = requests.get(f"{BASE_URL}/api/city/events")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_news_breaking(self):
        """Test breaking news endpoint (public)"""
        response = requests.get(f"{BASE_URL}/api/news/breaking")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_city_ads_active(self):
        """Test active ads endpoint (public)"""
        response = requests.get(f"{BASE_URL}/api/city/ads/active")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
