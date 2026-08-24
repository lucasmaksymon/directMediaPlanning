import { Suspense } from "react";

export default function PlayerLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<main className="min-h-screen bg-black" />}>{children}</Suspense>;
}
