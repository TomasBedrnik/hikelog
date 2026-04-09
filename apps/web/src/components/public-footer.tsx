"use client";

import Link from "next/link";
import Script from "next/script";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { useI18n } from "@/components/i18n-provider";
import { Locale, normalizeEnabledLocales } from "@/lib/i18n";

export function PublicFooter({ enabledLocales }: { enabledLocales?: Locale[] }) {
  const { dict } = useI18n();
  const allowedLocales = normalizeEnabledLocales(enabledLocales);
  const webpushrPublicKey = process.env.NEXT_PUBLIC_WEBPUSHR_PUBLIC_KEY;

  return (
    <>
      {webpushrPublicKey ? (
        <Script id="webpushr-init" strategy="afterInteractive">
          {`(function(w,d,s,id){if(typeof(w.webpushr)!=='undefined')return;w.webpushr=w.webpushr||function(){(w.webpushr.q=w.webpushr.q||[]).push(arguments)};var js,fjs=d.getElementsByTagName(s)[0];js=d.createElement(s);js.id=id;js.async=1;js.src='https://cdn.webpushr.com/app.min.js';fjs.parentNode.appendChild(js);}(window,document,'script','webpushr-jssdk'));webpushr('setup',{'key':'${webpushrPublicKey}'});`}
        </Script>
      ) : null}

      <footer className="mt-20 border-t border-stone-400 pt-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Link className="text-sm text-stone-500 transition hover:text-stone-900" href="/admin">
              {dict.publicSite.adminLink}
            </Link>
          </div>
          {allowedLocales.length > 1 ? <LocaleSwitcher enabledLocales={allowedLocales} /> : null}
        </div>
      </footer>
    </>
  );
}
