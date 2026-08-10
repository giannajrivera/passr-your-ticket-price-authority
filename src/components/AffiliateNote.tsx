export function AffiliateNote({ className = "" }: { className?: string }) {
  return (
    <p
      className={`text-center text-[11px] leading-relaxed text-muted-foreground ${className}`}
    >
      Heads up: Passr may earn an affiliate commission when you buy through a marketplace link. It
      never changes the price you pay, and it never changes how we rank listings — cheapest
      out-the-door always comes first.
    </p>
  );
}
