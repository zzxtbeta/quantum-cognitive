import { apiClient } from './client';
import { SignalDetail, SignalFilters, SignalListResponse } from '../types';
import { BackendPapersResponse } from '../types/backend';
import { adaptPapersResponse, adaptPaperToSignalDetail } from '../adapters/paperAdapter';
import { newsApi, NewsItem, NewsSearchResult, mapTagsToSignalType } from './news';
import type { Signal } from '../types';

/** 将数据库新闻条目转换为 Signal 格式 */
function adaptNewsItem(item: NewsItem | NewsSearchResult): Signal {
  const id = 'gold_news_id' in item
    ? `news-${item.gold_news_id}`
    : `news-${(item as NewsItem).id}`;
  const tags = (item as NewsItem).tags ?? (item as NewsSearchResult).tags ?? null;
  const type = mapTagsToSignalType(tags) as Signal['type'];
  const title = item.title || '（无标题）';
  const source = item.source || '未知来源';
  const dateStr = item.published_at || '';
  const priority: Signal['priority'] = 'mid';
  return {
    id,
    title,
    type,
    source,
    timestamp: dateStr,
    priority,
    summary: item.summary || title,
    relatedEntities: {
      companies: 0,
      people: 0,
      technologies: tags ? tags.length : 0,
    },
    metadata: { sourceUrl: item.source_url, tags },
  };
}

export const signalApi = {
  /**
   * 获取信号列表
   */
  getSignals: async (filters?: SignalFilters): Promise<SignalListResponse> => {
    const timeRangeMap: Record<string, string> = { '7': '7d', '30': '30d', '90': '90d' };

    // 新闻资讯类型：关键词搜索 + 分页
    if (filters?.type === '新闻资讯') {
      const timeRange = filters?.timeRange;
      const startDate = timeRange && timeRange !== 'all'
        ? (() => { const d = new Date(); d.setDate(d.getDate() - parseInt(timeRange)); return d.toISOString().slice(0, 10); })()
        : undefined;
      const keyword = filters?.keyword?.trim() || '量子';
      const response = await newsApi.getNewsList({
        page: filters?.page || 1,
        page_size: filters?.pageSize || 20,
        start_date: startDate,
        keyword,
        match_mode: 'any',
      });
      const validItems = response.data.filter(item => item.title && !item.title.startsWith('"'));
      return {
        total: response.total,
        page: response.page || filters?.page || 1,
        pageSize: response.page_size || filters?.pageSize || 20,
        signals: validItems.map(adaptNewsItem),
      };
    }

    // 技术发布：论文（最新研究）+ 技术关键词新闻 混合展示
    if (filters?.type === '技术发布') {
      const timeRange = filters?.timeRange && filters.timeRange !== 'all'
        ? timeRangeMap[filters.timeRange] : undefined;
      const keyword = filters?.keyword?.trim();
      const [paperResponse, newsResponse] = await Promise.all([
        apiClient.get<BackendPapersResponse>('/papers', {
          page: 1,
          page_size: 15,
          ...(timeRange ? { time_range: timeRange } : {}),
          ...(keyword ? { keyword } : {}),
        }),
        newsApi.getNewsList({
          keyword: keyword || '量子 发布 突破',
          page: 1,
          page_size: 10,
          match_mode: 'any',
        }),
      ]);
      const paperSignals = adaptPapersResponse(paperResponse.papers).map(s => ({ ...s, type: '技术发布' as Signal['type'] }));
      const validNews = newsResponse.data.filter(item => item.title && !item.title.startsWith('"'));
      const newsSignals = validNews.map(adaptNewsItem);
      const combined = [...paperSignals, ...newsSignals].sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      return {
        total: paperResponse.total + newsResponse.total,
        page: 1,
        pageSize: combined.length,
        signals: combined,
      };
    }

    // 其他分类类型（融资/政策/产业化/人才）：用关键词过滤新闻数据库
    const newsCategoryKeywords: Record<string, string> = {
      '融资事件': '量子 融资 投资 IPO',
      '政策规划': '量子 政策 规划 战略',
      '产业化进展': '量子 合作 商业 产业',
      '人才组织': '量子 院士 教授 研究员 人才',
    };
    if (filters?.type && filters.type !== '全部' && newsCategoryKeywords[filters.type]) {
      const keyword = filters?.keyword?.trim() || newsCategoryKeywords[filters.type];
      const response = await newsApi.getNewsList({
        keyword,
        page: filters?.page || 1,
        page_size: filters?.pageSize || 20,
        match_mode: 'any',
      });
      const validItems = response.data.filter(item => item.title && !item.title.startsWith('"'));
      return {
        total: response.total,
        page: response.page || filters?.page || 1,
        pageSize: response.page_size || filters?.pageSize || 20,
        signals: validItems.map(adaptNewsItem),
      };
    }

    // 全部类型：混合量子论文 + 量子新闻
    const [paperResponse, newsResponse] = await Promise.all([
      apiClient.get<BackendPapersResponse>('/papers', { page: 1, page_size: 15 }),
      newsApi.getNewsList({ keyword: '量子', page: 1, page_size: 15, match_mode: 'any' }),
    ]);
    const paperSignals = adaptPapersResponse(paperResponse.papers);
    const validNews = newsResponse.data.filter(item => item.title && !item.title.startsWith('"'));
    const newsSignals = validNews.map(adaptNewsItem);
    const allSignals = [...paperSignals, ...newsSignals].sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    return {
      total: paperResponse.total + newsResponse.total,
      page: 1,
      pageSize: allSignals.length,
      signals: allSignals,
    };
  },

  /**
   * 获取单个信号详情
   */
  getSignalById: async (id: string): Promise<SignalDetail> => {
    // 论文详情
    if (id.startsWith('paper-')) {
      const paperId = id.replace('paper-', '');
      const paper = await apiClient.get<any>(`/papers/${paperId}`);
      return adaptPaperToSignalDetail(paper);
    }

    // 新闻详情：直接通过 ID 查询（API 不提供单篇接口，抛出由调用方 fallback 处理）
    throw new Error(`No detail API for signal: ${id}`);
  },
};
