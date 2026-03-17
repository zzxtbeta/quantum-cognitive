import { apiClient } from './client';

export interface EmergingCompanySignal {
  id: string;
  companyName: string;
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
  raw: Record<string, unknown>;
}

function pickFirstString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value;
  }
  return null;
}

function normalizeItem(item: unknown, index: number): EmergingCompanySignal {
  const record = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
  const newsItems = Array.isArray(record.news_items) ? record.news_items as Array<Record<string, unknown>> : [];
  const latestNews = newsItems[0] || {};
  return {
    id: String(
      record.id ??
      record.company_id ??
      record.gold_company_id ??
      record.credit_code ??
      `emerging-${index}`,
    ),
    companyName: pickFirstString(record, ['company_name', 'name', 'display_name']) || `未命名公司 ${index + 1}`,
    establishedAt: pickFirstString(record, ['establish_time', 'registered_at', 'founded_at']),
    province: pickFirstString(record, ['province']),
    city: pickFirstString(record, ['city']),
    industry: pickFirstString(record, ['industry']),
    promotedAt: pickFirstString(record, ['promoted_at']),
    newsCount: typeof record.news_count === 'number' ? record.news_count : newsItems.length,
    latestNewsTitle: pickFirstString(latestNews, ['title']) || pickFirstString(record, ['latest_news_title', 'news_title', 'title']),
    latestNewsDate: pickFirstString(latestNews, ['rtm', 'published_at']) || pickFirstString(record, ['latest_news_date', 'published_at', 'news_published_at']),
    latestNewsSource: pickFirstString(latestNews, ['website', 'source']) || pickFirstString(record, ['latest_news_source', 'source']),
    latestNewsUrl: pickFirstString(latestNews, ['uri', 'source_url', 'url']) || pickFirstString(record, ['latest_news_url', 'source_url', 'url']),
    summary: pickFirstString(record, ['summary', 'description', 'company_profile']),
    raw: record,
  };
}

export async function fetchLatestCompanyPromotions(): Promise<EmergingCompanySignal[]> {
  const response = await apiClient.get<unknown>('/companies/internal/promotions/latest');
  const list = Array.isArray(response)
    ? response
    : Array.isArray((response as any)?.items)
      ? (response as any).items
      : Array.isArray((response as any)?.data)
        ? (response as any).data
        : [];

  return list.map((item: unknown, index: number) => normalizeItem(item, index));
}
