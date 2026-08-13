// Venue seat maps (Ticketmaster-style bowl views) rendered as SVG.
// Layouts are hand-tuned per known venue, with category-based fallbacks
// for anything we don't have a specific plan for yet.

import type { EventCategory } from "@/lib/types";

export type Zone = {
  id: string;
  /** Human-readable section name, e.g. "Floor A" or "204". */
  name: string;
  d: string;
  /** 0 = cheapest/furthest, 1 = most premium/closest. Drives pricing + shading. */
  tier: number;
  /** True for general-admission standing areas (no numbered rows). */
  standing?: boolean | undefined;
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
const W = 320;
const H = 300;

const r1 = (n: number) => Math.round(n * 10) / 10;

function pt(cx: number, cy: number, r: number, aDeg: number) {
  const a = aDeg * RAD;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const;
}

/** Ring segment path between radii ra..rb and angles a1..a2 (degrees, 0 = right, y down). */
function segment(cx: number, cy: number, ra: number, rb: number, a1: number, a2: number) {
  const large = Math.abs(a2 - a1) > 180 ? 1 : 0;
  const [x1, y1] = pt(cx, cy, rb, a1);
  const [x2, y2] = pt(cx, cy, rb, a2);
  const [x3, y3] = pt(cx, cy, ra, a2);
  const [x4, y4] = pt(cx, cy, ra, a1);
  return [
    `M ${r1(x1)} ${r1(y1)}`,
    `A ${rb} ${rb} 0 ${large} 1 ${r1(x2)} ${r1(y2)}`,
    `L ${r1(x3)} ${r1(y3)}`,
    `A ${ra} ${ra} 0 ${large} 0 ${r1(x4)} ${r1(y4)}`,
    "Z",
  ].join(" ");
}

type RingOpts = {
  prefix: string;
  /** Section-number prefix, e.g. 100 -> 101, 102, ... */
  numberFrom?: number;
  tier: number;
  showLabels?: boolean;
};

function ring(
  cx: number,
  cy: number,
  ra: number,
  rb: number,
  from: number,
  to: number,
  count: number,
  opts: RingOpts,
  gap = 2,
): Zone[] {
  const span = (to - from) / count;
  const zones: Zone[] = [];
  for (let i = 0; i < count; i++) {
    const a1 = from + i * span + gap / 2;
    const a2 = from + (i + 1) * span - gap / 2;
    const mid = (a1 + a2) / 2;
    const [lx, ly] = pt(cx, cy, (ra + rb) / 2, mid);
    const name = opts.numberFrom !== undefined ? String(opts.numberFrom + i + 1) : `${opts.prefix} ${i + 1}`;
    zones.push({
      id: `${opts.prefix}-${i}`,
      name,
      d: segment(cx, cy, ra, rb, a1, a2),
      tier: opts.tier,
      label: opts.showLabels === false ? undefined : name,
      labelX: r1(lx),
      labelY: r1(ly),
    });
  }
  return zones;
}

function rect(
  id: string,
  name: string,
  x: number,
  y: number,
  w: number,
  h: number,
  tier: number,
  extra?: { label?: string; standing?: boolean },
): Zone {
  return {
    id,
    name,
    d: `M ${x} ${y} h ${w} v ${h} h ${-w} Z`,
    tier,
    standing: extra?.standing,
    label: extra?.label ?? name,
    labelX: x + w / 2,
    labelY: y + h / 2,
  };
}

/* --------------------------------------------------------- Named venues */

/** Madison Square Garden — end-stage concert setup. */
function msgLayout(): VenueLayout {
  const cx = 160;
  const cy = 152;
  return {
    width: W,
    height: H,
    stage: { d: "M 105 14 h 110 v 32 h -110 Z", label: "STAGE", x: 160, y: 31 },
    zones: [
      rect("floor-a", "Floor A", 118, 60, 84, 36, 1, { label: "A" }),
      rect("floor-b", "Floor B", 118, 100, 84, 36, 0.86, { label: "B" }),
      rect("floor-c", "Floor C", 118, 140, 84, 36, 0.7, { label: "C" }),
      ...ring(cx, cy, 88, 108, -35, 215, 8, { prefix: "msg100", numberFrom: 100, tier: 0.6 }),
      ...ring(cx, cy, 112, 130, -35, 215, 10, { prefix: "msg200", numberFrom: 200, tier: 0.34 }),
      ...ring(cx, cy, 134, 152, -35, 215, 10, { prefix: "msg400", numberFrom: 400, tier: 0.1 }),
    ],
  };
}

/** Granite Arena — center-court basketball bowl. */
function graniteLayout(): VenueLayout {
  const cx = 160;
  const cy = 150;
  return {
    width: W,
    height: H,
    stage: {
      d: "M 112 122 h 96 a 6 6 0 0 1 6 6 v 44 a 6 6 0 0 1 -6 6 h -96 a 6 6 0 0 1 -6 -6 v -44 a 6 6 0 0 1 6 -6 Z",
      label: "COURT",
      x: 160,
      y: 150,
    },
    zones: [
      ...ring(cx, cy, 62, 76, 0, 360, 10, { prefix: "court", numberFrom: 0, tier: 1, showLabels: false }),
      ...ring(cx, cy, 80, 100, 0, 360, 12, { prefix: "ga100", numberFrom: 100, tier: 0.62 }),
      ...ring(cx, cy, 104, 124, 0, 360, 14, { prefix: "ga200", numberFrom: 200, tier: 0.32 }),
      ...ring(cx, cy, 128, 146, 0, 360, 16, { prefix: "ga300", numberFrom: 300, tier: 0.08 }),
    ],
  };
}

/** Anchor Field — open-air stadium. */
function anchorLayout(): VenueLayout {
  const zones: Zone[] = [
    rect("af-lower-1", "Lower 12", 44, 96, 46, 30, 0.9),
    rect("af-lower-2", "Lower 14", 44, 130, 46, 30, 0.94),
    rect("af-lower-3", "Lower 16", 44, 164, 46, 30, 0.86),
    rect("af-lower-4", "Lower 32", 230, 96, 46, 30, 0.9),
    rect("af-lower-5", "Lower 34", 230, 130, 46, 30, 0.94),
    rect("af-lower-6", "Lower 36", 230, 164, 46, 30, 0.86),
    rect("af-end-1", "End 5", 104, 58, 50, 28, 0.5),
    rect("af-end-2", "End 7", 166, 58, 50, 28, 0.5),
    rect("af-end-3", "End 25", 104, 208, 50, 28, 0.44),
    rect("af-end-4", "End 27", 166, 208, 50, 28, 0.44),
    rect("af-upper-1", "Upper 412", 20, 96, 18, 98, 0.14),
    rect("af-upper-2", "Upper 432", 282, 96, 18, 98, 0.14),
    rect("af-upper-3", "Upper 505", 104, 26, 112, 24, 0.05),
    rect("af-upper-4", "Upper 525", 104, 244, 112, 24, 0.05),
  ];
  return {
    width: W,
    height: H,
    stage: {
      d: "M 100 94 h 120 a 8 8 0 0 1 8 8 v 86 a 8 8 0 0 1 -8 8 h -120 a 8 8 0 0 1 -8 -8 v -86 a 8 8 0 0 1 8 -8 Z",
      label: "FIELD",
      x: 160,
      y: 145,
    },
    zones,
  };
}

/** Belmore Theatre — proscenium house. */
function belmoreLayout(): VenueLayout {
  const cx = 160;
  const cy = 44;
  return {
    width: W,
    height: H,
    stage: { d: "M 96 18 h 128 v 30 h -128 Z", label: "STAGE", x: 160, y: 35 },
    zones: [
      ...ring(cx, cy, 58, 104, 28, 152, 5, { prefix: "orch", tier: 0.95, showLabels: false }).map((z, i) => ({
        ...z,
        name: `Orchestra ${i + 1}`,
      })),
      ...ring(cx, cy, 112, 156, 24, 156, 5, { prefix: "mezz", tier: 0.55, showLabels: false }).map((z, i) => ({
        ...z,
        name: `Mezzanine ${i + 1}`,
      })),
      ...ring(cx, cy, 164, 206, 22, 158, 5, { prefix: "balc", tier: 0.15, showLabels: false }).map((z, i) => ({
        ...z,
        name: `Balcony ${i + 1}`,
      })),
    ],
  };
}

/** The Fillmore — small standing-room hall with a horseshoe balcony. */
function fillmoreLayout(): VenueLayout {
  const cx = 160;
  const cy = 60;
  return {
    width: W,
    height: H,
    stage: { d: "M 100 16 h 120 v 28 h -120 Z", label: "STAGE", x: 160, y: 30 },
    zones: [
      rect("pit", "GA Pit", 108, 56, 104, 42, 1, { standing: true, label: "PIT" }),
      rect("fl-l", "Floor Left", 56, 102, 66, 62, 0.72, { standing: true, label: "L" }),
      rect("fl-r", "Floor Right", 198, 102, 66, 62, 0.72, { standing: true, label: "R" }),
      rect("fl-back", "Floor Back", 108, 102, 84, 62, 0.6, { standing: true, label: "BACK" }),
      ...ring(cx, cy, 150, 178, 18, 162, 7, { prefix: "balc", tier: 0.4, showLabels: false }).map((z, i) => ({
        ...z,
        name: `Balcony ${i + 1}`,
      })),
    ],
  };
}

/* ----------------------------------------------------- Category fallbacks */

function arenaLayout(): VenueLayout {
  return msgLayout();
}

function stadiumLayout(): VenueLayout {
  return anchorLayout();
}

function theaterLayout(): VenueLayout {
  return belmoreLayout();
}

const BY_VENUE: Record<string, () => VenueLayout> = {
  "madison square garden": msgLayout,
  "granite arena": graniteLayout,
  "anchor field": anchorLayout,
  "belmore theatre": belmoreLayout,
  "the fillmore": fillmoreLayout,
};

/**
 * Layout for a specific venue. Falls back to a category-appropriate generic
 * bowl for venues we haven't hand-mapped yet.
 */
export function getVenueLayout(venue: string, category: EventCategory): VenueLayout {
  const named = BY_VENUE[venue.trim().toLowerCase()];
  if (named) return named();
  if (category === "Sports") return stadiumLayout();
  if (category === "Theater") return theaterLayout();
  return arenaLayout();
}
