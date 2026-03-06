// 量子新闻数据库 API

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
  mentioned_entities: string[] | null;
  created_at?: string;
}

export interface NewsListResponse {
  data: NewsItem[];
  total: number;
  page: number;
  page_size: number;
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

export interface NewsQueryParams {
  keyword?: string;
  start_date?: string;
  end_date?: string;
  source?: string;
  match_mode?: 'phrase' | 'any';
  sort_by?: 'published_at' | 'importance_score';
  page?: number;
  page_size?: number;
}

export const newsApi = {
  /**
   * 分页查询新闻列表（结构化过滤）
   */
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

    return apiClient.get<NewsListResponse>('/api/news', query);
  },

  /**
   * 向量语义检索新闻（自然语言查询）
   */
  semanticSearch: async (query: string, top_k = 10): Promise<NewsSearchResponse> => {
    return apiClient.post<NewsSearchResponse>('/api/news/search', { query, top_k });
  },
};

/**
 * 将 NewsItem 中文日期格式化为友好显示
 */
export function formatNewsDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return '今天';
  if (diffDays === 1) return '昨天';
  if (diffDays < 7) return `${diffDays}天前`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}个月前`;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * 将 tags 字段推断前端 SignalType
 */
export function mapTagsToSignalType(tags: string[] | null): string {
  if (!tags || tags.length === 0) return '新闻资讯';
  const joined = tags.join(' ');
  const map: Record<string, string> = {
    '融资': '融资事件',
    '投资': '融资事件',
    'IPO': '融资事件',
    '政策': '政策规划',
    '规划': '政策规划',
    '产品': '技术发布',
    '发布': '技术发布',
    '合作': '产业化进展',
    '产业': '产业化进展',
    '人才': '人才组织',
  };
  for (const [key, val] of Object.entries(map)) {
    if (joined.includes(key)) return val;
  }
  return '新闻资讯';
}
