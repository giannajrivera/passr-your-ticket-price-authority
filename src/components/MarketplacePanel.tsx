import { ExternalLink, Ticket } from "lucide-react";

import type { EventMarketplace } from "@/lib/marketplaces";
import { money } from "@/lib/mock-data";

type MarketplacePanelProps = {
  marketplaces: EventMarketplace[];
};

export function MarketplacePanel({
  marketplaces,
}: MarketplacePanelProps) {
  if (marketplaces.length === 0) {
    return (
      <section className="px-6 pt-7">
        <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Find tickets
        </h2>

        <div className="mt-4 rounded-2xl border border-border p-5">
          <div className="flex items-start gap-3">
            <Ticket
              className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground"
              strokeWidth={2.2}
            />

            <div>
              <p className="text-sm font-bold">
                No direct ticket source found
              </p>

              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Passr doesn't show generic marketplace
                search links. We'll only show a ticket
                site when we have a direct link for this
                specific event.
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="px-6 pt-7">
      <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">
        Find tickets
      </h2>

      <p className="mt-1 text-sm text-muted-foreground">
        Buy tickets from the sites currently listing
        this event.
      </p>

      <div className="mt-4 space-y-2">
        {marketplaces.map((marketplace) => (
          <a
            key={marketplace.id}
            href={marketplace.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-4 rounded-xl border border-border px-4 py-4 transition-colors hover:bg-accent-soft"
          >
            <div className="min-w-0">
              <p className="truncate text-base font-bold">
                {marketplace.name}
              </p>

              {marketplace.startingPrice !==
              undefined ? (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Tickets from{" "}
                  <span className="font-semibold text-foreground">
                    {money(
                      marketplace.startingPrice,
                    )}
                  </span>
                </p>
              ) : (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Direct event listing
                </p>
              )}
            </div>

            <span className="flex shrink-0 items-center gap-2 rounded-full bg-foreground px-3.5 py-2 text-xs font-bold text-background">
              Buy tickets
              <ExternalLink
                className="h-3.5 w-3.5"
                strokeWidth={2.4}
              />
            </span>
          </a>
        ))}
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        Passr only shows ticket sources with a direct
        event listing. We don't generate generic
        marketplace search links.
      </p>
    </section>
  );
}