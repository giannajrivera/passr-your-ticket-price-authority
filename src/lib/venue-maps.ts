// Simple procedural venue maps (Ticketmaster-style bowl views) rendered as SVG.

import type { EventCategory } from "@/lib/types";

export type Zone = {
  id: string;
  d: string;
  /** Optional short label drawn in the middle of the zone */
  label?: string | undefined;
  labelX?: number | undefined;
  labelY?: number | undefined;
};


export type VenueLayout = {
  width: number;
  height: number;
  /** Stage / field graphic */
  stage: { d: string; label: string; x: number; y: number };
  zones: Zone[];
};

const RAD = Math.PI / 180;

function pt(cx: number, cy: number, r: number, aDeg: number) {
  const a = aDeg * RAD;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const;
}

/** Ring segment path between radii r1..r2 and angles a1..a2 (degrees, 0 = right, y down). */
function segment(cx: number, cy: number, r1: number, r2: number, a1: number, a2: number) {
  const large = Math.abs(a2 - a1) > 180 ? 1 : 0;
  const [x1, y1] = pt(cx, cy, r2, a1);
  const [x2, y2] = pt(cx, cy, r2, a2);
  const [x3, y3] = pt(cx, cy, r1, a2);
  const [x4, y4] = pt(cx, cy, r1, a1);
  return [
    `M ${x1.toFixed(1)} ${y1.toFixed(1)}`,
    `A ${r2} ${r2} 0 ${large} 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`,
    `L ${x3.toFixed(1)} ${y3.toFixed(1)}`,
    `A ${r1} ${r1} 0 ${large} 0 ${x4.toFixed(1)} ${y4.toFixed(1)}`,
    "Z",
  ].join(" ");
}

function ring(
  prefix: string,
  cx: number,
  cy: number,
  r1: number,
  r2: number,
  from: number,
  to: number,
  count: number,
  gap = 2,
): Zone[] {
  const span = (to - from) / count;
  const zones: Zone[] = [];
  for (let i = 0; i < count; i++) {
    const a1 = from + i * span + gap / 2;
    const a2 = from + (i + 1) * span - gap / 2;
    const mid = (a1 + a2) / 2;
    const [lx, ly] = pt(cx, cy, (r1 + r2) / 2, mid);
    zones.push({ id: `${prefix}-${i}`, d: segment(cx, cy, r1, r2, a1, a2), labelX: lx, labelY: ly });
  }
  return zones;
}

function rect(id: string, x: number, y: number, w: number, h: number, label?: string): Zone {
  return {
    id,
    d: `M ${x} ${y} h ${w} v ${h} h ${-w} Z`,
    label,
    labelX: x + w / 2,
    labelY: y + h / 2,
  };
}

const W = 320;
const H = 300;

function arenaLayout(): VenueLayout {
  const cx = 160;
  const cy = 150;
  return {
    width: W,
    height: H,
    stage: { d: "M 105 14 h 110 v 32 h -110 Z", label: "STAGE", x: 160, y: 31 },
    zones: [
      rect("floor-a", 118, 88, 84, 38, "A"),
      rect("floor-b", 118, 130, 84, 38, "B"),
      rect("floor-c", 118, 172, 84, 38, "C"),
      ...ring("ring1", cx, cy, 82, 100, -40, 220, 8),
      ...ring("ring2", cx, cy, 104, 120, -40, 220, 10),
      ...ring("ring3", cx, cy, 124, 142, -40, 220, 10),
    ],
  };
}


function stadiumLayout(): VenueLayout {
  const cx = 160;
  const cy = 150;
  return {
    width: W,
    height: H,
    stage: {
      d: "M 108 116 h 104 a 8 8 0 0 1 8 8 v 52 a 8 8 0 0 1 -8 8 h -104 a 8 8 0 0 1 -8 -8 v -52 a 8 8 0 0 1 8 -8 Z",
      label: "FIELD",
      x: 160,
      y: 153,
    },
    zones: [
      ...ring("lower", cx, cy, 74, 96, 0, 360, 12),
      ...ring("club", cx, cy, 100, 118, 0, 360, 14),
      ...ring("upper", cx, cy, 122, 144, 0, 360, 16),
    ],
  };
}

function theaterLayout(): VenueLayout {
  const cx = 160;
  const cy = 44;
  return {
    width: W,
    height: H,
    stage: { d: "M 96 18 h 128 v 30 h -128 Z", label: "STAGE", x: 160, y: 35 },
    zones: [
      ...ring("orch", cx, cy, 58, 104, 28, 152, 5),
      ...ring("mezz", cx, cy, 112, 156, 24, 156, 5),
      ...ring("balc", cx, cy, 164, 206, 22, 158, 5),
    ],
  };
}

// `EventCategory` now covers more than these three layouts (Comedy,
// Festival, Family, Nightlife, Other) — every category not explicitly
// handled below falls back to the general-purpose arena bowl, same as
// "Concert" always has. No behavior change for existing categories.
export function getVenueLayout(category: EventCategory): VenueLayout {
  if (category === "Sports") return stadiumLayout();
  if (category === "Theater") return theaterLayout();
  return arenaLayout();
}
