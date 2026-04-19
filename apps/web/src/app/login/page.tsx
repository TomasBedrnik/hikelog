"use client";

import { GoogleLogin } from "@react-oauth/google";
import { useRouter } from "next/navigation";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { useI18n } from "@/components/i18n-provider";
import { exchangeGoogleIdToken, setIdToken } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const { dict } = useI18n();
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  return (
    <main className="mx-auto max-w-md p-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{dict.login.title}</h1>
        <LocaleSwitcher />
      </div>
      <p className="mt-2 text-sm text-gray-600">{dict.login.subtitle}</p>

      <div className="mt-6">
        {googleClientId ? (
          <GoogleLogin
            onSuccess={async (cred) => {
              const token = cred.credential;
              if (!token) return;
              try {
                const session = await exchangeGoogleIdToken(token);
                setIdToken(session.accessToken, { bootstrapOnly: session.bootstrapOnly });
                router.push(session.bootstrapOnly ? "/admin/users" : "/admin");
              } catch (error: unknown) {
                alert(error instanceof Error ? error.message : dict.login.googleError);
              }
            }}
            onError={() => {
              alert(dict.login.googleError);
            }}
          />
        ) : (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {dict.login.googleUnavailable}
          </p>
        )}
      </div>
    </main>
  );
}
