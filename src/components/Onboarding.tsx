import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Eye, Receipt, Search, ShieldCheck, Star } from "lucide-react";
import logo from "@/assets/passr-logo.png.asset.json";
import { onboardingQuestions } from "@/lib/onboarding-questions";
import { getProfile, saveProfile } from "@/lib/profile";

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

type Stage = "signup" | "questions" | "tour";

export function Onboarding({ onDone }: { onDone?: () => void }) {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<Stage>("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [tourIndex, setTourIndex] = useState(0);

  useEffect(() => {
    if (!getProfile()) setOpen(true);
  }, []);

  const question = onboardingQuestions[qIndex];
  const selected = useMemo(
    () => (question ? (answers[question.id] ?? []) : []),
    [answers, question],
  );

  if (!open) return null;

  const finish = () => {
    saveProfile({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      answers,
      completedAt: new Date().toISOString(),
    });
    setOpen(false);
    onDone?.();
  };

  const submitSignup = () => {
    if (!name.trim()) return setError("we just need a first name");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError("that email looks off");
    setError("");
    setStage("questions");
  };

  const toggle = (option: string) => {
    if (!question) return;
    setAnswers((prev) => {
      const current = prev[question.id] ?? [];
      if (question.multi) {
        return {
          ...prev,
          [question.id]: current.includes(option)
            ? current.filter((o) => o !== option)
            : [...current, option],
        };
      }
      return { ...prev, [question.id]: [option] };
    });
  };

  const nextQuestion = () => {
    if (qIndex < onboardingQuestions.length - 1) setQIndex(qIndex + 1);
    else setStage("tour");
  };

  const back = () => {
    if (stage === "questions") {
      if (qIndex === 0) setStage("signup");
      else setQIndex(qIndex - 1);
    } else if (stage === "tour") {
      if (tourIndex === 0) {
        setStage("questions");
        setQIndex(onboardingQuestions.length - 1);
      } else setTourIndex(tourIndex - 1);
    }
  };

  const totalSteps = 1 + onboardingQuestions.length + tourSteps.length;
  const currentStep =
    stage === "signup" ? 0 : stage === "questions" ? 1 + qIndex : 1 + onboardingQuestions.length + tourIndex;

  return (
    <div className="fixed inset-0 z-50 mx-auto flex max-w-md flex-col overflow-y-auto bg-brand px-7 py-10 text-background">
      <div className="flex items-center justify-between">
        {stage === "signup" ? (
          <span className="h-9 w-9" />
        ) : (
          <button onClick={back} aria-label="Back" className="-ml-2 p-2">
            <ArrowLeft className="h-5 w-5 text-background/70" />
          </button>
        )}
        <img src={logo.url} alt="Passr" className="h-14 w-14 object-contain" />
        <span className="h-9 w-9" />
      </div>

      {stage === "signup" && (
        <div className="mt-auto">
          <h1 className="text-4xl leading-[1.05] font-bold lowercase tracking-tight">
            let's get you the real price
          </h1>
          <p className="mt-4 text-base leading-relaxed text-background/70">
            Tell us where to reach you and we'll message you when prices drop on artists, teams and
            shows you care about.
          </p>

          <div className="mt-8 space-y-3">
            <Field label="First name" value={name} onChange={setName} placeholder="Alex" />
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
          {error && <p className="mt-3 text-sm text-background/80">{error}</p>}
        </div>
      )}

      {stage === "questions" && question && (
        <div className="mt-8">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-background/50">
            Question {qIndex + 1} of {onboardingQuestions.length}
          </p>
          <h1 className="mt-3 text-3xl leading-[1.1] font-bold lowercase tracking-tight">
            {question.question}
          </h1>
          {question.hint && <p className="mt-2 text-sm text-background/60">{question.hint}</p>}

          <div className="mt-6 space-y-2.5">
            {question.options.map((option) => {
              const on = selected.includes(option);
              return (
                <button
                  key={option}
                  onClick={() => toggle(option)}
                  className={`flex w-full items-center justify-between rounded-2xl border px-5 py-4 text-left text-base font-semibold transition-colors ${
                    on
                      ? "border-background bg-background text-brand"
                      : "border-background/25 text-background"
                  }`}
                >
                  {option}
                  {on && <Check className="h-4 w-4" strokeWidth={3} />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {stage === "tour" && (
        <div className="mt-auto">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-background/50">
            How Passr works
          </p>
          {(() => {
            const { icon: Icon, title, body } = tourSteps[tourIndex]!;
            return (
              <>
                <Icon className="mt-6 h-9 w-9 text-background" strokeWidth={1.6} />
                <h1 className="mt-6 text-4xl leading-[1.05] font-bold lowercase tracking-tight">
                  {title}
                </h1>
                <p className="mt-4 text-base leading-relaxed text-background/70">{body}</p>
              </>
            );
          })()}
        </div>
      )}

      <div className="mt-auto pt-10">
        <div className="mb-6 flex gap-1.5">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <span
              key={i}
              className={`h-1 flex-1 rounded-full ${i <= currentStep ? "bg-background" : "bg-background/20"}`}
            />
          ))}
        </div>

        {stage === "signup" && (
          <button
            onClick={submitSignup}
            className="w-full rounded-full bg-background py-4 text-base font-bold lowercase tracking-wide text-brand"
          >
            continue
          </button>
        )}

        {stage === "questions" && (
          <>
            <button
              onClick={nextQuestion}
              disabled={selected.length === 0}
              className="w-full rounded-full bg-background py-4 text-base font-bold lowercase tracking-wide text-brand disabled:opacity-40"
            >
              {qIndex === onboardingQuestions.length - 1 ? "see how it works" : "next"}
            </button>
            <button
              onClick={nextQuestion}
              className="mt-3 w-full py-2 text-sm font-medium lowercase text-background/50"
            >
              skip
            </button>
          </>
        )}

        {stage === "tour" && (
          <button
            onClick={() =>
              tourIndex === tourSteps.length - 1 ? finish() : setTourIndex(tourIndex + 1)
            }
            className="w-full rounded-full bg-background py-4 text-base font-bold lowercase tracking-wide text-brand"
          >
            {tourIndex === tourSteps.length - 1 ? "start checking prices" : "next"}
          </button>
        )}
      </div>
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
