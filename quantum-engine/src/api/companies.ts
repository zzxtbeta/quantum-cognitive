// 公司/候选标的相关API

import { Candidate, CandidateFilters, CandidateListResponse } from '../types';

export const companyApi = {
  /**
   * 获取候选标的列表（暂无真实数据，返回空列表）
   */
  getCandidates: async (_filters?: CandidateFilters): Promise<CandidateListResponse> => {
    return { total: 0, candidates: [] };
  },

  /**
   * 获取公司详情
   */
  getCompanyById: async (id: string): Promise<Candidate> => {
    throw new Error(`Company not found: ${id}`);
  },
};
