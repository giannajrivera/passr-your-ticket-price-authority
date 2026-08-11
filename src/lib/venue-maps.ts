// Venue maps modeled on the actual venues in the mock event data.
// Each venue has its own hand-tuned layout (Ticketmaster-style bowl view),
// and every zone carries a real section name plus a "tier" (0 = cheapest
// seat in the house, 1 = the most premium) that drives dynamic pricing.

export type Zone = {
  id: string;
  d: string;
  /** Real section name, e.g. "Section 112" or "Floor A" */
  name: string;
  /** Optional short label drawn in the middle of the zone */
  label?: string | undefined;
  labelX?: number | undefined;
  labelY?: number | undefined;
  /** 0 = cheapest area, 1 = most premium */
  tier: number;
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

type RingOpts = {
  /** First section number in this ring, e.g. 101 */
  startNumber: number;
  /** tier for each zone, given index + count */
  tier: (i: number, count: number) => number;
  gap?: number;
  /** Draw the section number inside the zone */
  showLabel?: boolean;
  namePrefix?: string;
};

function ring(
  prefix: string,
  cx: number,
  cy: number,
  r1: number,
  r2: number,
  from: number,
  to: number,
  count: number,
  opts: RingOpts,
): Zone[] {
  const gap = opts.gap ?? 2;
  const span = (to - from) / count;
  const zones: Zone[] = [];
  for (let i = 0; i < count; i++) {
    const a1 = from + i * span + gap / 2;
    const a2 = from + (i + 1) * span - gap / 2;
    const mid = (a1 + a2) / 2;
    const [lxRaw, lyRaw] = pt(cx, cy, (r1 + r2) / 2, mid);
    const lx = Math.round(lxRaw * 10) / 10;
    const ly = Math.round(lyRaw * 10) / 10;
    const num = opts.startNumber + i;
    zones.push({
      id: `${prefix}-${num}`,
      d: segment(cx, cy, r1, r2, a1, a2),
      name: `${opts.namePrefix ?? "Section"} ${num}`,
      label: opts.showLabel ? String(num) : undefined,
      labelX: lx,
      labelY: ly,
      tier: opts.tier(i, count),
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
  label?: string,
): Zone {
  return {
    id,
    d: `M ${x} ${y} h ${w} v ${h} h ${-w} Z`,
    name,
    label,
    labelX: x + w / 2,
    labelY: y + h / 2,
    tier,
  };
}

/** A straight run of `count` rect sections, laid out horizontally or vertically. */
function rectRow(
  prefix: string,
  startNumber: number,
  x: number,
  y: number,
  w: number,
  h: number,
  count: number,
  vertical: boolean,
  tier: (i: number, count: number) => number,
  gap = 2,
): Zone[] {
  const zones: Zone[] = [];
  const each = ((vertical ? h : w) - gap * (count - 1)) / count;
  for (let i = 0; i < count; i++) {
    const zx = vertical ? x : x + i * (each + gap);
    const zy = vertical ? y + i * (each + gap) : y;
    const zw = vertical ? w : each;
    const zh = vertical ? each : h;
    const num = startNumber + i;
    zones.push(
      rect(`${prefix}-${num}`, `Section ${num}`, zx, zy, zw, zh, tier(i, count), String(num)),
    );
  }
  return zones;
}

const W = 320;
const H = 300;

/** Higher in the middle of the run, lower toward the ends. */
const centered = (peak: number, edge: number) => (i: number, count: number) => {
  if (count <= 1) return peak;
  const d = Math.abs(i - (count - 1) / 2) / ((count - 1) / 2);
  return edge + (peak - edge) * (1 - d);
};

/* ---------------------------------------------------------------- venues */

/** Madison Square Garden — end-stage concert configuration. */
function madisonSquareGarden(): VenueLayout {
  const cx = 160;
  const cy = 150;
  return {
    width: W,
    height: H,
    stage: { d: "M 105 14 h 110 v 32 h -110 Z", label: "STAGE", x: 160, y: 31 },
    zones: [
      rect("floor-a", "Floor A", 118, 88, 84, 38, 1, "A"),
      rect("floor-b", "Floor B", 118, 130, 84, 38, 0.9, "B"),
      rect("floor-c", "Floor C", 118, 172, 84, 38, 0.78, "C"),
      ...ring("msg", cx, cy, 82, 100, -40, 220, 8, {
        startNumber: 101,
        tier: centered(0.68, 0.5),
      }),
      ...ring("msg", cx, cy, 104, 120, -40, 220, 10, {
        startNumber: 201,
        tier: centered(0.44, 0.3),
      }),
      ...ring("msg", cx, cy, 124, 142, -40, 220, 10, {
        startNumber: 401,
        tier: centered(0.2, 0.06),
      }),
    ],
  };
}

/** Granite Arena — center-court/ice bowl. */
function graniteArena(): VenueLayout {
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
      ...ring("court", cx, cy, 60, 74, 0, 360, 8, {
        startNumber: 1,
        tier: () => 1,
        namePrefix: "Courtside",
      }),
      ...ring("gra", cx, cy, 78, 100, 0, 360, 12, {
        startNumber: 101,
        tier: (i) => (i % 6 < 2 ? 0.72 : 0.58),
      }),
      ...ring("gra", cx, cy, 104, 124, 0, 360, 14, {
        startNumber: 201,
        tier: (i) => (i % 7 < 2 ? 0.46 : 0.36),
      }),
      ...ring("gra", cx, cy, 128, 146, 0, 360, 16, {
        startNumber: 301,
        tier: (i) => (i % 8 < 2 ? 0.2 : 0.1),
      }),
    ],
  };
}

/** Anchor Field — rectangular soccer stadium. */
function anchorField(): VenueLayout {
  return {
    width: W,
    height: H,
    stage: {
      d: "M 96 112 h 128 v 76 h -128 Z",
      label: "PITCH",
      x: 160,
      y: 150,
    },
    zones: [
      // Lower bowl — sidelines and ends around the pitch
      ...rectRow("af", 101, 96, 88, 128, 20, 5, false, centered(1, 0.7)),
      ...rectRow("af", 121, 96, 192, 128, 20, 5, false, centered(0.86, 0.6)),
      ...rectRow("af", 111, 66, 88, 24, 124, 4, true, centered(0.66, 0.48)),
      ...rectRow("af", 131, 230, 88, 24, 124, 4, true, centered(0.66, 0.48)),
      // Upper deck
      ...rectRow("af", 201, 66, 58, 188, 24, 6, false, centered(0.42, 0.28)),
      ...rectRow("af", 221, 66, 218, 188, 24, 6, false, centered(0.3, 0.14)),
      rect("af-supporters", "Supporters 301", 34, 88, 26, 124, 0.22, "301"),
      rect("af-302", "Section 302", 260, 88, 26, 124, 0.08, "302"),
    ],
  };
}

/** Belmore Theatre — proscenium Broadway house. */
function belmoreTheatre(): VenueLayout {
  const cx = 160;
  const cy = 44;
  return {
    width: W,
    height: H,
    stage: { d: "M 96 18 h 128 v 30 h -128 Z", label: "STAGE", x: 160, y: 35 },
    zones: [
      ...ring("orch", cx, cy, 58, 104, 28, 152, 5, {
        startNumber: 1,
        tier: centered(1, 0.74),
        namePrefix: "Orchestra",
      }),
      ...ring("mezz", cx, cy, 112, 156, 24, 156, 5, {
        startNumber: 1,
        tier: centered(0.6, 0.42),
        namePrefix: "Mezzanine",
      }),
      ...ring("balc", cx, cy, 164, 206, 22, 158, 5, {
        startNumber: 1,
        tier: centered(0.24, 0.06),
        namePrefix: "Balcony",
      }),
    ],
  };
}

/** The Fillmore — small general-admission hall with a horseshoe balcony. */
function theFillmore(): VenueLayout {
  return {
    width: W,
    height: H,
    stage: { d: "M 84 18 h 152 v 30 h -152 Z", label: "STAGE", x: 160, y: 33 },
    zones: [
      rect("fill-pit", "GA Pit", 92, 60, 136, 44, 1, "PIT"),
      rect("fill-floor-l", "Floor Left", 60, 112, 60, 62, 0.72),
      rect("fill-floor-c", "Floor Center", 126, 112, 68, 62, 0.82, "GA"),
      rect("fill-floor-r", "Floor Right", 200, 112, 60, 62, 0.72),
      rect("fill-rear", "Rear GA", 60, 182, 200, 34, 0.4, "REAR GA"),
      rect("fill-bar", "Bar Level", 60, 224, 96, 30, 0.3, "BAR"),
      rect("fill-balc-l", "Balcony Left", 162, 224, 46, 30, 0.5),
      rect("fill-balc-r", "Balcony Right", 214, 224, 46, 30, 0.5),
    ],
  };
}

const BY_VENUE: Record<string, () => VenueLayout> = {
  "madison square garden": madisonSquareGarden,
  "granite arena": graniteArena,
  "anchor field": anchorField,
  "belmore theatre": belmoreTheatre,
  "the fillmore": theFillmore,
};

/** Layout for a specific venue, falling back to a category-shaped generic bowl. */
export function getVenueLayout(
  venue: string,
  category: "Concert" | "Sports" | "Theater",
): VenueLayout {
  const exact = BY_VENUE[venue.trim().toLowerCase()];
  if (exact) return exact();
  if (category === "Sports") return graniteArena();
  if (category === "Theater") return belmoreTheatre();
  return madisonSquareGarden();
}
