"""
Test Iteration 23 - Document Status Change (Suspend/Revoke/Reactivate)
Tests for document management with RBAC permissions
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@purelife.rp"
ADMIN_PASSWORD = "Admin@2026!"

# Known document ID from the test data
TEST_DOC_ID = "f95d89c7-36fc-4a82-80c3-af532c1937c4"


class TestDocumentStatusChange:
    """Test document status change functionality (Suspend/Revoke/Reactivate)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.token = token
            print(f"✅ Admin login successful")
        else:
            pytest.skip(f"Admin login failed: {login_response.status_code}")
    
    def test_01_admin_login(self):
        """Test admin login with provided credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        print(f"✅ Admin login successful, token received")
    
    def test_02_get_documents_list(self):
        """Test GET /api/documents - List all documents"""
        response = self.session.get(f"{BASE_URL}/api/documents")
        assert response.status_code == 200, f"Failed to get documents: {response.text}"
        data = response.json()
        assert "documents" in data, "No documents key in response"
        assert "total" in data, "No total key in response"
        print(f"✅ Documents list retrieved: {data['total']} documents")
    
    def test_03_get_document_permissions(self):
        """Test GET /api/documents/permissions/me - Get user permissions"""
        response = self.session.get(f"{BASE_URL}/api/documents/permissions/me")
        assert response.status_code == 200, f"Failed to get permissions: {response.text}"
        data = response.json()
        
        # Check expected permission keys
        expected_perms = ['DOC_VIEW', 'DOC_SUSPEND', 'DOC_REVOKE', 'DOC_REACTIVATE', 'DOC_ADMIN']
        for perm in expected_perms:
            assert perm in data, f"Missing permission key: {perm}"
        
        print(f"✅ Permissions retrieved: {data}")
        
        # Admin should have DOC_ADMIN permission
        assert data.get('DOC_ADMIN') == True, "Admin should have DOC_ADMIN permission"
        print(f"✅ Admin has DOC_ADMIN permission")
    
    def test_04_get_document_detail(self):
        """Test GET /api/documents/{doc_id} - Get document detail"""
        response = self.session.get(f"{BASE_URL}/api/documents/{TEST_DOC_ID}")
        assert response.status_code == 200, f"Failed to get document: {response.text}"
        data = response.json()
        
        assert data.get("id") == TEST_DOC_ID, "Document ID mismatch"
        assert "status" in data, "No status in response"
        assert "citizen_full_name" in data, "No citizen_full_name in response"
        
        print(f"✅ Document detail retrieved: {data.get('document_number')} - Status: {data.get('status')}")
        return data
    
    def test_05_get_document_events(self):
        """Test GET /api/documents/{doc_id}/events - Get document timeline"""
        response = self.session.get(f"{BASE_URL}/api/documents/{TEST_DOC_ID}/events")
        assert response.status_code == 200, f"Failed to get events: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Events should be a list"
        print(f"✅ Document events retrieved: {len(data)} events")
        
        if len(data) > 0:
            event = data[0]
            assert "event_type" in event, "No event_type in event"
            assert "performed_by_name" in event, "No performed_by_name in event"
            print(f"   Latest event: {event.get('event_type')} by {event.get('performed_by_name')}")
    
    def test_06_suspend_document_validation_short_reason(self):
        """Test POST /api/documents/{doc_id}/status - Validation: reason too short"""
        response = self.session.post(f"{BASE_URL}/api/documents/{TEST_DOC_ID}/status", json={
            "new_status": "SUSPENDED",
            "reason": "abc"  # Less than 5 characters
        })
        
        # Should fail validation (422 Unprocessable Entity)
        assert response.status_code == 422, f"Expected 422 for short reason, got {response.status_code}: {response.text}"
        print(f"✅ Validation works: short reason rejected with 422")
    
    def test_07_suspend_document_validation_empty_reason(self):
        """Test POST /api/documents/{doc_id}/status - Validation: empty reason"""
        response = self.session.post(f"{BASE_URL}/api/documents/{TEST_DOC_ID}/status", json={
            "new_status": "SUSPENDED",
            "reason": ""  # Empty reason
        })
        
        # Should fail validation (422 Unprocessable Entity)
        assert response.status_code == 422, f"Expected 422 for empty reason, got {response.status_code}: {response.text}"
        print(f"✅ Validation works: empty reason rejected with 422")
    
    def test_08_suspend_document_success(self):
        """Test POST /api/documents/{doc_id}/status - Suspend document"""
        # First check current status
        doc_response = self.session.get(f"{BASE_URL}/api/documents/{TEST_DOC_ID}")
        current_status = doc_response.json().get("status")
        print(f"   Current status: {current_status}")
        
        # If already suspended, reactivate first
        if current_status == "SUSPENDED":
            reactivate_response = self.session.post(f"{BASE_URL}/api/documents/{TEST_DOC_ID}/status", json={
                "new_status": "VALID",
                "reason": "Riattivazione per test automatico"
            })
            assert reactivate_response.status_code == 200, f"Failed to reactivate: {reactivate_response.text}"
            print(f"   Reactivated document for test")
        
        # Now suspend the document
        response = self.session.post(f"{BASE_URL}/api/documents/{TEST_DOC_ID}/status", json={
            "new_status": "SUSPENDED",
            "reason": "Sospensione per test automatico - verifica funzionalità"
        })
        
        assert response.status_code == 200, f"Failed to suspend document: {response.text}"
        data = response.json()
        
        assert data.get("status") == "SUSPENDED", f"Status should be SUSPENDED, got {data.get('status')}"
        assert data.get("status_reason") == "Sospensione per test automatico - verifica funzionalità"
        
        print(f"✅ Document suspended successfully")
        print(f"   New status: {data.get('status')}")
        print(f"   Reason: {data.get('status_reason')}")
    
    def test_09_verify_suspension_in_events(self):
        """Test that suspension event is recorded in timeline"""
        response = self.session.get(f"{BASE_URL}/api/documents/{TEST_DOC_ID}/events")
        assert response.status_code == 200
        events = response.json()
        
        # Find the latest STATUS_CHANGE event
        status_change_events = [e for e in events if e.get("event_type") == "STATUS_CHANGE"]
        assert len(status_change_events) > 0, "No STATUS_CHANGE events found"
        
        latest_event = status_change_events[0]
        assert latest_event.get("new_status") == "SUSPENDED", "Latest event should show SUSPENDED"
        
        print(f"✅ Suspension event recorded in timeline")
        print(f"   Event: {latest_event.get('event_type')}")
        print(f"   Old status: {latest_event.get('old_status')} -> New status: {latest_event.get('new_status')}")
        print(f"   Reason: {latest_event.get('reason')}")
    
    def test_10_reactivate_document_success(self):
        """Test POST /api/documents/{doc_id}/status - Reactivate document"""
        # First verify document is suspended
        doc_response = self.session.get(f"{BASE_URL}/api/documents/{TEST_DOC_ID}")
        current_status = doc_response.json().get("status")
        
        if current_status != "SUSPENDED":
            # Suspend first
            self.session.post(f"{BASE_URL}/api/documents/{TEST_DOC_ID}/status", json={
                "new_status": "SUSPENDED",
                "reason": "Sospensione temporanea per test"
            })
        
        # Now reactivate
        response = self.session.post(f"{BASE_URL}/api/documents/{TEST_DOC_ID}/status", json={
            "new_status": "VALID",
            "reason": "Riattivazione documento - test completato con successo"
        })
        
        assert response.status_code == 200, f"Failed to reactivate document: {response.text}"
        data = response.json()
        
        assert data.get("status") == "VALID", f"Status should be VALID, got {data.get('status')}"
        
        print(f"✅ Document reactivated successfully")
        print(f"   New status: {data.get('status')}")
        print(f"   Reason: {data.get('status_reason')}")
    
    def test_11_verify_reactivation_in_events(self):
        """Test that reactivation event is recorded in timeline"""
        response = self.session.get(f"{BASE_URL}/api/documents/{TEST_DOC_ID}/events")
        assert response.status_code == 200
        events = response.json()
        
        # Find the latest STATUS_CHANGE event
        status_change_events = [e for e in events if e.get("event_type") == "STATUS_CHANGE"]
        assert len(status_change_events) > 0, "No STATUS_CHANGE events found"
        
        latest_event = status_change_events[0]
        assert latest_event.get("new_status") == "VALID", "Latest event should show VALID"
        
        print(f"✅ Reactivation event recorded in timeline")
        print(f"   Event: {latest_event.get('event_type')}")
        print(f"   Old status: {latest_event.get('old_status')} -> New status: {latest_event.get('new_status')}")
    
    def test_12_document_types_endpoint(self):
        """Test GET /api/documents/types - Get document types"""
        response = self.session.get(f"{BASE_URL}/api/documents/types")
        assert response.status_code == 200, f"Failed to get document types: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Document types should be a list"
        assert len(data) > 0, "Should have at least one document type"
        
        print(f"✅ Document types retrieved: {len(data)} types")
        for doc_type in data[:3]:  # Show first 3
            print(f"   - {doc_type.get('name_short')} ({doc_type.get('code')})")
    
    def test_13_document_stats_endpoint(self):
        """Test GET /api/documents/stats/summary - Get document statistics"""
        response = self.session.get(f"{BASE_URL}/api/documents/stats/summary")
        assert response.status_code == 200, f"Failed to get stats: {response.text}"
        data = response.json()
        
        assert "total" in data, "No total in stats"
        assert "by_status" in data, "No by_status in stats"
        
        print(f"✅ Document stats retrieved")
        print(f"   Total documents: {data.get('total')}")
        print(f"   By status: {data.get('by_status')}")
    
    def test_14_invalid_status_value(self):
        """Test POST /api/documents/{doc_id}/status - Invalid status value"""
        response = self.session.post(f"{BASE_URL}/api/documents/{TEST_DOC_ID}/status", json={
            "new_status": "INVALID_STATUS",
            "reason": "Test invalid status"
        })
        
        # Should fail validation (422 Unprocessable Entity)
        assert response.status_code == 422, f"Expected 422 for invalid status, got {response.status_code}"
        print(f"✅ Invalid status value rejected with 422")
    
    def test_15_document_not_found(self):
        """Test POST /api/documents/{doc_id}/status - Document not found"""
        fake_doc_id = "00000000-0000-0000-0000-000000000000"
        response = self.session.post(f"{BASE_URL}/api/documents/{fake_doc_id}/status", json={
            "new_status": "SUSPENDED",
            "reason": "Test document not found"
        })
        
        assert response.status_code == 404, f"Expected 404 for non-existent document, got {response.status_code}"
        print(f"✅ Non-existent document returns 404")
    
    def test_16_unauthenticated_access(self):
        """Test POST /api/documents/{doc_id}/status - Unauthenticated access"""
        # Create new session without auth
        unauth_session = requests.Session()
        unauth_session.headers.update({"Content-Type": "application/json"})
        
        response = unauth_session.post(f"{BASE_URL}/api/documents/{TEST_DOC_ID}/status", json={
            "new_status": "SUSPENDED",
            "reason": "Test unauthenticated access"
        })
        
        assert response.status_code in [401, 403], f"Expected 401/403 for unauthenticated, got {response.status_code}"
        print(f"✅ Unauthenticated access rejected with {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
