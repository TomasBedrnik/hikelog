import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import { normalizeLocale } from "@/lib/i18n";
import Providers from "./providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HikeLog",
  description: "HikeLog web application",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headerStore = await headers();
  const acceptLanguage = headerStore.get("accept-language");
  const initialLocale = normalizeLocale(acceptLanguage);

  return (
    <html lang={initialLocale}>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers initialLocale={initialLocale}>{children}</Providers>
      </body>
    </html>
  );
}
