/**
 * 研究人员 API
 * 调用真实后端 /people/search 接口
 */

import { Researcher, ResearcherFilters, ResearcherListResponse, Institution, PeopleSearchResponse } from '../types/people';
import { adaptApiItemToResearcher } from '../adapters/researcherAdapter';
import { API_BASE_URL } from './client';

// 机构枚举 → API institution 关键词映射
const INSTITUTION_KEYWORDS: Partial<Record<Institution, string>> = {
  baqis: '北京量子',
  qscgba: '粤港澳大湾区量子',
  tsinghua: '清华大学',
  ustc: '中国科学技术大学',
  zju: '浙江大学',
};

function buildSearchParams(filters: ResearcherFilters): URLSearchParams {
  const params = new URLSearchParams();

  params.set('data_source', 'seed_data');
  params.set('page', String(filters.page ?? 1));
  params.set('page_size', String(filters.pageSize ?? 20));

  const nameQuery = filters.name || filters.searchQuery;
  if (nameQuery) params.set('name', nameQuery);

  if (filters.institution?.length) {
    for (const inst of filters.institution) {
      const keyword = INSTITUTION_KEYWORDS[inst];
      if (keyword) params.append('institution', keyword);
    }
  }

  if (filters.position) params.set('position', filters.position);
  if (filters.researchArea) params.set('research_area', filters.researchArea);

  return params;
}

async function fetchPeople(queryString: string): Promise<PeopleSearchResponse> {
  const apiKey = import.meta.env.VITE_API_KEY;
  const res = await fetch(`${API_BASE_URL}/people/search?${queryString}`, {
    headers: {
      Accept: 'application/json',
      ...(apiKey ? { 'X-API-Key': apiKey } : {}),
    },
  });
  if (!res.ok) throw new Error(`People API error: ${res.status} ${res.statusText}`);
  return res.json();
}

export const researcherApi = {
  getResearchers: async (filters?: ResearcherFilters): Promise<ResearcherListResponse> => {
    const data = await fetchPeople(buildSearchParams(filters ?? {}).toString());
    return {
      total: data.total,
      page: data.page,
      pageSize: data.page_size,
      researchers: data.items.map(adaptApiItemToResearcher),
    };
  },

  getResearcherById: async (id: string): Promise<Researcher | null> => {
    const data = await fetchPeople('data_source=seed_data&page=1&page_size=100');
    const item = data.items.find(i => String(i.id) === id);
    return item ? adaptApiItemToResearcher(item) : null;
  },

  search: async (query: string, limit: number = 10): Promise<Researcher[]> => {
    const params = new URLSearchParams({
      data_source: 'seed_data',
      page: '1',
      page_size: String(limit),
      name: query,
    });
    const data = await fetchPeople(params.toString());
    return data.items.map(adaptApiItemToResearcher);
  },
};
