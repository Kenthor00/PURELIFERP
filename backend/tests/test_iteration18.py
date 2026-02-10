"""
PURE LIFE OS - Iteration 18 Backend Tests
Testing: Warrant status management, Fine modification/deletion, Evidence, POI, Justice
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuth:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@purelife.rp",
            "password": "Admin@2026!"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()["access_token"]
    
    def test_login_success(self):
        """Test admin login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@purelife.rp",
            "password": "Admin@2026!"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["sector"] == "ADMIN"


class TestWarrantStatusManagement:
    """Test warrant status lifecycle: OPEN -> EXECUTED/EXPIRED/CANCELLED"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@purelife.rp",
            "password": "Admin@2026!"
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_create_warrant(self, auth_headers):
        """Create a new warrant for testing"""
        response = requests.post(f"{BASE_URL}/api/lspd/warrants", 
            headers=auth_headers,
            json={
                "suspect_name": "TEST_Status_Warrant",
                "suspect_identifier": "TEST_ID_001",
                "reason": "Test warrant for status transitions",
                "expires_at": "2026-02-20T23:59:00"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "OPEN"
        assert data["is_active"] == True
        return data["id"]
    
    def test_warrant_status_open_to_executed(self, auth_headers):
        """Test OPEN -> EXECUTED transition"""
        # Create warrant
        create_res = requests.post(f"{BASE_URL}/api/lspd/warrants", 
            headers=auth_headers,
            json={
                "suspect_name": "TEST_Executed_Warrant",
                "suspect_identifier": "TEST_EXEC_001",
                "reason": "Test for EXECUTED status"
            }
        )
        warrant_id = create_res.json()["id"]
        
        # Change to EXECUTED
        response = requests.patch(
            f"{BASE_URL}/api/lspd/warrants/{warrant_id}/status",
            headers=auth_headers,
            params={"new_status": "EXECUTED", "reason": "Soggetto arrestato"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "EXECUTED"
        assert data["is_active"] == False
        assert data["executed"] == True
        assert data["executed_at"] is not None
    
    def test_warrant_status_open_to_expired(self, auth_headers):
        """Test OPEN -> EXPIRED transition"""
        # Create warrant
        create_res = requests.post(f"{BASE_URL}/api/lspd/warrants", 
            headers=auth_headers,
            json={
                "suspect_name": "TEST_Expired_Warrant",
                "suspect_identifier": "TEST_EXP_001",
                "reason": "Test for EXPIRED status"
            }
        )
        warrant_id = create_res.json()["id"]
        
        # Change to EXPIRED
        response = requests.patch(
            f"{BASE_URL}/api/lspd/warrants/{warrant_id}/status",
            headers=auth_headers,
            params={"new_status": "EXPIRED"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "EXPIRED"
        assert data["is_active"] == False
    
    def test_warrant_status_open_to_cancelled(self, auth_headers):
        """Test OPEN -> CANCELLED transition"""
        # Create warrant
        create_res = requests.post(f"{BASE_URL}/api/lspd/warrants", 
            headers=auth_headers,
            json={
                "suspect_name": "TEST_Cancelled_Warrant",
                "suspect_identifier": "TEST_CAN_001",
                "reason": "Test for CANCELLED status"
            }
        )
        warrant_id = create_res.json()["id"]
        
        # Change to CANCELLED
        response = requests.patch(
            f"{BASE_URL}/api/lspd/warrants/{warrant_id}/status",
            headers=auth_headers,
            params={"new_status": "CANCELLED", "reason": "Revocato per errore"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "CANCELLED"
        assert data["is_active"] == False
        assert data["cancellation_reason"] == "Revocato per errore"
    
    def test_invalid_status_transition(self, auth_headers):
        """Test that invalid transitions are rejected"""
        # Create and execute a warrant
        create_res = requests.post(f"{BASE_URL}/api/lspd/warrants", 
            headers=auth_headers,
            json={
                "suspect_name": "TEST_Invalid_Transition",
                "suspect_identifier": "TEST_INV_001",
                "reason": "Test for invalid transition"
            }
        )
        warrant_id = create_res.json()["id"]
        
        # Execute it
        requests.patch(
            f"{BASE_URL}/api/lspd/warrants/{warrant_id}/status",
            headers=auth_headers,
            params={"new_status": "EXECUTED"}
        )
        
        # Try to go back to OPEN (should fail)
        response = requests.patch(
            f"{BASE_URL}/api/lspd/warrants/{warrant_id}/status",
            headers=auth_headers,
            params={"new_status": "OPEN"}
        )
        assert response.status_code == 400
        assert "Transizione non valida" in response.json()["detail"]


class TestFineModificationDeletion:
    """Test fine modification and deletion with ownership"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@purelife.rp",
            "password": "Admin@2026!"
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_create_fine(self, auth_headers):
        """Create a fine for testing"""
        response = requests.post(f"{BASE_URL}/api/lspd/fines",
            headers=auth_headers,
            json={
                "citizen_name": "TEST_Fine_Citizen",
                "citizen_identifier": "TEST_FINE_001",
                "amount": 150.00,
                "reason": "Test fine for modification"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["amount"] == 150.0
        assert data["citizen_name"] == "TEST_Fine_Citizen"
        return data["id"]
    
    def test_modify_fine(self, auth_headers):
        """Test fine modification"""
        # Create fine
        create_res = requests.post(f"{BASE_URL}/api/lspd/fines",
            headers=auth_headers,
            json={
                "citizen_name": "TEST_Modify_Fine",
                "citizen_identifier": "TEST_MOD_001",
                "amount": 200.00,
                "reason": "Original reason"
            }
        )
        fine_id = create_res.json()["id"]
        
        # Modify fine
        response = requests.put(
            f"{BASE_URL}/api/lspd/fines/{fine_id}",
            headers=auth_headers,
            params={
                "amount": 300,
                "reason": "Updated reason",
                "modification_reason": "Errore importo originale"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["amount"] == 300.0
        assert data["reason"] == "Updated reason"
        assert data["modification_reason"] == "Errore importo originale"
        assert data["last_modified_by"] is not None
    
    def test_delete_fine(self, auth_headers):
        """Test fine deletion"""
        # Create fine
        create_res = requests.post(f"{BASE_URL}/api/lspd/fines",
            headers=auth_headers,
            json={
                "citizen_name": "TEST_Delete_Fine",
                "citizen_identifier": "TEST_DEL_001",
                "amount": 100.00,
                "reason": "Fine to be deleted"
            }
        )
        fine_id = create_res.json()["id"]
        
        # Delete fine
        response = requests.delete(
            f"{BASE_URL}/api/lspd/fines/{fine_id}",
            headers=auth_headers,
            params={"deletion_reason": "Multa emessa per errore"}
        )
        assert response.status_code == 200
        assert "eliminata" in response.json()["message"].lower()
        
        # Verify deletion
        get_res = requests.get(f"{BASE_URL}/api/lspd/fines", headers=auth_headers)
        fines = get_res.json()
        assert not any(f["id"] == fine_id for f in fines)


class TestEvidence:
    """Test evidence management for cases"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@purelife.rp",
            "password": "Admin@2026!"
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture(scope="class")
    def test_case(self, auth_headers):
        """Create a test case"""
        response = requests.post(f"{BASE_URL}/api/lspd/cases",
            headers=auth_headers,
            json={
                "title": "TEST_Evidence_Case",
                "description": "Case for evidence testing",
                "priority": "normale",
                "suspect_name": "Test Suspect",
                "location": "Test Location"
            }
        )
        return response.json()["id"]
    
    def test_add_evidence(self, auth_headers, test_case):
        """Test adding evidence to a case"""
        response = requests.post(f"{BASE_URL}/api/lspd/evidence",
            headers=auth_headers,
            json={
                "case_id": test_case,
                "evidence_type": "document",
                "title": "TEST_Evidence_Document",
                "description": "Test evidence description"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "TEST_Evidence_Document"
        assert data["evidence_type"] == "document"
        assert data["case_id"] == test_case
    
    def test_get_case_with_evidence(self, auth_headers, test_case):
        """Test getting case detail with evidence"""
        response = requests.get(f"{BASE_URL}/api/lspd/cases/{test_case}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "evidence" in data
        assert len(data["evidence"]) > 0


class TestPOI:
    """Test POI (Points of Interest) management"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@purelife.rp",
            "password": "Admin@2026!"
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_poi_categories(self):
        """Test getting POI categories"""
        response = requests.get(f"{BASE_URL}/api/poi/categories")
        assert response.status_code == 200
        data = response.json()
        assert "categories" in data
        assert len(data["categories"]) > 0
        
        # Check expected categories
        category_values = [c["value"] for c in data["categories"]]
        assert "polizia" in category_values
        assert "ospedale" in category_values
        assert "governo" in category_values
    
    def test_create_poi(self, auth_headers):
        """Test creating a POI"""
        response = requests.post(f"{BASE_URL}/api/poi",
            headers=auth_headers,
            json={
                "name": "TEST_POI_Location",
                "x_percent": 45.5,
                "y_percent": 55.5,
                "category": "polizia",
                "description": "Test POI description",
                "is_public": True
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "TEST_POI_Location"
        assert data["category"] == "polizia"
        return data["id"]
    
    def test_get_pois(self, auth_headers):
        """Test getting POI list"""
        response = requests.get(f"{BASE_URL}/api/poi", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_update_poi(self, auth_headers):
        """Test updating a POI"""
        # Create POI
        create_res = requests.post(f"{BASE_URL}/api/poi",
            headers=auth_headers,
            json={
                "name": "TEST_Update_POI",
                "x_percent": 30.0,
                "y_percent": 40.0,
                "category": "commerciale"
            }
        )
        poi_id = create_res.json()["id"]
        
        # Update POI
        response = requests.put(f"{BASE_URL}/api/poi/{poi_id}",
            headers=auth_headers,
            json={
                "name": "TEST_Updated_POI",
                "description": "Updated description"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "TEST_Updated_POI"
        assert data["description"] == "Updated description"
    
    def test_delete_poi(self, auth_headers):
        """Test deleting a POI"""
        # Create POI
        create_res = requests.post(f"{BASE_URL}/api/poi",
            headers=auth_headers,
            json={
                "name": "TEST_Delete_POI",
                "x_percent": 20.0,
                "y_percent": 30.0,
                "category": "altro"
            }
        )
        poi_id = create_res.json()["id"]
        
        # Delete POI
        response = requests.delete(f"{BASE_URL}/api/poi/{poi_id}",
            headers=auth_headers
        )
        assert response.status_code == 200


class TestJustice:
    """Test Justice module - cases and hearings"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@purelife.rp",
            "password": "Admin@2026!"
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_justice_cases(self, auth_headers):
        """Test getting justice cases"""
        response = requests.get(f"{BASE_URL}/api/justice/cases",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_create_justice_case(self, auth_headers):
        """Test creating a justice case with lawyer field"""
        response = requests.post(f"{BASE_URL}/api/justice/cases",
            headers=auth_headers,
            json={
                "title": "TEST_Justice_Case",
                "case_type": "CIVIL",
                "plaintiff_name": "Avvocato Test",  # This is the lawyer field
                "defendant_name": "Convenuto Test",
                "description": "Test case description"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "TEST_Justice_Case"
        assert data["plaintiff_name"] == "Avvocato Test"
        return data["id"]
    
    def test_get_hearings(self, auth_headers):
        """Test getting hearings"""
        response = requests.get(f"{BASE_URL}/api/justice/hearings",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_create_hearing_with_case(self, auth_headers):
        """Test creating a hearing linked to a case"""
        # First create a case
        case_res = requests.post(f"{BASE_URL}/api/justice/cases",
            headers=auth_headers,
            json={
                "title": "TEST_Hearing_Case",
                "case_type": "CRIMINAL",
                "plaintiff_name": "Avvocato Hearing",
                "defendant_name": "Imputato Test"
            }
        )
        case_id = case_res.json()["id"]
        
        # Create hearing linked to case
        response = requests.post(f"{BASE_URL}/api/justice/hearings",
            headers=auth_headers,
            json={
                "legal_case_id": case_id,
                "title": "TEST_Hearing",
                "scheduled_date": "2026-02-15T10:00:00",
                "courtroom": "Aula 1"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["legal_case_id"] == case_id
        assert data["title"] == "TEST_Hearing"


class TestCityPulse:
    """Test City Pulse / Map functionality"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@purelife.rp",
            "password": "Admin@2026!"
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_lspd_stats(self, auth_headers):
        """Test LSPD stats endpoint"""
        response = requests.get(f"{BASE_URL}/api/lspd/stats",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "casi_aperti" in data
        assert "mandati_attivi" in data
    
    def test_dispatch_stats(self, auth_headers):
        """Test Dispatch stats endpoint"""
        response = requests.get(f"{BASE_URL}/api/dispatch/stats",
            headers=auth_headers
        )
        assert response.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
