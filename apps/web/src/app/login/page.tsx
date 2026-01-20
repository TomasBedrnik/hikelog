"use client";

import { GoogleLogin } from "@react-oauth/google";
import { useRouter } from "next/navigation";
import { setIdToken } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-semibold">Admin login</h1>
      <p className="mt-2 text-sm text-gray-600">Sign in with Google to access admin pages.</p>

      <div className="mt-6">
        <GoogleLogin
          onSuccess={(cred) => {
            const token = cred.credential;
            if (!token) return;
            setIdToken(token);
            router.push("/admin");
          }}
          onError={() => {
            alert("Google login failed");
          }}
        />
      </div>
    </main>
  );
}
