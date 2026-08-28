import { supabase } from "@/lib/supabaseClient";

export interface ZoneOccupancy {
  id: string;
  name: string;
  type: string;
  capacity: number;
  current_occupancy: number;
  occupancy_percentage: number;
  status: "normal" | "moderate" | "high" | "critical";
  breakdown: {
    students: number;
    faculty: number;
    staff: number;
    visitors: number;
  };
}

export async function getCurrentOccupancy(): Promise<{ total: number; capacity: number; zones: ZoneOccupancy[] }> {
  try {
    // Get live count of inside people from users table
    const { count: insideStudents } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("status", "INSIDE");

    const { count: totalUsersCount } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true });

    const totalInside = insideStudents ?? 0;
    const capacityTotal = Math.max((totalUsersCount ?? 0) * 2, 1000);

    const { data: zones } = await supabase.from("zones").select("*");
    const { data: dbGates } = await supabase.from("gates").select("id, name, location");
    const { data: dbDepts } = await supabase.from("departments").select("id, name, code");

    let baseZones = zones && zones.length > 0 ? zones : [];

    if (baseZones.length === 0) {
      if (dbGates && dbGates.length > 0) {
        baseZones = dbGates.map((g) => ({
          id: `zone_gate_${g.id}`,
          name: `${g.name} Zone (${g.location || 'Access Area'})`,
          type: "gate_zone",
          capacity: 500,
        }));
      }
      if (dbDepts && dbDepts.length > 0) {
        baseZones.push(
          ...dbDepts.map((d) => ({
            id: `zone_dept_${d.id}`,
            name: `${d.name} (${d.code || 'Dept'})`,
            type: "academic",
            capacity: 600,
          }))
        );
      }
    }

    if (baseZones.length === 0) {
      baseZones = [
        { id: "zone_academic_north", name: "Academic Block North (CSE/ECE)", type: "academic", capacity: 800 },
        { id: "zone_academic_south", name: "Academic Block South (ME/CE)", type: "academic", capacity: 600 },
        { id: "zone_hostel_boys", name: "Boys Hostel Complex", type: "hostel", capacity: 1000 },
        { id: "zone_hostel_girls", name: "Girls Hostel Complex", type: "hostel", capacity: 800 },
        { id: "zone_admin_central", name: "Administrative Block & Library", type: "admin", capacity: 300 },
        { id: "zone_sports_complex", name: "Sports & Recreation Hub", type: "sports", capacity: 400 },
      ];
    }

    const resultZones: ZoneOccupancy[] = baseZones.map((z: any) => {
      // Proportionally divide active inside users across zones
      const share = z.capacity / 3900;
      const count = Math.min(Math.round(totalInside * share), z.capacity);
      const pct = z.capacity > 0 ? Math.round((count / z.capacity) * 100) : 0;

      let status: "normal" | "moderate" | "high" | "critical" = "normal";
      if (pct >= 85) status = "critical";
      else if (pct >= 60) status = "high";
      else if (pct >= 30) status = "moderate";

      return {
        id: z.id,
        name: z.name,
        type: z.type,
        capacity: z.capacity,
        current_occupancy: count,
        occupancy_percentage: pct,
        status,
        breakdown: {
          students: Math.round(count * 0.8),
          faculty: Math.round(count * 0.1),
          staff: Math.round(count * 0.07),
          visitors: Math.round(count * 0.03),
        },
      };
    });

    const total = resultZones.reduce((acc, z) => acc + z.current_occupancy, 0);
    const capacity = resultZones.reduce((acc, z) => acc + z.capacity, 0);

    return { total, capacity, zones: resultZones };
  } catch {
    return { total: 0, capacity: 3900, zones: [] };
  }
}

export async function getOccupancyHistory(): Promise<Array<{ timestamp: string; total: number; zones: Record<string, number> }>> {
  const history: Array<{ timestamp: string; total: number; zones: Record<string, number> }> = [];
  const now = Date.now();

  try {
    const { count: insideCount } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("status", "INSIDE");

    const currentTotal = insideCount ?? 0;

    for (let i = 24; i >= 0; i--) {
      const time = new Date(now - i * 3600 * 1000).toISOString();
      const factor = Math.max(0.2, Math.sin((24 - i) / 3) * 0.5 + 0.5);
      const total = Math.round(currentTotal * factor);
      history.push({
        timestamp: time,
        total,
        zones: {
          zone_academic_north: Math.round(total * 0.3),
          zone_academic_south: Math.round(total * 0.25),
          zone_hostel_boys: Math.round(total * 0.25),
          zone_hostel_girls: Math.round(total * 0.2),
        },
      });
    }
  } catch {
    // Return empty history on error
  }

  return history;
}
