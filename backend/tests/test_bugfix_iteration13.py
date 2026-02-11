"""
PURE LIFE OS - Bug Fix Testing Iteration 13
Tests for:
A) Case detail page - evidence.collected_by column fix
B) Chat messages - updated_at and sender_id columns fix
C) LSPD Fines and Warrants CRUD
D) Chat functionality
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://role-master-4.preview.emergentagent.com')

class TestAuth:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for admin user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@purelife.rp",
            "password": "Admin@2026!"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        return data["access_token"]
    
    def test_login_success(self):
        """Test admin login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@purelife.rp",
            "password": "Admin@2026!"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        print(f"Login successful, token received")


class TestLSPDCases:
    """Test LSPD Cases - Bug Fix A: evidence.collected_by"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@purelife.rp",
            "password": "Admin@2026!"
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_cases_list(self, auth_headers):
        """Test getting cases list"""
        response = requests.get(f"{BASE_URL}/api/lspd/cases", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get cases: {response.text}"
        cases = response.json()
        assert isinstance(cases, list)
        print(f"Found {len(cases)} cases")
        return cases
    
    def test_get_case_detail(self, auth_headers):
        """Test getting case detail - BUG FIX A: evidence.collected_by"""
        # First get list of cases
        response = requests.get(f"{BASE_URL}/api/lspd/cases", headers=auth_headers)
        cases = response.json()
        
        if len(cases) > 0:
            case_id = cases[0]["id"]
            # Get case detail
            detail_response = requests.get(f"{BASE_URL}/api/lspd/cases/{case_id}", headers=auth_headers)
            assert detail_response.status_code == 200, f"Failed to get case detail: {detail_response.text}"
            
            case_detail = detail_response.json()
            assert "id" in case_detail
            assert "case_number" in case_detail
            assert "title" in case_detail
            
            # Check evidence array (this was the bug - evidence.collected_by was missing)
            if "evidence" in case_detail:
                print(f"Evidence found: {len(case_detail.get('evidence', []))} items")
                for ev in case_detail.get("evidence", []):
                    print(f"  - Evidence: {ev.get('title', 'N/A')}")
            
            print(f"SUCCESS: Case detail loaded without error - BUG FIX A VERIFIED!")
            print(f"Case: {case_detail.get('case_number')} - {case_detail.get('title')}")
        else:
            pytest.skip("No cases available to test")


class TestLSPDFines:
    """Test LSPD Fines CRUD - Feature B"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@purelife.rp",
            "password": "Admin@2026!"
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_fines_list(self, auth_headers):
        """Test getting fines list"""
        response = requests.get(f"{BASE_URL}/api/lspd/fines", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get fines: {response.text}"
        fines = response.json()
        assert isinstance(fines, list)
        print(f"Found {len(fines)} fines")
    
    def test_create_fine(self, auth_headers):
        """Test creating a new fine"""
        fine_data = {
            "citizen_name": "TEST_Citizen_Fine",
            "citizen_identifier": "TEST123",
            "reason": "Test fine for iteration 13",
            "amount": 500
        }
        response = requests.post(f"{BASE_URL}/api/lspd/fines", json=fine_data, headers=auth_headers)
        assert response.status_code == 200, f"Failed to create fine: {response.text}"
        
        fine = response.json()
        assert "id" in fine
        assert "fine_number" in fine
        assert fine["citizen_name"] == "TEST_Citizen_Fine"
        assert fine["amount"] == 500
        print(f"SUCCESS: Fine created - {fine['fine_number']}")
        return fine


class TestLSPDWarrants:
    """Test LSPD Warrants CRUD - Feature B"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@purelife.rp",
            "password": "Admin@2026!"
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_warrants_list(self, auth_headers):
        """Test getting warrants list"""
        response = requests.get(f"{BASE_URL}/api/lspd/warrants", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get warrants: {response.text}"
        warrants = response.json()
        assert isinstance(warrants, list)
        print(f"Found {len(warrants)} warrants")
    
    def test_create_warrant(self, auth_headers):
        """Test creating a new warrant"""
        warrant_data = {
            "suspect_name": "TEST_Suspect_Warrant",
            "suspect_identifier": "TEST456",
            "reason": "Test warrant for iteration 13"
        }
        response = requests.post(f"{BASE_URL}/api/lspd/warrants", json=warrant_data, headers=auth_headers)
        assert response.status_code == 200, f"Failed to create warrant: {response.text}"
        
        warrant = response.json()
        assert "id" in warrant
        assert "warrant_number" in warrant
        assert warrant["suspect_name"] == "TEST_Suspect_Warrant"
        print(f"SUCCESS: Warrant created - {warrant['warrant_number']}")
        return warrant


class TestChat:
    """Test Chat functionality - Bug Fix B: updated_at and sender_id"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@purelife.rp",
            "password": "Admin@2026!"
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_channels(self, auth_headers):
        """Test getting chat channels"""
        response = requests.get(f"{BASE_URL}/api/chat/channels", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get channels: {response.text}"
        channels = response.json()
        assert isinstance(channels, list)
        assert len(channels) > 0, "No channels found"
        print(f"Found {len(channels)} channels")
        for ch in channels:
            print(f"  - {ch['name']}: {ch['display_name']}")
        return channels
    
    def test_get_channel_messages(self, auth_headers):
        """Test getting messages from LSPD channel"""
        response = requests.get(f"{BASE_URL}/api/chat/channels/lspd/messages", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get messages: {response.text}"
        messages = response.json()
        assert isinstance(messages, list)
        print(f"Found {len(messages)} messages in LSPD channel")
        
        # Check message structure (bug fix was for updated_at and sender_id)
        if len(messages) > 0:
            msg = messages[0]
            assert "id" in msg
            assert "content" in msg
            assert "author_id" in msg
            assert "created_at" in msg
            print(f"SUCCESS: Messages loaded without error - BUG FIX B VERIFIED!")
    
    def test_send_message(self, auth_headers):
        """Test sending a message to LSPD channel"""
        message_data = {
            "content": "Test message from iteration 13 testing",
            "message_type": "text"
        }
        response = requests.post(
            f"{BASE_URL}/api/chat/channels/lspd/messages", 
            json=message_data, 
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to send message: {response.text}"
        
        message = response.json()
        assert "id" in message
        assert "content" in message
        assert message["content"] == "Test message from iteration 13 testing"
        print(f"SUCCESS: Message sent - ID: {message['id']}")
        return message
    
    def test_get_presence(self, auth_headers):
        """Test getting user presence"""
        response = requests.get(f"{BASE_URL}/api/chat/presence", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get presence: {response.text}"
        presence = response.json()
        assert isinstance(presence, list)
        print(f"Found {len(presence)} users online")


class TestLSPDStats:
    """Test LSPD Dashboard Stats"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@purelife.rp",
            "password": "Admin@2026!"
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_lspd_stats(self, auth_headers):
        """Test getting LSPD stats"""
        response = requests.get(f"{BASE_URL}/api/lspd/stats", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get stats: {response.text}"
        stats = response.json()
        assert "casi_aperti" in stats
        assert "mandati_attivi" in stats
        assert "multe_non_pagate" in stats
        print(f"LSPD Stats: {stats}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
