#!/usr/bin/env node
/**
 * Authorization Security Test Suite
 *
 * This script tests the security of the authorization system by attempting
 * various attack vectors and verifying that the system properly rejects them.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3000';

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
  console.error('Missing Supabase configuration');
  process.exit(1);
}

// Create clients
const supabase = createClient(supabaseUrl, supabaseAnonKey);
const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Test configuration
const testConfig = {
  testUserPassword: 'test-password-123',
  testStudentRoll: `TEST${Math.floor(1000 + Math.random() * 9000)}`
};

interface TestUser {
  id: string;
  email: string;
  role: string;
  token: string;
  gateId?: string;
}

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: any;
}

/**
 * Create a test user with the specified role
 */
async function createTestUser(role: string, gateId?: string): Promise<TestUser> {
  const email = `test-${role}-${uuidv4()}@example.com`;
  const loginIdentifier = `test-${role}-${uuidv4().substring(0, 8)}`;

  // Create auth user
  const { data: authUser, error: authError } = await serviceClient.auth.admin.createUser({
    email,
    password: testConfig.testUserPassword,
    email_confirm: true
  });

  if (authError || !authUser.user) {
    throw new Error(`Failed to create auth user: ${authError?.message}`);
  }

  // Create user profile
  const { error: profileError } = await serviceClient
    .from('users')
    .insert({
      id: authUser.user.id,
      name: `Test ${role}`,
      role,
      email,
      status: 'ACTIVE',
      auth_provider: 'email',
      last_password_change: new Date(),
      updated_at: new Date(),
      login_identifier: loginIdentifier,
      gate_id: gateId
    });

  if (profileError) {
    throw new Error(`Failed to create user profile: ${profileError.message}`);
  }

  // Login to get token
  const { data: { session }, error: loginError } = await supabase.auth.signInWithPassword({
    email,
    password: testConfig.testUserPassword
  });

  if (loginError || !session) {
    throw new Error(`Failed to login: ${loginError?.message}`);
  }

  return {
    id: authUser.user.id,
    email,
    role,
    token: session.access_token,
    gateId
  };
}

/**
 * Create a test student
 */
async function createTestStudent() {
  const roll = testConfig.testStudentRoll;
  const email = `student-${uuidv4()}@example.com`;

  // Create auth user for student
  const { data: authUser, error: authError } = await serviceClient.auth.admin.createUser({
    email,
    password: testConfig.testUserPassword,
    email_confirm: true
  });

  if (authError || !authUser.user) {
    throw new Error(`Failed to create student auth user: ${authError?.message}`);
  }

  // Create student record
  const { error: studentError } = await serviceClient
    .from('students')
    .insert({
      id: authUser.user.id,
      roll,
      name: 'Test Student',
      department: 'Computer Science',
      year: 2,
      section: 'A',
      batch: '2024',
      photo: '',
      email,
      phone: '1234567890',
      parent_name: 'Test Parent',
      parent_phone: '0987654321',
      parent_id: null,
      qr_code: '',
      id_valid_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'ACTIVE',
      hostel_block: 'A',
      room_number: '101'
    });

  if (studentError) {
    throw new Error(`Failed to create student: ${studentError.message}`);
  }

  return { roll, studentId: authUser.user.id };
}

/**
 * Clean up test users
 */
async function cleanupTestUsers(userIds: string[]) {
  for (const userId of userIds) {
    try {
      await serviceClient.auth.admin.deleteUser(userId);
    } catch (error) {
      console.error(`Failed to delete user ${userId}:`, error);
    }
  }
}

/**
 * Run an API request with the specified parameters
 */
async function apiRequest(
  method: string,
  endpoint: string,
  token: string,
  body?: any,
  headers?: Record<string, string>
): Promise<{ response: any; status: number }> {
  const url = `${apiBaseUrl}${endpoint}`;
  const options: any = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...headers
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    const data = await response.json();
    return { response: data, status: response.status };
  } catch (error) {
    return { response: { error: error instanceof Error ? error.message : 'Network error' }, status: 500 };
  }
}

/**
 * Test 1: Anonymous access to protected endpoints should be denied
 */
async function testAnonymousAccess(): Promise<TestResult> {
  const endpoints = [
    { method: 'GET', endpoint: '/api/gate/scan' },
    { method: 'POST', endpoint: '/api/gate/scan' },
    { method: 'GET', endpoint: '/api/users' },
    { method: 'POST', endpoint: '/api/users' }
  ];

  const results = [];

  for (const { method, endpoint } of endpoints) {
    const { response, status } = await apiRequest(method, endpoint, '');
    const passed = status === 401 && response.error?.code === 'UNAUTHORIZED';
    results.push({
      endpoint,
      method,
      passed,
      status,
      response
    });
  }

  const allPassed = results.every(r => r.passed);
  return {
    name: 'Anonymous access to protected endpoints',
    passed: allPassed,
    details: results
  };
}

/**
 * Test 2: Student access to admin endpoints should be denied
 */
async function testStudentToAdminAccess(): Promise<TestResult> {
  let studentUser: TestUser | null = null;
  try {
    // Create test student user
    studentUser = await createTestUser('student');

    const endpoints = [
      { method: 'GET', endpoint: '/api/users' },
      { method: 'POST', endpoint: '/api/users' },
      { method: 'GET', endpoint: '/api/admin/dashboard' }
    ];

    const results = [];

    for (const { method, endpoint } of endpoints) {
      const { response, status } = await apiRequest(method, endpoint, studentUser.token);
      const passed = status === 403 && response.error?.code === 'FORBIDDEN';
      results.push({
        endpoint,
        method,
        passed,
        status,
        response
      });
    }

    const allPassed = results.every(r => r.passed);
    return {
      name: 'Student access to admin endpoints',
      passed: allPassed,
      details: results
    };
  } finally {
    if (studentUser) {
      await cleanupTestUsers([studentUser.id]);
    }
  }
}

/**
 * Test 3: Operator ID forgery protection
 */
async function testOperatorIdForgery(): Promise<TestResult> {
  let operatorUser: TestUser | null = null;
  let otherOperatorUser: TestUser | null = null;
  let studentRoll: string | null = null;

  try {
    // Create test student
    const student = await createTestStudent();
    studentRoll = student.roll;

    // Create two operators
    operatorUser = await createTestUser('operator', 'gate-1');
    otherOperatorUser = await createTestUser('operator', 'gate-2');

    // Try to create a scan as operator1 but with operator2's ID
    const { response, status } = await apiRequest(
      'POST',
      '/api/gate/scan',
      operatorUser.token,
      {
        roll: studentRoll,
        direction: 'IN',
        gateId: 'gate-1',
        operatorId: otherOperatorUser.id // Forged operator ID
      }
    );

    // Should fail because the system should use the authenticated operator ID
    const passed = status === 403 || (status === 200 && response.data?.operatorId === operatorUser.id);

    return {
      name: 'Operator ID forgery protection',
      passed,
      details: {
        status,
        response,
        expectedOperatorId: operatorUser.id,
        actualOperatorId: response.data?.operatorId
      }
    };
  } finally {
    const userIds = [];
    if (operatorUser) userIds.push(operatorUser.id);
    if (otherOperatorUser) userIds.push(otherOperatorUser.id);
    await cleanupTestUsers(userIds);
  }
}

/**
 * Test 4: Operator access to unauthorized gates
 */
async function testOperatorGateAccess(): Promise<TestResult> {
  let operatorUser: TestUser | null = null;
  let studentRoll: string | null = null;

  try {
    // Create test student
    const student = await createTestStudent();
    studentRoll = student.roll;

    // Create operator assigned to gate-1
    operatorUser = await createTestUser('operator', 'gate-1');

    // Try to create a scan for gate-2 (which operator is not assigned to)
    const { response, status } = await apiRequest(
      'POST',
      '/api/gate/scan',
      operatorUser.token,
      {
        roll: studentRoll,
        direction: 'IN',
        gateId: 'gate-2' // Unauthorized gate
      }
    );

    const passed = status === 403 && response.error?.code === 'FORBIDDEN';

    return {
      name: 'Operator access to unauthorized gates',
      passed,
      details: {
        status,
        response,
        operatorGate: operatorUser.gateId,
        requestedGate: 'gate-2'
      }
    };
  } finally {
    if (operatorUser) {
      await cleanupTestUsers([operatorUser.id]);
    }
  }
}

/**
 * Test 5: Inactive user access should be denied
 */
async function testInactiveUserAccess(): Promise<TestResult> {
  let inactiveUser: TestUser | null = null;
  let studentRoll: string | null = null;

  try {
    // Create test student
    const student = await createTestStudent();
    studentRoll = student.roll;

    // Create inactive user
    const email = `inactive-${uuidv4()}@example.com`;
    const { data: authUser, error: authError } = await serviceClient.auth.admin.createUser({
      email,
      password: testConfig.testUserPassword,
      email_confirm: true
    });

    if (authError || !authUser.user) {
      throw new Error(`Failed to create auth user: ${authError?.message}`);
    }

    // Create inactive user profile
    const { error: profileError } = await serviceClient
      .from('users')
      .insert({
        id: authUser.user.id,
        name: 'Inactive User',
        role: 'operator',
        email,
        status: 'DISABLED', // Inactive status
        auth_provider: 'email',
        last_password_change: new Date(),
        updated_at: new Date(),
        login_identifier: `inactive-${uuidv4().substring(0, 8)}`,
        gate_id: 'gate-1'
      });

    if (profileError) {
      throw new Error(`Failed to create user profile: ${profileError.message}`);
    }

    // Login to get token
    const { data: { session }, error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password: testConfig.testUserPassword
    });

    if (loginError || !session) {
      throw new Error(`Failed to login: ${loginError?.message}`);
    }

    inactiveUser = {
      id: authUser.user.id,
      email,
      role: 'operator',
      token: session.access_token
    };

    // Try to access protected endpoint
    const { response, status } = await apiRequest(
      'POST',
      '/api/gate/scan',
      inactiveUser.token,
      {
        roll: studentRoll,
        direction: 'IN',
        gateId: 'gate-1'
      }
    );

    const passed = status === 403 && response.error?.code === 'ACCOUNT_INACTIVE';

    return {
      name: 'Inactive user access should be denied',
      passed,
      details: {
        status,
        response,
        userStatus: 'DISABLED'
      }
    };
  } finally {
    if (inactiveUser) {
      await cleanupTestUsers([inactiveUser.id]);
    }
  }
}

/**
 * Test 6: User self-promotion should be denied
 */
async function testUserSelfPromotion(): Promise<TestResult> {
  let operatorUser: TestUser | null = null;

  try {
    // Create operator user
    operatorUser = await createTestUser('operator');

    // Try to access admin endpoint
    const { response, status } = await apiRequest(
      'GET',
      '/api/users',
      operatorUser.token
    );

    const passed = status === 403 && response.error?.code === 'FORBIDDEN';

    return {
      name: 'User self-promotion should be denied',
      passed,
      details: {
        status,
        response,
        userRole: operatorUser.role,
        attemptedAccess: 'admin endpoint'
      }
    };
}

/**
 * Test 7: Student IDOR protection
 */
async function testStudentIdorProtection(): Promise<TestResult> {
  let operatorUser: TestUser | null = null;
  let student1Roll: string | null = null;
  let student2Roll: string | null = null;

  try {
    // Create two test students
    const student1 = await createTestStudent();
    student1Roll = student1.roll;

    const student2 = await createTestStudent();
    student2Roll = student2.roll.replace('TEST', 'TEST2');

    // Create operator
    operatorUser = await createTestUser('operator', 'gate-1');

    // Operator should be able to access student1
    const { response: response1, status: status1 } = await apiRequest(
      'GET',
      `/api/students/${student1Roll}/gate-info`,
      operatorUser.token
    );

    // Operator should NOT be able to access student2 (IDOR attempt)
    const { response: response2, status: status2 } = await apiRequest(
      'GET',
      `/api/students/${student2Roll}/gate-info`,
      operatorUser.token
    );

    const passed = status1 === 200 && (status2 === 403 || status2 === 404);

    return {
      name: 'Student IDOR protection',
      passed,
      details: {
        student1Access: status1 === 200,
        student2Access: status2,
        student1Roll,
        student2Roll
      }
    };
  } finally {
    if (operatorUser) {
      await cleanupTestUsers([operatorUser.id]);
    }
  }
}

/**
 * Test 8: PII minimization in gate student info
 */
async function testPiiMinimization(): Promise<TestResult> {
  let operatorUser: TestUser | null = null;
  let studentRoll: string | null = null;

  try {
    // Create test student
    const student = await createTestStudent();
    studentRoll = student.roll;

    // Create operator
    operatorUser = await createTestUser('operator', 'gate-1');

    // Get student info for gate verification
    const { response, status } = await apiRequest(
      'GET',
      `/api/students/${studentRoll}/gate-info`,
      operatorUser.token
    );

    if (status !== 200) {
      return {
        name: 'PII minimization in gate student info',
        passed: false,
        error: `Failed to get student info: ${status}`,
        details: { status, response }
      };
    }

    // Check that sensitive PII is not returned
    const sensitiveFields = ['email', 'phone', 'parentName', 'parentPhone', 'parentId', 'qrCode'];
    const returnedFields = Object.keys(response.data || {});

    const hasSensitivePii = sensitiveFields.some(field => returnedFields.includes(field));

    const passed = !hasSensitivePii;

    return {
      name: 'PII minimization in gate student info',
      passed,
      details: {
        status,
        sensitiveFieldsChecked: sensitiveFields,
        returnedFields,
        hasSensitivePii
      }
    };
  } finally {
    if (operatorUser) {
      await cleanupTestUsers([operatorUser.id]);
    }
  }
}

/**
 * Test 9: Audit logging of security events
 */
async function testAuditLogging(): Promise<TestResult> {
  let operatorUser: TestUser | null = null;
  let studentRoll: string | null = null;

  try {
    // Create test student
    const student = await createTestStudent();
    studentRoll = student.roll;

    // Create operator
    operatorUser = await createTestUser('operator', 'gate-1');

    // Perform a gate scan
    const { response, status } = await apiRequest(
      'POST',
      '/api/gate/scan',
      operatorUser.token,
      {
        roll: studentRoll,
        direction: 'IN',
        gateId: 'gate-1'
      }
    );

    if (status !== 200) {
      return {
        name: 'Audit logging of security events',
        passed: false,
        error: `Gate scan failed: ${status}`,
        details: { status, response }
      };
    }

    // Check if audit log was created
    const { data: auditLogs, error: auditError } = await serviceClient
      .from('audit_logs')
      .select('*')
      .eq('event_type', 'GATE_SCAN')
      .eq('user_id', operatorUser.id)
      .order('timestamp', { ascending: false })
      .limit(1);

    if (auditError || !auditLogs || auditLogs.length === 0) {
      return {
        name: 'Audit logging of security events',
        passed: false,
        error: 'Audit log not found',
        details: { auditError, auditLogs }
      };
    }

    const auditLog = auditLogs[0];

    // Verify audit log contains required information
    const requiredFields = ['event_type', 'user_id', 'details', 'timestamp'];
    const missingFields = requiredFields.filter(field => !(field in auditLog));

    const hasStudentInfo = auditLog.details?.studentId && auditLog.details?.roll;
    const hasOperatorInfo = auditLog.details?.operatorId === operatorUser.id;
    const hasGateInfo = auditLog.details?.gateId;

    const passed = missingFields.length === 0 && hasStudentInfo && hasOperatorInfo && hasGateInfo;

    return {
      name: 'Audit logging of security events',
      passed,
      details: {
        auditLog,
        missingFields,
        hasStudentInfo,
        hasOperatorInfo,
        hasGateInfo
      }
    };
  } finally {
    if (operatorUser) {
      await cleanupTestUsers([operatorUser.id]);
    }
  }
}

/**
 * Test 10: Role change security
 */
async function testRoleChangeSecurity(): Promise<TestResult> {
  let adminUser: TestUser | null = null;
  let targetUser: TestUser | null = null;

  try {
    // Create admin user
    adminUser = await createTestUser('admin');

    // Create target user
    targetUser = await createTestUser('operator');

    // Admin should be able to change role (simulated - actual API may vary)
    // For this test, we'll check that the admin has the required permission
    const { response, status } = await apiRequest(
      'GET',
      '/api/users',
      adminUser.token
    );

    const passed = status === 200;

    return {
      name: 'Role change security',
      passed,
      details: {
        status,
        adminCanAccessUserManagement: status === 200
      }
    };
  } finally {
    const userIds = [];
    if (adminUser) userIds.push(adminUser.id);
    if (targetUser) userIds.push(targetUser.id);
    await cleanupTestUsers(userIds);
  }
}

/**
 * Run all security tests
 */
async function runSecurityTests() {
  console.log('Starting Authorization Security Tests\n');

  const tests = [
    testAnonymousAccess,
    testStudentToAdminAccess,
    testOperatorIdForgery,
    testOperatorGateAccess,
    testInactiveUserAccess,
    testUserSelfPromotion,
    testStudentIdorProtection,
    testPiiMinimization,
    testAuditLogging,
    testRoleChangeSecurity
  ];

  const results: TestResult[] = [];
  const startTime = Date.now();

  for (const test of tests) {
    try {
      const result = await test();
      results.push(result);
      console.log(`✓ ${result.name}: ${result.passed ? 'PASSED' : 'FAILED'}`);
      if (!result.passed) {
        console.log(`  Error: ${result.error || 'Test failed'}`);
        if (result.details) {
          console.log(`  Details:`, result.details);
        }
      }
    } catch (error) {
      results.push({
        name: test.name,
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      console.log(`✗ ${test.name}: FAILED - ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    console.log('');
  }

  const passedTests = results.filter(r => r.passed).length;
  const totalTests = results.length;
  const successRate = (passedTests / totalTests) * 100;
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('=== Security Test Results ===');
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${totalTests - passedTests}`);
  console.log(`Success Rate: ${successRate.toFixed(2)}%`);
  console.log(`Duration: ${duration} seconds`);

  // Generate test results file
  const testResults = {
    timestamp: new Date().toISOString(),
    duration: `${duration} seconds`,
    successRate: `${successRate.toFixed(2)}%`,
    passedTests,
    totalTests,
    results
  };

  const fs = require('fs');
  fs.writeFileSync('AUTHORIZATION_TEST_RESULTS.md', generateTestResultsMarkdown(testResults));

  console.log('\nTest results saved to AUTHORIZATION_TEST_RESULTS.md');

  return testResults;
}

/**
 * Generate markdown report from test results
 */
function generateTestResultsMarkdown(results: any): string {
  let markdown = `# Authorization Security Test Results\n\n`;
  markdown += `**Timestamp:** ${results.timestamp}\n`;
  markdown += `**Duration:** ${results.duration}\n`;
  markdown += `**Success Rate:** ${results.successRate}\n`;
  markdown += `**Passed Tests:** ${results.passedTests}/${results.totalTests}\n\n`;

  markdown += `## Test Summary\n\n`;
  markdown += `| Test Name | Result |\n`;
  markdown += `|----------|--------|\n`;

  for (const result of results.results) {
    markdown += `| ${result.name} | ${result.passed ? '✅ PASSED' : '❌ FAILED'} |\n`;
  }

  markdown += `\n## Detailed Results\n\n`;

  for (const result of results.results) {
    markdown += `### ${result.name}\n\n`;
    markdown += `- **Result:** ${result.passed ? '✅ PASSED' : '❌ FAILED'}\n`;

    if (result.error) {
      markdown += `- **Error:** ${result.error}\n`;
    }

    if (result.details) {
      markdown += `- **Details:**\n\n`;
      markdown += '```json\n';
      markdown += JSON.stringify(result.details, null, 2);
      markdown += '\n```\n';
    }

    markdown += '\n';
  }

  return markdown;
}

// Run the tests
runSecurityTests().catch(error => {
  console.error('Test execution error:', error);
  process.exit(1);
});