"""
Iteration 33 - Director/Manager Assignment Tests
Tests for the new director management system:
- Admin assigns/removes directors to departments
- Directors can create postings for their assigned departments
- Non-directors cannot create postings for other departments
- User search for manager assignment
- managers_count in department listing
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_CREDS = {"email": "admin@purelife.rp", "password": "Admin123!"}
LSPD_CREDS = {"email": "lspd@purelife.rp", "password": "Admin123!"}  # Already assigned as LSPD director
EMS_CREDS = {"email": "ems@purelife.rp", "password": "Admin123!"}    # NOT assigned as director
CITIZEN_CREDS = {"email": "cittadino@purelife.rp", "password": "Admin123!"}


class TestDirectorManagement:
    """Tests for director/manager assignment system"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup tokens for all users"""
        self.admin_token = self._login(ADMIN_CREDS)
        self.lspd_token = self._login(LSPD_CREDS)
        self.ems_token = self._login(EMS_CREDS)
        self.citizen_token = self._login(CITIZEN_CREDS)
        
    def _login(self, creds):
        """Helper to login and get token"""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json=creds)
        if resp.status_code == 200:
            return resp.json().get("access_token")
        return None
    
    def _headers(self, token):
        return {"Authorization": f"Bearer {token}"}
    
    # ==================== MANAGER CRUD TESTS ====================
    
    def test_admin_can_list_dept_managers(self):
        """GET /api/jobs/departments/{dept_id}/managers - Admin can list managers"""
        # First get departments to find LSPD dept_id
        resp = requests.get(f"{BASE_URL}/api/jobs/departments", headers=self._headers(self.admin_token))
        assert resp.status_code == 200, f"Failed to get departments: {resp.text}"
        depts = resp.json()
        lspd_dept = next((d for d in depts if d['code'] == 'LSPD'), None)
        assert lspd_dept is not None, "LSPD department not found"
        
        # Get managers for LSPD
        resp = requests.get(f"{BASE_URL}/api/jobs/departments/{lspd_dept['id']}/managers", 
                          headers=self._headers(self.admin_token))
        assert resp.status_code == 200, f"Failed to get managers: {resp.text}"
        managers = resp.json()
        assert isinstance(managers, list), "Managers should be a list"
        print(f"LSPD has {len(managers)} managers assigned")
        
    def test_admin_can_search_users_for_manager(self):
        """GET /api/jobs/users/search?q=lspd - Admin can search users"""
        resp = requests.get(f"{BASE_URL}/api/jobs/users/search?q=lspd", 
                          headers=self._headers(self.admin_token))
        assert resp.status_code == 200, f"Failed to search users: {resp.text}"
        users = resp.json()
        assert isinstance(users, list), "Search results should be a list"
        print(f"Found {len(users)} users matching 'lspd'")
        
    def test_non_admin_cannot_search_users(self):
        """GET /api/jobs/users/search - Non-admin gets 403"""
        resp = requests.get(f"{BASE_URL}/api/jobs/users/search?q=test", 
                          headers=self._headers(self.lspd_token))
        assert resp.status_code == 403, f"Expected 403, got {resp.status_code}"
        
    def test_non_admin_cannot_assign_manager(self):
        """POST /api/jobs/departments/{dept_id}/managers - Non-admin gets 403"""
        # Get LSPD dept_id
        resp = requests.get(f"{BASE_URL}/api/jobs/departments", headers=self._headers(self.admin_token))
        depts = resp.json()
        lspd_dept = next((d for d in depts if d['code'] == 'LSPD'), None)
        
        # Try to assign manager as non-admin
        resp = requests.post(f"{BASE_URL}/api/jobs/departments/{lspd_dept['id']}/managers?user_id=999", 
                           headers=self._headers(self.lspd_token))
        assert resp.status_code == 403, f"Expected 403, got {resp.status_code}"
        
    def test_departments_include_managers_count(self):
        """GET /api/jobs/departments - Response includes managers_count"""
        resp = requests.get(f"{BASE_URL}/api/jobs/departments", headers=self._headers(self.admin_token))
        assert resp.status_code == 200
        depts = resp.json()
        assert len(depts) > 0, "Should have at least one department"
        
        for dept in depts:
            assert 'managers_count' in dept, f"Department {dept['code']} missing managers_count"
            assert isinstance(dept['managers_count'], int), "managers_count should be int"
        print(f"All {len(depts)} departments have managers_count field")
        
    # ==================== DIRECTOR PERMISSION TESTS ====================
    
    def test_lspd_director_can_create_lspd_posting(self):
        """POST /api/jobs/postings/create?dept_code=LSPD - LSPD director can create"""
        posting_data = {
            "title": "TEST_Director_Posting_LSPD",
            "description": "Test posting created by LSPD director",
            "requirements": "Test requirements",
            "salary_range": "$1000-$2000",
            "max_slots": 1,
            "location": "Los Santos",
            "priority": "normal"
        }
        resp = requests.post(f"{BASE_URL}/api/jobs/postings/create?dept_code=LSPD", 
                           json=posting_data, headers=self._headers(self.lspd_token))
        assert resp.status_code == 200, f"LSPD director should create LSPD posting: {resp.text}"
        data = resp.json()
        assert 'id' in data, "Response should include posting id"
        print(f"LSPD director created posting: {data.get('title')}")
        
        # Cleanup - delete the test posting
        if 'id' in data:
            requests.delete(f"{BASE_URL}/api/jobs/postings/{data['id']}", 
                          headers=self._headers(self.lspd_token))
        
    def test_ems_staff_cannot_create_lspd_posting(self):
        """POST /api/jobs/postings/create?dept_code=LSPD - EMS staff gets 403 (not LSPD director)"""
        posting_data = {
            "title": "TEST_EMS_Trying_LSPD",
            "description": "This should fail",
            "max_slots": 1
        }
        resp = requests.post(f"{BASE_URL}/api/jobs/postings/create?dept_code=LSPD", 
                           json=posting_data, headers=self._headers(self.ems_token))
        assert resp.status_code == 403, f"EMS staff should NOT create LSPD posting: {resp.status_code}"
        print("EMS staff correctly blocked from creating LSPD posting")
        
    def test_admin_can_create_posting_for_any_dept(self):
        """POST /api/jobs/postings/create - Admin can create for any department"""
        posting_data = {
            "title": "TEST_Admin_EMS_Posting",
            "description": "Admin creating EMS posting",
            "max_slots": 1
        }
        resp = requests.post(f"{BASE_URL}/api/jobs/postings/create?dept_code=EMS", 
                           json=posting_data, headers=self._headers(self.admin_token))
        assert resp.status_code == 200, f"Admin should create any dept posting: {resp.text}"
        data = resp.json()
        print(f"Admin created EMS posting: {data.get('title')}")
        
        # Cleanup
        if 'id' in data:
            requests.delete(f"{BASE_URL}/api/jobs/postings/{data['id']}", 
                          headers=self._headers(self.admin_token))
            
    def test_citizen_cannot_create_posting(self):
        """POST /api/jobs/postings/create - Citizen gets 403"""
        posting_data = {
            "title": "TEST_Citizen_Posting",
            "description": "This should fail",
            "max_slots": 1
        }
        resp = requests.post(f"{BASE_URL}/api/jobs/postings/create?dept_code=LSPD", 
                           json=posting_data, headers=self._headers(self.citizen_token))
        assert resp.status_code == 403, f"Citizen should NOT create posting: {resp.status_code}"
        print("Citizen correctly blocked from creating posting")
        
    # ==================== DEPARTMENT UPDATE TESTS ====================
    
    def test_director_can_update_own_department(self):
        """PUT /api/jobs/departments/{id} - Director can update their department"""
        # Get LSPD dept
        resp = requests.get(f"{BASE_URL}/api/jobs/departments", headers=self._headers(self.admin_token))
        depts = resp.json()
        lspd_dept = next((d for d in depts if d['code'] == 'LSPD'), None)
        
        # LSPD director updates LSPD dept description
        update_data = {"description": "Updated by LSPD director - test"}
        resp = requests.put(f"{BASE_URL}/api/jobs/departments/{lspd_dept['id']}", 
                          json=update_data, headers=self._headers(self.lspd_token))
        assert resp.status_code == 200, f"LSPD director should update LSPD dept: {resp.text}"
        print("LSPD director successfully updated LSPD department")
        
    def test_ems_cannot_update_lspd_department(self):
        """PUT /api/jobs/departments/{id} - EMS staff cannot update LSPD dept"""
        # Get LSPD dept
        resp = requests.get(f"{BASE_URL}/api/jobs/departments", headers=self._headers(self.admin_token))
        depts = resp.json()
        lspd_dept = next((d for d in depts if d['code'] == 'LSPD'), None)
        
        # EMS tries to update LSPD
        update_data = {"description": "EMS trying to update LSPD"}
        resp = requests.put(f"{BASE_URL}/api/jobs/departments/{lspd_dept['id']}", 
                          json=update_data, headers=self._headers(self.ems_token))
        assert resp.status_code == 403, f"EMS should NOT update LSPD dept: {resp.status_code}"
        print("EMS correctly blocked from updating LSPD department")


class TestManagerAssignmentFlow:
    """Test the full manager assignment flow"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.admin_token = self._login(ADMIN_CREDS)
        self.ems_token = self._login(EMS_CREDS)
        
    def _login(self, creds):
        resp = requests.post(f"{BASE_URL}/api/auth/login", json=creds)
        if resp.status_code == 200:
            return resp.json().get("access_token")
        return None
    
    def _headers(self, token):
        return {"Authorization": f"Bearer {token}"}
    
    def test_full_manager_assignment_flow(self):
        """Test: Admin assigns EMS user as MECH director, EMS can then create MECH posting"""
        # 1. Get departments
        resp = requests.get(f"{BASE_URL}/api/jobs/departments", headers=self._headers(self.admin_token))
        assert resp.status_code == 200
        depts = resp.json()
        mech_dept = next((d for d in depts if d['code'] == 'MECH'), None)
        assert mech_dept is not None, "MECH department not found"
        
        # 2. Get EMS user ID by searching
        resp = requests.get(f"{BASE_URL}/api/jobs/users/search?q=ems", headers=self._headers(self.admin_token))
        assert resp.status_code == 200
        users = resp.json()
        ems_user = next((u for u in users if 'ems' in u.get('email', '').lower()), None)
        
        if ems_user is None:
            pytest.skip("EMS user not found in search results")
            
        ems_user_id = ems_user['id']
        print(f"Found EMS user: {ems_user['game_name']} (id={ems_user_id})")
        
        # 3. EMS cannot create MECH posting before assignment
        posting_data = {
            "title": "TEST_EMS_MECH_Before",
            "description": "Should fail before assignment",
            "max_slots": 1
        }
        resp = requests.post(f"{BASE_URL}/api/jobs/postings/create?dept_code=MECH", 
                           json=posting_data, headers=self._headers(self.ems_token))
        assert resp.status_code == 403, "EMS should NOT create MECH posting before assignment"
        print("EMS correctly blocked from MECH posting (before assignment)")
        
        # 4. Admin assigns EMS as MECH director
        resp = requests.post(f"{BASE_URL}/api/jobs/departments/{mech_dept['id']}/managers?user_id={ems_user_id}", 
                           headers=self._headers(self.admin_token))
        # Could be 200 or 409 if already assigned
        assert resp.status_code in [200, 409], f"Failed to assign manager: {resp.text}"
        print(f"Admin assigned EMS user as MECH director (status: {resp.status_code})")
        
        # 5. EMS can now create MECH posting
        posting_data = {
            "title": "TEST_EMS_MECH_After",
            "description": "Should succeed after assignment",
            "max_slots": 1
        }
        resp = requests.post(f"{BASE_URL}/api/jobs/postings/create?dept_code=MECH", 
                           json=posting_data, headers=self._headers(self.ems_token))
        assert resp.status_code == 200, f"EMS should create MECH posting after assignment: {resp.text}"
        posting_id = resp.json().get('id')
        print("EMS successfully created MECH posting after being assigned as director")
        
        # 6. Cleanup - delete posting and remove manager
        if posting_id:
            requests.delete(f"{BASE_URL}/api/jobs/postings/{posting_id}", 
                          headers=self._headers(self.ems_token))
        requests.delete(f"{BASE_URL}/api/jobs/departments/{mech_dept['id']}/managers/{ems_user_id}", 
                       headers=self._headers(self.admin_token))
        print("Cleanup completed")


class TestCitizenJobBoard:
    """Test citizen job board functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.citizen_token = self._login(CITIZEN_CREDS)
        
    def _login(self, creds):
        resp = requests.post(f"{BASE_URL}/api/auth/login", json=creds)
        if resp.status_code == 200:
            return resp.json().get("access_token")
        return None
    
    def _headers(self, token):
        return {"Authorization": f"Bearer {token}"}
    
    def test_citizen_can_view_open_postings(self):
        """GET /api/jobs/open - Citizen sees open postings grouped by department"""
        resp = requests.get(f"{BASE_URL}/api/jobs/open", headers=self._headers(self.citizen_token))
        assert resp.status_code == 200, f"Failed to get open postings: {resp.text}"
        postings = resp.json()
        assert isinstance(postings, list), "Postings should be a list"
        
        # Check postings have department info
        for posting in postings:
            assert 'dept_code' in posting, "Posting should have dept_code"
            assert 'dept_name' in posting, "Posting should have dept_name"
            assert 'dept_color' in posting, "Posting should have dept_color"
        print(f"Citizen can view {len(postings)} open postings")
        
    def test_citizen_can_view_own_applications(self):
        """GET /api/jobs/my-applications - Citizen sees their applications"""
        resp = requests.get(f"{BASE_URL}/api/jobs/my-applications", headers=self._headers(self.citizen_token))
        assert resp.status_code == 200, f"Failed to get applications: {resp.text}"
        apps = resp.json()
        assert isinstance(apps, list), "Applications should be a list"
        print(f"Citizen has {len(apps)} applications")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
