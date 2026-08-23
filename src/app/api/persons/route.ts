import { NextRequest, NextResponse } from "next/server";
import { findAllPersons, searchPersons, findPersonByUniqueId, findPersonsByType, getLinkedPersons } from "@/lib/db";
import { supabase } from "@/lib/supabaseClient";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import type { Person, PersonType } from "@/lib/types";

function extractToken(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7);
}

async function handleGet(req: NextRequest) {
  try {
    const token = extractToken(req);
    if (!token) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    const authRole = req.headers.get("x-user-role");
    const authUserId = req.headers.get("x-user-id");
    const params = req.nextUrl.searchParams;
    const uniqueId = params.get("uniqueId") || params.get("roll");
    const q = params.get("q");
    const type = params.get("type") as PersonType | null;
    const parentId = params.get("parentId");

    if (parentId) {
      if (authRole !== "admin" && authRole !== "sysadmin" && authUserId !== parentId) {
        return NextResponse.json(
          { success: false, error: { code: "FORBIDDEN", message: "You can only access your own linked persons." } },
          { status: 403 }
        );
      }
      const children = await getLinkedPersons(parentId);
      return NextResponse.json({ success: true, data: children });
    }

    if (uniqueId) {
      if (!["operator", "supervisor", "admin", "sysadmin", "faculty", "staff"].includes(authRole || "")) {
        return NextResponse.json(
          { success: false, error: { code: "FORBIDDEN", message: "Insufficient permissions to look up person." } },
          { status: 403 }
        );
      }
      const person = await findPersonByUniqueId(uniqueId);
      if (!person) {
        return NextResponse.json(
          { success: false, error: { code: "NOT_FOUND", message: "Person not found" } },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, data: person });
    }

    if (q) {
      if (!["supervisor", "admin", "sysadmin", "operator"].includes(authRole || "")) {
        return NextResponse.json(
          { success: false, error: { code: "FORBIDDEN", message: "Insufficient permissions to search persons." } },
          { status: 403 }
        );
      }
      const data = await searchPersons(q, type || undefined);
      return NextResponse.json({ success: true, data });
    }

    if (!["admin", "sysadmin", "supervisor"].includes(authRole || "")) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "You do not have permission to list persons." } },
        { status: 403 }
      );
    }

    const data = type ? await findPersonsByType(type) : await findAllPersons();
    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    console.error("Error fetching person data:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to load persons" } },
      { status: 500 }
    );
  }
}

async function handlePost(req: NextRequest) {
  try {
    const authRole = req.headers.get("x-user-role");
    if (!["admin", "sysadmin"].includes(authRole || "")) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Only admins can create persons." } },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { uniqueId, fullName, personType, department, designation, email, phone } = body;

    if (!uniqueId || !fullName || !personType) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "uniqueId, fullName, and personType are required." } },
        { status: 400 }
      );
    }

    const id = crypto.randomUUID();
    const personRow = {
      id,
      unique_id: uniqueId.trim().toUpperCase(),
      full_name: fullName,
      person_type: personType,
      department: department || null,
      designation: designation || null,
      email: email || null,
      phone: phone || null,
      status: "active",
    };

    const { data, error } = await supabase.from("persons").insert(personRow).select().single();
    if (error) {
      return NextResponse.json(
        { success: false, error: { code: "DB_ERROR", message: error.message } },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    console.error("Error creating person:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to create person" } },
      { status: 500 }
    );
  }
}

async function handlePatch(req: NextRequest) {
  try {
    const authRole = req.headers.get("x-user-role");
    if (!["admin", "sysadmin"].includes(authRole || "")) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Only admins can update persons." } },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { id, uniqueId, ...updates } = body;
    if (!id && !uniqueId) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "Person id or uniqueId required." } },
        { status: 400 }
      );
    }

    let query = supabase.from("persons").update(updates);
    if (id) query = query.eq("id", id);
    else query = query.eq("unique_id", uniqueId);

    const { data, error } = await query.select().single();
    if (error) {
      return NextResponse.json(
        { success: false, error: { code: "DB_ERROR", message: error.message } },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    console.error("Error updating person:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to update person" } },
      { status: 500 }
    );
  }
}

async function handleDelete(req: NextRequest) {
  try {
    const authRole = req.headers.get("x-user-role");
    if (!["admin", "sysadmin"].includes(authRole || "")) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Only admins can delete persons." } },
        { status: 403 }
      );
    }

    const params = req.nextUrl.searchParams;
    const id = params.get("id");
    if (!id) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "Person id is required." } },
        { status: 400 }
      );
    }

    const { error } = await supabase.from("persons").update({ status: "inactive" }).eq("id", id);
    if (error) {
      return NextResponse.json(
        { success: false, error: { code: "DB_ERROR", message: error.message } },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: "Person deactivated successfully" });
  } catch (error: unknown) {
    console.error("Error deactivating person:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to deactivate person" } },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ["operator", "supervisor", "admin", "sysadmin", "parent", "faculty", "staff"] }),
  { keyPrefix: "persons_get", maxRequests: 100 }
);

export const POST = withRateLimit(
  withAuthorization(handlePost, { requiredRole: ["admin", "sysadmin"] }),
  { keyPrefix: "persons_post", maxRequests: 30 }
);

export const PATCH = withRateLimit(
  withAuthorization(handlePatch, { requiredRole: ["admin", "sysadmin"] }),
  { keyPrefix: "persons_patch", maxRequests: 30 }
);

export const DELETE = withRateLimit(
  withAuthorization(handleDelete, { requiredRole: ["admin", "sysadmin"] }),
  { keyPrefix: "persons_delete", maxRequests: 30 }
);
