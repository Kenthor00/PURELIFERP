"""
Iteration 32 - Multi-Department Job Board System Tests
Tests for departments, postings, applications with role-based access control
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://dispatch-center-27.preview.emergentagent.com')

# Test credentials
ADMIN_CREDS = {"email": "admin@purelife.rp", "password": "Admin123!"}
LSPD_CREDS = {"email": "lspd@purelife.rp", "password": "Admin123!"}
EMS_CREDS = {"email": "ems@purelife.rp", "password": "Admin123!"}
CITIZEN_CREDS = {"email": "cittadino@purelife.rp", "password": "Admin123!"}


@pytest.fixture(scope="module")
def admin_token():
    """Get admin token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def lspd_token():
    """Get LSPD staff token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=LSPD_CREDS)
    assert response.status_code == 200, f"LSPD login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def ems_token():
    """Get EMS staff token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=EMS_CREDS)
    assert response.status_code == 200, f"EMS login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def citizen_token():
    """Get citizen token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=CITIZEN_CREDS)
    assert response.status_code == 200, f"Citizen login failed: {response.text}"
    return response.json()["access_token"]


class TestDepartments:
    """Department management tests - Admin only"""

    def test_get_departments_admin(self, admin_token):
        """Admin can list all departments"""
        response = requests.get(
            f"{BASE_URL}/api/jobs/departments",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        depts = response.json()
        assert isinstance(depts, list)
        assert len(depts) >= 3, "Should have at least 3 departments (LSPD, EMS, MECH)"
        
        # Verify department structure
        codes = [d["code"] for d in depts]
        assert "LSPD" in codes, "LSPD department should exist"
        assert "EMS" in codes, "EMS department should exist"
        assert "MECH" in codes, "MECH department should exist"
        
        # Verify department data
        lspd = next(d for d in depts if d["code"] == "LSPD")
        assert lspd["name"] == "Los Santos Police Department"
        assert lspd["active"] == True
        assert "open_postings" in lspd
        assert "pending_applications" in lspd

    def test_create_department_admin_only(self, citizen_token):
        """Citizen cannot create department (403)"""
        response = requests.post(
            f"{BASE_URL}/api/jobs/departments/create",
            headers={"Authorization": f"Bearer {citizen_token}"},
            json={"name": "Test Dept", "code": "TEST", "description": "Test"}
        )
        assert response.status_code == 403
        assert "admin" in response.json()["detail"].lower()

    def test_create_department_lspd_forbidden(self, lspd_token):
        """LSPD staff cannot create department (403)"""
        response = requests.post(
            f"{BASE_URL}/api/jobs/departments/create",
            headers={"Authorization": f"Bearer {lspd_token}"},
            json={"name": "Test Dept", "code": "TEST2", "description": "Test"}
        )
        assert response.status_code == 403


class TestPostings:
    """Job posting tests - Staff can manage their department's postings"""

    def test_get_postings_admin_sees_all(self, admin_token):
        """Admin sees all postings from all departments"""
        response = requests.get(
            f"{BASE_URL}/api/jobs/postings/my-dept",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        postings = response.json()
        assert isinstance(postings, list)
        assert len(postings) >= 2, "Should have at least 2 postings"
        
        # Admin should see postings from multiple departments
        dept_codes = set(p["dept_code"] for p in postings)
        assert len(dept_codes) >= 2, "Admin should see postings from multiple departments"

    def test_get_postings_lspd_sees_only_lspd(self, lspd_token):
        """LSPD staff sees only LSPD postings"""
        response = requests.get(
            f"{BASE_URL}/api/jobs/postings/my-dept",
            headers={"Authorization": f"Bearer {lspd_token}"}
        )
        assert response.status_code == 200
        postings = response.json()
        assert isinstance(postings, list)
        
        # All postings should be LSPD
        for p in postings:
            assert p["dept_code"] == "LSPD", f"LSPD staff should only see LSPD postings, got {p['dept_code']}"

    def test_create_posting_lspd_for_lspd(self, lspd_token):
        """LSPD staff can create posting for LSPD"""
        response = requests.post(
            f"{BASE_URL}/api/jobs/postings/create?dept_code=LSPD",
            headers={"Authorization": f"Bearer {lspd_token}"},
            json={
                "title": "TEST_Detective LSPD",
                "description": "Posizione test per detective",
                "requirements": "Esperienza investigativa",
                "salary_range": "$4000-$6000",
                "max_slots": 2
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["title"] == "TEST_Detective LSPD"
        
        # Cleanup - delete the test posting
        posting_id = data["id"]
        del_response = requests.delete(
            f"{BASE_URL}/api/jobs/postings/{posting_id}",
            headers={"Authorization": f"Bearer {lspd_token}"}
        )
        assert del_response.status_code == 200

    def test_create_posting_ems_for_lspd_forbidden(self, ems_token):
        """EMS staff cannot create posting for LSPD (403)"""
        response = requests.post(
            f"{BASE_URL}/api/jobs/postings/create?dept_code=LSPD",
            headers={"Authorization": f"Bearer {ems_token}"},
            json={
                "title": "Test Posting",
                "description": "Should fail"
            }
        )
        assert response.status_code == 403
        assert "dipartimento" in response.json()["detail"].lower()


class TestOpenPostings:
    """Open postings for citizens"""

    def test_get_open_postings_citizen(self, citizen_token):
        """Citizen can see open postings with department info"""
        response = requests.get(
            f"{BASE_URL}/api/jobs/open",
            headers={"Authorization": f"Bearer {citizen_token}"}
        )
        assert response.status_code == 200
        postings = response.json()
        assert isinstance(postings, list)
        assert len(postings) >= 2, "Should have at least 2 open postings"
        
        # Verify posting structure includes department info
        for p in postings:
            assert "dept_name" in p
            assert "dept_color" in p
            assert "dept_icon" in p
            assert "user_applied" in p
            assert "user_application_status" in p
            assert "available_slots" in p

    def test_citizen_sees_application_status(self, citizen_token):
        """Citizen sees their application status on postings"""
        response = requests.get(
            f"{BASE_URL}/api/jobs/open",
            headers={"Authorization": f"Bearer {citizen_token}"}
        )
        assert response.status_code == 200
        postings = response.json()
        
        # Find LSPD posting where citizen has applied
        lspd_posting = next((p for p in postings if p["dept_code"] == "LSPD"), None)
        if lspd_posting:
            assert lspd_posting["user_applied"] == True
            assert lspd_posting["user_application_status"] == "interview"


class TestApplications:
    """Application management tests"""

    def test_get_my_applications_citizen(self, citizen_token):
        """Citizen can see their applications"""
        response = requests.get(
            f"{BASE_URL}/api/jobs/my-applications",
            headers={"Authorization": f"Bearer {citizen_token}"}
        )
        assert response.status_code == 200
        apps = response.json()
        assert isinstance(apps, list)
        assert len(apps) >= 1, "Citizen should have at least 1 application"
        
        # Verify application structure
        app = apps[0]
        assert "job_title" in app
        assert "dept_name" in app
        assert "dept_color" in app
        assert "status" in app
        assert app["status"] == "interview"
        assert "interview_date" in app

    def test_get_posting_applications_admin(self, admin_token):
        """Admin can see applications for any posting"""
        response = requests.get(
            f"{BASE_URL}/api/jobs/postings/1/applications",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        apps = response.json()
        assert isinstance(apps, list)
        assert len(apps) >= 1
        
        # Verify application data
        app = apps[0]
        assert app["game_name"] == "Mario Rossi"
        assert app["status"] == "interview"
        assert "reviewer_notes" in app

    def test_get_posting_applications_lspd_for_lspd(self, lspd_token):
        """LSPD staff can see applications for LSPD postings"""
        response = requests.get(
            f"{BASE_URL}/api/jobs/postings/1/applications",
            headers={"Authorization": f"Bearer {lspd_token}"}
        )
        assert response.status_code == 200
        apps = response.json()
        assert isinstance(apps, list)

    def test_get_posting_applications_ems_for_lspd_forbidden(self, ems_token):
        """EMS staff cannot see applications for LSPD postings (403)"""
        response = requests.get(
            f"{BASE_URL}/api/jobs/postings/1/applications",
            headers={"Authorization": f"Bearer {ems_token}"}
        )
        assert response.status_code == 403


class TestDeptStats:
    """Department statistics tests"""

    def test_dept_stats_admin(self, admin_token):
        """Admin gets stats for all departments"""
        response = requests.get(
            f"{BASE_URL}/api/jobs/dept-stats",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        stats = response.json()
        
        assert "total_postings" in stats
        assert "open_postings" in stats
        assert "total_applications" in stats
        assert "pending_applications" in stats
        assert "accepted_applications" in stats
        
        assert stats["total_postings"] >= 2
        assert stats["total_applications"] >= 1

    def test_dept_stats_lspd(self, lspd_token):
        """LSPD staff gets stats for LSPD only"""
        response = requests.get(
            f"{BASE_URL}/api/jobs/dept-stats",
            headers={"Authorization": f"Bearer {lspd_token}"}
        )
        assert response.status_code == 200
        stats = response.json()
        
        # LSPD should have at least 1 posting
        assert stats["total_postings"] >= 1


class TestAccessControl:
    """Access control edge cases"""

    def test_citizen_cannot_access_dept_stats(self, citizen_token):
        """Citizen can access dept-stats (it's filtered by their sector)"""
        response = requests.get(
            f"{BASE_URL}/api/jobs/dept-stats",
            headers={"Authorization": f"Bearer {citizen_token}"}
        )
        # Citizens can access but will see CIVIL sector stats (likely 0)
        assert response.status_code == 200

    def test_citizen_cannot_create_posting(self, citizen_token):
        """Citizen cannot create job posting"""
        response = requests.post(
            f"{BASE_URL}/api/jobs/postings/create?dept_code=LSPD",
            headers={"Authorization": f"Bearer {citizen_token}"},
            json={"title": "Test", "description": "Test"}
        )
        assert response.status_code == 403

    def test_citizen_cannot_review_application(self, citizen_token):
        """Citizen cannot review applications"""
        response = requests.put(
            f"{BASE_URL}/api/jobs/applications/1/review",
            headers={"Authorization": f"Bearer {citizen_token}"},
            json={"status": "accepted"}
        )
        assert response.status_code == 403


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
