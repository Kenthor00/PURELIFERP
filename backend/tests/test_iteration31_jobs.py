"""
PURE LIFE OS - Iteration 31 - Job Board System Tests
Tests for:
- Admin job creation/management (POST /api/jobs/create, PUT /api/jobs/{id}, DELETE /api/jobs/{id})
- Admin job stats (GET /api/jobs/admin/stats, GET /api/jobs/admin/all)
- Admin application review (PUT /api/jobs/applications/{id}/review, GET /api/jobs/{id}/applications)
- Citizen job browsing (GET /api/jobs/open)
- Citizen job application (POST /api/jobs/{id}/apply, GET /api/jobs/my-applications)
- Citizen cannot apply twice to same job
- Staff (ADMIN/GOV) cannot create tickets (403)
- Citizens CAN create tickets
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://fivem-manager-3.preview.emergentagent.com')

# Test credentials
CITIZEN_EMAIL = "testflow@purelife.rp"
CITIZEN_PASSWORD = "CiaoCiao1!"
ADMIN_EMAIL = "admin@purelife.rp"
ADMIN_PASSWORD = "Admin@2026!"
LSPD_EMAIL = "lspd@purelife.rp"
LSPD_PASSWORD = "Lspd@2026!"


class TestJobBoardSystem:
    """Job Board API Tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def citizen_token(self):
        """Get citizen auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CITIZEN_EMAIL,
            "password": CITIZEN_PASSWORD
        })
        assert response.status_code == 200, f"Citizen login failed: {response.text}"
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def lspd_token(self):
        """Get LSPD auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": LSPD_EMAIL,
            "password": LSPD_PASSWORD
        })
        assert response.status_code == 200, f"LSPD login failed: {response.text}"
        return response.json()["access_token"]
    
    # ==========================================
    # ADMIN JOB MANAGEMENT TESTS
    # ==========================================
    
    def test_admin_get_job_stats(self, admin_token):
        """Admin can get job statistics"""
        response = requests.get(
            f"{BASE_URL}/api/jobs/admin/stats",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "total_jobs" in data
        assert "open_jobs" in data
        assert "total_applications" in data
        assert "pending_applications" in data
        assert "accepted_applications" in data
        print(f"Job stats: {data}")
    
    def test_admin_get_all_jobs(self, admin_token):
        """Admin can get all jobs with application counts"""
        response = requests.get(
            f"{BASE_URL}/api/jobs/admin/all",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        jobs = response.json()
        assert isinstance(jobs, list)
        # Should have at least 3 jobs (LSPD, Meccanico, EMS)
        assert len(jobs) >= 3, f"Expected at least 3 jobs, got {len(jobs)}"
        # Check job structure
        if jobs:
            job = jobs[0]
            assert "id" in job
            assert "title" in job
            assert "department" in job
            assert "status" in job
            assert "applications_count" in job
        print(f"Found {len(jobs)} jobs")
    
    def test_admin_create_job(self, admin_token):
        """Admin can create a new job posting"""
        job_data = {
            "title": "TEST_Tester Position",
            "department": "QA",
            "description": "Test job for automated testing",
            "requirements": "Must be a test",
            "salary_range": "$1000-$2000",
            "max_slots": 2,
            "location": "Test City",
            "priority": "normal"
        }
        response = requests.post(
            f"{BASE_URL}/api/jobs/create",
            json=job_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "id" in data
        assert data["title"] == job_data["title"]
        assert data["status"] == "open"
        print(f"Created job ID: {data['id']}")
        return data["id"]
    
    def test_admin_update_job_status_pause(self, admin_token):
        """Admin can pause a job"""
        # First get all jobs to find one to pause
        response = requests.get(
            f"{BASE_URL}/api/jobs/admin/all",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        jobs = response.json()
        test_job = next((j for j in jobs if "TEST_" in j["title"]), None)
        if not test_job:
            pytest.skip("No test job found to pause")
        
        response = requests.put(
            f"{BASE_URL}/api/jobs/{test_job['id']}",
            json={"status": "paused"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        print(f"Paused job {test_job['id']}")
    
    def test_admin_update_job_status_reopen(self, admin_token):
        """Admin can reopen a paused job"""
        response = requests.get(
            f"{BASE_URL}/api/jobs/admin/all",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        jobs = response.json()
        test_job = next((j for j in jobs if "TEST_" in j["title"]), None)
        if not test_job:
            pytest.skip("No test job found to reopen")
        
        response = requests.put(
            f"{BASE_URL}/api/jobs/{test_job['id']}",
            json={"status": "open"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        print(f"Reopened job {test_job['id']}")
    
    def test_admin_get_job_applications(self, admin_token):
        """Admin can get applications for a specific job"""
        # Get job 1 (LSPD) which should have 1 application
        response = requests.get(
            f"{BASE_URL}/api/jobs/1/applications",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        apps = response.json()
        assert isinstance(apps, list)
        print(f"Job 1 has {len(apps)} applications")
    
    def test_admin_review_application(self, admin_token):
        """Admin can review an application"""
        # Get applications for job 1
        response = requests.get(
            f"{BASE_URL}/api/jobs/1/applications",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        apps = response.json()
        if not apps:
            pytest.skip("No applications to review")
        
        app_id = apps[0]["id"]
        response = requests.put(
            f"{BASE_URL}/api/jobs/applications/{app_id}/review",
            json={"status": "reviewing", "notes": "Test review note"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        print(f"Reviewed application {app_id}")
    
    # ==========================================
    # CITIZEN JOB BROWSING & APPLICATION TESTS
    # ==========================================
    
    def test_citizen_get_open_jobs(self, citizen_token):
        """Citizen can browse open jobs"""
        response = requests.get(
            f"{BASE_URL}/api/jobs/open",
            headers={"Authorization": f"Bearer {citizen_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        jobs = response.json()
        assert isinstance(jobs, list)
        # Check job structure includes user_applied field
        if jobs:
            job = jobs[0]
            assert "id" in job
            assert "title" in job
            assert "user_applied" in job
            assert "available_slots" in job
        print(f"Citizen sees {len(jobs)} open jobs")
    
    def test_citizen_get_my_applications(self, citizen_token):
        """Citizen can see their applications"""
        response = requests.get(
            f"{BASE_URL}/api/jobs/my-applications",
            headers={"Authorization": f"Bearer {citizen_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        apps = response.json()
        assert isinstance(apps, list)
        # testflow@purelife.rp already applied to job 1
        assert len(apps) >= 1, "Expected at least 1 application"
        if apps:
            app = apps[0]
            assert "job_title" in app
            assert "status" in app
        print(f"Citizen has {len(apps)} applications")
    
    def test_citizen_cannot_apply_twice(self, citizen_token):
        """Citizen cannot apply twice to the same job"""
        # Try to apply to job 1 again (already applied)
        response = requests.post(
            f"{BASE_URL}/api/jobs/1/apply",
            json={"motivation": "Test duplicate application"},
            headers={"Authorization": f"Bearer {citizen_token}"}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        assert "gia'" in response.json().get("detail", "").lower() or "already" in response.json().get("detail", "").lower()
        print("Correctly rejected duplicate application")
    
    def test_citizen_apply_to_new_job(self, citizen_token):
        """Citizen can apply to a job they haven't applied to"""
        # First check open jobs to find one not applied to
        response = requests.get(
            f"{BASE_URL}/api/jobs/open",
            headers={"Authorization": f"Bearer {citizen_token}"}
        )
        jobs = response.json()
        unapplied_job = next((j for j in jobs if not j["user_applied"] and "TEST_" not in j["title"]), None)
        
        if not unapplied_job:
            print("No unapplied jobs found - citizen may have applied to all")
            return
        
        response = requests.post(
            f"{BASE_URL}/api/jobs/{unapplied_job['id']}/apply",
            json={
                "motivation": "Test application from automated test",
                "experience": "Testing experience",
                "availability": "Anytime"
            },
            headers={"Authorization": f"Bearer {citizen_token}"}
        )
        # Could be 200 (success) or 400 (already applied)
        assert response.status_code in [200, 400], f"Unexpected status: {response.status_code}"
        print(f"Application result: {response.status_code}")
    
    # ==========================================
    # ACCESS CONTROL TESTS
    # ==========================================
    
    def test_citizen_cannot_access_admin_stats(self, citizen_token):
        """Citizen cannot access admin job stats"""
        response = requests.get(
            f"{BASE_URL}/api/jobs/admin/stats",
            headers={"Authorization": f"Bearer {citizen_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("Correctly denied citizen access to admin stats")
    
    def test_citizen_cannot_create_job(self, citizen_token):
        """Citizen cannot create a job posting"""
        response = requests.post(
            f"{BASE_URL}/api/jobs/create",
            json={"title": "Illegal Job", "department": "Test", "description": "Test"},
            headers={"Authorization": f"Bearer {citizen_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("Correctly denied citizen job creation")
    
    def test_lspd_cannot_access_admin_jobs(self, lspd_token):
        """LSPD (non-admin staff) cannot access admin job management"""
        response = requests.get(
            f"{BASE_URL}/api/jobs/admin/all",
            headers={"Authorization": f"Bearer {lspd_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("Correctly denied LSPD access to admin jobs")


class TestTicketAccessControl:
    """Ticket System Access Control Tests - Staff cannot create tickets"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def citizen_token(self):
        """Get citizen auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CITIZEN_EMAIL,
            "password": CITIZEN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_admin_cannot_create_ticket(self, admin_token):
        """CRITICAL: Admin (staff) cannot create tickets - should get 403"""
        response = requests.post(
            f"{BASE_URL}/api/tickets/create",
            json={
                "subject": "Admin trying to create ticket",
                "message": "This should fail",
                "category": "generale"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        assert "staff" in response.json().get("detail", "").lower()
        print("Correctly denied admin ticket creation (403)")
    
    def test_citizen_can_create_ticket(self, citizen_token):
        """CRITICAL: Citizen CAN create tickets"""
        response = requests.post(
            f"{BASE_URL}/api/tickets/create",
            json={
                "subject": f"TEST_Citizen Ticket {int(time.time())}",
                "message": "Test ticket from automated test",
                "category": "generale",
                "priority": "normal"
            },
            headers={"Authorization": f"Bearer {citizen_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "ticket_number" in data
        assert data["status"] == "open"
        print(f"Citizen created ticket: {data['ticket_number']}")
    
    def test_citizen_can_view_own_tickets(self, citizen_token):
        """Citizen can view their own tickets"""
        response = requests.get(
            f"{BASE_URL}/api/tickets/my",
            headers={"Authorization": f"Bearer {citizen_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        tickets = response.json()
        assert isinstance(tickets, list)
        print(f"Citizen has {len(tickets)} tickets")
    
    def test_admin_can_view_all_tickets(self, admin_token):
        """Admin can view all tickets (staff management)"""
        response = requests.get(
            f"{BASE_URL}/api/tickets/staff/all",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        tickets = response.json()
        assert isinstance(tickets, list)
        print(f"Admin sees {len(tickets)} total tickets")


class TestJobBoardCleanup:
    """Cleanup test data"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_cleanup_test_jobs(self, admin_token):
        """Delete TEST_ prefixed jobs"""
        response = requests.get(
            f"{BASE_URL}/api/jobs/admin/all",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        jobs = response.json()
        test_jobs = [j for j in jobs if "TEST_" in j["title"]]
        
        for job in test_jobs:
            del_response = requests.delete(
                f"{BASE_URL}/api/jobs/{job['id']}",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            print(f"Deleted test job {job['id']}: {del_response.status_code}")
        
        print(f"Cleaned up {len(test_jobs)} test jobs")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
