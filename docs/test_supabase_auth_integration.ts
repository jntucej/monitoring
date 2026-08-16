#!/usr/bin/env node
/**
 * Test script for Supabase Auth Integration
 * This script tests the database migration and basic authentication flow
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
  console.error('Missing Supabase configuration');
  process.exit(1);
}

// Create clients
const supabase = createClient(supabaseUrl, supabaseAnonKey);
const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function testDatabaseMigration() {
  console.log('=== Testing Database Migration ===');

  try {
    // Test 1: Check if users table has the correct structure
    const { data: tableInfo, error: tableError } = await serviceClient
      .from('information_schema.columns')
      .select('column_name, is_nullable, data_type')
      .eq('table_name', 'users')
      .order('ordinal_position');

    if (tableError) {
      console.error('Error fetching table info:', tableError);
      return false;
    }

    console.log('Users table columns:');
    const columns = tableInfo.map(col => ({
      name: col.column_name,
      nullable: col.is_nullable === 'YES',
      type: col.data_type
    }));

    console.table(columns);

    // Check for required columns
    const requiredColumns = [
      'id', 'email', 'auth_provider', 'last_password_change',
      'updated_at', 'login_identifier', 'initial_pin_hash'
    ];

    const missingColumns = requiredColumns.filter(col =>
      !tableInfo.some(c => c.column_name === col)
    );

    if (missingColumns.length > 0) {
      console.error('Missing required columns:', missingColumns);
      return false;
    }

    // Check for removed columns
    const removedColumns = ['password_hash', 'pin_hash'];
    const foundRemovedColumns = removedColumns.filter(col =>
      tableInfo.some(c => c.column_name === col)
    );

    if (foundRemovedColumns.length > 0) {
      console.error('Found removed columns that should not exist:', foundRemovedColumns);
      return false;
    }

    // Test 2: Check foreign key constraint
    const { data: fkInfo, error: fkError } = await serviceClient
      .from('information_schema.table_constraints')
      .select('*')
      .eq('table_name', 'users')
      .eq('constraint_type', 'FOREIGN KEY');

    if (fkError) {
      console.error('Error fetching foreign key info:', fkError);
      return false;
    }

    const hasAuthFk = fkInfo.some(fk =>
      fk.constraint_name === 'fk_users_auth' &&
      fk.table_name === 'users'
    );

    if (!hasAuthFk) {
      console.error('Missing foreign key constraint to auth.users');
      return false;
    }

    console.log('✅ Foreign key constraint to auth.users exists');

    // Test 3: Check RLS policies
    const { data: rlsInfo, error: rlsError } = await serviceClient
      .from('pg_policies')
      .select('schemaname, tablename, policyname, roles, cmd, permissive')
      .eq('tablename', 'users');

    if (rlsError) {
      console.error('Error fetching RLS policies:', rlsError);
      return false;
    }

    console.log('Users table RLS policies:');
    console.table(rlsInfo);

    // Check for required policies
    const requiredPolicies = [
      'Users can view their own data',
      'Users can update their own data',
      'Admins can view all users',
      'Admins can update user data',
      'Sysadmins can update user roles'
    ];

    const missingPolicies = requiredPolicies.filter(policy =>
      !rlsInfo.some(p => p.policyname === policy)
    );

    if (missingPolicies.length > 0) {
      console.error('Missing required RLS policies:', missingPolicies);
      return false;
    }

    console.log('✅ All required RLS policies exist');

    return true;
  } catch (error) {
    console.error('Error testing database migration:', error);
    return false;
  }
}

async function testAuthenticationFunctions() {
  console.log('\n=== Testing Authentication Functions ===');

  try {
    // Test 1: Test resolve_login_identifier function
    const testLoginId = 'test-' + uuidv4().substring(0, 8);
    const testEmail = `test-${uuidv4()}@example.com`;

    // Create a test user
    const { data: authUser, error: authError } = await serviceClient.auth.admin.createUser({
      email: testEmail,
      password: 'test-password-123',
      email_confirm: true
    });

    if (authError || !authUser.user) {
      console.error('Error creating test user:', authError);
      return false;
    }

    // Insert test user into public.users
    const { error: insertError } = await serviceClient
      .from('users')
      .insert({
        id: authUser.user.id,
        name: 'Test User',
        role: 'operator',
        email: testEmail,
        status: 'ACTIVE',
        auth_provider: 'email',
        last_password_change: new Date(),
        updated_at: new Date(),
        login_identifier: testLoginId
      });

    if (insertError) {
      console.error('Error inserting test user:', insertError);
      return false;
    }

    // Test the resolve_login_identifier function
    const { data: resolvedEmail, error: resolveError } = await supabase
      .rpc('resolve_login_identifier', { login_id: testLoginId })
      .single();

    if (resolveError || !resolvedEmail) {
      console.error('Error resolving login identifier:', resolveError);
      return false;
    }

    if (resolvedEmail !== testEmail) {
      console.error('Login identifier resolution mismatch:', resolvedEmail, '!=', testEmail);
      return false;
    }

    console.log('✅ resolve_login_identifier function works correctly');

    // Test 2: Test can_user_authenticate function
    const { data: canAuthenticate, error: canAuthError } = await supabase
      .rpc('can_user_authenticate', { user_id: authUser.user.id })
      .single();

    if (canAuthError || !canAuthenticate) {
      console.error('Error validating user authentication:', canAuthError);
      return false;
    }

    console.log('✅ can_user_authenticate function works correctly');

    // Test 3: Test with inactive user
    const { error: updateError } = await serviceClient
      .from('users')
      .update({ status: 'DISABLED' })
      .eq('id', authUser.user.id);

    if (updateError) {
      console.error('Error updating user status:', updateError);
      return false;
    }

    const { data: canAuthenticateInactive, error: canAuthInactiveError } = await supabase
      .rpc('can_user_authenticate', { user_id: authUser.user.id })
      .single();

    if (canAuthInactiveError || canAuthenticateInactive) {
      console.error('Inactive user should not be able to authenticate');
      return false;
    }

    console.log('✅ can_user_authenticate correctly rejects inactive users');

    // Clean up
    await serviceClient.auth.admin.deleteUser(authUser.user.id);

    return true;
  } catch (error) {
    console.error('Error testing authentication functions:', error);
    return false;
  }
}

async function testLoginFlow() {
  console.log('\n=== Testing Login Flow ===');

  try {
    const testLoginId = 'test-' + uuidv4().substring(0, 8);
    const testEmail = `test-${uuidv4()}@example.com`;
    const testPassword = 'test-password-123';

    // Create a test user
    const { data: authUser, error: authError } = await serviceClient.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true
    });

    if (authError || !authUser.user) {
      console.error('Error creating test user:', authError);
      return false;
    }

    // Insert test user into public.users
    const { error: insertError } = await serviceClient
      .from('users')
      .insert({
        id: authUser.user.id,
        name: 'Test User',
        role: 'operator',
        email: testEmail,
        status: 'ACTIVE',
        auth_provider: 'email',
        last_password_change: new Date(),
        updated_at: new Date(),
        login_identifier: testLoginId
      });

    if (insertError) {
      console.error('Error inserting test user:', insertError);
      return false;
    }

    // Test the login flow
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        loginId: testLoginId,
        password: testPassword
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Login failed:', errorData);
      return false;
    }

    const data = await response.json();

    if (!data.success || !data.data.token) {
      console.error('Invalid login response:', data);
      return false;
    }

    console.log('✅ Login flow works correctly');
    console.log('Token received:', data.data.token.substring(0, 20) + '...');

    // Test token validation
    const { data: { user }, error: validateError } = await supabase.auth.getUser(data.data.token);

    if (validateError || !user) {
      console.error('Error validating token:', validateError);
      return false;
    }

    if (user.id !== authUser.user.id) {
      console.error('User ID mismatch:', user.id, '!=', authUser.user.id);
      return false;
    }

    console.log('✅ Token validation works correctly');

    // Clean up
    await serviceClient.auth.admin.deleteUser(authUser.user.id);

    return true;
  } catch (error) {
    console.error('Error testing login flow:', error);
    return false;
  }
}

async function runTests() {
  console.log('Starting Supabase Auth Integration Tests\n');

  const dbTestPassed = await testDatabaseMigration();
  const funcTestPassed = await testAuthenticationFunctions();
  const loginTestPassed = await testLoginFlow();

  console.log('\n=== Test Results ===');
  console.log(`Database Migration: ${dbTestPassed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Authentication Functions: ${funcTestPassed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Login Flow: ${loginTestPassed ? '✅ PASSED' : '❌ FAILED'}`);

  if (dbTestPassed && funcTestPassed && loginTestPassed) {
    console.log('\n🎉 All tests passed! Supabase Auth integration is working correctly.');
    return true;
  } else {
    console.log('\n❌ Some tests failed. Please review the errors above.');
    return false;
  }
}

// Run the tests
runTests().catch(error => {
  console.error('Test execution error:', error);
  process.exit(1);
});