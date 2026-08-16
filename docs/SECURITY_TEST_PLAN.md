# Security Test Plan

This document outlines the comprehensive security testing plan for the Gate Monitoring System, including test cases, methodologies, and expected results for each security control.

## TEST METHODOLOGY

### Test Types
1. **Authentication Testing**: Verify authentication mechanisms
2. **Authorization Testing**: Verify role-based and resource-based access control
3. **Input Validation Testing**: Verify input sanitization and validation
4. **Session Security Testing**: Verify session management and security
5. **Data Security Testing**: Verify data protection and field-level security
6. **IDOR Testing**: Verify protection against Insecure Direct Object Reference vulnerabilities
7. **Business Logic Testing**: Verify business rule enforcement
8. **Security Control Testing**: Verify security controls (rate limiting, audit logging, etc.)

### Test Environment
- **Environment**: Staging environment matching production configuration
- **Tools**: Postman, Burp Suite, OWASP ZAP, custom test scripts
- **Accounts**: Test accounts for each role (SYSTEM_ADMIN, ADMIN, SUPERVISOR, OPERATOR, STUDENT, PARENT, WARDEN)
- **Data**: Realistic test data with proper relationships

### Test Principles
1. **Zero Trust**: Every test assumes the attacker has some level of access
2. **Defense in Depth**: Test multiple layers of security controls
3. **Fail Secure**: Verify that failures result in secure defaults
4. **Least Privilege**: Verify that users cannot exceed their authorized access
5. **Data Minimization**: Verify that only necessary data is exposed

## AUTHENTICATION TESTING

### Test Cases

#### 1. Unauthenticated Access Tests
| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| UNAUTH-01 | Access protected endpoint without authentication | 401 Unauthorized |
| UNAUTH-02 | Access gate scan endpoint without authentication | 401 Unauthorized |
| UNAUTH-03 | Access student data endpoint without authentication | 401 Unauthorized |
| UNAUTH-04 | Access admin dashboard without authentication | 401 Unauthorized |
| UNAUTH-05 | Access supervisor corrections without authentication | 401 Unauthorized |

#### 2. Invalid Token Tests
| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| INVALID-01 | Access endpoint with expired token | 401 Unauthorized |
| INVALID-02 | Access endpoint with malformed token | 401 Unauthorized |
| INVALID-03 | Access endpoint with invalid signature token | 401 Unauthorized |
| INVALID-04 | Access endpoint with token for non-existent user | 401 Unauthorized |
| INVALID-05 | Access endpoint with token from different environment | 401 Unauthorized |

#### 3. Account Status Tests
| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| STATUS-01 | Access endpoint with suspended account | 403 Forbidden |
| STATUS-02 | Access endpoint with disabled account | 403 Forbidden |
| STATUS-03 | Access endpoint with locked account | 403 Forbidden |
| STATUS-04 | Login with suspended account | 403 Forbidden |
| STATUS-05 | Login with disabled account | 403 Forbidden |

#### 4. Credential Security Tests
| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| CRED-01 | Login with correct credentials | 200 OK, valid token |
| CRED-02 | Login with incorrect password | 401 Unauthorized |
| CRED-03 | Login with incorrect PIN | 401 Unauthorized |
| CRED-04 | Brute force password attempts | Rate limited after 5 attempts |
| CRED-05 | Brute force PIN attempts | Rate limited after 5 attempts |
| CRED-06 | Login with SQL injection in username | 400 Bad Request |
| CRED-07 | Login with XSS payload in username | 400 Bad Request |

#### 5. Session Management Tests
| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| SESS-01 | Multiple concurrent sessions | All sessions valid |
| SESS-02 | Session invalidation on logout | Session invalidated |
| SESS-03 | Session invalidation on password change | Session invalidated |
| SESS-04 | Session invalidation on account suspension | Session invalidated |
| SESS-05 | Session timeout after 7 days | Session expired |
| SESS-06 | Session hijacking attempt | Session validation fails |

## AUTHORIZATION TESTING

### Test Cases

#### 1. Role-Based Access Control Tests
| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| RBAC-01 | Operator accesses admin endpoint | 403 Forbidden |
| RBAC-02 | Supervisor accesses system admin endpoint | 403 Forbidden |
| RBAC-03 | Student accesses operator endpoint | 403 Forbidden |
| RBAC-04 | Parent accesses admin endpoint | 403 Forbidden |
| RBAC-05 | Warden accesses system admin endpoint | 403 Forbidden |
| RBAC-06 | Admin accesses system admin endpoint (role change) | 403 Forbidden |
| RBAC-07 | Operator accesses supervisor endpoint | 403 Forbidden |

#### 2. Gate Scan Authorization Tests
| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| GATE-01 | Operator scans at assigned gate | 200 OK |
| GATE-02 | Operator scans at unassigned gate | 403 Forbidden |
| GATE-03 | Operator scans with client-supplied operatorId | 400 Bad Request |
| GATE-04 | Operator scans with client-supplied gateId | 400 Bad Request |
| GATE-05 | Operator scans with invalid direction | 400 Bad Request |
| GATE-06 | Operator scans with invalid reason | 400 Bad Request |
| GATE-07 | Operator scans non-existent student | 404 Not Found |

#### 3. Student Data Access Tests
| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| STUD-01 | Student accesses own data | 200 OK |
| STUD-02 | Student accesses another student's data | 403 Forbidden |
| STUD-03 | Parent accesses own child's data | 200 OK |
| STUD-04 | Parent accesses non-child student's data | 403 Forbidden |
| STUD-05 | Operator accesses student in scan context | 200 OK (limited fields) |
| STUD-06 | Operator accesses student outside scan context | 403 Forbidden |
| STUD-07 | Admin accesses any student data | 200 OK (full fields) |
| STUD-08 | Warden accesses student in own department | 200 OK (limited fields) |
| STUD-09 | Warden accesses student in other department | 403 Forbidden |

#### 4. Field-Level Security Tests
| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| FIELD-01 | Operator requests student data | Only non-sensitive fields returned |
| FIELD-02 | Parent requests child data | Only parent-authorized fields returned |
| FIELD-03 | Student requests own data | Only student-authorized fields returned |
| FIELD-04 | Admin requests student data | All non-sensitive fields returned |
| FIELD-05 | System admin requests student data | All fields returned |
| FIELD-06 | Sensitive fields not returned to unauthorized roles | Sensitive fields omitted |

#### 5. Gate Pass Authorization Tests
| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| PASS-01 | Student creates pass for self | 200 OK |
| PASS-02 | Student creates pass for another student | 403 Forbidden |
| PASS-03 | Parent approves pass for own child | 200 OK |
| PASS-04 | Parent approves pass for non-child | 403 Forbidden |
| PASS-05 | Warden approves pass for own department | 200 OK |
| PASS-06 | Warden approves pass for other department | 403 Forbidden |
| PASS-07 | Admin approves any pass | 200 OK |
| PASS-08 | Operator views pass | 403 Forbidden |

#### 6. User Management Authorization Tests
| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| USER-01 | Admin creates user | 200 OK |
| USER-02 | Admin changes user role | 403 Forbidden (only SYSTEM_ADMIN) |
| USER-03 | Admin suspends user | 200 OK |
| USER-04 | Admin deletes user | 403 Forbidden (only SYSTEM_ADMIN) |
| USER-05 | Supervisor creates user | 403 Forbidden |
| USER-06 | Operator views own profile | 200 OK |
| USER-07 | Operator views another user's profile | 403 Forbidden |
| USER-08 | Supervisor views supervised operator profile | 200 OK |

## INPUT VALIDATION TESTING

### Test Cases

#### 1. Roll Number Validation Tests
| Test Case | Input | Expected Result |
|-----------|-------|-----------------|
| ROLL-01 | "24JJ1A0308" | 200 OK |
| ROLL-02 | "24JJ1A308" | 400 Bad Request |
| ROLL-03 | "24JJ1A0308'" | 400 Bad Request |
| ROLL-04 | "24JJ1A0308; DROP TABLE students" | 400 Bad Request |
| ROLL-05 | "24JJ1A0308<script>alert(1)</script>" | 400 Bad Request |
| ROLL-06 | "" | 400 Bad Request |
| ROLL-07 | null | 400 Bad Request |

#### 2. Gate Scan Validation Tests
| Test Case | Input | Expected Result |
|-----------|-------|-----------------|
| SCAN-01 | Valid roll, "IN", no reason | 200 OK |
| SCAN-02 | Valid roll, "OUT", valid reason | 200 OK |
| SCAN-03 | Valid roll, "OUT", no reason | 400 Bad Request |
| SCAN-04 | Valid roll, "INVALID", valid reason | 400 Bad Request |
| SCAN-05 | Valid roll, "IN", "INVALID_REASON" | 400 Bad Request |
| SCAN-06 | Valid roll, "IN", SQL injection reason | 400 Bad Request |
| SCAN-07 | Valid roll, "IN", XSS reason | 400 Bad Request |

#### 3. SQL Injection Tests
| Test Case | Description | Input | Expected Result |
|-----------|-------------|-------|-----------------|
| SQLI-01 | SQL injection in roll parameter | `' OR '1'='1` | 400 Bad Request |
| SQLI-02 | SQL injection in student search | `' UNION SELECT * FROM users` | 400 Bad Request |
| SQLI-03 | SQL injection in gate ID | `' OR 1=1 --` | 400 Bad Request |
| SQLI-04 | SQL injection in pass ID | `'; DROP TABLE passes --` | 400 Bad Request |
| SQLI-05 | SQL injection in user ID | `admin' --` | 400 Bad Request |
| SQLI-06 | SQL injection in direction | `IN'; UPDATE gate_logs SET direction='OUT' --` | 400 Bad Request |

#### 4. Business Rule Validation Tests
| Test Case | Description | Input | Expected Result |
|-----------|-------------|-------|-----------------|
| BUS-01 | Duplicate scan within 5 minutes | Same roll, same direction | 429 Too Many Requests |
| BUS-02 | Day student attempting overnight pass | "Home Out" for day student | 400 Bad Request |
| BUS-03 | Hostel student with invalid curfew time | Exit after curfew | 400 Bad Request |
| BUS-04 | Invalid pass duration | 72 hour pass for day out | 400 Bad Request |
| BUS-05 | Correction request for old scan | Scan from 2 hours ago | 200 OK |
| BUS-06 | Correction request for very old scan | Scan from 2 days ago | 400 Bad Request |

## SESSION SECURITY TESTING

### Test Cases

| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| SESS-07 | Session fixation attempt | New session ID generated |
| SESS-08 | Session hijacking via token theft | Session validation fails |
| SESS-09 | Concurrent session from different IPs | Both sessions valid, alert generated |
| SESS-10 | Session replay attack | 401 Unauthorized |
| SESS-11 | Session invalidation on role change | Session invalidated |
| SESS-12 | Session invalidation on account status change | Session invalidated |
| SESS-13 | Session timeout enforcement | Session expires after 7 days |
| SESS-14 | Session token brute force | Rate limited |

## IDOR TESTING

### Test Cases

#### 1. Student IDOR Tests
| Test Case | Description | Attack | Expected Result |
|-----------|-------------|--------|-----------------|
| IDOR-01 | Access another student's data | `/api/students/24JJ1A0309` (as student 24JJ1A0308) | 403 Forbidden |
| IDOR-02 | Access another student's history | `/api/students/24JJ1A0309/history` (as student 24JJ1A0308) | 403 Forbidden |
| IDOR-03 | Parent accesses non-child student | `/api/students/24JJ1A0309` (as parent of 24JJ1A0308) | 403 Forbidden |
| IDOR-04 | Operator accesses random student | `/api/students/24JJ1A0309` (as operator) | 403 Forbidden |
| IDOR-05 | Admin accesses any student | `/api/students/24JJ1A0309` (as admin) | 200 OK |

#### 2. Gate IDOR Tests
| Test Case | Description | Attack | Expected Result |
|-----------|-------------|--------|-----------------|
| IDOR-06 | Operator scans at unauthorized gate | `{"gateId": "gate-2"}` (assigned to gate-1) | 403 Forbidden |
| IDOR-07 | Operator views unauthorized gate activity | `/api/gate/logs?gateId=gate-2` (assigned to gate-1) | 403 Forbidden |
| IDOR-08 | Supervisor views unauthorized gate | `/api/supervisor/live-events?gateId=gate-2` (supervises gate-1) | 403 Forbidden |

#### 3. Pass IDOR Tests
| Test Case | Description | Attack | Expected Result |
|-----------|-------------|--------|-----------------|
| IDOR-09 | Student accesses another student's pass | `/api/passes/pass-123` (owns pass-456) | 403 Forbidden |
| IDOR-10 | Parent accesses non-child's pass | `/api/passes/pass-123` (child has pass-456) | 403 Forbidden |
| IDOR-11 | Warden approves pass outside jurisdiction | Approve pass for student in other hostel | 403 Forbidden |

#### 4. User IDOR Tests
| Test Case | Description | Attack | Expected Result |
|-----------|-------------|--------|-----------------|
| IDOR-12 | User accesses another user's profile | `/api/admin/users/user-123` (as user-456) | 403 Forbidden |
| IDOR-13 | Supervisor accesses non-supervised user | `/api/admin/users/user-123` (supervises user-456) | 403 Forbidden |
| IDOR-14 | Admin changes another admin's role | Change role of equal-level admin | 403 Forbidden |

## DATA SECURITY TESTING

### Test Cases

#### 1. Field-Level Security Tests
| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| DATA-01 | Operator requests student data | Only non-sensitive fields returned |
| DATA-02 | Parent requests child data | Parent-appropriate fields returned |
| DATA-03 | Student requests own data | Student-appropriate fields returned |
| DATA-04 | Admin requests student data | All non-sensitive fields returned |
| DATA-05 | System admin requests student data | All fields returned |
| DATA-06 | Sensitive fields not in API response | Sensitive fields omitted from JSON |
| DATA-07 | Database query only requests authorized fields | Query includes only role-appropriate fields |

#### 2. Data Integrity Tests
| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| DATA-08 | Historical scan modification attempt | 403 Forbidden |
| DATA-09 | Audit log modification attempt | 403 Forbidden |
| DATA-10 | Scan correction creates new record | Original record unchanged |
| DATA-11 | Server-generated timestamps | Timestamps match server time |
| DATA-12 | Immutable audit logs | Audit logs append-only |

## SECURITY CONTROL TESTING

### Test Cases

#### 1. Rate Limiting Tests
| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| RATE-01 | 5 login attempts in 1 hour | 200 OK |
| RATE-02 | 6 login attempts in 1 hour | 429 Too Many Requests |
| RATE-03 | 30 gate scans in 1 minute | 200 OK |
| RATE-04 | 31 gate scans in 1 minute | 429 Too Many Requests |
| RATE-05 | 20 student lookups in 1 minute | 200 OK |
| RATE-06 | 21 student lookups in 1 minute | 429 Too Many Requests |

#### 2. Audit Logging Tests
| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| AUDIT-01 | Successful authentication | Audit log entry created |
| AUDIT-02 | Failed authentication | Audit log entry created |
| AUDIT-03 | Gate scan operation | Audit log entry created |
| AUDIT-04 | Student data access | Audit log entry created |
| AUDIT-05 | Pass approval | Audit log entry created |
| AUDIT-06 | User role change | Audit log entry created |
| AUDIT-07 | Account suspension | Audit log entry created |
| AUDIT-08 | Audit log access | Audit log entry created |
| AUDIT-09 | Audit log modification attempt | 403 Forbidden |

#### 3. Security Header Tests
| Test Case | Header | Expected Value |
|-----------|--------|----------------|
| HEAD-01 | Content-Security-Policy | Properly configured |
| HEAD-02 | X-Content-Type-Options | nosniff |
| HEAD-03 | X-Frame-Options | DENY or SAMEORIGIN |
| HEAD-04 | Referrer-Policy | strict-origin-when-cross-origin |
| HEAD-05 | Strict-Transport-Security | max-age=31536000; includeSubDomains |

## BUSINESS LOGIC TESTING

### Test Cases

#### 1. Gate Scan Logic Tests
| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| LOGIC-01 | Student enters campus | Campus count increases by 1 |
| LOGIC-02 | Student exits campus | Campus count decreases by 1 |
| LOGIC-03 | Duplicate scan attempt | 429 Too Many Requests |
| LOGIC-04 | Student exits without entering | Business rule validation error |
| LOGIC-05 | Day student attempts overnight exit | 400 Bad Request |
| LOGIC-06 | Hostel student exits after curfew | 400 Bad Request (or alert) |

#### 2. Gate Pass Logic Tests
| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| LOGIC-07 | Student requests day out pass | Parent notification sent |
| LOGIC-08 | Parent approves pass | Pass status updated |
| LOGIC-09 | Warden approves pass | Pass status updated |
| LOGIC-10 | Both parent and warden approve | Pass fully approved |
| LOGIC-11 | Either parent or warden rejects | Pass rejected |
| LOGIC-12 | Student requests pass beyond allowed duration | 400 Bad Request |

#### 3. Correction Logic Tests
| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| LOGIC-13 | Operator requests correction | Correction request created |
| LOGIC-14 | Supervisor approves correction | New scan record created |
| LOGIC-15 | Correction for old scan | 400 Bad Request |
| LOGIC-16 | Multiple corrections for same scan | Business rule validation |

## PRIVILEGE ESCALATION TESTING

### Test Cases

| Test Case | Description | Attack | Expected Result |
|-----------|-------------|--------|-----------------|
| ESC-01 | Operator → Supervisor | Modify role in JWT | 403 Forbidden |
| ESC-02 | Operator → Admin | Modify role in request body | 403 Forbidden |
| ESC-03 | Supervisor → Admin | Modify role in session | 403 Forbidden |
| ESC-04 | Admin → System Admin | Modify role in database | 403 Forbidden |
| ESC-05 | Student → Operator | Modify role in localStorage | 403 Forbidden |
| ESC-06 | Parent → Student | Modify role in API request | 403 Forbidden |
| ESC-07 | Disabled → Active | Reuse old session | 403 Forbidden |
| ESC-08 | Suspended → Active | Modify account status | 403 Forbidden |
| ESC-09 | Operator self-promotion | Call role change API | 403 Forbidden |
| ESC-10 | Admin self-promotion to System Admin | Call role change API | 403 Forbidden |

## TEST EXECUTION PLAN

### Phase 1: Authentication Testing
1. Execute unauthenticated access tests
2. Execute invalid token tests
3. Execute account status tests
4. Execute credential security tests
5. Execute session management tests

### Phase 2: Authorization Testing
1. Execute role-based access control tests
2. Execute gate scan authorization tests
3. Execute student data access tests
4. Execute field-level security tests
5. Execute gate pass authorization tests
6. Execute user management authorization tests

### Phase 3: Input Validation Testing
1. Execute roll number validation tests
2. Execute gate scan validation tests
3. Execute SQL injection tests
4. Execute business rule validation tests

### Phase 4: Session Security Testing
1. Execute session security tests
2. Execute session invalidation tests

### Phase 5: IDOR Testing
1. Execute student IDOR tests
2. Execute gate IDOR tests
3. Execute pass IDOR tests
4. Execute user IDOR tests

### Phase 6: Data Security Testing
1. Execute field-level security tests
2. Execute data integrity tests

### Phase 7: Security Control Testing
1. Execute rate limiting tests
2. Execute audit logging tests
3. Execute security header tests

### Phase 8: Business Logic Testing
1. Execute gate scan logic tests
2. Execute gate pass logic tests
3. Execute correction logic tests

### Phase 9: Privilege Escalation Testing
1. Execute all privilege escalation tests

## TEST REPORTING

### Test Report Format
```markdown
# Security Test Report - [Date]

## Executive Summary
- Total Tests Executed: [Number]
- Tests Passed: [Number]
- Tests Failed: [Number]
- Critical Vulnerabilities: [Number]
- High Severity Issues: [Number]

## Test Results by Category

### Authentication Testing
| Test Case | Result | Notes |
|-----------|--------|-------|
| UNAUTH-01 | Pass/Fail | Notes |

### Authorization Testing
| Test Case | Result | Notes |
|-----------|--------|-------|
| RBAC-01 | Pass/Fail | Notes |

### Input Validation Testing
| Test Case | Result | Notes |
|-----------|--------|-------|
| ROLL-01 | Pass/Fail | Notes |

## Detailed Findings

### Critical Vulnerabilities
1. [Finding 1]
   - Description:
   - Impact:
   - Reproduction Steps:
   - Recommendation:

### High Severity Issues
1. [Finding 1]
   - Description:
   - Impact:
   - Reproduction Steps:
   - Recommendation:

## Recommendations
1. [Recommendation 1]
2. [Recommendation 2]
3. [Recommendation 3]
```

## TEST DATA REQUIREMENTS

### Test Accounts
| Role | Username | Password | PIN | Notes |
|------|----------|----------|-----|-------|
| SYSTEM_ADMIN | sysadmin | [secure] | 12345678 | Full access |
| ADMIN | admin | [secure] | 12345678 | Admin access |
| SUPERVISOR | supervisor | [secure] | 12345678 | Supervises gate-1 |
| OPERATOR | operator1 | [secure] | 12345678 | Assigned to gate-1 |
| OPERATOR | operator2 | [secure] | 12345678 | Assigned to gate-2 |
| STUDENT | 24JJ1A0308 | [secure] | N/A | Regular student |
| STUDENT | 24JJ1A0309 | [secure] | N/A | Hostel student |
| PARENT | parent1 | [secure] | N/A | Parent of 24JJ1A0308 |
| PARENT | parent2 | [secure] | N/A | Parent of 24JJ1A0309 |
| WARDEN | warden1 | [secure] | 12345678 | Warden for CSE department |

### Test Data
1. **Students**: At least 10 students with various attributes
2. **Gates**: At least 3 gates (gate-1, gate-2, gate-3)
3. **Gate Passes**: At least 5 gate passes in various states
4. **Gate Scans**: At least 20 historical scans
5. **Users**: At least 2 users per role
6. **Parent-Child Relationships**: At least 5 parent-child relationships
7. **Department Assignments**: Students assigned to different departments

## TEST AUTOMATION

### Automated Test Scripts
1. **Authentication Tests**: Automated API calls for authentication scenarios
2. **Authorization Tests**: Automated role-based access control tests
3. **Input Validation Tests**: Automated input fuzzing and validation tests
4. **IDOR Tests**: Automated IDOR testing for all endpoints
5. **Rate Limiting Tests**: Automated rate limit testing

### Test Tools
1. **Postman**: API testing with collections for each test category
2. **Burp Suite**: Security testing and vulnerability scanning
3. **OWASP ZAP**: Automated security scanning
4. **Custom Scripts**: Node.js scripts for automated testing
5. **Jest**: Unit and integration testing

## REGRESSION TESTING

### Regression Test Plan
1. **After Authentication Fixes**: Re-run all authentication tests
2. **After Authorization Fixes**: Re-run all authorization tests
3. **After Input Validation Fixes**: Re-run all input validation tests
4. **After Session Management Fixes**: Re-run all session tests
5. **After Data Security Fixes**: Re-run all data security tests

### Regression Test Frequency
- **Before Major Releases**: Full regression test suite
- **After Security Fixes**: Targeted regression testing
- **Continuous Integration**: Automated regression tests on code changes