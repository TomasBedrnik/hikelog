"use client";

import { GoogleOAuthProvider } from "@react-oauth/google";
import { I18nProvider } from "@/components/i18n-provider";
import { Locale } from "@/lib/i18n";

export default function Providers({
  children,
  initialLocale,
}: {
  children: React.ReactNode;
  initialLocale: Locale;
}) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const content = <I18nProvider initialLocale={initialLocale}>{children}</I18nProvider>;
  if (!clientId) {
    return content;
  }
  return <GoogleOAuthProvider clientId={clientId}>{content}</GoogleOAuthProvider>;
}
