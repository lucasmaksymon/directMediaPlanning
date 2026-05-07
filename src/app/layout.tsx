import type { Metadata } from "next";
import { Bebas_Neue, Inter } from "next/font/google";
import { AuthProvider } from "@/components/AuthProvider";
import { AppHeader } from "@/components/layout/AppHeader";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-sans" });
const display = Bebas_Neue({ weight: "400", subsets: ["latin"], display: "swap", variable: "--font-display" });

export const metadata: Metadata = {
  title: "Direct Planning — Medios en un solo lugar",
  description:
    "Plataforma para conectar anunciantes con medios en vía pública y digital. Catálogo, solicitudes y seguimiento en un entorno claro y profesional.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-AR" suppressHydrationWarning>
      <body
        className={`${inter.className} ${display.variable} nm-body min-h-screen text-foreground antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider>
          <AuthProvider>
            <AppHeader />
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
