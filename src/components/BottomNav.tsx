import { Link } from "@tanstack/react-router";
import { Search, Bell, UserCircle } from "lucide-react";

export function BottomNav() {
  const base =
    "flex flex-1 flex-col items-center gap-1 py-3 text-[11px] font-semibold tracking-wide text-muted-foreground transition-colors";

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-md border-t border-border bg-background">
      <Link
        to="/"
        activeOptions={{ exact: true }}
        activeProps={{ className: "text-primary" }}
        className={base}
      >
        <Search className="h-5 w-5" strokeWidth={2.2} />
        Search
      </Link>

      <Link
        to="/watchlist"
        activeProps={{ className: "text-primary" }}
        className={base}
      >
        <Bell className="h-5 w-5" strokeWidth={2.2} />
        Watchlist
      </Link>

      <Link
        to="/account"
        activeProps={{ className: "text-primary" }}
        className={base}
      >
        <UserCircle className="h-5 w-5" strokeWidth={2.2} />
        Account
      </Link>
    </nav>
  );
}
