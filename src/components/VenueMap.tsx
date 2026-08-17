import { useMemo } from "react";
import { getVenueLayout } from "@/lib/venue-maps";
import type { ZoneInventory } from "@/lib/venue-listings";
import type { PassrEvent } from "@/lib/types";
import { money } from "@/lib/mock-data";

export function VenueMap({
  event,
  inventory,
  selectedId,
  onSelect,
}: {
  event: PassrEvent;
  inventory: Map<string, ZoneInventory>;
  selectedId: string;
  onSelect: (zoneId: string) => void;
}) {
  const layout = useMemo(
    () => getVenueLayout(event.venue, event.category),
    [event.venue, event.category],
  );

  const { min, max } = useMemo(() => {
    const prices = [...inventory.values()].filter((i) => !i.soldOut).map((i) => i.from);
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }, [inventory]);

  const selected = inventory.get(selectedId);

  const tint = (from: number) => {
    if (max === min) return 0.45;
    return 0.22 + ((from - min) / (max - min)) * 0.6;
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
          const inv = inventory.get(z.id);
          const isSelected = z.id === selectedId;

          if (!inv || inv.soldOut) {
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
                onClick={() => onSelect(z.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") onSelect(z.id);
                }}
                aria-label={`${z.name}, ${inv.seats} tickets from ${money(inv.from)}`}
                className="cursor-pointer fill-primary stroke-primary transition-opacity"
                style={{ fillOpacity: isSelected ? 1 : tint(inv.from) }}
                strokeWidth={isSelected ? 2.5 : 0.75}
              />
              {z.label && z.labelX !== undefined && z.labelY !== undefined ? (
                <text
                  x={Math.round(z.labelX * 10) / 10}
                  y={Math.round(z.labelY * 10) / 10}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="pointer-events-none fill-background"
                  style={{ fontSize: z.label.length > 4 ? 8 : 10, fontWeight: 700 }}
                >
                  {z.label}
                </text>
              ) : z.labelX !== undefined && z.labelY !== undefined ? (
                <circle
                  cx={Math.round(z.labelX * 10) / 10}
                  cy={Math.round(z.labelY * 10) / 10}
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
          <p className="truncate text-sm font-bold">{selected?.zone.name ?? "Pick a section"}</p>
          <p className="text-xs text-muted-foreground">
            {selected && !selected.soldOut
              ? `${selected.seats} tickets from ${money(selected.from)}`
              : "Tap a highlighted section to see what's available."}
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
      <p className="mt-2 text-[11px] text-muted-foreground">
        Grey sections have no tickets left right now.
      </p>
    </div>
  );
}
