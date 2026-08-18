import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Eye,
  Receipt,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
} from "lucide-react";
import logo from "@/assets/passr-logo.png.asset.json";
import {
  clearProfile,
  getProfile,
  saveProfile,
  syncProfileToSupabase,
  type PassrProfile,
} from "@/lib/profile";
import { useAuth } from "@/lib/auth";
import {
  taxonomy,
  labelFor,
  type TaxonomyCategory,
  type TaxonomyNode,
} from "@/lib/taxonomy";
import {
  budgetOptions,
  emptyPreferences,
  horizonOptions,
  interestsByCategory,
  labelForBudget,
  labelForHorizon,
  labelForTravel,
  labelForVibe,
  toLegacyAnswers,
  travelOptions,
  vibeOptions,
  type EventPreferences,
  type EventVibe,
} from "@/lib/preferences";

const tourSteps = [
  {
    icon: Search,
    title: "search anything, see the real price",
    body: "Type an artist, team or show. Every price already includes fees, so nothing changes at checkout.",
  },
  {
    icon: Receipt,
    title: "compare every marketplace at once",
    body: "Open an event to see StubHub, SeatGeek, Vivid Seats and Ticketmaster side by side, cheapest first.",
  },
  {
    icon: Eye,
    title: "check a listing before you buy",
    body: "Paste any listing price and we'll tell you if it's below, at, or above the 30-day market average.",
  },
  {
    icon: Star,
    title: "save it to your watchlist",
    body: "Tap the star on any event and we'll message you when the out-the-door price drops.",
  },
  {
    icon: ShieldCheck,
    title: "we only read, never touch",
    body: "Passr doesn't sell tickets or move prices. It just shows you what's out there.",
  },
];

type Step =
  | { kind: "signup" }
  | { kind: "categories" }
  | { kind: "drill"; categoryId: string }
  | { kind: "budget" }
  | { kind: "travel" }
  | { kind: "horizon" }
  | { kind: "vibes" }
  | { kind: "review" }
  | { kind: "tour"; index: number };

export function Onboarding({ onDone }: { onDone?: () => void }) {
  const { user, sendMagicLink } = useAuth();

  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [prefs, setPrefs] = useState<EventPreferences>(emptyPreferences);
  const [expanded, setExpanded] = useState<string[]>([]);

  useEffect(() => {
    // Preview/demo helper: start each fresh preview session (or ?onboarding=1)
    // at the very beginning of onboarding.
    const params = new URLSearchParams(window.location.search);
    const forced = params.get("onboarding") === "1";
    const host = window.location.hostname;
    const isPreview =
      host.includes("lovableproject.com") ||
      host.includes("-preview--") ||
      host === "localhost";
    const sessionKey = "passr:onboarding-session";
    const freshSession =
      isPreview && !window.sessionStorage.getItem(sessionKey);

    if (forced || freshSession) {
      window.sessionStorage.setItem(sessionKey, "1");
      clearProfile();
      setOpen(true);
      return;
    }

    if (!getProfile()) setOpen(true);
  }, []);


  const steps: Step[] = useMemo(() => {
    const drills: Step[] = prefs.categories.map((categoryId) => ({
      kind: "drill",
      categoryId,
    }));

    return [
      { kind: "signup" },
      { kind: "categories" },
      ...drills,
      { kind: "budget" },
      { kind: "travel" },
      { kind: "horizon" },
      { kind: "vibes" },
      { kind: "review" },
      ...tourSteps.map((_, index) => ({ kind: "tour", index }) as Step),
    ];
  }, [prefs.categories]);

  const step = steps[Math.min(stepIndex, steps.length - 1)]!;

  if (!open) return null;

  const finish = async () => {
    const profile: PassrProfile = {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      answers: toLegacyAnswers(prefs),
      preferences: prefs,
      completedAt: new Date().toISOString(),
    };

    // Keep the existing local cache.
    saveProfile(profile);

    // If the user isn't authenticated yet, send a magic link.
    if (!user && profile.email) {
      const { error } = await sendMagicLink(profile.email);

      if (error) {
        console.error("[Passr] Failed to send magic link:", error);
      }
    }

    // If already authenticated, immediately sync to Supabase.
    if (user) {
      await syncProfileToSupabase(user.id);
    }

    setOpen(false);
    onDone?.();
  };

  const next = () => {
    if (stepIndex >= steps.length - 1) {
      void finish();
    } else {
      setStepIndex(stepIndex + 1);
    }
  };

  const back = () => setStepIndex(Math.max(0, stepIndex - 1));

  const submitSignup = () => {
    if (!name.trim()) {
      return setError("we just need a first name");
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return setError("that email looks off");
    }

    setError("");
    next();
  };

  const toggleCategory = (id: string) =>
    setPrefs((p) => ({
      ...p,
      categories: p.categories.includes(id)
        ? p.categories.filter((c) => c !== id)
        : [...p.categories, id],
      // dropping a category drops everything selected beneath it
      interests: p.categories.includes(id)
        ? p.interests.filter((i) => !i.startsWith(`${id}.`))
        : p.interests,
    }));

  const toggleInterest = (id: string) =>
    setPrefs((p) => ({
      ...p,
      interests: p.interests.includes(id)
        ? p.interests.filter((i) => i !== id)
        : [...p.interests, id],
    }));

  const toggleExpanded = (id: string) =>
    setExpanded((e) =>
      e.includes(id) ? e.filter((x) => x !== id) : [...e, id],
    );

  const toggleVibe = (id: EventVibe) =>
    setPrefs((p) => ({
      ...p,
      vibes: p.vibes.includes(id)
        ? p.vibes.filter((v) => v !== id)
        : [...p.vibes, id],
    }));

  const canContinue =
    step.kind === "categories" ? prefs.categories.length > 0 : true;

  const skippable =
    step.kind === "drill" ||
    step.kind === "budget" ||
    step.kind === "travel" ||
    step.kind === "horizon" ||
    step.kind === "vibes";

  return (
    <div className="fixed inset-0 z-50 mx-auto flex max-w-md flex-col overflow-y-auto bg-brand px-7 py-10 text-background">
      <div className="flex items-center justify-between">
        {stepIndex === 0 ? (
          <span className="h-9 w-9" />
        ) : (
          <button onClick={back} aria-label="Back" className="-ml-2 p-2">
            <ArrowLeft className="h-5 w-5 text-background/70" />
          </button>
        )}

        <img
          src={logo.url}
          alt="Passr"
          className="h-14 w-14 object-contain"
        />

        <span className="h-9 w-9" />
      </div>

      {step.kind === "signup" && (
        <div className="mt-auto animate-in fade-in duration-300">
          <h1 className="text-4xl leading-[1.05] font-bold lowercase tracking-tight">
            let's get you the real price
          </h1>

          <p className="mt-4 text-base leading-relaxed text-background/70">
            Tell us where to reach you and we'll message you when prices drop
            on artists, teams and shows you care about.
          </p>

          <div className="mt-8 space-y-3">
            <Field
              label="First name"
              value={name}
              onChange={setName}
              placeholder="Alex"
            />

            <Field
              label="Email"
              value={email}
              onChange={setEmail}
              placeholder="you@email.com"
              type="email"
            />

            <Field
              label="Phone (optional)"
              value={phone}
              onChange={setPhone}
              placeholder="(555) 123-4567"
              type="tel"
            />
          </div>

          {error && (
            <p className="mt-3 text-sm text-background/80">{error}</p>
          )}
        </div>
      )}

      {step.kind === "categories" && (
        <div className="mt-8 animate-in fade-in duration-300">
          <Eyebrow>Step 1 · your taste</Eyebrow>

          <h1 className="mt-3 text-3xl leading-[1.1] font-bold lowercase tracking-tight">
            what do you go out for?
          </h1>

          <p className="mt-2 text-sm text-background/60">
            Pick as many as you like — we'll get specific next.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-2.5">
            {taxonomy.map((c) => (
              <CategoryCard
                key={c.id}
                category={c}
                on={prefs.categories.includes(c.id)}
                onClick={() => toggleCategory(c.id)}
              />
            ))}
          </div>
        </div>
      )}

      {step.kind === "drill" && (
        <DrillStep
          categoryId={step.categoryId}
          interests={prefs.interests}
          expanded={expanded}
          onToggleInterest={toggleInterest}
          onToggleExpanded={toggleExpanded}
        />
      )}

      {step.kind === "budget" && (
        <ChoiceStep
          eyebrow="Step 2 · budget"
          title="what's a normal ticket for you?"
          hint="Out-the-door, fees included."
          options={budgetOptions}
          selected={prefs.budget ? [prefs.budget] : []}
          onSelect={(id) =>
            setPrefs((p) => ({
              ...p,
              budget: id as EventPreferences["budget"],
            }))
          }
        />
      )}

      {step.kind === "travel" && (
        <ChoiceStep
          eyebrow="Step 3 · distance"
          title="how far will you travel?"
          options={travelOptions}
          selected={prefs.travel ? [prefs.travel] : []}
          onSelect={(id) =>
            setPrefs((p) => ({
              ...p,
              travel: id as EventPreferences["travel"],
            }))
          }
        />
      )}

      {step.kind === "horizon" && (
        <ChoiceStep
          eyebrow="Step 4 · timing"
          title="when are you looking to go?"
          options={horizonOptions}
          selected={prefs.horizon ? [prefs.horizon] : []}
          onSelect={(id) =>
            setPrefs((p) => ({
              ...p,
              horizon: id as EventPreferences["horizon"],
            }))
          }
        />
      )}

      {step.kind === "vibes" && (
        <ChoiceStep
          eyebrow="Step 5 · the vibe"
          title="how do you like to go out?"
          hint="Pick as many as fit."
          options={vibeOptions}
          selected={prefs.vibes}
          onSelect={(id) => toggleVibe(id as EventVibe)}
        />
      )}

      {step.kind === "review" && (
        <ReviewStep prefs={prefs} name={name} />
      )}

      {step.kind === "tour" && (
        <div className="mt-auto animate-in fade-in duration-300">
          <Eyebrow>How Passr works</Eyebrow>

          {(() => {
            const { icon: Icon, title, body } = tourSteps[step.index]!;

            return (
              <>
                <Icon
                  className="mt-6 h-9 w-9 text-background"
                  strokeWidth={1.6}
                />

                <h1 className="mt-6 text-4xl leading-[1.05] font-bold lowercase tracking-tight">
                  {title}
                </h1>

                <p className="mt-4 text-base leading-relaxed text-background/70">
                  {body}
                </p>
              </>
            );
          })()}
        </div>
      )}

      <div className="mt-auto pt-10">
        <div className="mb-6 flex gap-1.5">
          {steps.map((_, i) => (
            <span
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                i <= stepIndex
                  ? "bg-background"
                  : "bg-background/20"
              }`}
            />
          ))}
        </div>

        <button
          onClick={step.kind === "signup" ? submitSignup : next}
          disabled={!canContinue}
          className="w-full rounded-full bg-background py-4 text-base font-bold lowercase tracking-wide text-brand transition-opacity disabled:opacity-40"
        >
          {step.kind === "review"
            ? "looks right"
            : step.kind === "tour"
              ? step.index === tourSteps.length - 1
                ? "start checking prices"
                : "next"
              : "continue"}
        </button>

        {skippable && (
          <button
            onClick={next}
            className="mt-3 w-full py-2 text-sm font-medium lowercase text-background/50"
          >
            skip for now
          </button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ sub-views */

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold uppercase tracking-[0.16em] text-background/50">
      {children}
    </p>
  );
}

function CategoryCard({
  category,
  on,
  onClick,
}: {
  category: TaxonomyCategory;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={`rounded-2xl border p-3.5 text-left transition-all active:scale-[0.98] ${
        on
          ? "border-background bg-background text-brand"
          : "border-background/25 text-background"
      }`}
    >
      <span className="text-xl leading-none">{category.emoji}</span>

      <span className="mt-2 block text-sm font-bold leading-tight">
        {category.label}
      </span>

      <span
        className={`mt-1 block text-[11px] leading-snug ${
          on ? "text-brand/60" : "text-background/45"
        }`}
      >
        {category.blurb}
      </span>
    </button>
  );
}

function Chip({
  label,
  on,
  onClick,
  small,
}: {
  label: string;
  on: boolean;
  onClick: () => void;
  small?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={`inline-flex items-center gap-1.5 rounded-full border transition-all active:scale-[0.97] ${
        small
          ? "px-3 py-1.5 text-xs"
          : "px-4 py-2 text-sm"
      } font-semibold ${
        on
          ? "border-background bg-background text-brand"
          : "border-background/25 text-background/90"
      }`}
    >
      {label}

      {on && (
        <Check
          className="h-3 w-3"
          strokeWidth={3}
        />
      )}
    </button>
  );
}

function DrillStep({
  categoryId,
  interests,
  expanded,
  onToggleInterest,
  onToggleExpanded,
}: {
  categoryId: string;
  interests: string[];
  expanded: string[];
  onToggleInterest: (id: string) => void;
  onToggleExpanded: (id: string) => void;
}) {
  const category = taxonomy.find((c) => c.id === categoryId);

  if (!category) return null;

  const single = category.children.length === 1;

  const groups: TaxonomyNode[] = single
    ? category.children[0]!.children
    : category.children;

  return (
    <div className="mt-8 animate-in fade-in duration-300">
      <Eyebrow>
        {category.emoji} {category.label}
      </Eyebrow>

      <h1 className="mt-3 text-3xl leading-[1.1] font-bold lowercase tracking-tight">
        {single
          ? "what should we watch for?"
          : `what kind of ${category.label.toLowerCase()}?`}
      </h1>

      <p className="mt-2 text-sm text-background/60">
        {single
          ? "Tap anything that fits."
          : "Tap a group to see the specifics."}
      </p>

      {single ? (
        <div className="mt-6 flex flex-wrap gap-2">
          {groups.map((n) => (
            <Chip
              key={n.id}
              label={n.label}
              on={interests.includes(n.id)}
              onClick={() => onToggleInterest(n.id)}
            />
          ))}
        </div>
      ) : (
        <div className="mt-6 space-y-2">
          {groups.map((group) => {
            const isOpen = expanded.includes(group.id);

            const picked = interests.filter((i) =>
              i.startsWith(`${group.id}.`)
            ).length;

            const groupOn = interests.includes(group.id);

            return (
              <div
                key={group.id}
                className="rounded-2xl border border-background/20"
              >
                <button
                  onClick={() => onToggleExpanded(group.id)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                >
                  <span className="text-base font-bold">
                    {group.label}
                  </span>

                  <span className="flex items-center gap-2">
                    {picked > 0 && (
                      <span className="rounded-full bg-background px-2 py-0.5 text-[11px] font-bold text-brand">
                        {picked}
                      </span>
                    )}

                    <ChevronDown
                      className={`h-4 w-4 text-background/60 transition-transform ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </span>
                </button>

                {isOpen && (
                  <div className="animate-in fade-in slide-in-from-top-1 space-y-2 px-4 pb-4 duration-200">
                    <div className="flex flex-wrap gap-2">
                      <Chip
                        small
                        label={`All ${group.label}`}
                        on={groupOn}
                        onClick={() =>
                          onToggleInterest(group.id)
                        }
                      />

                      {group.children.map((option) => (
                        <Chip
                          key={option.id}
                          small
                          label={option.label}
                          on={interests.includes(option.id)}
                          onClick={() =>
                            onToggleInterest(option.id)
                          }
                        />
                      ))}
                    </div>

                    {group.children
                      .filter(
                        (o) =>
                          o.children.length > 0 &&
                          interests.includes(o.id),
                      )
                      .map((o) => (
                        <div
                          key={`${o.id}-sub`}
                          className="flex flex-wrap gap-2 pl-1"
                        >
                          {o.children.map((sub) => (
                            <Chip
                              key={sub.id}
                              small
                              label={sub.label}
                              on={interests.includes(sub.id)}
                              onClick={() =>
                                onToggleInterest(sub.id)
                              }
                            />
                          ))}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ChoiceStep({
  eyebrow,
  title,
  hint,
  options,
  selected,
  onSelect,
}: {
  eyebrow: string;
  title: string;
  hint?: string;
  options: { id: string; label: string }[];
  selected: string[];
  onSelect: (id: string) => void;
}) {
  return (
    <div className="mt-8 animate-in fade-in duration-300">
      <Eyebrow>{eyebrow}</Eyebrow>

      <h1 className="mt-3 text-3xl leading-[1.1] font-bold lowercase tracking-tight">
        {title}
      </h1>

      {hint && (
        <p className="mt-2 text-sm text-background/60">
          {hint}
        </p>
      )}

      <div className="mt-6 space-y-2.5">
        {options.map((o) => {
          const on = selected.includes(o.id);

          return (
            <button
              key={o.id}
              onClick={() => onSelect(o.id)}
              aria-pressed={on}
              className={`flex w-full items-center justify-between rounded-2xl border px-5 py-4 text-left text-base font-semibold transition-all active:scale-[0.99] ${
                on
                  ? "border-background bg-background text-brand"
                  : "border-background/25 text-background"
              }`}
            >
              {o.label}

              {on && (
                <Check
                  className="h-4 w-4"
                  strokeWidth={3}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ReviewStep({
  prefs,
  name,
}: {
  prefs: EventPreferences;
  name: string;
}) {
  const grouped = interestsByCategory(prefs);

  return (
    <div className="mt-8 animate-in fade-in duration-300">
      <Eyebrow>
        <span className="inline-flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5" />
          Your taste profile
        </span>
      </Eyebrow>

      <h1 className="mt-3 text-3xl leading-[1.1] font-bold lowercase tracking-tight">
        here's what passr knows
        {name.trim()
          ? ` about ${name.trim().toLowerCase()}`
          : " about your taste"}
      </h1>

      <div className="mt-6 space-y-3">
        {prefs.categories.map((catId) => {
          const picks = grouped.get(catId) ?? [];

          return (
            <div
              key={catId}
              className="rounded-2xl border border-background/20 px-4 py-3"
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-background/50">
                {labelFor(catId)}
              </p>

              <p className="mt-1 text-sm font-semibold leading-snug">
                {picks.length
                  ? picks.map(labelFor).join(" · ")
                  : "Everything in this category"}
              </p>
            </div>
          );
        })}

        <div className="rounded-2xl border border-background/20 px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-background/50">
            How you buy
          </p>

          <p className="mt-1 text-sm font-semibold leading-snug">
            {[
              labelForBudget(prefs.budget),
              labelForTravel(prefs.travel),
              labelForHorizon(prefs.horizon),
              ...prefs.vibes.map(labelForVibe),
            ]
              .filter(Boolean)
              .join(" · ") ||
              "No preference yet — we'll learn as you browse."}
          </p>
        </div>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-background/50">
        You can change any of this later. Passr uses it only to rank what
        shows up in your feed.
      </p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <label className="block rounded-2xl bg-background/10 px-5 py-3">
      <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-background/50">
        {label}
      </span>

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full bg-transparent text-base text-background outline-none placeholder:text-background/35"
      />
    </label>
  );
}
