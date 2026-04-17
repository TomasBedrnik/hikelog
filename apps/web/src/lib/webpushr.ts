export type WebpushrSummaryRead = {
  configured: boolean;
  authorized: boolean;
  authorization_description: string | null;
  total_subscribers: number | null;
  active_subscribers: number | null;
};

export type WebpushrSendWrite = {
  title: string;
  message: string;
  target_url: string;
  icon: string | null;
  image: string | null;
};

export type WebpushrSendRead = {
  status: string;
  description: string | null;
  campaign_id: string | null;
};

export type WebpushrCampaignStatusRead = {
  campaign_id: string;
  status: string;
  title: string | null;
  message: string | null;
  target_url: string | null;
  sent_count: number | null;
  delivered_count: number | null;
  clicked_count: number | null;
  closed_count: number | null;
  failed_count: number | null;
  raw_status: Record<string, string | number | null>;
};

function getApiBaseUrl() {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    throw new Error("Missing NEXT_PUBLIC_API_BASE_URL");
  }
  return baseUrl;
}

async function request<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error("AUTH_REQUIRED");
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }

  return (await res.json()) as T;
}

export function getWebpushrSummary(token: string) {
  return request<WebpushrSummaryRead>("/api/v1/webpushr/summary", token);
}

export function sendWebpushrNotification(token: string, payload: WebpushrSendWrite) {
  return request<WebpushrSendRead>("/api/v1/webpushr/send", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getWebpushrCampaignStatus(token: string, campaignId: string) {
  return request<WebpushrCampaignStatusRead>(`/api/v1/webpushr/campaigns/${campaignId}`, token);
}
