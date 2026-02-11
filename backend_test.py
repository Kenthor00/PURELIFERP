#!/usr/bin/env python3
"""
PURE LIFE OS - Backend API Testing
Test delle API base senza MySQL (MySQL non configurato)
"""
import requests
import sys
from datetime import datetime

class PLOSAPITester:
    def __init__(self, base_url="https://role-master-4.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.results = []

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Esegue un singolo test API"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if headers:
            test_headers.update(headers)
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Test {self.tests_run}: {name}")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            
            result = {
                'name': name,
                'endpoint': endpoint,
                'method': method,
                'expected_status': expected_status,
                'actual_status': response.status_code,
                'success': success,
                'response_data': None,
                'error': None
            }

            if success:
                self.tests_passed += 1
                print(f"✅ SUCCESSO - Status: {response.status_code}")
                try:
                    result['response_data'] = response.json()
                    print(f"   Risposta: {result['response_data']}")
                except:
                    result['response_data'] = response.text[:200]
            else:
                print(f"❌ FALLITO - Atteso {expected_status}, ricevuto {response.status_code}")
                try:
                    error_data = response.json()
                    result['error'] = error_data
                    print(f"   Errore: {error_data}")
                except:
                    result['error'] = response.text[:200]
                    print(f"   Errore: {response.text[:200]}")

            self.results.append(result)
            return success, result['response_data'] if success else result['error']

        except requests.exceptions.RequestException as e:
            print(f"❌ ERRORE CONNESSIONE - {str(e)}")
            result = {
                'name': name,
                'endpoint': endpoint,
                'method': method,
                'expected_status': expected_status,
                'actual_status': 'CONNECTION_ERROR',
                'success': False,
                'response_data': None,
                'error': str(e)
            }
            self.results.append(result)
            return False, str(e)

    def test_system_info(self):
        """Test API /api/ - Info sistema"""
        return self.run_test(
            "Sistema Info",
            "GET",
            "api/",
            200
        )

    def test_health_check(self):
        """Test API /api/health - Health check"""
        return self.run_test(
            "Health Check",
            "GET", 
            "api/health",
            200
        )

    def test_login_without_mysql(self):
        """Test login (dovrebbe fallire senza MySQL)"""
        return self.run_test(
            "Login Test (MySQL non configurato)",
            "POST",
            "api/auth/login",
            500,  # Aspettiamo errore 500 per MySQL non configurato
            data={"email": "lspd@purelife.rp", "password": "demo123"}
        )

    def print_summary(self):
        """Stampa riassunto dei test"""
        print(f"\n{'='*60}")
        print(f"📊 RIASSUNTO TEST PURE LIFE OS")
        print(f"{'='*60}")
        print(f"Test eseguiti: {self.tests_run}")
        print(f"Test superati: {self.tests_passed}")
        print(f"Percentuale successo: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        print(f"\n📋 DETTAGLI:")
        for result in self.results:
            status_icon = "✅" if result['success'] else "❌"
            print(f"{status_icon} {result['name']} - {result['actual_status']}")
        
        print(f"\n💡 NOTE:")
        print("- MySQL non è configurato, quindi le API che richiedono DB falliranno")
        print("- Test di base (/, /health) dovrebbero funzionare")
        print("- Login fallirà fino a configurazione MySQL")

def main():
    print("🚀 AVVIO TEST PURE LIFE OS BACKEND")
    print("=" * 50)
    
    tester = PLOSAPITester()
    
    # Test API base (non richiedono MySQL)
    print("\n📡 TEST API BASE")
    tester.test_system_info()
    tester.test_health_check()
    
    # Test API che richiedono MySQL (dovrebbero fallire)
    print("\n🔐 TEST API CON DATABASE")
    tester.test_login_without_mysql()
    
    # Stampa riassunto
    tester.print_summary()
    
    # Return code per CI/CD
    return 0 if tester.tests_passed >= 2 else 1  # Almeno 2 test base devono passare

if __name__ == "__main__":
    sys.exit(main())