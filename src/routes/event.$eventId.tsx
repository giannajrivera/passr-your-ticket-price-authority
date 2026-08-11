import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Bell, BellOff, Check, Minus, Plus, ShieldCheck, Ticket } from "lucide-react";
import { getEvent, money, quotesFor } from "@/lib/mock-data";
import { getVenueLayout } from "@/lib/venue-maps";
import { venueInventory } from "@/lib/venue-listings";
import { BottomNav } from "@/components/BottomNav";
import { VenueMap } from "@/components/VenueMap";
import { AffiliateNote } from "@/components/AffiliateNote";
import { isSaved, toggleSaved, useWatchlist } from "@/lib/watchlist";


export const Route = createFileRoute("/event/$eventId")({
  loader: ({ params }) => {
    const event = getEvent(params.eventId);
    if (!event) throw notFound();
    return { event };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Event unavailable — Passr" }, { name: "robots", content: "noindex" }] };
    }
    const { event } = loaderData;
    const title = `${event.name} — real prices on Passr`;
    const description = `${event.date} at ${event.venue}, ${event.city}. Compare out-the-door prices across four marketplaces from ${money(event.startingAt)}.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: EventDetail,
});

function EventDetail() {
  const { eventId } = Route.useParams();
  const event = getEvent(eventId)!;
  const watchlist = useWatchlist();
  const saved = isSaved(watchlist, event.id);

  const layout = useMemo(
    () => getVenueLayout(event.venue, event.category),
    [event.venue, event.category],
  );
  const inventory = useMemo(
    () => venueInventory(event.id, event.startingAt, layout.zones, event.category !== "Theater"),
    [event.id, event.startingAt, layout.zones, event.category],
  );

  const available = useMemo(
    () => [...inventory.values()].filter((i) => !i.soldOut).sort((a, b) => a.from - b.from),
    [inventory],
  );

  const [zoneId, setZoneId] = useState(
    () =>
      [...inventory.values()]
        .filter((i) => !i.soldOut)
        .sort((a, b) => b.zone.tier - a.zone.tier)[2]?.zone.id ??
      available[0]?.zone.id ??
      layout.zones[0]!.id,
  );

  const zone = inventory.get(zoneId) ?? available[0]!;
  const [listingId, setListingId] = useState<string | null>(null);
  const listing = zone.listings.find((l) => l.id === listingId) ?? zone.listings[0]!;

  const [people, setPeople] = useState(2);

  const quotes = useMemo(() => quotesFor(listing.base), [listing.base]);
  const cheapest = quotes[0]!;
  const delta = Math.round(((cheapest.total - zone.avg30) / zone.avg30) * 100);
  const below = cheapest.total < zone.avg30;

  const selectZone = (id: string) => {
    setZoneId(id);
    setListingId(null);
  };

  return (
    <main className="mx-auto min-h-screen max-w-md bg-background pb-28">
      <header className="relative">
        <img
          src={event.image}
          alt={event.name}
          width={1024}
          height={640}
          className="h-56 w-full object-cover"
        />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
          <Link
            to="/"
            aria-label="Back to search"
            className="grid h-10 w-10 place-items-center rounded-full bg-background/90"
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={2.2} />
          </Link>
          <button
            onClick={() => toggleSaved(event.id, cheapest.total)}
            aria-label={saved ? "Remove from watchlist" : "Save to watchlist"}
            className={`grid h-10 w-10 place-items-center rounded-full ${saved ? "bg-primary text-primary-foreground" : "bg-background/90 text-foreground"}`}
          >
            {saved ? <Bell className="h-5 w-5" strokeWidth={2.2} /> : <BellOff className="h-5 w-5" strokeWidth={2.2} />}
          </button>
        </div>
      </header>

      <section className="bg-foreground px-6 pt-6 pb-8 text-background">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-background/60">
          {event.category} · {event.subtitle}
        </p>
        <h1 className="mt-2 text-3xl font-bold leading-[1.1] tracking-tight">{event.name}</h1>
        <p className="mt-3 text-sm text-background/70">
          {event.date} · {event.venue}, {event.city}
        </p>
      </section>

      {/* Seat map + live listings for the tapped section */}
      <section className="px-6 pt-7">
        <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">
          {event.venue}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tap any section to see what's actually available there.
        </p>
        <div className="mt-3">
          <VenueMap event={event} inventory={inventory} selectedId={zone.zone.id} onSelect={selectZone} />
        </div>

        <div className="mt-4 rounded-2xl border border-border">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-base font-bold">{zone.zone.name}</p>
              <p className="text-xs text-muted-foreground">
                {zone.listings.length} {zone.listings.length === 1 ? "listing" : "listings"} ·{" "}
                {zone.seats} tickets
              </p>
            </div>
            <p className="price shrink-0 text-sm font-bold text-primary">from {money(zone.from)}</p>
          </div>
          <ul className="divide-y divide-border">
            {zone.listings.map((l) => {
              const active = l.id === listing.id;
              return (
                <li key={l.id}>
                  <button
                    onClick={() => setListingId(l.id)}
                    aria-pressed={active}
                    className={`flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left ${
                      active ? "bg-accent-soft" : ""
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <Ticket
                        className={`h-4 w-4 shrink-0 ${active ? "text-primary" : "text-muted-foreground"}`}
                        strokeWidth={2.2}
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold">Row {l.row}</span>
                        <span className="block text-xs text-muted-foreground">
                          {l.qty} {l.qty === 1 ? "ticket" : "tickets"} together
                        </span>
                      </span>
                    </span>
                    <span className="price shrink-0 text-lg font-bold">{money(l.base)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {available.slice(0, 8).map((i) => (
            <button
              key={i.zone.id}
              onClick={() => selectZone(i.zone.id)}
              className={`shrink-0 rounded-full border px-3.5 py-2 text-xs font-bold ${
                i.zone.id === zone.zone.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border"
              }`}
            >
              {i.zone.name} · {money(i.from)}
            </button>
          ))}
        </div>
      </section>



      {/* Out-the-door prices */}
      <section className="px-6 pt-8">
        <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Out-the-door price
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">Per ticket, every fee included.</p>
        <ul className="mt-4 space-y-2">
          {quotes.map((qt, i) => {
            const best = i === 0;
            return (
              <li
                key={qt.marketplace}
                className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-xl border px-4 py-4 ${
                  best ? "border-primary bg-accent-soft" : "border-border"
                }`}
              >
                <div className="min-w-0">
                  <p className="truncate text-base font-bold">{qt.marketplace}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {money(qt.base)} + {money(qt.fees)} fees
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className={`price text-2xl font-bold ${best ? "text-primary" : ""}`}>
                    {money(qt.total)}
                  </p>
                  {best && (
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
                      Cheapest
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Market value */}
      <section className="mx-6 mt-8 rounded-2xl border border-border p-6">
        <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Market value · 30-day avg
        </h2>
        <p className="price mt-3 text-6xl font-bold leading-none">{money(section.avg30)}</p>
        <p className="mt-3 text-sm text-muted-foreground">
          Average out-the-door price paid for {section.name} over the last 30 days.
        </p>
        <span
          className={`mt-4 inline-flex items-center rounded-full px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide ${
            below ? "bg-success-soft text-success" : "bg-accent-soft text-primary"
          }`}
        >
          {below
            ? `${Math.abs(delta)}% below average · good deal`
            : `${Math.abs(delta)}% above average`}
        </span>
      </section>

      {/* Listing check */}
      <section className="mx-6 mt-4 flex items-start gap-3 rounded-2xl border border-border p-5">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-success" strokeWidth={2.2} />
        <p className="text-sm leading-relaxed">
          <span className="font-bold">Listing check passed.</span>{" "}
          <span className="text-muted-foreground">
            Seller history, price movement, and delivery method all match normal patterns for this
            venue. Nothing looks off.
          </span>
        </p>
      </section>

      {/* Splitting */}
      <section className="mx-6 mt-4 rounded-2xl bg-foreground p-6 text-background">
        <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-background/60">
          Splitting with friends?
        </h2>
        <div className="mt-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Stepper
              label="Remove one person"
              disabled={people <= 1}
              onClick={() => setPeople((p) => Math.max(1, p - 1))}
            >
              <Minus className="h-5 w-5" strokeWidth={2.4} />
            </Stepper>
            <span className="price w-8 text-center text-2xl font-bold">{people}</span>
            <Stepper
              label="Add one person"
              disabled={people >= 10}
              onClick={() => setPeople((p) => Math.min(10, p + 1))}
            >
              <Plus className="h-5 w-5" strokeWidth={2.4} />
            </Stepper>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-background/60">
              per person
            </p>
            <p className="price text-4xl font-bold leading-none">
              {money(cheapest.total)}
            </p>
          </div>
        </div>
        <p className="mt-5 text-sm text-background/70">
          {people} {people === 1 ? "ticket" : "tickets"} on {cheapest.marketplace} ·{" "}
          <span className="font-bold text-background">{money(cheapest.total * people)}</span> total,
          fees included.
        </p>
      </section>

      <div className="space-y-3 px-6 pt-6">
        <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Check className="h-3.5 w-3.5 text-success" strokeWidth={3} />
          Passr only reads prices. We never mark them up.
        </p>
        <AffiliateNote />
      </div>


      <BottomNav />
    </main>
  );
}

function Stepper({
  children,
  onClick,
  disabled,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="grid h-11 w-11 place-items-center rounded-full border border-background/25 text-background disabled:opacity-30"
    >
      {children}
    </button>
  );
}
