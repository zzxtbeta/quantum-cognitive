// 公司库 API — /api/gold/companies

import { apiClient } from './client';
import type { GoldCompanyFilters, GoldCompanyListResponse } from '../types';
import { Candidate, CandidateFilters, CandidateListResponse } from '../types';

/**
 * 查询 Gold 层公司列表
 * GET /api/gold/companies
 * 支持公司名/法人模糊匹配，省份/行业/登记状态精确筛选，分页
 */
export async function fetchGoldCompanies(
  filters: GoldCompanyFilters = {}
): Promise<GoldCompanyListResponse> {
  const params: Record<string, any> = {
    page: filters.page ?? 1,
    page_size: filters.page_size ?? 20,
  };
  if (filters.name) params.name = filters.name;
  if (filters.legal_person) params.legal_person = filters.legal_person;
  if (filters.province) params.province = filters.province;
  if (filters.industry) params.industry = filters.industry;
  if (filters.reg_status) params.reg_status = filters.reg_status;

  return apiClient.get<GoldCompanyListResponse>('/api/gold/companies', params);
}

// 保留旧接口（其他页面依赖 companyApi.getCandidates / getCompanyById）
export const companyApi = {
  getCandidates: async (_filters?: CandidateFilters): Promise<CandidateListResponse> => {
    return { total: 0, candidates: [] };
  },
  getCompanyById: async (id: string): Promise<Candidate> => {
    throw new Error(`Company not found: ${id}`);
  },
};
