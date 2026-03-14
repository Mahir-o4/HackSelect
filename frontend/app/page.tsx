 "use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Toaster } from "@/components/ui/sonner"
import { toast } from "sonner"

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-8">
      <div className="max-w-5xl w-full space-y-10">
        {/* Header */}
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-(--tracking-wide) text-muted-foreground">
            Shadcn UI + Tailwind template
          </p>
          <h1 className="text-3xl font-semibold tracking-(--tracking-tight)">
            Design tokens and utility classes showcase
          </h1>
          <p className="text-sm text-muted-foreground">
            This page demonstrates the semantic color tokens, radius, shadows, and typography
            defined in <code className="px-1 py-0.5 rounded bg-muted text-muted-foreground text-xs">globals.css</code>.
          </p>
        </header>

        {/* Design tokens overview */}
        <section className="grid gap-6 md:grid-cols-[2fr,1.5fr] items-start">
          {/* Colors & surfaces */}
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-card text-card-foreground shadow-md p-6 space-y-4">
              <h2 className="text-base font-medium tracking-(--tracking-tight)">
                Surfaces & content
              </h2>
              <p className="text-sm text-muted-foreground">
                These blocks use the semantic surface tokens: <span className="font-mono text-xs">background</span>,{" "}
                <span className="font-mono text-xs">card</span>, <span className="font-mono text-xs">popover</span>, and{" "}
                <span className="font-mono text-xs">border</span>.
              </p>

              <div className="grid gap-3 sm:grid-cols-3 text-xs">
                <div className="space-y-1 rounded-md border bg-background p-3">
                  <div className="font-medium">Background</div>
                  <p className="text-muted-foreground">`bg-background` + `text-foreground`</p>
                </div>
                <div className="space-y-1 rounded-md border bg-card text-card-foreground shadow-sm p-3">
                  <div className="font-medium">Card</div>
                  <p className="text-muted-foreground">`bg-card` + `text-card-foreground`</p>
                </div>
                <div className="space-y-1 rounded-md border bg-popover text-popover-foreground shadow-xs p-3">
                  <div className="font-medium">Popover</div>
                  <p className="text-muted-foreground">`bg-popover` + `text-popover-foreground`</p>
                </div>
              </div>
            </div>

            {/* Sidebar tokens */}
            <div className="rounded-lg border bg-sidebar text-sidebar-foreground shadow p-6 space-y-4">
              <h2 className="text-base font-medium tracking-(--tracking-tight)">
                Sidebar palette
              </h2>
              <p className="text-sm text-sidebar-foreground/80">
                Tokens: <span className="font-mono text-xs">sidebar</span>,{" "}
                <span className="font-mono text-xs">sidebar-primary</span>,{" "}
                <span className="font-mono text-xs">sidebar-accent</span>,{" "}
                <span className="font-mono text-xs">sidebar-border</span>, and{" "}
                <span className="font-mono text-xs">sidebar-ring</span>.
              </p>
              <div className="flex flex-wrap gap-3 text-xs">
                <span className="inline-flex items-center gap-1 rounded-full border border-sidebar-border bg-sidebar px-3 py-1">
                  Default sidebar
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-sidebar-primary text-sidebar-primary-foreground px-3 py-1">
                  Primary
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-sidebar-accent text-sidebar-accent-foreground px-3 py-1">
                  Accent
                </span>
              </div>
            </div>
          </div>

          {/* Controls & states (raw tokens) */}
          <div className="rounded-xl border bg-card text-card-foreground shadow-lg p-6 space-y-6">
            <h2 className="text-base font-medium tracking-(--tracking-tight)">
              Controls & states
            </h2>

            {/* Buttons */}
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-(--tracking-wide) text-muted-foreground">
                Buttons
              </p>
              <div className="flex flex-wrap gap-3">
                <button className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
                  Primary
                </button>
                <button className="inline-flex items-center justify-center rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground shadow-sm hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
                  Secondary
                </button>
                <button className="inline-flex items-center justify-center rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground shadow-sm hover:bg-accent/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
                  Accent
                </button>
                <button className="inline-flex items-center justify-center rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground shadow-sm hover:bg-destructive/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2 focus-visible:ring-offset-background">
                  Destructive
                </button>
              </div>
            </div>

            {/* Inputs */}
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-(--tracking-wide) text-muted-foreground">
                Inputs
              </p>
              <div className="space-y-3">
                <input
                  placeholder="Input using `border`, `bg-background`, `ring`"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <textarea
                  rows={3}
                  placeholder="Muted textarea"
                  className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>

            {/* Badges / labels */}
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-(--tracking-wide) text-muted-foreground">
                Semantic badges
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="inline-flex items-center rounded-full border bg-muted px-2.5 py-1 text-muted-foreground shadow-2xs">
                  Muted
                </span>
                <span className="inline-flex items-center rounded-full bg-primary px-2.5 py-1 text-primary-foreground shadow-2xs">
                  Primary
                </span>
                <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-1 text-secondary-foreground shadow-2xs">
                  Secondary
                </span>
                <span className="inline-flex items-center rounded-full bg-accent px-2.5 py-1 text-accent-foreground shadow-2xs">
                  Accent
                </span>
                <span className="inline-flex items-center rounded-full bg-destructive px-2.5 py-1 text-destructive-foreground shadow-2xs">
                  Destructive
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Charts / data tokens */}
        <section className="rounded-xl border bg-card text-card-foreground shadow p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-medium tracking-(--tracking-tight)">
              Chart palette
            </h2>
            <span className="text-xs text-muted-foreground">
              Tokens: <code className="px-1 py-0.5 rounded bg-muted text-muted-foreground text-[10px]">chart-1 … chart-5</code>
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-5 text-xs">
            <div className="space-y-1 rounded-lg bg-chart-1/15 p-3">
              <div className="h-8 w-full rounded bg-chart-1 shadow-sm" />
              <p className="font-mono text-[10px]">bg-chart-1</p>
            </div>
            <div className="space-y-1 rounded-lg bg-chart-2/15 p-3">
              <div className="h-8 w-full rounded bg-chart-2 shadow-sm" />
              <p className="font-mono text-[10px]">bg-chart-2</p>
            </div>
            <div className="space-y-1 rounded-lg bg-chart-3/15 p-3">
              <div className="h-8 w-full rounded bg-chart-3 shadow-sm" />
              <p className="font-mono text-[10px]">bg-chart-3</p>
            </div>
            <div className="space-y-1 rounded-lg bg-chart-4/15 p-3">
              <div className="h-8 w-full rounded bg-chart-4 shadow-sm" />
              <p className="font-mono text-[10px]">bg-chart-4</p>
            </div>
            <div className="space-y-1 rounded-lg bg-chart-5/15 p-3">
              <div className="h-8 w-full rounded bg-chart-5 shadow-sm" />
              <p className="font-mono text-[10px]">bg-chart-5</p>
            </div>
          </div>
        </section>

        {/* UI components showcase */}
        <section className="rounded-xl border bg-card text-card-foreground shadow-lg p-6 space-y-6">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-base font-medium tracking-(--tracking-tight)">
                Shadcn UI components
              </h2>
              <p className="text-sm text-muted-foreground">
                Live previews of the <code>Button</code>, <code>Input</code>, <code>Label</code>, and <code>Toaster</code> components from the <code>ui</code> folder.
              </p>
            </div>
          </div>

          {/* Buttons */}
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-(--tracking-wide) text-muted-foreground">
              Button variants
            </p>
            <div className="flex flex-wrap gap-3">
              <Button>Default</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="link" className="px-0">
                Link
              </Button>
            </div>
          </div>

          {/* Form controls */}
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-(--tracking-wide) text-muted-foreground">
              Label + Input
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email-error">Email (invalid)</Label>
                <Input
                  id="email-error"
                  type="email"
                  aria-invalid="true"
                  placeholder="invalid@example.com"
                />
              </div>
            </div>
          </div>

          {/* Toaster / notifications */}
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-(--tracking-wide) text-muted-foreground">
              Toaster (sonner)
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                size="sm"
                onClick={() => toast("Simple toast")}
              >
                Show toast
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => toast.success("Saved successfully")}
              >
                Success toast
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => toast.error("Something went wrong")}
              >
                Error toast
              </Button>
            </div>
          </div>

          <Toaster richColors closeButton />
        </section>
      </div>
    </main>
  );
}