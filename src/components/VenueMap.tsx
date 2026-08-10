import { useMemo } from "react";
import { getVenueLayout } from "@/lib/venue-maps";
import type { MockPassrEvent, Section } from "@/lib/mock-data";
import { money } from "@/lib/mock-data";

export function VenueMap({
  event,
  selectedId,
  onSelect,
}: {
  event: MockPassrEvent;
  selectedId: string;
  onSelect: (sectionId: string) => void;
}) {
  const layout = useMemo(() => getVenueLayout(event.category), [event.category]);

  const byZone = useMemo(() => {
    const map = new Map<string, Section>();
    for (const s of event.sections) map.set(s.zone, s);
    return map;
  }, [event.sections]);

  const selected = event.sections.find((s) => s.id === selectedId);

  const prices = event.sections.map((s) => s.base);
  const min = Math.min(...prices);
  const max = Math.max(...prices);

  const tint = (s: Section) => {
    if (max === min) return 0.45;
    return 0.22 + ((s.base - min) / (max - min)) * 0.55;
  };

  return (
    <div className="rounded-2xl border border-border p-4">
      <svg
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        role="img"
        aria-label={`Seat map of ${event.venue}`}
        className="w-full"
      >
        {/* stage / field */}
        <path d={layout.stage.d} className="fill-foreground" />
        <text
          x={layout.stage.x}
          y={layout.stage.y}
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-background"
          style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.4 }}
        >
          {layout.stage.label}
        </text>

        {layout.zones.map((z) => {
          const section = byZone.get(z.id);
          const isSelected = !!section && section.id === selectedId;
          if (!section) {
            return (
              <path
                key={z.id}
                d={z.d}
                className="fill-muted stroke-border"
                strokeWidth={1}
                aria-hidden="true"
              />
            );
          }
          return (
            <g key={z.id}>
              <path
                d={z.d}
                onClick={() => onSelect(section.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") onSelect(section.id);
                }}
                aria-label={`${section.name}, from ${money(section.base)}`}
                className="cursor-pointer fill-primary stroke-primary transition-opacity"
                style={{ fillOpacity: isSelected ? 1 : tint(section) }}
                strokeWidth={isSelected ? 2.5 : 0.75}
              />
              {z.label && z.labelX !== undefined && z.labelY !== undefined ? (
                <text
                  x={z.labelX}
                  y={z.labelY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="pointer-events-none fill-background"
                  style={{ fontSize: 12, fontWeight: 700 }}
                >
                  {z.label}
                </text>
              ) : z.labelX !== undefined && z.labelY !== undefined ? (
                <circle
                  cx={z.labelX}
                  cy={z.labelY}
                  r={isSelected ? 3 : 1.8}
                  className="pointer-events-none fill-background"
                />
              ) : null}
            </g>
          );
        })}
      </svg>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{selected?.name ?? "Pick a section"}</p>
          <p className="text-xs text-muted-foreground">
            Tap a highlighted section to price it out.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-primary opacity-30" />
          <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            cheap
          </span>
          <span className="ml-1 h-3 w-3 rounded-sm bg-primary" />
          <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            premium
          </span>
        </div>
      </div>
    </div>
  );
}
