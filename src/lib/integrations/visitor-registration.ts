import { getDbClient } from "@/lib/db";
import { VisitorPreRegistration } from "@/lib/integration-types";
import { sendEmail } from "@/lib/integrations/email";
import { sendSMS } from "@/lib/integrations/sms";

// Generate QR code payload or data string using a secure UUID token
export function generateQR(payload: string): string {
  return `VSTR:${payload}`;
}

// Create a visitor pre-registration
export async function createVisitorPreRegistration(
  data: Omit<VisitorPreRegistration, "id" | "createdAt" | "updatedAt" | "status" | "qrCode">
): Promise<VisitorPreRegistration | null> {
  try {
    const token = crypto.randomUUID();
    const id = `visit_${token}`;
    const qrCode = generateQR(token);

    const { data: registration, error } = await getDbClient()
      .from("visitor_pre_registrations")
      .insert({
        id,
        full_name: data.fullName,
        email: data.email,
        phone: data.phone,
        host_id: data.hostId,
        host_name: data.hostName,
        purpose: data.purpose,
        expected_arrival: data.expectedArrival,
        expected_departure: data.expectedDeparture,
        qr_code: qrCode,
        status: "pending",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    
    return {
      id: registration.id,
      fullName: registration.full_name,
      email: registration.email,
      phone: registration.phone,
      hostId: registration.host_id,
      hostName: registration.host_name,
      purpose: registration.purpose,
      expectedArrival: registration.expected_arrival,
      expectedDeparture: registration.expected_departure,
      status: registration.status,
      qrCode: registration.qr_code,
      createdAt: registration.created_at,
      updatedAt: registration.updated_at,
    };
  } catch (error) {
    console.error("Error creating visitor pre-registration:", error);
    return null;
  }
}

// Approve visitor pre-registration
export async function approveVisitorRegistration(
  id: string,
  adminId: string
): Promise<boolean> {
  try {
    const { error } = await getDbClient()
      .from("visitor_pre_registrations")
      .update({
        status: "approved",
        updated_at: new Date().toISOString(),
        approved_by: adminId,
        approved_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) throw error;

    // Notify visitor via email/SMS
    const { data: reg } = await getDbClient()
      .from("visitor_pre_registrations")
      .select("*")
      .eq("id", id)
      .single();

    if (reg) {
      const formattedReg: VisitorPreRegistration = {
        id: reg.id,
        fullName: reg.full_name,
        email: reg.email,
        phone: reg.phone,
        hostId: reg.host_id,
        hostName: reg.host_name,
        purpose: reg.purpose,
        expectedArrival: reg.expected_arrival,
        expectedDeparture: reg.expected_departure,
        status: reg.status,
        qrCode: reg.qr_code,
        createdAt: reg.created_at,
        updatedAt: reg.updated_at,
      };
      await sendRegistrationApprovalNotification(formattedReg);
    }

    return true;
  } catch (error) {
    console.error("Error approving visitor registration:", error);
    return false;
  }
}

// Send registration approval notification
async function sendRegistrationApprovalNotification(registration: VisitorPreRegistration) {
  // Send email
  await sendEmail({
    to: registration.email,
    subject: "Visitor Registration Approved",
    body: `
Dear ${registration.fullName},

Your visitor registration has been approved.

Details:
- Host: ${registration.hostName}
- Purpose: ${registration.purpose}
- Expected Arrival: ${new Date(registration.expectedArrival).toLocaleString()}
- Expected Departure: ${new Date(registration.expectedDeparture).toLocaleString()}

Please show this QR code at the gate when you arrive:
${registration.qrCode}

Thank you,
Campus Access Management
    `,
  });

  // Send SMS if phone is available
  if (registration.phone) {
    await sendSMS({
      to: registration.phone,
      message: `Your visitor registration has been approved for ${registration.hostName}. Show QR at gate: ${registration.qrCode}`,
    });
  }
}

// Get pending registrations
export async function getPendingRegistrations(hostId?: string): Promise<VisitorPreRegistration[]> {
  let query = getDbClient()
    .from("visitor_pre_registrations")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (hostId) {
    query = query.eq("host_id", hostId);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching pending registrations:", error);
    return [];
  }

  return (data || []).map((reg) => ({
    id: reg.id,
    fullName: reg.full_name,
    email: reg.email,
    phone: reg.phone,
    hostId: reg.host_id,
    hostName: reg.host_name,
    purpose: reg.purpose,
    expectedArrival: reg.expected_arrival,
    expectedDeparture: reg.expected_departure,
    status: reg.status,
    qrCode: reg.qr_code,
    createdAt: reg.created_at,
    updatedAt: reg.updated_at,
  }));
}

// Check-in pre-registered visitor
export async function checkInPreRegisteredVisitor(id: string): Promise<boolean> {
  try {
    // Get registration details
    const { data: reg, error: regError } = await getDbClient()
      .from("visitor_pre_registrations")
      .select("*")
      .eq("id", id)
      .single();

    if (regError || !reg) {
      console.error("Registration not found:", regError);
      return false;
    }

    const uniqueId = `VIS-${id}`;

    // Create person record if not exists
    const { data: existing } = await getDbClient()
      .from("users")
      .select("id")
      .eq("unique_id", uniqueId)
      .maybeSingle();

    let personId: string;

    if (!existing) {
      const { data: person, error: personError } = await getDbClient()
        .from("users")
        .insert({
          id: crypto.randomUUID(),
          unique_id: uniqueId,
          name: reg.full_name,
          role: "visitor",
          email: reg.email || `${uniqueId.toLowerCase()}@visitor.gatekeeper.edu`,
          phone: reg.phone,
          status: "ACTIVE",
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (personError || !person) {
        console.error("Error creating person:", personError);
        return false;
      }
      personId = person.id;
    } else {
      personId = existing.id;
    }

    // Create visitor log
    const { error: logError } = await getDbClient()
      .from("visitor_logs")
      .insert({
        user_id: personId,
        host_user_id: reg.host_id,
        purpose: reg.purpose,
        check_in_at: new Date().toISOString(),
        status: "active",
      });

    if (logError) {
      console.error("Error creating visitor log:", logError);
      return false;
    }

    // Update registration status
    await getDbClient()
      .from("visitor_pre_registrations")
      .update({
        status: "checked_in",
        updated_at: new Date().toISOString(),
        checked_in_at: new Date().toISOString(),
      })
      .eq("id", id);

    return true;
  } catch (error) {
    console.error("Error checking in pre-registered visitor:", error);
    return false;
  }
}
