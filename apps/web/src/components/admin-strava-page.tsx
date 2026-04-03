"use client";

import Image from "next/image";
import { startTransition, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { clearIdToken, getIdToken } from "@/lib/auth";
import { AdminNav } from "@/components/admin-nav";
import { useI18n } from "@/components/i18n-provider";
import { getDateLocale } from "@/lib/i18n";
import {
  createStravaAuthorization,
  disconnectStrava,
  getStravaConnection,
  listRecentStravaActivities,
  StravaConnectionRead,
  StravaRecentActivityRead,
} from "@/lib/strava";

function formatDistance(locale: string, value: number | null) {
  if (value == null) {
    return "—";
  }
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 1,
  }).format(value / 1000).concat(" km");
}

function formatMovingTime(value: number | null) {
  if (value == null) {
    return "—";
  }

  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const seconds = value % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

function formatElevation(locale: string, value: number | null) {
  if (value == null) {
    return "—";
  }
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  }).format(value).concat(" m");
}

function getAthleteName(connection: StravaConnectionRead, fallback: string) {
  const fullName = [connection.firstname, connection.lastname].filter(Boolean).join(" ").trim();
  return fullName || connection.username || fallback;
}

export function AdminStravaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { dict, locale } = useI18n();
  const [connection, setConnection] = useState<StravaConnectionRead | null>(null);
  const [activities, setActivities] = useState<StravaRecentActivityRead[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"connecting" | "disconnecting" | "refreshing" | null>(null);

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

  const load = async () => {
    const token = requireToken();
    if (!token) {
      return;
    }

    setBusy((current) => current ?? "refreshing");
    setError(null);

    try {
      const loadedConnection = await getStravaConnection(token);
      const loadedActivities = loadedConnection.connected ? await listRecentStravaActivities(token) : [];

      startTransition(() => {
        setConnection(loadedConnection);
        setActivities(loadedActivities);
      });
    } catch (e: unknown) {
      if (handleAuthError(e)) {
        return;
      }
      setError(e instanceof Error ? e.message : dict.strava.loadFailed);
    } finally {
      setBusy(null);
    }
  };

  useEffect(() => {
    void load();
  }, [dict.strava.loadFailed]);

  useEffect(() => {
    const status = searchParams.get("strava");
    const message = searchParams.get("message");
    if (status !== "error" || !message) {
      return;
    }
    setError(message);
  }, [searchParams]);

  const connect = async () => {
    const token = requireToken();
    if (!token) {
      return;
    }

    setBusy("connecting");
    setError(null);
    try {
      const result = await createStravaAuthorization(token);
      if (!result.authorization_url) {
        throw new Error(dict.strava.authorizationMissing);
      }
      window.location.href = result.authorization_url;
    } catch (e: unknown) {
      if (handleAuthError(e)) {
        return;
      }
      setError(e instanceof Error ? e.message : dict.common.unknownError);
      setBusy(null);
    }
  };

  const disconnect = async () => {
    const token = requireToken();
    if (!token) {
      return;
    }

    setBusy("disconnecting");
    setError(null);
    try {
      await disconnectStrava(token);
      startTransition(() => {
        setConnection({
          connected: false,
          athlete_id: null,
          username: null,
          firstname: null,
          lastname: null,
          profile_medium: null,
          scopes: [],
          expires_at: null,
        });
        setActivities([]);
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

  const athleteName = connection ? getAthleteName(connection, dict.strava.unknownAthlete) : dict.strava.unknownAthlete;
  const isConnected = connection?.connected ?? false;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f5f1e8_0%,#f8fafc_30%,#ffffff_100%)] p-6 text-stone-900">
      <div className="mx-auto max-w-6xl">
        <AdminNav />

        <div className="mt-8 rounded-[32px] border border-stone-300/80 bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-semibold tracking-tight">{dict.strava.title}</h1>
          <p className="mt-2 max-w-3xl text-sm text-stone-600">{dict.strava.description}</p>

          {error ? <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
          {!connection && !error ? <p className="mt-4 text-sm text-stone-600">{dict.common.loading}</p> : null}

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <section className="rounded-[28px] border border-stone-200 bg-stone-50 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-stone-900">{dict.strava.statusTitle}</h2>
                  <p className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                    isConnected ? "bg-emerald-100 text-emerald-800" : "bg-stone-200 text-stone-700"
                  }`}>
                    {isConnected ? dict.strava.statusConnected : dict.strava.statusDisconnected}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={busy !== null}
                    onClick={() => {
                      void load();
                    }}
                    type="button"
                  >
                    {dict.strava.refresh}
                  </button>
                  {isConnected ? (
                    <button
                      className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={busy !== null}
                      onClick={() => {
                        void disconnect();
                      }}
                      type="button"
                    >
                      {busy === "disconnecting" ? dict.strava.disconnecting : dict.strava.disconnect}
                    </button>
                  ) : (
                    <button
                      className="rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={busy !== null}
                      onClick={() => {
                        void connect();
                      }}
                      type="button"
                    >
                      {busy === "connecting" ? dict.strava.connecting : dict.strava.connect}
                    </button>
                  )}
                </div>
              </div>

              {connection ? (
                <div className="mt-5 rounded-[24px] border border-stone-200 bg-white p-4">
                  <p className="text-sm font-medium text-stone-700">{dict.strava.accountTitle}</p>
                  <div className="mt-4 flex items-center gap-4">
                    {connection.profile_medium ? (
                      <Image
                        alt={athleteName}
                        className="size-16 rounded-full border border-stone-200 object-cover"
                        height={64}
                        src={connection.profile_medium}
                        unoptimized
                        width={64}
                      />
                    ) : (
                      <div className="flex size-16 items-center justify-center rounded-full border border-stone-200 bg-stone-100 text-lg font-semibold text-stone-500">
                        {athleteName.slice(0, 1).toUpperCase()}
                      </div>
                    )}

                    <div>
                      <div className="text-base font-semibold text-stone-900">{athleteName}</div>
                      <div className="mt-1 text-sm text-stone-600">
                        {dict.strava.athleteId}: {connection.athlete_id ?? "—"}
                      </div>
                    </div>
                  </div>

                  <dl className="mt-5 grid gap-3 text-sm text-stone-700">
                    <div className="rounded-2xl border border-stone-200 px-4 py-3">
                      <dt className="font-medium">{dict.strava.scopes}</dt>
                      <dd className="mt-1 text-stone-600">
                        {connection.scopes.length > 0 ? connection.scopes.join(", ") : "—"}
                      </dd>
                    </div>
                    <div className="rounded-2xl border border-stone-200 px-4 py-3">
                      <dt className="font-medium">{dict.strava.tokenExpires}</dt>
                      <dd className="mt-1 text-stone-600">
                        {connection.expires_at
                          ? new Date(connection.expires_at).toLocaleString(getDateLocale(locale))
                          : "—"}
                      </dd>
                    </div>
                  </dl>
                </div>
              ) : null}
            </section>

            <section className="rounded-[28px] border border-stone-200 bg-stone-50 p-5">
              <h2 className="text-lg font-semibold text-stone-900">{dict.strava.recentActivitiesTitle}</h2>
              <p className="mt-2 text-sm text-stone-500">{dict.strava.recentActivitiesDescription}</p>

              {activities && activities.length === 0 ? (
                <p className="mt-5 rounded-2xl border border-dashed border-stone-300 bg-white px-4 py-6 text-sm text-stone-500">
                  {dict.strava.emptyActivities}
                </p>
              ) : null}

              {activities && activities.length > 0 ? (
                <div className="mt-5 space-y-3">
                  {activities.map((activity) => (
                    <article key={activity.id} className="rounded-[24px] border border-stone-200 bg-white p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="text-base font-semibold text-stone-900">{activity.name}</h3>
                          <p className="mt-1 text-sm text-stone-500">{activity.sport_type ?? "—"}</p>
                        </div>
                        <div className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-600">
                          #{activity.id}
                        </div>
                      </div>

                      <dl className="mt-4 grid gap-3 text-sm text-stone-700 sm:grid-cols-2">
                        <div className="rounded-2xl bg-stone-50 px-3 py-2">
                          <dt className="font-medium">{dict.strava.started}</dt>
                          <dd className="mt-1 text-stone-600">
                            {new Date(activity.start_date).toLocaleString(getDateLocale(locale))}
                          </dd>
                        </div>
                        <div className="rounded-2xl bg-stone-50 px-3 py-2">
                          <dt className="font-medium">{dict.strava.distance}</dt>
                          <dd className="mt-1 text-stone-600">{formatDistance(locale, activity.distance)}</dd>
                        </div>
                        <div className="rounded-2xl bg-stone-50 px-3 py-2">
                          <dt className="font-medium">{dict.strava.movingTime}</dt>
                          <dd className="mt-1 text-stone-600">{formatMovingTime(activity.moving_time)}</dd>
                        </div>
                        <div className="rounded-2xl bg-stone-50 px-3 py-2">
                          <dt className="font-medium">{dict.strava.elevation}</dt>
                          <dd className="mt-1 text-stone-600">{formatElevation(locale, activity.total_elevation_gain)}</dd>
                        </div>
                      </dl>
                    </article>
                  ))}
                </div>
              ) : null}
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
