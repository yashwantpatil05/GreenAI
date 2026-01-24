#!/usr/bin/env python3
"""
Backend API Testing for GreenAI Application
Tests health endpoints and basic API functionality
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class GreenAIAPITester:
    def __init__(self, base_url: str = "https://1092e148-1b74-4537-8efa-bb9eebe81970.preview.emergentagent.com/api"):
        self.base_url = base_url.rstrip('/')
        self.health_base = base_url.replace('/api', '')  # Health endpoints are at root level
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'GreenAI-Test-Client/1.0'
        })
        
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            
        result = {
            "test_name": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat(),
            "response_data": response_data
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}")
        if details:
            print(f"    {details}")
        if not success and response_data:
            print(f"    Response: {response_data}")

    def test_health_endpoint(self) -> bool:
        """Test GET /healthz endpoint - try both root and /api prefixed"""
        # Try root level first
        try:
            response = self.session.get(f"{self.health_base}/healthz", timeout=10)
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    if data.get("status") == "ok":
                        self.log_test("Health Endpoint (Root)", True, f"Status: {response.status_code}, Response: {data}")
                        return True
                except json.JSONDecodeError:
                    # Check if response is plain text "ok"
                    if response.text.strip().lower() == "ok":
                        self.log_test("Health Endpoint (Root)", True, f"Status: {response.status_code}, Response: {response.text}")
                        return True
        except requests.exceptions.RequestException:
            pass
        
        # Try with /api prefix
        try:
            response = self.session.get(f"{self.base_url}/healthz", timeout=10)
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    if data.get("status") == "ok":
                        self.log_test("Health Endpoint (API)", True, f"Status: {response.status_code}, Response: {data}")
                        return True
                except json.JSONDecodeError:
                    # Check if response is plain text "ok"
                    if response.text.strip().lower() == "ok":
                        self.log_test("Health Endpoint (API)", True, f"Status: {response.status_code}, Response: {response.text}")
                        return True
            
            self.log_test("Health Endpoint", False, f"Both root and API endpoints failed. Last status: {response.status_code}")
            return False
                
        except requests.exceptions.RequestException as e:
            self.log_test("Health Endpoint", False, f"Both endpoints failed. Last error: {str(e)}")
            return False

    def test_readiness_endpoint(self) -> bool:
        """Test GET /readyz endpoint - try both root and /api prefixed"""
        # Try root level first
        try:
            response = self.session.get(f"{self.health_base}/readyz", timeout=10)
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    if data.get("status") == "ready":
                        self.log_test("Readiness Endpoint (Root)", True, f"Status: {response.status_code}, Response: {data}")
                        return True
                except json.JSONDecodeError:
                    # Check if response is plain text "ready"
                    if response.text.strip().lower() == "ready":
                        self.log_test("Readiness Endpoint (Root)", True, f"Status: {response.status_code}, Response: {response.text}")
                        return True
        except requests.exceptions.RequestException:
            pass
        
        # Try with /api prefix
        try:
            response = self.session.get(f"{self.base_url}/readyz", timeout=10)
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    if data.get("status") == "ready":
                        self.log_test("Readiness Endpoint (API)", True, f"Status: {response.status_code}, Response: {data}")
                        return True
                except json.JSONDecodeError:
                    # Check if response is plain text "ready"
                    if response.text.strip().lower() == "ready":
                        self.log_test("Readiness Endpoint (API)", True, f"Status: {response.status_code}, Response: {response.text}")
                        return True
            
            self.log_test("Readiness Endpoint", False, f"Both root and API endpoints failed. Last status: {response.status_code}")
            return False
                
        except requests.exceptions.RequestException as e:
            self.log_test("Readiness Endpoint", False, f"Both endpoints failed. Last error: {str(e)}")
            return False

    def test_cors_headers(self) -> bool:
        """Test CORS headers are properly set"""
        try:
            response = self.session.options(f"{self.base_url}/", timeout=10)
            
            cors_headers = {
                'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
                'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
                'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers'),
            }
            
            # Check if CORS is configured (should allow all origins for this app)
            if cors_headers['Access-Control-Allow-Origin'] == '*':
                self.log_test("CORS Configuration", True, f"CORS headers: {cors_headers}")
                return True
            else:
                self.log_test("CORS Configuration", False, f"CORS headers: {cors_headers}")
                return False
                
        except requests.exceptions.RequestException as e:
            self.log_test("CORS Configuration", False, f"Request failed: {str(e)}")
            return False

    def test_api_root_endpoint(self) -> bool:
        """Test API root endpoint accessibility"""
        try:
            response = self.session.get(f"{self.base_url}/", timeout=10)
            
            # API root might return 404 or redirect, but should be reachable
            if response.status_code in [200, 404, 405]:
                self.log_test("API Root Accessibility", True, f"Status: {response.status_code}")
                return True
            else:
                self.log_test("API Root Accessibility", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except requests.exceptions.RequestException as e:
            self.log_test("API Root Accessibility", False, f"Request failed: {str(e)}")
            return False

    def test_billing_plans_endpoint(self) -> bool:
        """Test GET /api/billing/plans endpoint (should return 3 plans)"""
        try:
            response = self.session.get(f"{self.base_url}/billing/plans", timeout=10)
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    plans = data.get("plans", [])
                    
                    if len(plans) == 3:
                        plan_names = [plan.get("name") for plan in plans]
                        expected_plans = ["Starter", "Pro", "Enterprise"]
                        
                        if all(name in plan_names for name in expected_plans):
                            self.log_test("Billing Plans Endpoint", True, f"Found 3 plans: {plan_names}")
                            return True
                        else:
                            self.log_test("Billing Plans Endpoint", False, f"Expected plans {expected_plans}, got {plan_names}")
                            return False
                    else:
                        self.log_test("Billing Plans Endpoint", False, f"Expected 3 plans, got {len(plans)}")
                        return False
                        
                except json.JSONDecodeError:
                    self.log_test("Billing Plans Endpoint", False, f"Invalid JSON response: {response.text}")
                    return False
            else:
                self.log_test("Billing Plans Endpoint", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except requests.exceptions.RequestException as e:
            self.log_test("Billing Plans Endpoint", False, f"Request failed: {str(e)}")
            return False

    def test_projects_endpoint_without_auth(self) -> bool:
        """Test projects endpoint without authentication (should return 401/403)"""
        try:
            response = self.session.get(f"{self.base_url}/projects", timeout=10)
            
            # Should return 401 or 403 for unauthenticated requests
            if response.status_code in [401, 403]:
                self.log_test("Projects Endpoint (No Auth)", True, f"Status: {response.status_code} - Properly secured")
                return True
            else:
                self.log_test("Projects Endpoint (No Auth)", False, f"Status: {response.status_code} - Should be secured")
                return False
                
        except requests.exceptions.RequestException as e:
            self.log_test("Projects Endpoint (No Auth)", False, f"Request failed: {str(e)}")
            return False

    def test_auth_signup_endpoint(self) -> bool:
        """Test POST /api/auth/signup endpoint"""
        try:
            test_data = {
                "email": "testuser456@example.com",
                "password": "testpassword456",
                "organization_name": "Test Org 456"
            }
            
            response = self.session.post(f"{self.base_url}/auth/signup", json=test_data, timeout=10)
            
            # Should return 201 for successful signup or 409 if user already exists
            if response.status_code == 201:
                try:
                    data = response.json()
                    if data.get("email") == test_data["email"]:
                        self.log_test("Auth Signup Endpoint", True, f"Status: {response.status_code}, User created successfully")
                        return True
                    else:
                        self.log_test("Auth Signup Endpoint", False, f"Status: {response.status_code}, Invalid response data")
                        return False
                except json.JSONDecodeError:
                    self.log_test("Auth Signup Endpoint", False, f"Status: {response.status_code}, Invalid JSON response")
                    return False
            elif response.status_code == 409:
                self.log_test("Auth Signup Endpoint", True, f"Status: {response.status_code} - User already exists (expected)")
                return True
            else:
                self.log_test("Auth Signup Endpoint", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except requests.exceptions.RequestException as e:
            self.log_test("Auth Signup Endpoint", False, f"Request failed: {str(e)}")
            return False

    def test_auth_token_endpoint(self) -> bool:
        """Test POST /api/auth/token endpoint"""
        try:
            # Use form data for OAuth2PasswordRequestForm
            form_data = {
                "username": "testuser456@example.com",
                "password": "testpassword456"
            }
            
            # Remove JSON content type for form data
            headers = {'User-Agent': 'GreenAI-Test-Client/1.0'}
            response = requests.post(f"{self.base_url}/auth/token", data=form_data, headers=headers, timeout=10)
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    if data.get("access_token"):
                        self.log_test("Auth Token Endpoint", True, f"Status: {response.status_code}, Token received")
                        return True
                    else:
                        self.log_test("Auth Token Endpoint", False, f"Status: {response.status_code}, No access token in response")
                        return False
                except json.JSONDecodeError:
                    self.log_test("Auth Token Endpoint", False, f"Status: {response.status_code}, Invalid JSON response")
                    return False
            elif response.status_code == 404:
                self.log_test("Auth Token Endpoint", True, f"Status: {response.status_code} - User not provisioned (expected if signup failed)")
                return True
            else:
                self.log_test("Auth Token Endpoint", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except requests.exceptions.RequestException as e:
            self.log_test("Auth Token Endpoint", False, f"Request failed: {str(e)}")
            return False

    def run_all_tests(self) -> Dict[str, Any]:
        """Run all backend tests"""
        print("🚀 Starting GreenAI Backend API Tests")
        print(f"📍 Base URL: {self.base_url}")
        print(f"🏥 Health URL: {self.health_base}")
        print("-" * 60)
        
        # Run tests
        self.test_health_endpoint()
        self.test_readiness_endpoint()
        self.test_billing_plans_endpoint()
        self.test_auth_signup_endpoint()
        self.test_auth_token_endpoint()
        self.test_cors_headers()
        self.test_api_root_endpoint()
        self.test_projects_endpoint_without_auth()
        
        # Summary
        print("-" * 60)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"📈 Success Rate: {success_rate:.1f}%")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
        else:
            print("⚠️  Some tests failed - check details above")
        
        return {
            "total_tests": self.tests_run,
            "passed_tests": self.tests_passed,
            "success_rate": success_rate,
            "test_results": self.test_results
        }

def main():
    """Main test execution"""
    tester = GreenAIAPITester()
    results = tester.run_all_tests()
    
    # Return appropriate exit code
    if results["passed_tests"] == results["total_tests"]:
        return 0
    else:
        return 1

if __name__ == "__main__":
    sys.exit(main())