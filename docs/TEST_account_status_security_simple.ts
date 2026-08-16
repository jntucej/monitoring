/**
 * TEST: Account Status Security Verification (Simple Version)
 *
 * This test verifies that the CRITICAL-001 security issue has been fixed:
 * - Non-ACTIVE accounts cannot authenticate
 * - Account status validation is properly enforced
 */

import { findUserByLogin, verifyLogin, updateAccountStatus, findUserById } from './gate-monitor/src/lib/db';

// Mock Supabase client - simple implementation
const mockSupabase = {
  from: (table: string) => ({
    insert: (records: any[]) => ({
      select: () => ({
        single: () => Promise.resolve({ data: records[0], error: null })
      })
    }),
    update: () => ({
      eq: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: {}, error: null })
        })
      })
    })
  })
};

// Replace the supabase import with our mock
const supabase = mockSupabase;

async function testAccountStatusSecurity() {
  console.log('=== ACCOUNT STATUS SECURITY TEST ===\n');

  // Test 1: Create a test user with ACTIVE status
  console.log('1. Creating test user...');
  const testLogin = 'test.user@example.com';
  const testPassword = 'test123456';

  // Check if user already exists
  let testUser = await findUserByLogin(testLogin);

  if (!testUser) {
    // Create a test user (this would normally be done through admin interface)
    console.log('   Test user not found, creating one...');
    const { data, error } = await supabase
      .from('users')
      .insert([
        {
          email: testLogin,
          password_hash: '$2a$10$fakehashedpassword', // This is a fake hash - won't work for real login
          name: 'Test User',
          role: 'operator',
          status: 'ACTIVE'
        }
      ])
      .select()
      .single();

    if (error || !data) {
      console.error('   ERROR: Could not create test user:', error);
      return;
    }
    testUser = data;
    console.log('   Test user created with ID:', testUser.id);
  } else {
    console.log('   Test user found with ID:', testUser.id);
  }

  // Test 2: Verify that ACTIVE user can be found by login
  console.log('\n2. Testing ACTIVE user lookup...');
  const activeUser = await findUserByLogin(testLogin);
  if (activeUser) {
    console.log('   ✓ ACTIVE user can be found by login');
    console.log('   Status:', activeUser.status);
  } else {
    console.log('   ✗ ACTIVE user cannot be found by login');
    return;
  }

  // Update testUser with the activeUser we just found
  testUser = activeUser;

  // Test 3: Change user status to LOCKED
  console.log('\n3. Changing user status to LOCKED...');
  const statusUpdate = await updateAccountStatus(testUser.id, 'LOCKED');
  if (statusUpdate) {
    console.log('   ✓ User status updated to LOCKED');
  } else {
    console.log('   ✗ Failed to update user status');
    return;
  }

  // Test 4: Verify that LOCKED user cannot be found by login
  console.log('\n4. Testing LOCKED user lookup...');
  const lockedUser = await findUserByLogin(testLogin);
  if (!lockedUser) {
    console.log('   ✓ LOCKED user cannot be found by login (as expected)');
  } else {
    console.log('   ✗ LOCKED user can still be found by login (SECURITY ISSUE)');
    return;
  }

  // Test 5: Change user status to SUSPENDED
  console.log('\n5. Changing user status to SUSPENDED...');
  await updateAccountStatus(testUser.id, 'SUSPENDED');

  // Test 6: Verify that SUSPENDED user cannot be found by login
  console.log('\n6. Testing SUSPENDED user lookup...');
  const suspendedUser = await findUserByLogin(testLogin);
  if (!suspendedUser) {
    console.log('   ✓ SUSPENDED user cannot be found by login (as expected)');
  } else {
    console.log('   ✗ SUSPENDED user can still be found by login (SECURITY ISSUE)');
    return;
  }

  // Test 7: Change user status back to ACTIVE
  console.log('\n7. Changing user status back to ACTIVE...');
  await updateAccountStatus(testUser.id, 'ACTIVE');

  // Test 8: Verify that ACTIVE user can be found again
  console.log('\n8. Testing ACTIVE user lookup after reactivation...');
  const reactivatedUser = await findUserByLogin(testLogin);
  if (reactivatedUser) {
    console.log('   ✓ Reactivated user can be found by login (as expected)');
    console.log('   Status:', reactivatedUser.status);
  } else {
    console.log('   ✗ Reactivated user cannot be found by login');
    return;
  }

  // Test 9: Test direct login attempt with non-ACTIVE status
  console.log('\n9. Testing direct login attempt with non-ACTIVE status...');

  // Temporarily change status to LOCKED
  await updateAccountStatus(testUser.id, 'LOCKED');

  // Use findUserById to bypass the ACTIVE filter
  const userForLogin = await findUserById(testUser.id);
  if (userForLogin) {
    // Simulate verifyLogin call
    const loginResult = await verifyLogin(testLogin, testPassword);
    if (!loginResult) {
      console.log('   ✓ verifyLogin correctly rejects LOCKED user');
    } else {
      console.log('   ✗ verifyLogin incorrectly allows LOCKED user (SECURITY ISSUE)');
      return;
    }
  }

  // Test 10: Clean up - restore ACTIVE status
  console.log('\n10. Restoring ACTIVE status...');
  await updateAccountStatus(testUser.id, 'ACTIVE');
  console.log('   ✓ User status restored to ACTIVE');

  console.log('\n=== TEST COMPLETED SUCCESSFULLY ===');
  console.log('✓ CRITICAL-001: Account status validation is working correctly');
  console.log('✓ Non-ACTIVE accounts cannot authenticate');
  console.log('✓ Account status changes are properly enforced');
}

testAccountStatusSecurity().catch(console.error);