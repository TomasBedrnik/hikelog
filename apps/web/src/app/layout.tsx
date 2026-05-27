import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import Script from "next/script";
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
  title: "Zuzka jde...",
  description: "Web o Zuzčině putování po světě",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/favicon.ico"],
  },
  manifest: "/site.webmanifest",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headerStore = await headers();
  const acceptLanguage = headerStore.get("accept-language");
  const initialLocale = normalizeLocale(acceptLanguage);
  const webpushrPublicKey = process.env.NEXT_PUBLIC_WEBPUSHR_PUBLIC_KEY;
  const googleAnalyticsId = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;

  return (
    <html lang={initialLocale}>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {webpushrPublicKey ? (
          <Script id="webpushr-init" strategy="afterInteractive">
            {`(function(w,d,s,id){if(typeof(w.webpushr)!=='undefined')return;w.webpushr=w.webpushr||function(){(w.webpushr.q=w.webpushr.q||[]).push(arguments)};var js,fjs=d.getElementsByTagName(s)[0];js=d.createElement(s);js.id=id;js.async=1;js.src='https://cdn.webpushr.com/app.min.js';fjs.parentNode.appendChild(js);}(window,document,'script','webpushr-jssdk'));webpushr('setup',{'key':'${webpushrPublicKey}'});`}
          </Script>
        ) : null}
        {googleAnalyticsId ? (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', '${googleAnalyticsId}');`}
            </Script>
          </>
        ) : null}
        <Providers initialLocale={initialLocale}>{children}</Providers>
      </body>
    </html>
  );
}
