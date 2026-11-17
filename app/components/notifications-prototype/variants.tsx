// PROTOTYPE — throwaway. Lives on branch prototype/in-app-notifications-ui only.
// Question (issue #8): how should in-app Notifications look and behave in the
// Cadence web app — pop-up/toast, inbox, or both?
// Three structurally different variants, switchable via `?variant=A|B|C` and the
// floating bottom bar. State is in memory; "Simulate" fakes a new arrival.
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import { Bell, CheckCheck, ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { cn } from "~/lib/utils";
import type { ProtoNotification } from "./mock.server";

type Template = Omit<ProtoNotification, "id" | "minutesAgo" | "read">;

const VARIANTS = [
  { key: "A", name: "Bell + dropdown, no toasts" },
  { key: "B", name: "Toasts + inbox drawer" },
  { key: "C", name: "Toasts + inline strip, no inbox" },
] as const;
type VariantKey = (typeof VARIANTS)[number]["key"];

function ago(m: number) {
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  if (m < 60 * 24) return `${Math.round(m / 60)}h ago`;
  return `${Math.round(m / 60 / 24)}d ago`;
}

function useVariant(): [VariantKey, (v: VariantKey) => void] {
  const [params, setParams] = useSearchParams();
  const [stored, setStored] = useState<VariantKey>("A");
  useEffect(() => {
    try {
      const s = sessionStorage.getItem("notif-proto-variant") as VariantKey | null;
      if (s) setStored(s);
    } catch {}
  }, []);
  const fromUrl = params.get("variant") as VariantKey | null;
  const current = fromUrl && VARIANTS.some((v) => v.key === fromUrl) ? fromUrl : stored;
  const set = (v: VariantKey) => {
    setStored(v);
    try {
      sessionStorage.setItem("notif-proto-variant", v);
    } catch {}
    const next = new URLSearchParams(params);
    next.set("variant", v);
    setParams(next, { replace: true, preventScrollReset: true });
  };
  return [current, set];
}

// ---------------------------------------------------------------------------
// Shared state, owned by the layout so it survives navigation + variant flips
// ---------------------------------------------------------------------------
export function useProtoNotifications(initial: ProtoNotification[], pool: Template[], userKey: unknown) {
  const [items, setItems] = useState(initial);
  const [cursor, setCursor] = useState(0);
  // Reset when the DevUI switches user.
  useEffect(() => { setItems(initial); setCursor(0); }, [userKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const markRead = (id: string) =>
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, read: true } : x)));
  const markAllRead = () => setItems((xs) => xs.map((x) => ({ ...x, read: true })));
  const simulate = (): ProtoNotification | null => {
    if (!pool.length) return null;
    const t = pool[cursor % pool.length];
    setCursor((c) => c + 1);
    const n = { ...t, id: `sim-${Date.now()}`, minutesAgo: 0, read: false };
    setItems((xs) => [n, ...xs]);
    return n;
  };
  return { items, markRead, markAllRead, simulate };
}
type Store = ReturnType<typeof useProtoNotifications>;

function Row({ n, onOpen, compact }: { n: ProtoNotification; onOpen: () => void; compact?: boolean }) {
  return (
    <Link
      to={n.href}
      onClick={onOpen}
      className={cn(
        "flex gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent",
        !n.read && "bg-primary/5"
      )}
    >
      <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-primary")} />
      <span className="flex-1">
        <span className={cn(!n.read && "font-medium")}>{n.text}</span>
        {!compact && (
          <span className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
            {ago(n.minutesAgo)}
            {n.actionable && <span className="rounded bg-amber-500/15 px-1.5 text-amber-700 dark:text-amber-400">needs you</span>}
          </span>
        )}
      </span>
    </Link>
  );
}

function BellButton({ unread, onClick, active }: { unread: number; onClick: () => void; active?: boolean }) {
  // Sits in the sidebar header, right of the "Cadence" wordmark.
  return (
    <button
      onClick={onClick}
      title="Notifications"
      className={cn(
        "fixed left-[10.5rem] top-3 z-40 rounded-md p-2 text-sidebar-foreground/70 hover:bg-sidebar-accent",
        active && "bg-sidebar-accent"
      )}
    >
      <Bell className="size-4" />
      {unread > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
          {unread}
        </span>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Variant A — quiet: bell with unread badge, dropdown list. No toasts.
// ---------------------------------------------------------------------------
function VariantA({ store }: { store: Store }) {
  const [open, setOpen] = useState(false);
  const unread = store.items.filter((n) => !n.read).length;
  return (
    <>
      <BellButton unread={unread} onClick={() => setOpen((o) => !o)} active={open} />
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="fixed left-[10.5rem] top-12 z-50 w-96 rounded-lg border bg-popover shadow-xl">
            <div className="flex items-center justify-between border-b px-3 py-2">
              <span className="text-sm font-semibold">Notifications</span>
              <button onClick={store.markAllRead} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                <CheckCheck className="size-3.5" /> Mark all read
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto p-1">
              {store.items.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">You're all caught up.</p>}
              {store.items.map((n) => (
                <Row key={n.id} n={n} onOpen={() => { store.markRead(n.id); setOpen(false); }} />
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Variant B — toasts on arrival + full-height inbox drawer with Unread/All tabs,
// grouped Today / Earlier.
// ---------------------------------------------------------------------------
function VariantB({ store }: { store: Store }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"unread" | "all">("unread");
  const unread = store.items.filter((n) => !n.read).length;
  const shown = store.items.filter((n) => tab === "all" || !n.read);
  const today = shown.filter((n) => n.minutesAgo < 60 * 24);
  const earlier = shown.filter((n) => n.minutesAgo >= 60 * 24);
  const open_ = (n: ProtoNotification) => { store.markRead(n.id); setOpen(false); };
  return (
    <>
      <BellButton unread={unread} onClick={() => setOpen(true)} active={open} />
      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setOpen(false)} />
          <aside className="fixed right-0 top-0 z-50 flex h-screen w-[26rem] flex-col border-l bg-background shadow-2xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h2 className="text-base font-semibold">Notifications</h2>
              <button onClick={() => setOpen(false)} className="rounded p-1 hover:bg-accent"><X className="size-4" /></button>
            </div>
            <div className="flex items-center gap-1 border-b px-4 py-2">
              {(["unread", "all"] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)} className={cn("rounded-full px-3 py-1 text-xs font-medium capitalize", tab === t ? "bg-primary text-primary-foreground" : "hover:bg-accent")}>
                  {t}{t === "unread" && unread ? ` (${unread})` : ""}
                </button>
              ))}
              <button onClick={store.markAllRead} className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                <CheckCheck className="size-3.5" /> Mark all read
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {shown.length === 0 && <p className="p-10 text-center text-sm text-muted-foreground">Nothing unread.</p>}
              {today.length > 0 && <h3 className="px-3 pb-1 pt-2 text-xs font-semibold uppercase text-muted-foreground">Today</h3>}
              {today.map((n) => <Row key={n.id} n={n} onOpen={() => open_(n)} />)}
              {earlier.length > 0 && <h3 className="px-3 pb-1 pt-4 text-xs font-semibold uppercase text-muted-foreground">Earlier</h3>}
              {earlier.map((n) => <Row key={n.id} n={n} onOpen={() => open_(n)} />)}
            </div>
          </aside>
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Variant C — no inbox, no bell. Toasts on arrival; anything unread stays as an
// inline strip at the top of every page until opened or dismissed. "History"
// expands read ones inline.
// ---------------------------------------------------------------------------
function VariantC({ store }: { store: Store }) {
  const [history, setHistory] = useState(false);
  const unread = store.items.filter((n) => !n.read);
  const read = store.items.filter((n) => n.read);
  if (!unread.length && !history) {
    return (
      <div className="flex justify-end border-b px-6 py-1">
        <button onClick={() => setHistory(true)} className="text-xs text-muted-foreground hover:text-foreground">Notification history ({read.length})</button>
      </div>
    );
  }
  return (
    <div className="border-b bg-amber-50/60 px-6 py-3 dark:bg-amber-950/20">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {unread.length ? `${unread.length} new` : "Notification history"}
        </span>
        <span className="flex gap-3 text-xs text-muted-foreground">
          {unread.length > 0 && <button onClick={store.markAllRead} className="hover:text-foreground">Dismiss all</button>}
          <button onClick={() => setHistory((h) => !h)} className="hover:text-foreground">{history ? "Hide history" : `History (${read.length})`}</button>
        </span>
      </div>
      <ul className="space-y-1">
        {unread.map((n) => (
          <li key={n.id} className="flex items-center gap-2 text-sm">
            {n.actionable && <span className="rounded bg-amber-500/20 px-1.5 text-xs text-amber-800 dark:text-amber-300">needs you</span>}
            <Link to={n.href} onClick={() => store.markRead(n.id)} className="font-medium hover:underline">{n.text}</Link>
            <span className="text-xs text-muted-foreground">· {ago(n.minutesAgo)}</span>
            <button onClick={() => store.markRead(n.id)} title="Dismiss" className="ml-auto rounded p-0.5 hover:bg-accent"><X className="size-3.5" /></button>
          </li>
        ))}
      </ul>
      {history && (
        <div className="mt-2 max-h-48 overflow-y-auto border-t pt-2">
          {read.map((n) => <Row key={n.id} n={n} onOpen={() => {}} compact />)}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mount points used by the layout
// ---------------------------------------------------------------------------
/** Inside <main>, above the page. Only Variant C renders here. */
export function NotificationsPrototypeTop({ store }: { store: Store }) {
  const [variant] = useVariant();
  if (import.meta.env.PROD) return null;
  return variant === "C" ? <VariantC store={store} /> : null;
}

/** Overlay pieces + the floating switcher. */
export function NotificationsPrototype({ store }: { store: Store }) {
  const [variant, setVariant] = useVariant();
  const navigate = useNavigate();
  const idx = VARIANTS.findIndex((v) => v.key === variant);
  const cycle = (d: number) => setVariant(VARIANTS[(idx + d + VARIANTS.length) % VARIANTS.length].key);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, [contenteditable]")) return;
      if (e.key === "ArrowLeft") cycle(-1);
      if (e.key === "ArrowRight") cycle(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (import.meta.env.PROD) return null;

  const simulate = () => {
    const n = store.simulate();
    if (!n) return;
    if (variant === "B" || variant === "C") {
      toast(n.text, {
        description: n.actionable ? "Needs you" : undefined,
        action: { label: "Open", onClick: () => { store.markRead(n.id); navigate(n.href); } },
      });
    }
  };

  return (
    <>
      {variant === "A" && <VariantA store={store} />}
      {variant === "B" && <VariantB store={store} />}
      <div className="fixed bottom-4 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-full bg-zinc-900 px-2 py-1.5 text-sm text-white shadow-2xl ring-2 ring-fuchsia-500">
        <button onClick={() => cycle(-1)} className="rounded-full p-1 hover:bg-white/15"><ChevronLeft className="size-4" /></button>
        <span className="min-w-56 text-center font-medium">{variant} ({VARIANTS[idx]?.name})</span>
        <button onClick={() => cycle(1)} className="rounded-full p-1 hover:bg-white/15"><ChevronRight className="size-4" /></button>
        <span className="mx-1 h-4 w-px bg-white/30" />
        <button onClick={simulate} className="flex items-center gap-1 rounded-full px-2 py-0.5 hover:bg-white/15"><Plus className="size-3.5" /> Simulate new</button>
      </div>
    </>
  );
}
