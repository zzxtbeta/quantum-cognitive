/**
 * 研究人员 API
 * 调用真实后端 /people/search 接口（通过 Vite proxy /api）
 */

import { Researcher, ResearcherFilters, ResearcherListResponse, Institution, PeopleSearchResponse } from '../types/people';
import { adaptApiItemToResearcher } from '../adapters/researcherAdapter';

// 机构枚举 → API institution 关键词映射
const INSTITUTION_KEYWORDS: Partial<Record<Institution, string>> = {
  baqis: '北京量子',
  qscgba: '粤港澳大湾区量子',
  tsinghua: '清华大学',
  ustc: '中国科学技术大学',
  zju: '浙江大学',
};

/**
 * 构建 /people/search 请求 URL
 */
function buildSearchUrl(filters: ResearcherFilters): string {
  const params = new URLSearchParams();

  // 默认只取 seed_data（完整字段）
  params.set('data_source', 'seed_data');

  // 分页
  params.set('page', String(filters.page ?? 1));
  params.set('page_size', String(filters.pageSize ?? 20));

  // 姓名搜索（兼容旧的 searchQuery）
  const nameQuery = filters.name || filters.searchQuery;
  if (nameQuery) {
    params.set('name', nameQuery);
  }

  // 机构筛选（多个 institution 参数，OR 逻辑）
  if (filters.institution?.length) {
    for (const inst of filters.institution) {
      const keyword = INSTITUTION_KEYWORDS[inst];
      if (keyword) {
        params.append('institution', keyword);
      }
    }
  }

  // 职位筛选
  if (filters.position) {
    params.set('position', filters.position);
  }

  // 研究方向筛选
  if (filters.researchArea) {
    params.set('research_area', filters.researchArea);
  }

  return `/api/people/search?${params.toString()}`;
}

/**
 * 研究人员 API
 */
export const researcherApi = {
  /**
   * 获取研究人员列表（调用真实 API）
   */
  getResearchers: async (filters?: ResearcherFilters): Promise<ResearcherListResponse> => {
    const url = buildSearchUrl(filters ?? {});

    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`People API error: ${response.status} ${response.statusText}`);
    }

    const data: PeopleSearchResponse = await response.json();
    const researchers: Researcher[] = data.items.map(adaptApiItemToResearcher);

    return {
      total: data.total,
      page: data.page,
      pageSize: data.page_size,
      researchers,
    };
  },

  /**
   * 获取单个研究人员详情（按 id 精确匹配）
   */
  getResearcherById: async (id: string): Promise<Researcher | null> => {
    const url = `/api/people/search?data_source=seed_data&page=1&page_size=100`;
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) return null;
    const data: PeopleSearchResponse = await response.json();
    const item = data.items.find(i => String(i.id) === id);
    return item ? adaptApiItemToResearcher(item) : null;
  },

  /**
   * 全局搜索（用于 Chat 拖拽等场景）
   */
  search: async (query: string, limit: number = 10): Promise<Researcher[]> => {
    const params = new URLSearchParams({
      data_source: 'seed_data',
      page: '1',
      page_size: String(limit),
      name: query,
    });
    const response = await fetch(`/api/people/search?${params}`, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return [];
    const data: PeopleSearchResponse = await response.json();
    return data.items.map(adaptApiItemToResearcher);
  },
};
