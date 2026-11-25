"use client";

import { useCallback, useEffect, useState } from "react";

interface PlaceRow {
  id: string;
  code: string;
  name: string;
  kind: string;
  lat: number;
  lng: number;
  radius_m: number;
  active: boolean;
}

export function PlacesEditor() {
  const [places, setPlaces] = useState<PlaceRow[]>([]);
  const [filter, setFilter] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [kind, setKind] = useState("open_area");
  const [lat, setLat] = useState("17.9784");
  const [lng, setLng] = useState("79.5942");
  const [radiusM, setRadiusM] = useState("30");

  function useMyGps() {
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
      });
    }
  }

  const load = useCallback(() => {
    fetch("/api/security/locations")
      .then((r) => r.json())
      .then((j) => setPlaces(j?.data?.locations ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function addPlace(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/security/locations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: code.trim(),
        name: name.trim(),
        kind,
        lat: Number(lat),
        lng: Number(lng),
        radius_m: Number(radiusM),
      }),
    });
    if (r.ok) {
      setCode("");
      setName("");
      load();
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={addPlace} className="grid gap-2 sm:grid-cols-6">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="CODE"
          className="border border-border bg-background px-2 py-1.5 text-sm text-foreground"
          required
        />
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Location name"
          className="border border-border bg-background px-2 py-1.5 text-sm text-foreground sm:col-span-2"
          required
        />
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          className="border border-border bg-background px-2 py-1.5 text-sm text-foreground"
        >
          {["gate", "building", "hostel_block", "open_area", "lab", "library", "canteen", "parking", "junction", "sos_point"].map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={`${lat},${lng}`}
          onChange={(e) => {
            const [a, b] = e.target.value.split(",");
            if (a !== undefined) setLat(a.trim());
            if (b !== undefined) setLng(b.trim());
          }}
          placeholder="lat,lng"
          className="border border-border bg-background px-2 py-1.5 text-sm text-foreground"
        />
        <button type="button" onClick={useMyGps} className="border border-border px-2 py-1.5 text-xs text-foreground">
          Use GPS
        </button>
        <button type="submit" className="bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
          Add Place
        </button>
      </form>

      <input
        type="text"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Type to filter places by code, name, or kind..."
        className="w-full border-b border-border py-1.5 text-sm text-foreground"
      />

      <div className="divide-y divide-border">
        {places
          .filter(
            (p) =>
              !filter.trim() ||
              p.code.toLowerCase().includes(filter.toLowerCase()) ||
              p.name.toLowerCase().includes(filter.toLowerCase()) ||
              p.kind.toLowerCase().includes(filter.toLowerCase()),
          )
          .map((p) => (
          <div key={p.id} className="flex items-center justify-between py-2 text-sm text-foreground">
            <span>
              <strong>{p.code}</strong> — {p.name} ({p.kind})
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              {p.lat.toFixed(4)}, {p.lng.toFixed(4)} • r={p.radius_m}m
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
