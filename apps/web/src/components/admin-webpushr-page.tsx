"use client";

import { startTransition, useEffect, useState } from "react";
import { clearIdToken, getIdToken } from "@/lib/auth";
import { useI18n } from "@/components/i18n-provider";
import { useRouter } from "next/navigation";
import {
  getWebpushrCampaignStatus,
  getWebpushrSummary,
  sendWebpushrNotification,
  WebpushrCampaignStatusRead,
  WebpushrSummaryRead,
} from "@/lib/webpushr";

type NotificationDraft = {
  title: string;
  message: string;
  targetUrl: string;
  icon: string;
  image: string;
};

const EMPTY_DRAFT: NotificationDraft = {
  title: "",
  message: "",
  targetUrl: "",
  icon: "",
  image: "",
};

export function AdminWebpushrPage() {
  const router = useRouter();
  const { dict, locale } = useI18n();
  const [summary, setSummary] = useState<WebpushrSummaryRead | null>(null);
  const [campaignStatus, setCampaignStatus] = useState<WebpushrCampaignStatusRead | null>(null);
  const [campaignIdInput, setCampaignIdInput] = useState("");
  const [draft, setDraft] = useState<NotificationDraft>(EMPTY_DRAFT);
  const [busy, setBusy] = useState<"loading" | "sending" | "checking" | null>("loading");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const requireToken = () => {
    const token = getIdToken();
    if (!token) {
      router.push("/login");
      return null;
    }
    return token;
  };

  const handleAuthError = (e: unknown) => {
    if (e instanceof Error && e.message === "AUTH_REQUIRED") {
      clearIdToken();
      router.push("/login");
      return true;
    }
    return false;
  };

  const loadSummary = async () => {
    const token = requireToken();
    if (!token) {
      return;
    }

    setBusy("loading");
    setError(null);

    try {
      const loadedSummary = await getWebpushrSummary(token);
      startTransition(() => {
        setSummary(loadedSummary);
      });
    } catch (e: unknown) {
      if (handleAuthError(e)) {
        return;
      }
      setError(e instanceof Error ? e.message : dict.common.unknownError);
    } finally {
      setBusy(null);
    }
  };

  useEffect(() => {
    void loadSummary();
  }, []);

  const sendNotification = async () => {
    const token = requireToken();
    if (!token) {
      return;
    }
    if (!draft.title.trim() || !draft.message.trim() || !draft.targetUrl.trim()) {
      setError(dict.webpushr.validationError);
      return;
    }

    setBusy("sending");
    setError(null);
    setSuccess(null);

    try {
      const sent = await sendWebpushrNotification(token, {
        title: draft.title.trim(),
        message: draft.message.trim(),
        target_url: draft.targetUrl.trim(),
        icon: draft.icon.trim() || null,
        image: draft.image.trim() || null,
      });
      const nextCampaignId = sent.campaign_id ?? "";
      startTransition(() => {
        setCampaignIdInput(nextCampaignId);
        setSuccess(sent.description ?? dict.webpushr.sendSuccess);
        setDraft((current) => ({ ...current, title: "", message: "" }));
      });
      await loadSummary();
      if (nextCampaignId) {
        const status = await getWebpushrCampaignStatus(token, nextCampaignId);
        startTransition(() => {
          setCampaignStatus(status);
        });
      }
    } catch (e: unknown) {
      if (handleAuthError(e)) {
        return;
      }
      setError(e instanceof Error ? e.message : dict.common.unknownError);
    } finally {
      setBusy(null);
    }
  };

  const checkCampaign = async () => {
    const token = requireToken();
    if (!token) {
      return;
    }
    if (!campaignIdInput.trim()) {
      setError(dict.webpushr.campaignIdRequired);
      return;
    }

    setBusy("checking");
    setError(null);
    setSuccess(null);

    try {
      const status = await getWebpushrCampaignStatus(token, campaignIdInput.trim());
      startTransition(() => {
        setCampaignStatus(status);
      });
    } catch (e: unknown) {
      if (handleAuthError(e)) {
        return;
      }
      setError(e instanceof Error ? e.message : dict.common.unknownError);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto mt-6 max-w-6xl border-t border-stone-300 pt-6">
      <h1 className="text-3xl font-semibold tracking-tight">{dict.webpushr.title}</h1>
      <p className="mt-2 max-w-3xl text-sm text-stone-600">{dict.webpushr.description}</p>

      {error ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {success}
        </div>
      ) : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <section className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-stone-900">{dict.webpushr.sendTitle}</h2>
              <p className="mt-1 text-sm text-stone-500">{dict.webpushr.sendDescription}</p>
            </div>
            <button
              className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
              onClick={() => {
                void sendNotification();
              }}
              type="button"
            >
              {busy === "sending" ? dict.webpushr.sending : dict.webpushr.send}
            </button>
          </div>

          <div className="mt-6 grid gap-4">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-stone-700">{dict.webpushr.titleLabel}</span>
              <input
                className="rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-stone-900"
                onChange={(event) => {
                  setDraft((current) => ({ ...current, title: event.target.value }));
                }}
                value={draft.title}
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium text-stone-700">{dict.webpushr.messageLabel}</span>
              <textarea
                className="min-h-28 rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-stone-900"
                onChange={(event) => {
                  setDraft((current) => ({ ...current, message: event.target.value }));
                }}
                value={draft.message}
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium text-stone-700">{dict.webpushr.targetUrlLabel}</span>
              <input
                className="rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-stone-900"
                onChange={(event) => {
                  setDraft((current) => ({ ...current, targetUrl: event.target.value }));
                }}
                placeholder="https://example.com/article"
                value={draft.targetUrl}
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-medium text-stone-700">{dict.webpushr.iconLabel}</span>
                <input
                  className="rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-stone-900"
                  onChange={(event) => {
                    setDraft((current) => ({ ...current, icon: event.target.value }));
                  }}
                  placeholder="https://example.com/icon.png"
                  value={draft.icon}
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-medium text-stone-700">{dict.webpushr.imageLabel}</span>
                <input
                  className="rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-stone-900"
                  onChange={(event) => {
                    setDraft((current) => ({ ...current, image: event.target.value }));
                  }}
                  placeholder="https://example.com/hero.jpg"
                  value={draft.image}
                />
              </label>
            </div>
          </div>
        </section>

        <section className="grid gap-6">
          <div className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-stone-900">{dict.webpushr.statsTitle}</h2>
                <p className="mt-1 text-sm text-stone-500">{dict.webpushr.statsDescription}</p>
              </div>
              <button
                className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
                onClick={() => {
                  void loadSummary();
                }}
                type="button"
              >
                {busy === "loading" ? dict.webpushr.refreshing : dict.webpushr.refresh}
              </button>
            </div>

            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.25rem] bg-stone-50 px-4 py-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">
                  {dict.webpushr.configured}
                </dt>
                <dd className="mt-2 text-sm text-stone-700">
                  {summary?.configured ? dict.publicSite.yes : dict.publicSite.no}
                </dd>
              </div>
              <div className="rounded-[1.25rem] bg-stone-50 px-4 py-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">
                  {dict.webpushr.authorized}
                </dt>
                <dd className="mt-2 text-sm text-stone-700">
                  {summary?.authorized ? dict.publicSite.yes : dict.publicSite.no}
                </dd>
              </div>
              <div className="rounded-[1.25rem] bg-stone-50 px-4 py-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">
                  {dict.webpushr.totalSubscribers}
                </dt>
                <dd className="mt-2 text-sm text-stone-700">
                  {summary?.total_subscribers?.toLocaleString(locale) ?? "—"}
                </dd>
              </div>
              <div className="rounded-[1.25rem] bg-stone-50 px-4 py-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">
                  {dict.webpushr.activeSubscribers}
                </dt>
                <dd className="mt-2 text-sm text-stone-700">
                  {summary?.active_subscribers?.toLocaleString(locale) ?? "—"}
                </dd>
              </div>
            </dl>
            {summary?.authorization_description ? (
              <p className="mt-4 text-sm text-stone-500">{summary.authorization_description}</p>
            ) : null}
          </div>

          <div className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-stone-900">{dict.webpushr.campaignTitle}</h2>
                <p className="mt-1 text-sm text-stone-500">{dict.webpushr.campaignDescription}</p>
              </div>
              <button
                className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
                onClick={() => {
                  void checkCampaign();
                }}
                type="button"
              >
                {busy === "checking" ? dict.webpushr.checking : dict.webpushr.check}
              </button>
            </div>

            <label className="mt-5 grid gap-2">
              <span className="text-sm font-medium text-stone-700">{dict.webpushr.campaignIdLabel}</span>
              <input
                className="rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-stone-900"
                onChange={(event) => {
                  setCampaignIdInput(event.target.value);
                }}
                value={campaignIdInput}
              />
            </label>

            {campaignStatus ? (
              <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[1.25rem] bg-stone-50 px-4 py-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">
                    {dict.webpushr.statusLabel}
                  </dt>
                  <dd className="mt-2 text-sm text-stone-700">{campaignStatus.status}</dd>
                </div>
                <div className="rounded-[1.25rem] bg-stone-50 px-4 py-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">
                    {dict.webpushr.sentCount}
                  </dt>
                  <dd className="mt-2 text-sm text-stone-700">
                    {campaignStatus.sent_count?.toLocaleString(locale) ?? "—"}
                  </dd>
                </div>
                <div className="rounded-[1.25rem] bg-stone-50 px-4 py-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">
                    {dict.webpushr.deliveredCount}
                  </dt>
                  <dd className="mt-2 text-sm text-stone-700">
                    {campaignStatus.delivered_count?.toLocaleString(locale) ?? "—"}
                  </dd>
                </div>
                <div className="rounded-[1.25rem] bg-stone-50 px-4 py-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">
                    {dict.webpushr.clickedCount}
                  </dt>
                  <dd className="mt-2 text-sm text-stone-700">
                    {campaignStatus.clicked_count?.toLocaleString(locale) ?? "—"}
                  </dd>
                </div>
                <div className="rounded-[1.25rem] bg-stone-50 px-4 py-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">
                    {dict.webpushr.closedCount}
                  </dt>
                  <dd className="mt-2 text-sm text-stone-700">
                    {campaignStatus.closed_count?.toLocaleString(locale) ?? "—"}
                  </dd>
                </div>
                <div className="rounded-[1.25rem] bg-stone-50 px-4 py-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">
                    {dict.webpushr.failedCount}
                  </dt>
                  <dd className="mt-2 text-sm text-stone-700">
                    {campaignStatus.failed_count?.toLocaleString(locale) ?? "—"}
                  </dd>
                </div>
              </dl>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
