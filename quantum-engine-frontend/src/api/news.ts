import { apiClient } from './client';

export interface NewsItem {
  id: number;
  title: string;
  summary: string | null;
  published_at: string;
  source: string;
  source_url: string | null;
  author: string | null;
  tags: string[] | null;
  mentioned_entities?: string[] | null;
  created_at?: string;
}

export interface NewsListResponse {
  data: NewsItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages?: number;
}

export interface NewsSearchResult {
  gold_news_id: number;
  title: string;
  summary: string | null;
  published_at: string;
  source: string;
  source_url: string | null;
  tags: string[] | null;
  score: number;
}

export interface NewsSearchResponse {
  data: NewsSearchResult[];
}

export interface NewsSourceItem {
  source: string;
  count?: number;
}

export interface NewsQueryParams {
  keyword?: string;
  start_date?: string;
  end_date?: string;
  source?: string;
  match_mode?: 'phrase' | 'any';
  sort_by?: 'published_at';
  page?: number;
  page_size?: number;
}

export const newsApi = {
  getNewsList: async (params: NewsQueryParams = {}): Promise<NewsListResponse> => {
    const query: Record<string, any> = {
      sort_by: params.sort_by || 'published_at',
      match_mode: params.match_mode || 'phrase',
      page: params.page || 1,
      page_size: params.page_size || 20,
    };

    if (params.keyword) query.keyword = params.keyword;
    if (params.start_date) query.start_date = params.start_date;
    if (params.end_date) query.end_date = params.end_date;
    if (params.source) query.source = params.source;

    return apiClient.get<NewsListResponse>('/news', query);
  },

  semanticSearch: async (query: string, top_k = 10): Promise<NewsSearchResponse> => {
    return apiClient.post<NewsSearchResponse>('/news/search', { query, top_k });
  },

  getSources: async (): Promise<NewsSourceItem[]> => {
    const response = await apiClient.get<NewsSourceItem[] | { data: NewsSourceItem[] }>('/news/sources');
    return Array.isArray(response) ? response : response.data;
  },
};

export function formatNewsDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays <= 0) return '今天';
  if (diffDays === 1) return '昨天';
  if (diffDays < 7) return `${diffDays}天前`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}个月前`;

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function mapTagsToSignalType(tags: string[] | null): string {
  if (!tags || tags.length === 0) return '新闻资讯';
  const joined = tags.join(' ');

  const map: Record<string, string> = {
    '融资': '融资事件',
    'IPO': '融资事件',
    '上市': '融资事件',
    '政策': '政策规划',
    '规划': '政策规划',
    '技术': '技术发布',
    '突破': '技术发布',
    '产业化': '产业化进展',
    '商业化': '产业化进展',
    '人才': '人才组织',
    '团队': '人才组织',
  };

  for (const [keyword, value] of Object.entries(map)) {
    if (joined.includes(keyword)) return value;
  }

  return '新闻资讯';
}
