import { useEffect, useState } from "react";
import { Eye, Receipt, ShieldCheck } from "lucide-react";
import logo from "@/assets/passr-logo.png.asset.json";

const KEY = "passr.onboarded.v1";

const steps = [
  {
    icon: Receipt,
    title: "the real price, nothing hidden",
    body: "We add every fee before we show you a number. What you see is what you'd actually pay at checkout.",
  },
  {
    icon: Eye,
    title: "know a good deal when you see one",
    body: "Every section is compared against its 30-day market average, so you can tell a bargain from a bad night.",
  },
  {
    icon: ShieldCheck,
    title: "we only read, never touch",
    body: "Passr doesn't sell tickets, move prices, or take credit for purchases it didn't influence. It just shows you what's out there.",
  },
];

export function Onboarding() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!window.localStorage.getItem(KEY)) setOpen(true);
  }, []);

  if (!open) return null;

  const finish = () => {
    window.localStorage.setItem(KEY, "1");
    setOpen(false);
  };

  const { icon: Icon, title, body } = steps[step]!;
  const last = step === steps.length - 1;

  return (
    <div className="fixed inset-0 z-50 mx-auto flex max-w-md flex-col bg-foreground px-7 py-12 text-background">
      <img src={logo.url} alt="Passr" className="mx-auto h-24 w-24 object-contain" />

      <div className="mt-auto">
        <Icon className="h-9 w-9 text-primary-foreground/90" strokeWidth={1.6} />
        <h1 className="mt-6 text-4xl leading-[1.05] font-bold lowercase tracking-tight">{title}</h1>
        <p className="mt-4 text-base leading-relaxed text-background/70">{body}</p>
      </div>

      <div className="mt-auto pt-10">
        <div className="mb-6 flex gap-2">
          {steps.map((_, i) => (
            <span
              key={i}
              className={`h-1 flex-1 rounded-full ${i <= step ? "bg-accent" : "bg-background/20"}`}
            />
          ))}
        </div>
        <button
          onClick={() => (last ? finish() : setStep(step + 1))}
          className="w-full rounded-full bg-accent py-4 text-base font-bold lowercase tracking-wide text-accent-foreground"
        >
          {last ? "start checking prices" : "next"}
        </button>
        {!last && (
          <button
            onClick={finish}
            className="mt-3 w-full py-2 text-sm font-medium lowercase text-background/50"
          >
            skip
          </button>
        )}
      </div>
    </div>
  );
}
