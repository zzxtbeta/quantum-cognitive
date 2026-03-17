// 公司库 API — /companies

import { apiClient } from './client';
import type { CompanyFilters, CompanyListResponse } from '../types';
import { Candidate, CandidateFilters, CandidateListResponse } from '../types';

/**
 * 查询公司列表
 * GET /companies
 * 支持公司名/法人模糊匹配，省份/行业/登记状态精确筛选，分页
 */
export async function fetchCompanies(
  filters: CompanyFilters = {}
): Promise<CompanyListResponse> {
  const params: Record<string, any> = {
    page: filters.page ?? 1,
    page_size: filters.page_size ?? 20,
  };
  if (filters.name) params.name = filters.name;
  if (filters.legal_person) params.legal_person = filters.legal_person;
  if (filters.province) params.province = filters.province;
  if (filters.industry) params.industry = filters.industry;
  if (filters.reg_status) params.reg_status = filters.reg_status;

  return apiClient.get<CompanyListResponse>('/companies', params);
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
