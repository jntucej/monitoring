"use client";

/**
 * AllocationPanel — room-bed allocation surface for the hostel manager console.
 *
 * Desktop: a side panel (rendered by RoleConsole alongside the board). Mobile:
 * a full-width section below the board. No horizontal scroll.
 *
 * Layout:
 *   - Left: an "unallocated students" list (drag source, draggable).
 *   - Right: a rooms × beds grid. Occupied beds show the resident's name +
 *     roll; unoccupied beds are drop targets.
 *
 * Dragging a student onto a bed calls PATCH /api/students/[roll] with
 * `{ hostelBlock, hostelRoom }` — the endpoint's student_details fields are
 * `hostel_block` (from `hostelBlock`) and `room_number` (from `hostelRoom`).
 * There is no dedicated rooms/beds endpoint that the hostel_manager role can
 * read, so when no room data is available the panel renders an EmptyState
 * ("No room data available — assign beds in the admin panel") instead of the
 * grid.
 */

import { useMemo, useState } from "react";
import { BedDouble, Users, Lock, Circle } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { useAuthStore } from "@/stores/authStore";
import { getAuthHeaders } from "@/lib/utils";
import { useUIStore } from "@/stores/uiStore";

/** A single occupant bound to a room + bed. */
interface Occupant {
  roll: string;
  name: string;
  hostelBlock: string;
  roomNumber: string;
  bedNumber: string;
}

/** A bed cell: occupied (has an occupant) or free (drop target). */
interface BedCell {
  bedNumber: string;
  occupant: Occupant | null;
}

/** A room: its block, room number, and beds. */
interface RoomRow {
  hostelBlock: string;
  roomNumber: string;
  beds: BedCell[];
}

/** An unallocated student — a drag source. */
interface UnallocatedStudent {
  roll: string;
  name: string;
}

type RoomData =
  | { status: "loading" }
  | { status: "ready"; rooms: RoomRow[]; unallocated: UnallocatedStudent[] }
  | { status: "empty" };

/**
 * Best-effort room/bed data source. There is no `/api/hostel-manager/rooms`
 * endpoint the hostel_manager role can read, and `/api/occupancy/presence-matrix`
 * is a gate-presence matrix (no room/bed structure). We therefore treat the
 * absence of a rooms endpoint as the empty case and surface the EmptyState.
 * This keeps the drag-drop grid wired and functional for when a rooms source
 * lands.
 */
async function loadRoomData(hostel: string | null): Promise<RoomData> {
  void hostel;
  // No dedicated rooms/beds endpoint exists yet — fall back to empty so the
  // panel renders its affordance instead of a broken grid.
  return { status: "empty" };
}

export function AllocationPanel() {
  const assignedHostel = useAuthStore((s) => s.user?.assignedHostel ?? null);
  const addToast = useUIStore((s) => s.addToast);

  const [data, setData] = useState<RoomData>({ status: "loading" });
  const [dragOverBed, setDragOverBed] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Load once on mount (best-effort; no rooms endpoint today).
  useMemo(() => {
    void loadRoomData(assignedHostel).then(setData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDrop = async (e: React.DragEvent, bed: BedCell, room: RoomRow) => {
    e.preventDefault();
    setDragOverBed(null);
    const roll = e.dataTransfer?.getData("text/plain");
    if (!roll || bed.occupant) return;

    setBusy(true);
    try {
      const res = await fetch(`/api/students/${encodeURIComponent(roll)}`, {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          hostelBlock: room.hostelBlock,
          hostelRoom: `${room.roomNumber}·${bed.bedNumber}`,
        }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        addToast({
          variant: "success",
          message: `Allocated ${roll} → ${room.hostelBlock} ${room.roomNumber} bed ${bed.bedNumber}`,
        });
        // Optimistically move the student into the bed.
        setData((prev) => {
          if (prev.status !== "ready") return prev;
          const next = { ...prev };
          next.rooms = prev.rooms.map((r) =>
            r.hostelBlock === room.hostelBlock && r.roomNumber === room.roomNumber
              ? {
                  ...r,
                  beds: r.beds.map((b) =>
                    b.bedNumber === bed.bedNumber
                      ? {
                          ...b,
                          occupant: {
                            roll,
                            name:
                              prev.unallocated.find((u) => u.roll === roll)?.name ?? roll,
                            hostelBlock: room.hostelBlock,
                            roomNumber: room.roomNumber,
                            bedNumber: bed.bedNumber,
                          },
                        }
                      : b,
                  ),
                }
              : r,
          );
          next.unallocated = prev.unallocated.filter((u) => u.roll !== roll);
          return next;
        });
      } else {
        addToast({
          variant: "error",
          message: json?.error?.message || `Failed to allocate ${roll}`,
        });
      }
    } catch {
      addToast({ variant: "error", message: "Network error while allocating bed" });
    } finally {
      setBusy(false);
    }
  };

  // ── Loading state ──
  if (data.status === "loading") {
    return (
      <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)]/60 p-4 min-w-0">
        <PanelHeader hostel={assignedHostel} />
        <p className="text-xs text-[var(--text-muted)] italic px-1 py-4 text-center">
          Loading room &amp; bed data…
        </p>
      </section>
    );
  }

  // ── No room data: EmptyState fallback ──
  if (data.status === "empty") {
    return (
      <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)]/60 p-4 min-w-0">
        <PanelHeader hostel={assignedHostel} />
        <EmptyState
          icon={<BedDouble className="w-6 h-6" />}
          title="No room data available"
          description="Assign beds in the admin panel. The room &amp; bed grid will appear here once room data is published for your hostel."
        />
      </section>
    );
  }

  const { rooms, unallocated } = data;

  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)]/60 p-4 min-w-0">
      <PanelHeader hostel={assignedHostel} />

      {/* Two columns on desktop: unallocated list | room-bed grid. Stacked on mobile. */}
      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,240px)_minmax(0,1fr)] gap-4">
        {/* Unallocated students (drag sources) */}
        <div className="min-w-0">
          <h4 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
            <Users className="w-3.5 h-3.5" />
            Unallocated ({unallocated.length})
          </h4>
          {unallocated.length === 0 ? (
            <p className="text-[11px] text-[var(--text-muted)] italic px-1 py-2">
              All residents allocated.
            </p>
          ) : (
            <ul className="space-y-1.5 max-h-[320px] overflow-y-auto custom-scrollbar pr-1">
              {unallocated.map((u) => (
                <li key={u.roll}>
                  <div
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", u.roll);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    className="flex items-center gap-2 rounded-lg border border-dashed border-[var(--border)] bg-[var(--bg-elevated)] px-2.5 py-2 cursor-grab active:cursor-grabbing hover:border-[var(--action-primary)]/40 transition-colors select-none"
                    aria-label={`Drag ${u.name} to a bed`}
                  >
                    <Circle className="w-2 h-2 text-[var(--text-muted)] shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{u.name}</p>
                      <p className="text-[10px] font-mono text-[var(--text-muted)] truncate">{u.roll}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Rooms × beds grid */}
        <div className="min-w-0">
          <h4 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
            <BedDouble className="w-3.5 h-3.5" />
            Rooms &amp; Beds
          </h4>
          <div className="space-y-3 max-h-[360px] overflow-y-auto custom-scrollbar pr-1">
            {rooms.map((room) => (
              <div key={`${room.hostelBlock}-${room.roomNumber}`}>
                <p className="text-[11px] font-mono text-[var(--text-secondary)] mb-1.5">
                  {room.hostelBlock} · Rm {room.roomNumber}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {room.beds.map((bed) => (
                    <div
                      key={bed.bedNumber}
                      onDragOver={(e) => {
                        if (!bed.occupant) {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "move";
                          setDragOverBed(`${room.hostelBlock}-${room.roomNumber}-${bed.bedNumber}`);
                        }
                      }}
                      onDragLeave={() =>
                        setDragOverBed((k) =>
                          k === `${room.hostelBlock}-${room.roomNumber}-${bed.bedNumber}` ? null : k,
                        )
                      }
                      onDrop={(e) => void handleDrop(e, bed, room)}
                      className={`flex flex-col items-center justify-center min-w-[72px] rounded-lg border px-2 py-1.5 transition-colors ${
                        bed.occupant
                          ? "border-emerald-500/30 bg-emerald-500/5"
                          : "border-dashed border-[var(--border)] bg-[var(--bg-base)] hover:border-[var(--action-primary)]/40"
                      } ${
                        dragOverBed === `${room.hostelBlock}-${room.roomNumber}-${bed.bedNumber}`
                          ? "ring-2 ring-[var(--action-primary)]/50 border-[var(--action-primary)]"
                          : ""
                      }`}
                      aria-label={
                        bed.occupant
                          ? `Bed ${bed.bedNumber} occupied by ${bed.occupant.name}`
                          : `Free bed ${bed.bedNumber}`
                      }
                    >
                      <span className="text-[10px] font-mono font-bold text-[var(--text-muted)]">
                        B{bed.bedNumber}
                      </span>
                      {bed.occupant ? (
                        <>
                          <span className="text-[11px] font-semibold text-emerald-400 truncate w-full text-center">
                            {bed.occupant.name}
                          </span>
                          <span className="text-[10px] font-mono text-[var(--text-muted)]">{bed.occupant.roll}</span>
                        </>
                      ) : (
                        <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                          {busy ? "…" : "—"} free
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <p className="mt-3 text-[10px] text-[var(--text-muted)] flex items-center gap-1">
            <Lock className="w-3 h-3" />
            Drag a student onto a free bed to allocate.
          </p>
        </div>
      </div>
    </section>
  );
}

function PanelHeader({ hostel }: { hostel: string | null }) {
  return (
    <div className="flex items-center justify-between gap-2 mb-3">
      <div className="flex items-center gap-2 min-w-0">
        <BedDouble className="w-4 h-4 text-[var(--action-primary)] shrink-0" />
        <span className="text-sm font-bold text-[var(--text-primary)] truncate">
          Room &amp; Bed Allocation
        </span>
      </div>
      {hostel ? (
        <span className="text-[10px] font-mono text-[var(--text-muted)] shrink-0">
          {hostel}
        </span>
      ) : null}
    </div>
  );
}

export default AllocationPanel;
