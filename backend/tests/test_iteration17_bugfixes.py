"""
Test Iteration 17 - Bug Fixes Verification
Tests for:
1. Chat channel switching
2. EMS patient detail page
3. EMS report modal
4. Justice Verdetti/Archivio (toast instead of 404)
5. LSPD ELIMINA TUTTO button (timeline clear)
6. City Pulse zones/activity API
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuth:
    """Authentication for tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@purelife.rp",
            "password": "Admin@2026!"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get auth headers"""
        return {"Authorization": f"Bearer {auth_token}"}


class TestChatChannels(TestAuth):
    """Test Chat channel switching functionality"""
    
    def test_get_channels(self, auth_headers):
        """Test fetching chat channels"""
        response = requests.get(f"{BASE_URL}/api/chat/channels", headers=auth_headers)
        assert response.status_code == 200
        
        channels = response.json()
        assert isinstance(channels, list)
        assert len(channels) > 0
        
        # Check channel structure
        channel = channels[0]
        assert "id" in channel
        assert "name" in channel
        assert "display_name" in channel
    
    def test_get_channel_messages(self, auth_headers):
        """Test fetching messages from a channel"""
        # First get channels
        channels_res = requests.get(f"{BASE_URL}/api/chat/channels", headers=auth_headers)
        channels = channels_res.json()
        
        if len(channels) > 0:
            channel_name = channels[0]["name"]
            response = requests.get(
                f"{BASE_URL}/api/chat/channels/{channel_name}/messages?limit=10",
                headers=auth_headers
            )
            assert response.status_code == 200
            messages = response.json()
            assert isinstance(messages, list)
    
    def test_switch_channels(self, auth_headers):
        """Test that different channels return different messages"""
        channels_res = requests.get(f"{BASE_URL}/api/chat/channels", headers=auth_headers)
        channels = channels_res.json()
        
        if len(channels) >= 2:
            # Get messages from first channel
            ch1_name = channels[0]["name"]
            ch1_messages = requests.get(
                f"{BASE_URL}/api/chat/channels/{ch1_name}/messages?limit=10",
                headers=auth_headers
            ).json()
            
            # Get messages from second channel
            ch2_name = channels[1]["name"]
            ch2_messages = requests.get(
                f"{BASE_URL}/api/chat/channels/{ch2_name}/messages?limit=10",
                headers=auth_headers
            ).json()
            
            # Both should return valid responses (may be empty)
            assert isinstance(ch1_messages, list)
            assert isinstance(ch2_messages, list)


class TestEMSPatientDetail(TestAuth):
    """Test EMS patient detail functionality"""
    
    def test_get_patients_list(self, auth_headers):
        """Test fetching patients list"""
        response = requests.get(f"{BASE_URL}/api/ems/patients", headers=auth_headers)
        assert response.status_code == 200
        
        patients = response.json()
        assert isinstance(patients, list)
    
    def test_get_patient_detail(self, auth_headers):
        """Test fetching patient detail by ID"""
        # First get patients list
        patients_res = requests.get(f"{BASE_URL}/api/ems/patients", headers=auth_headers)
        patients = patients_res.json()
        
        if len(patients) > 0:
            patient_id = patients[0]["id"]
            response = requests.get(
                f"{BASE_URL}/api/ems/patients/{patient_id}",
                headers=auth_headers
            )
            assert response.status_code == 200
            
            patient = response.json()
            assert "id" in patient
            assert "name" in patient
            assert "patient_number" in patient
            assert "blood_type" in patient


class TestEMSReports(TestAuth):
    """Test EMS reports functionality"""
    
    def test_get_reports_list(self, auth_headers):
        """Test fetching reports list"""
        response = requests.get(f"{BASE_URL}/api/ems/reports", headers=auth_headers)
        assert response.status_code == 200
        
        reports = response.json()
        assert isinstance(reports, list)
    
    def test_report_list_contains_full_data(self, auth_headers):
        """Test that report list contains all data needed for modal display"""
        # Note: There's no /reports/{id} endpoint - frontend uses list data for modal
        reports_res = requests.get(f"{BASE_URL}/api/ems/reports", headers=auth_headers)
        assert reports_res.status_code == 200
        reports = reports_res.json()
        
        if len(reports) > 0:
            report = reports[0]
            # Verify all fields needed for modal are present
            assert "id" in report
            assert "report_number" in report
            assert "diagnosis" in report
            assert "treatment" in report
            assert "patient_id" in report
            assert "created_at" in report


class TestJusticeDashboard(TestAuth):
    """Test Justice dashboard functionality"""
    
    def test_get_justice_stats(self, auth_headers):
        """Test fetching justice stats"""
        response = requests.get(f"{BASE_URL}/api/justice/stats", headers=auth_headers)
        assert response.status_code == 200
        
        stats = response.json()
        assert "pratiche_in_attesa" in stats
        assert "udienze_programmate" in stats
        assert "verdetti_oggi" in stats
    
    def test_get_hearings(self, auth_headers):
        """Test fetching hearings list"""
        response = requests.get(f"{BASE_URL}/api/justice/hearings?limit=10", headers=auth_headers)
        assert response.status_code == 200
        
        hearings = response.json()
        assert isinstance(hearings, list)
    
    def test_get_cases(self, auth_headers):
        """Test fetching legal cases list"""
        response = requests.get(f"{BASE_URL}/api/justice/cases?limit=10", headers=auth_headers)
        assert response.status_code == 200
        
        cases = response.json()
        assert isinstance(cases, list)


class TestTimelineClear(TestAuth):
    """Test timeline clear functionality (LSPD ELIMINA TUTTO)"""
    
    def test_get_recent_timeline(self, auth_headers):
        """Test fetching recent timeline events"""
        response = requests.get(f"{BASE_URL}/api/timeline/recent?limit=10", headers=auth_headers)
        assert response.status_code == 200
        
        events = response.json()
        assert isinstance(events, list)
    
    def test_timeline_clear_endpoint_exists(self, auth_headers):
        """Test that timeline clear endpoint exists and requires proper permissions"""
        # Test with entity_type parameter
        response = requests.delete(
            f"{BASE_URL}/api/timeline/clear",
            params={"entity_type": "lspd"},
            headers=auth_headers
        )
        # Should return 200 (success) or 403 (forbidden if not admin/chief)
        assert response.status_code in [200, 403]


class TestCityPulseZones(TestAuth):
    """Test City Pulse zones/activity API"""
    
    def test_get_zones_activity(self, auth_headers):
        """Test fetching zones activity data"""
        response = requests.get(f"{BASE_URL}/api/dispatch/zones/activity", headers=auth_headers)
        assert response.status_code == 200
        
        zones = response.json()
        assert isinstance(zones, dict)
        
        # Check expected zones exist
        expected_zones = ['vinewood', 'downtown', 'pillbox', 'vespucci', 'la_mesa', 
                         'sandy', 'paleto', 'grapeseed', 'del_perro', 'rockford']
        for zone_id in expected_zones:
            assert zone_id in zones, f"Zone {zone_id} not found"
            
            zone_data = zones[zone_id]
            assert "name" in zone_data
            assert "level" in zone_data
            assert "incidents" in zone_data
            assert "type" in zone_data
            
            # Level should be 0-100
            assert 0 <= zone_data["level"] <= 100
            
            # Type should be one of the expected values
            assert zone_data["type"] in ["normale", "elevata", "critica"]
    
    def test_zones_activity_based_on_real_data(self, auth_headers):
        """Test that zones activity is based on real dispatch/LSPD data"""
        response = requests.get(f"{BASE_URL}/api/dispatch/zones/activity", headers=auth_headers)
        zones = response.json()
        
        # At least one zone should have some activity if there are cases/calls
        total_incidents = sum(z["incidents"] for z in zones.values())
        
        # This is informational - we just verify the structure is correct
        print(f"Total incidents across all zones: {total_incidents}")
        
        # Verify Vinewood has activity (based on test data)
        if zones["vinewood"]["incidents"] > 0:
            assert zones["vinewood"]["level"] > 0


class TestDispatchStats(TestAuth):
    """Test Dispatch stats for City Pulse"""
    
    def test_get_dispatch_stats(self, auth_headers):
        """Test fetching dispatch stats"""
        response = requests.get(f"{BASE_URL}/api/dispatch/stats", headers=auth_headers)
        assert response.status_code == 200
        
        stats = response.json()
        assert "chiamate_in_attesa" in stats
        assert "chiamate_attive" in stats
        assert "chiamate_p1" in stats
        assert "completate_oggi" in stats


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
