// 公司/候选标的相关API

import { Candidate, CandidateFilters, CandidateListResponse } from '../types';
import { mockCandidates } from '../mock/companies';

export const companyApi = {
  /**
   * 获取候选标的列表
   */
  getCandidates: async (filters?: CandidateFilters): Promise<CandidateListResponse> => {
    // 候选标的暂时只有Mock数据
    await new Promise(resolve => setTimeout(resolve, 300));
    
    let filteredCandidates = [...mockCandidates];
    
    // 地区筛选
    if (filters?.location) {
      filteredCandidates = filteredCandidates.filter(c => c.location === filters.location);
    }
    
    // 技术路线筛选
    if (filters?.techRoute) {
      filteredCandidates = filteredCandidates.filter(c => c.techRoute === filters.techRoute);
    }
    
    // 排序
    if (filters?.sortBy === 'signalCount') {
      filteredCandidates.sort((a, b) => b.signalCount - a.signalCount);
    }
    
    return {
      total: filteredCandidates.length,
      candidates: filteredCandidates,
    };
  },

  /**
   * 获取公司详情
   */
  getCompanyById: async (id: string): Promise<Candidate> => {
    // 候选标的暂时只有Mock数据
    await new Promise(resolve => setTimeout(resolve, 200));
    const candidate = mockCandidates.find(c => c.id === id);
    if (!candidate) {
      throw new Error(`Company not found: ${id}`);
    }
    return candidate;
  },
};
