import { apiClient } from './client';
import { SignalDetail, SignalFilters, SignalListResponse } from '../types';
import { BackendPapersResponse } from '../types/backend';
import { adaptPapersResponse, adaptPaperToSignalDetail } from '../adapters/paperAdapter';
import { newsApi, NewsItem, NewsSearchResult, mapTagsToSignalType } from './news';
import type { Signal } from '../types';

function adaptNewsItem(item: NewsItem | NewsSearchResult): Signal {
  const id = 'gold_news_id' in item ? `news-${item.gold_news_id}` : `news-${(item as NewsItem).id}`;
  const tags = 'tags' in item ? item.tags ?? null : null;

  return {
    id,
    title: item.title || '未命名新闻',
    type: mapTagsToSignalType(tags) as Signal['type'],
    source: item.source || '未声明来源',
    timestamp: item.published_at || '',
    priority: 'mid',
    summary: item.summary || item.title || '',
    relatedEntities: {
      companies: 0,
      people: 0,
      technologies: tags ? tags.length : 0,
    },
    metadata: {
      sourceUrl: item.source_url,
      tags,
    },
  };
}

function buildStartDate(timeRange?: SignalFilters['timeRange']) {
  if (!timeRange || timeRange === 'all') return undefined;
  const days = Number(timeRange);
  if (!Number.isFinite(days)) return undefined;
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

export const signalApi = {
  getSignals: async (filters?: SignalFilters): Promise<SignalListResponse> => {
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 20;

    if (filters?.type === '新闻资讯') {
      const response = await newsApi.getNewsList({
        page,
        page_size: pageSize,
        keyword: filters.keyword?.trim() || undefined,
        source: filters.source?.trim() || undefined,
        start_date: filters.startDate || buildStartDate(filters.timeRange),
        end_date: filters.endDate || undefined,
        match_mode: filters.matchMode || 'phrase',
        sort_by: 'published_at',
      });

      const validItems = response.data.filter((item) => item.title && !item.title.startsWith('"'));
      return {
        total: response.total,
        page: response.page || page,
        pageSize: response.page_size || pageSize,
        signals: validItems.map(adaptNewsItem),
      };
    }

    if (filters?.type === '技术发布') {
      const [paperResponse, newsResponse] = await Promise.all([
        apiClient.get<BackendPapersResponse>('/papers', {
          page: 1,
          page_size: 15,
          ...(filters?.keyword ? { keyword: filters.keyword.trim() } : {}),
        }),
        newsApi.getNewsList({
          keyword: filters?.keyword?.trim() || '量子 技术 发布 突破',
          page: 1,
          page_size: 10,
          match_mode: 'any',
        }),
      ]);

      const paperSignals = adaptPapersResponse(paperResponse.papers).map((signal) => ({
        ...signal,
        type: '技术发布' as Signal['type'],
      }));
      const newsSignals = newsResponse.data
        .filter((item) => item.title && !item.title.startsWith('"'))
        .map(adaptNewsItem);

      const combined = [...paperSignals, ...newsSignals].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );

      return {
        total: paperResponse.total + newsResponse.total,
        page: 1,
        pageSize: combined.length,
        signals: combined,
      };
    }

    const categoryKeywords: Record<string, string> = {
      '融资事件': '量子 融资 投资 IPO 上市',
      '政策规划': '量子 政策 规划 标准 监管',
      '产业化进展': '量子 商业化 产业化 交付 合作 平台',
      '人才组织': '量子 团队 人才 机构 创始人 教授',
    };

    if (filters?.type && filters.type !== '全部' && categoryKeywords[filters.type]) {
      const response = await newsApi.getNewsList({
        page,
        page_size: pageSize,
        keyword: filters.keyword?.trim() || categoryKeywords[filters.type],
        match_mode: filters.matchMode || 'any',
        start_date: filters.startDate || buildStartDate(filters.timeRange),
        end_date: filters.endDate || undefined,
        source: filters.source?.trim() || undefined,
      });

      const validItems = response.data.filter((item) => item.title && !item.title.startsWith('"'));
      return {
        total: response.total,
        page: response.page || page,
        pageSize: response.page_size || pageSize,
        signals: validItems.map(adaptNewsItem),
      };
    }

    const [paperResponse, newsResponse] = await Promise.all([
      apiClient.get<BackendPapersResponse>('/papers', { page: 1, page_size: 15 }),
      newsApi.getNewsList({
        keyword: filters?.keyword?.trim() || '量子',
        page: 1,
        page_size: 15,
        match_mode: 'any',
        start_date: filters?.startDate || buildStartDate(filters?.timeRange),
        end_date: filters?.endDate || undefined,
      }),
    ]);

    const paperSignals = adaptPapersResponse(paperResponse.papers);
    const newsSignals = newsResponse.data
      .filter((item) => item.title && !item.title.startsWith('"'))
      .map(adaptNewsItem);
    const allSignals = [...paperSignals, ...newsSignals].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    return {
      total: paperResponse.total + newsResponse.total,
      page: 1,
      pageSize: allSignals.length,
      signals: allSignals,
    };
  },

  getSignalById: async (id: string): Promise<SignalDetail> => {
    if (id.startsWith('paper-')) {
      const paperId = id.replace('paper-', '');
      const paper = await apiClient.get<any>(`/papers/${paperId}`);
      return adaptPaperToSignalDetail(paper);
    }

    throw new Error(`No detail API for signal: ${id}`);
  },
};
