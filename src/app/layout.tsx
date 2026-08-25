import type { Metadata } from "next";
import { Bebas_Neue, Inter } from "next/font/google";
import { AuthProvider } from "@/components/AuthProvider";
import { AppHeader } from "@/components/layout/AppHeader";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { CLIENT_BRAND, PRODUCT_NAME, PRODUCT_TAGLINE } from "@/lib/brand";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});
const display = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: `${PRODUCT_NAME} — ${CLIENT_BRAND}`,
  description: `${PRODUCT_TAGLINE}. Catálogo, planificación y solicitudes operados por ${CLIENT_BRAND}.`,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className="h-dvh overflow-hidden" lang="es-AR" suppressHydrationWarning>
      <body
        className={`${inter.className} ${inter.variable} ${display.variable} nm-body flex h-dvh flex-col overflow-hidden text-foreground antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              <AppHeader />
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                {children}
              </div>
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
