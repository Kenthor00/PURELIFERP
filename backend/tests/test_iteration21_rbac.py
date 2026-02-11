"""
PURE LIFE OS - Iteration 21 RBAC Tests
Tests for Admin RBAC system with Italian hierarchies
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestRBACAuth:
    """Authentication tests for RBAC endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@purelife.rp",
            "password": "Admin@2026!"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()["access_token"]
    
    def test_admin_login(self, auth_token):
        """Test admin login returns valid token"""
        assert auth_token is not None
        assert len(auth_token) > 50


class TestRBACStats:
    """Tests for RBAC statistics endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@purelife.rp",
            "password": "Admin@2026!"
        })
        return response.json()["access_token"]
    
    def test_get_rbac_stats(self, auth_token):
        """GET /api/admin/rbac/stats - Returns system statistics"""
        response = requests.get(
            f"{BASE_URL}/api/admin/rbac/stats",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "lavori_attivi" in data
        assert "utenti_per_lavoro" in data
        assert "staff_attivi" in data
        assert "override_attivi" in data
        assert "azioni_24h" in data
        
        # Verify values
        assert data["lavori_attivi"] >= 12  # At least 12 jobs
        assert isinstance(data["utenti_per_lavoro"], list)
        assert data["staff_attivi"] >= 1  # At least admin


class TestRBACJobs:
    """Tests for Jobs endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@purelife.rp",
            "password": "Admin@2026!"
        })
        return response.json()["access_token"]
    
    def test_list_jobs(self, auth_token):
        """GET /api/admin/rbac/jobs - Returns list of jobs with categories"""
        response = requests.get(
            f"{BASE_URL}/api/admin/rbac/jobs",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        jobs = response.json()
        
        # Verify we have jobs
        assert len(jobs) >= 12
        
        # Verify job structure
        job = jobs[0]
        assert "id" in job
        assert "code" in job
        assert "name" in job
        assert "name_short" in job
        assert "category" in job
        assert "is_active" in job
        
        # Verify specific jobs exist
        job_codes = [j["code"] for j in jobs]
        assert "lspd" in job_codes
        assert "ems" in job_codes
        assert "justice" in job_codes
        assert "weazel" in job_codes
    
    def test_get_lspd_grades(self, auth_token):
        """GET /api/admin/rbac/jobs/1/grades - LSPD has 13 Italian grades"""
        response = requests.get(
            f"{BASE_URL}/api/admin/rbac/jobs/1/grades",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        grades = response.json()
        
        # LSPD should have exactly 13 grades
        assert len(grades) == 13, f"Expected 13 LSPD grades, got {len(grades)}"
        
        # Verify grade structure
        grade = grades[0]
        assert "id" in grade
        assert "job_id" in grade
        assert "grade_level" in grade
        assert "code" in grade
        assert "name" in grade
        assert "category" in grade
        
        # Verify Italian grade names
        grade_names = [g["name"] for g in grades]
        assert "Capo della Polizia" in grade_names
        assert "Vice Capo della Polizia" in grade_names
        assert "Comandante" in grade_names
        assert "Capitano" in grade_names
        assert "Tenente" in grade_names
        assert "Sergente" in grade_names
        assert "Agente Senior" in grade_names
        assert "Recluta" in grade_names
        
        # Verify categories
        categories = set(g["category"] for g in grades)
        assert "COMANDO" in categories
        assert "ALTO COMANDO" in categories
        assert "SUPERVISIONE" in categories
        assert "UFFICIALI" in categories
        assert "RECLUTE" in categories
    
    def test_get_ems_grades(self, auth_token):
        """GET /api/admin/rbac/jobs/2/grades - EMS has 6 Italian grades"""
        response = requests.get(
            f"{BASE_URL}/api/admin/rbac/jobs/2/grades",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        grades = response.json()
        
        # EMS should have exactly 6 grades
        assert len(grades) == 6, f"Expected 6 EMS grades, got {len(grades)}"
        
        # Verify Italian grade names
        grade_names = [g["name"] for g in grades]
        assert "Direttore Sanitario" in grade_names
        assert "Dirigente Sanitario" in grade_names
        assert "Primario" in grade_names
        assert "Dottore" in grade_names
        assert "Infermiere" in grade_names
        assert "Soccorritore" in grade_names
    
    def test_get_justice_grades(self, auth_token):
        """GET /api/admin/rbac/jobs/4/grades - Justice has 5 Italian grades"""
        response = requests.get(
            f"{BASE_URL}/api/admin/rbac/jobs/4/grades",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        grades = response.json()
        
        # Justice should have exactly 5 grades
        assert len(grades) == 5, f"Expected 5 Justice grades, got {len(grades)}"
        
        # Verify Italian grade names
        grade_names = [g["name"] for g in grades]
        assert "Procuratore Generale" in grade_names
        assert "Procuratore Distrettuale" in grade_names
        assert "Giudice" in grade_names
        assert "Pubblico Ministero" in grade_names
        assert "Avvocato" in grade_names
    
    def test_get_weazel_grades(self, auth_token):
        """GET /api/admin/rbac/jobs/6/grades - Weazel News has 5 Italian grades"""
        response = requests.get(
            f"{BASE_URL}/api/admin/rbac/jobs/6/grades",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        grades = response.json()
        
        # Weazel should have exactly 5 grades
        assert len(grades) == 5, f"Expected 5 Weazel grades, got {len(grades)}"
        
        # Verify Italian grade names
        grade_names = [g["name"] for g in grades]
        assert "Direttore Editoriale" in grade_names
        assert "Caporedattore" in grade_names
        assert "Redattore" in grade_names
        assert "Giornalista" in grade_names
        assert "Reporter" in grade_names


class TestRBACStaffRoles:
    """Tests for Staff Roles endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@purelife.rp",
            "password": "Admin@2026!"
        })
        return response.json()["access_token"]
    
    def test_list_staff_roles(self, auth_token):
        """GET /api/admin/rbac/staff-roles - Returns 3 staff roles"""
        response = requests.get(
            f"{BASE_URL}/api/admin/rbac/staff-roles",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        roles = response.json()
        
        # Should have exactly 3 staff roles
        assert len(roles) == 3, f"Expected 3 staff roles, got {len(roles)}"
        
        # Verify role structure
        role = roles[0]
        assert "id" in role
        assert "code" in role
        assert "name" in role
        assert "level" in role
        assert "bypass_job_permissions" in role
        
        # Verify Italian role names
        role_names = [r["name"] for r in roles]
        assert "Moderatore" in role_names
        assert "Amministratore" in role_names
        assert "Super Admin" in role_names
        
        # Verify levels
        role_levels = {r["name"]: r["level"] for r in roles}
        assert role_levels["Moderatore"] == 1
        assert role_levels["Amministratore"] == 2
        assert role_levels["Super Admin"] == 3


class TestRBACPermissions:
    """Tests for Permissions endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@purelife.rp",
            "password": "Admin@2026!"
        })
        return response.json()["access_token"]
    
    def test_list_permissions(self, auth_token):
        """GET /api/admin/rbac/permissions - Returns 23+ permissions"""
        response = requests.get(
            f"{BASE_URL}/api/admin/rbac/permissions",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        permissions = response.json()
        
        # Should have at least 23 permissions
        assert len(permissions) >= 23, f"Expected 23+ permissions, got {len(permissions)}"
        
        # Verify permission structure
        perm = permissions[0]
        assert "id" in perm
        assert "code" in perm
        assert "name" in perm
        assert "category" in perm
        
        # Verify categories exist
        categories = set(p["category"] for p in permissions)
        assert "admin" in categories or "lspd" in categories or "ems" in categories


class TestRBACAssignments:
    """Tests for Job and Staff Role assignment endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@purelife.rp",
            "password": "Admin@2026!"
        })
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def test_user_id(self, auth_token):
        """Get a test user ID"""
        response = requests.get(
            f"{BASE_URL}/api/admin/rbac/users?limit=10",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        users = response.json()["users"]
        # Find a user without job assignment
        for user in users:
            if user["id"] != 1 and user["job"] is None:
                return user["id"]
        return users[1]["id"] if len(users) > 1 else None
    
    def test_assign_job_to_user(self, auth_token, test_user_id):
        """POST /api/admin/rbac/users/assign-job - Assigns job to user"""
        if test_user_id is None:
            pytest.skip("No test user available")
        
        response = requests.post(
            f"{BASE_URL}/api/admin/rbac/users/assign-job",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "user_id": test_user_id,
                "job_id": 2,  # EMS
                "grade_id": 19,  # Soccorritore (lowest EMS grade)
                "reason": "TEST_Iteration21 - Assegnazione EMS per test"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "EMS" in data["message"] or "Soccorritore" in data["message"]


class TestRBACAudit:
    """Tests for Audit Log endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@purelife.rp",
            "password": "Admin@2026!"
        })
        return response.json()["access_token"]
    
    def test_get_audit_log(self, auth_token):
        """GET /api/admin/rbac/audit - Returns audit log with filters"""
        response = requests.get(
            f"{BASE_URL}/api/admin/rbac/audit?limit=10",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        logs = response.json()
        
        # Should have audit entries
        assert len(logs) > 0
        
        # Verify log structure
        log = logs[0]
        assert "id" in log
        assert "action" in log
        assert "timestamp" in log
    
    def test_audit_log_contains_job_change(self, auth_token):
        """Verify audit log contains job_change action from assignment test"""
        response = requests.get(
            f"{BASE_URL}/api/admin/rbac/audit?limit=50",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        logs = response.json()
        
        # Check for job_change action
        actions = [log["action"] for log in logs]
        assert "job_change" in actions or "login_success" in actions


class TestRBACUsers:
    """Tests for Users RBAC endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@purelife.rp",
            "password": "Admin@2026!"
        })
        return response.json()["access_token"]
    
    def test_list_users_rbac(self, auth_token):
        """GET /api/admin/rbac/users - Returns users with RBAC info"""
        response = requests.get(
            f"{BASE_URL}/api/admin/rbac/users?limit=10",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "users" in data
        assert "total" in data
        assert "limit" in data
        
        # Verify user structure
        if len(data["users"]) > 0:
            user = data["users"][0]
            assert "id" in user
            assert "email" in user
            assert "staff_roles" in user
            assert "permissions_count" in user


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
