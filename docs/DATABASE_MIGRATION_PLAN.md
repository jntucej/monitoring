# Gate Monitoring System - Database Migration Plan

## 1. Existing Schema Assumptions

The application currently uses Supabase with the following schema components:

### Tables
- `students` - Student records with personal and academic information
- `gates` - Physical gate locations and configurations
- `gate_logs` - Scan records for student entry/exit
- `gate_passes` - Approval records for student gate passes
- `campus_occupancy` - Current campus occupancy status
- `alerts` - System alerts for security/safety issues
- `audit_logs` - Audit trail for system actions
- `notifications` - User notifications
- `sessions` - User session management

### Extensions
- `pgcrypto` - For UUID generation and cryptographic functions
- `pg_trgm` - For text similarity and search
- `uuid-ossp` - For UUID generation

### Functions & Triggers
- `update_campus_occupancy_on_scan()` - Updates occupancy status on scan
- `create_audit_log_on_scan()` - Creates audit log for scans
- `create_audit_log_on_pass()` - Creates audit log for gate passes
- `create_audit_log_on_pass_update()` - Creates audit log for pass status changes
- `create_audit_log_on_user()` - Creates audit log for user creation
- `create_audit_log_on_user_role_update()` - Creates audit log for role changes
- `create_audit_log_on_account_status_update()` - Creates audit log for status changes
- `user_student_mapping()` - Maps users to students for RLS

### RLS Policies
Comprehensive Row Level Security policies are implemented for all tables with role-based access control.

## 2. Required Tables

Based on the application code and existing migrations, the following tables are required:

### Core Tables
1. **users** - User accounts and authentication
2. **students** - Student records
3. **gates** - Gate configurations
4. **gate_logs** - Scan records
5. **gate_passes** - Gate pass approvals
6. **campus_occupancy** - Current campus occupancy status

### Supporting Tables
7. **alerts** - System alerts
8. **audit_logs** - Audit trail
9. **notifications** - User notifications
10. **sessions** - User sessions

## 3. Relationships

### Primary Key Relationships
- `users.id` → `students.parent_id`
- `users.id` → `gate_logs.operator_id`
- `users.id` → `gate_passes.requested_by_id`
- `users.id` → `gate_passes.parent_approver_id`
- `users.id` → `gate_passes.admin_approver_id`
- `users.id` → `sessions.user_id`
- `students.id` → `gate_logs.student_id`
- `students.id` → `gate_passes.student_id`
- `students.id` → `campus_occupancy.student_id`
- `gates.id` → `users.gate_id`
- `gates.id` → `gate_logs.gate_id`
- `gates.id` → `alerts.gate_id`
- `gate_logs.id` → `campus_occupancy.last_log_id`
- `gate_logs.id` → `gate_logs.original_scan_id` (self-reference)

### Data Flow Relationships
- Scans (`gate_logs`) update campus occupancy status
- Gate passes (`gate_passes`) trigger notifications
- User actions create audit logs (`audit_logs`)
- System events create alerts (`alerts`)

## 4. Existing RLS Expectations

The application expects the following RLS policies:

### Users Table
- Users can view their own data
- Users can update their own data (except role and status)
- Admins can view all users
- Admins can update user data (except role)
- Sysadmins can update user roles

### Students Table
- Students can view their own data
- Parents can view their children's data
- Admins can view all student data
- Wardens can view students in their hostel

### Gates Table
- All authenticated users can view active gates
- Operators can view gates they are assigned to

### Gate Logs Table
- Operators can view logs for gates they are assigned to
- Admins can view all gate logs

### Gate Passes Table
- Students can view their own gate passes
- Parents can view gate passes for their children
- Admins can view all gate passes

### Alerts Table
- Admins can view all alerts

### Audit Logs Table
- Sysadmins can view all audit logs

### Notifications Table
- Users can view their own notifications
- Users can update their own notifications (mark as read)

### Sessions Table
- Users can view their own sessions
- Users can invalidate their own sessions

### Campus Occupancy Table
- Admins can view all campus occupancy data

## 5. Missing Schema Components

Based on analysis of the application code and existing migrations, the following components are missing:

### Missing Tables
- **user_student_mapping** - The RLS policy references this table but it doesn't exist in the schema

### Missing Constraints
- **Foreign key constraints** - Several foreign key relationships are not properly constrained
- **CHECK constraints** - Some CHECK constraints are missing for enum-like fields
- **Unique constraints** - Some unique constraints are missing

### Missing Indexes
- Additional indexes may be needed for performance optimization

### Missing Functions
- The `user_student_mapping()` function references a non-existent table

## 6. Migration Order

The migration should be applied in the following order:

1. **Extensions** - Enable required PostgreSQL extensions
2. **Tables** - Create all tables in dependency order
3. **Constraints** - Add primary keys, foreign keys, unique constraints, and CHECK constraints
4. **Indexes** - Create performance indexes
5. **Functions** - Create database functions
6. **Triggers** - Create triggers
7. **RLS** - Enable Row Level Security and create policies

## 7. Risks

### Data Integrity Risks
- Missing foreign key constraints could lead to orphaned records
- Missing CHECK constraints could allow invalid data
- Missing unique constraints could allow duplicate records

### Security Risks
- Missing RLS policies could expose sensitive data
- Incomplete RLS implementation could allow unauthorized access
- Missing audit triggers could reduce accountability

### Operational Risks
- Missing indexes could impact performance
- Incomplete functions could break application logic
- Missing triggers could break data consistency

### Migration Risks
- Schema changes could break existing application queries
- Data type changes could cause data loss
- Constraint additions could fail on existing data

## 8. Migration Strategy

### Phase 1: Schema Analysis and Planning
- ✅ Complete schema analysis
- ✅ Identify all required components
- ✅ Document existing schema
- ✅ Identify missing components

### Phase 2: Migration File Creation
- [ ] Create migration files for all required components
- [ ] Implement proper dependency ordering
- [ ] Include all necessary constraints
- [ ] Include all necessary indexes
- [ ] Implement all required functions
- [ ] Implement all required triggers
- [ ] Implement comprehensive RLS policies

### Phase 3: Testing
- [ ] Test migration on fresh Supabase instance
- [ ] Verify all tables are created correctly
- [ ] Verify all constraints are enforced
- [ ] Verify all indexes are created
- [ ] Verify all functions work correctly
- [ ] Verify all triggers fire correctly
- [ ] Verify RLS policies enforce security correctly
- [ ] Verify application works with migrated schema

### Phase 4: Deployment
- [ ] Apply migrations to production
- [ ] Monitor for issues
- [ ] Verify data integrity
- [ ] Verify application functionality