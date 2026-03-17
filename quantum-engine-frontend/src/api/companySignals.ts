import { apiClient } from './client';

export interface EmergingCompanyNewsItem {
  newsId: string;
  title: string | null;
  url: string | null;
  source: string | null;
  publishedAt: string | null;
}

export interface EmergingCompanySignal {
  id: string;
  companyName: string;
  creditCode?: string | null;
  legalPersonName?: string | null;
  establishedAt?: string | null;
  province?: string | null;
  city?: string | null;
  industry?: string | null;
  promotedAt?: string | null;
  newsCount?: number;
  latestNewsTitle?: string | null;
  latestNewsDate?: string | null;
  latestNewsSource?: string | null;
  latestNewsUrl?: string | null;
  summary?: string | null;
  newsItems: EmergingCompanyNewsItem[];
  raw: Record<string, unknown>;
}

function pickFirstString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value;
  }
  return null;
}

function normalizeNewsItem(item: unknown, index: number): EmergingCompanyNewsItem {
  const record = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
  return {
    newsId: String(record.news_id ?? record.id ?? `news-${index}`),
    title: pickFirstString(record, ['title']),
    url: pickFirstString(record, ['uri', 'source_url', 'url']),
    source: pickFirstString(record, ['website', 'source']),
    publishedAt: pickFirstString(record, ['rtm', 'published_at']),
  };
}

function normalizeItem(item: unknown, index: number): EmergingCompanySignal {
  const record = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
  const newsItems = Array.isArray(record.news_items)
    ? record.news_items.map((news, newsIndex) => normalizeNewsItem(news, newsIndex))
    : [];
  const latestNews = newsItems[0];

  return {
    id: String(
      record.id ??
        record.company_id ??
        record.gold_company_id ??
        record.credit_code ??
        `emerging-${index}`,
    ),
    companyName:
      pickFirstString(record, ['company_name', 'name', 'display_name']) ||
      `未命名公司 ${index + 1}`,
    creditCode: pickFirstString(record, ['credit_code']),
    legalPersonName: pickFirstString(record, ['legal_person_name']),
    establishedAt: pickFirstString(record, ['establish_time', 'registered_at', 'founded_at']),
    province: pickFirstString(record, ['province']),
    city: pickFirstString(record, ['city']),
    industry: pickFirstString(record, ['industry']),
    promotedAt: pickFirstString(record, ['promoted_at']),
    newsCount: typeof record.news_count === 'number' ? record.news_count : newsItems.length,
    latestNewsTitle: latestNews?.title ?? null,
    latestNewsDate: latestNews?.publishedAt ?? null,
    latestNewsSource: latestNews?.source ?? null,
    latestNewsUrl: latestNews?.url ?? null,
    summary: pickFirstString(record, ['summary', 'description', 'company_profile']),
    newsItems,
    raw: record,
  };
}

export async function fetchLatestCompanyPromotions(): Promise<EmergingCompanySignal[]> {
  const response = await apiClient.get<unknown>('/companies/internal/promotions/latest');
  const list = Array.isArray(response)
    ? response
    : Array.isArray((response as { items?: unknown[] })?.items)
      ? (response as { items: unknown[] }).items
      : Array.isArray((response as { data?: unknown[] })?.data)
        ? (response as { data: unknown[] }).data
        : [];

  return list.map((item: unknown, index: number) => normalizeItem(item, index));
}
