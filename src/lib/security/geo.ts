import { query } from "@/lib/postgres";

export interface NearestLocationResult {
  id: string;
  code: string;
  name: string;
  kind: string;
  distance_m: number;
}

/**
 * Always resolves to the nearest active campus_location (even if outside radius_m).
 */
export async function nearestLocation(
  lat: number,
  lng: number,
): Promise<NearestLocationResult | null> {
  const { rows } = await query<NearestLocationResult>(
    `SELECT id, code, name, kind,
            earth_distance(geo, ll_to_earth($1::float8, $2::float8))::int AS distance_m
       FROM public.campus_locations
      WHERE active = true
      ORDER BY geo <-> ll_to_earth($1::float8, $2::float8)
      LIMIT 1`,
    [lat, lng],
  );
  return rows[0] ?? null;
}

/**
 * Pure Haversine distance in meters.
 */
export function distanceM(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}
