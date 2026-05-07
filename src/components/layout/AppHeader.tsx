import Link from "next/link";
import { auth } from "@/auth";
import { signOutAction } from "@/app/actions/session";
import { buildHeaderNav } from "@/components/layout/build-nav";
import { MobileMenu } from "@/components/layout/MobileMenu";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

export async function AppHeader() {
  const session = await auth();
  const { desktop, mobilePrimary, mobileSections } = buildHeaderNav(session);

  return (
    <header
      className="sticky top-0 z-50 border-b border-border/80 bg-nav/90 backdrop-blur-md backdrop-saturate-150"
      suppressHydrationWarning
    >
      <div
        className="flex h-14 w-full items-center gap-3 px-4 sm:gap-4 sm:px-6 lg:px-8 xl:px-10"
        suppressHydrationWarning
      >
        <Link className="shrink-0 font-display text-lg uppercase tracking-wide text-foreground" href="/">
          <span className="hidden sm:inline">
            <span className="text-led">Direct</span> Planning
          </span>
          <span className="text-led sm:hidden">DP</span>
        </Link>

        <nav aria-label="Principal" className="hidden min-w-0 flex-1 items-center gap-1 md:flex">
          {desktop.map((item) => (
            <Link
              className="rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition duration-250 hover:bg-muted hover:text-foreground"
              href={item.href}
              key={item.href + item.label}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:gap-3" suppressHydrationWarning>
          <ThemeToggle />
          {session?.user ? (
            <>
              <span
                className="hidden max-w-[12rem] truncate text-xs text-muted-foreground lg:inline"
                title={session.user.email ?? undefined}
              >
                {session.user.email}
              </span>
              <form action={signOutAction} className="hidden sm:block">
                <button
                  className="rounded-full border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground shadow-sm transition duration-250 hover:bg-muted"
                  type="submit"
                >
                  Salir
                </button>
              </form>
            </>
          ) : null}

          <MobileMenu items={mobilePrimary} sections={mobileSections} showSignOut={Boolean(session?.user)} />
        </div>
      </div>
    </header>
  );
}
