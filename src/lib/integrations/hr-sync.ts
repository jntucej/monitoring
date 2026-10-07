import { getDbClient } from "@/lib/db";
import { HREmployee } from "@/lib/integration-types";

// Sync employees from HR system
export async function syncEmployeesFromHR(): Promise<{
  success: boolean;
  added: number;
  updated: number;
  errors: string[];
}> {
  let added = 0;
  let updated = 0;
  const errors: string[] = [];

  try {
    // Mock HR system employee data
    const mockEmployees: HREmployee[] = [
      {
        employeeId: "FAC-001",
        fullName: "Dr. S. Sharma",
        email: "s.sharma@campus.edu",
        phone: "+919876543210",
        department: "CSE",
        designation: "Professor",
        isHod: true,
        joiningDate: "2015-06-01",
        status: "active",
      },
      {
        employeeId: "FAC-002",
        fullName: "Dr. P. Reddy",
        email: "p.reddy@campus.edu",
        phone: "+919876543211",
        department: "CSE",
        designation: "Associate Professor",
        isHod: false,
        joiningDate: "2018-08-15",
        status: "active",
      },
      {
        employeeId: "STF-001",
        fullName: "R. Kumar",
        email: "r.kumar@campus.edu",
        phone: "+919876543212",
        department: "Admin",
        designation: "Administrative Officer",
        isHod: false,
        joiningDate: "2010-01-01",
        status: "active",
      },
    ];

    for (const emp of mockEmployees) {
      try {
        // Check if person already exists
        const { data: existing } = await getDbClient()
          .from("users")
          .select("id, name, department_id, status")
          .eq("unique_id", emp.employeeId)
          .maybeSingle();

        if (existing) {
          // Update existing person
          const { error } = await getDbClient()
            .from("users")
            .update({
              name: emp.fullName,
              email: emp.email,
              phone: emp.phone,
              department_id: emp.department,
              status: emp.status === "active" ? "ACTIVE" : "DISABLED",
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id);

          if (error) {
            errors.push(`Failed to update ${emp.employeeId}: ${error.message}`);
          } else {
            updated++;
          }

          // Update employee details
          await getDbClient()
            .from("employee_details")
            .upsert(
              {
                user_id: existing.id,
                employee_id: emp.employeeId,
                designation: emp.designation,
                joining_date: emp.joiningDate,
                is_hod: emp.isHod,
                department_id: emp.department,
              },
              { onConflict: "user_id" }
            );
        } else {
          // Create new person
          const { data: person, error: personError } = await getDbClient()
            .from("users")
            .insert({
              id: crypto.randomUUID(),
              unique_id: emp.employeeId,
              name: emp.fullName,
              role: emp.employeeId.startsWith("FAC") ? "faculty" : "staff",
              email: emp.email,
              phone: emp.phone,
              department_id: emp.department,
              status: emp.status === "active" ? "ACTIVE" : "DISABLED",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (personError || !person) {
            errors.push(`Failed to create ${emp.employeeId}: ${personError?.message}`);
            continue;
          }

          // Create employee details
          await getDbClient().from("employee_details").insert({
            user_id: person.id,
            employee_id: emp.employeeId,
            designation: emp.designation,
            joining_date: emp.joiningDate,
            is_hod: emp.isHod,
            department_id: emp.department,
          });

          added++;
        }
      } catch (error: any) {
        errors.push(`Error processing ${emp.employeeId}: ${error.message || error}`);
      }
    }

    return { success: errors.length === 0, added, updated, errors };
  } catch (error: any) {
    console.error("Error syncing employees:", error);
    return { success: false, added: 0, updated: 0, errors: [error.message || "Sync failed"] };
  }
}
