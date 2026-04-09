"use client";

import { GoogleLogin } from "@react-oauth/google";
import { useRouter } from "next/navigation";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { useI18n } from "@/components/i18n-provider";
import { exchangeGoogleIdToken, setIdToken } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const { dict } = useI18n();

  return (
    <main className="mx-auto max-w-md p-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{dict.login.title}</h1>
        <LocaleSwitcher />
      </div>
      <p className="mt-2 text-sm text-gray-600">{dict.login.subtitle}</p>

      <div className="mt-6">
        <GoogleLogin
          onSuccess={async (cred) => {
            const token = cred.credential;
            if (!token) return;
            try {
              const accessToken = await exchangeGoogleIdToken(token);
              setIdToken(accessToken);
              router.push("/admin");
            } catch (error: unknown) {
              alert(error instanceof Error ? error.message : dict.login.googleError);
            }
          }}
          onError={() => {
            alert(dict.login.googleError);
          }}
        />
      </div>
    </main>
  );
}
