// 公司/候选标的相关类型定义

export interface Candidate {
  id: string;
  name: string;
  location: string;
  techRoute: string;
  signalCount: number;
  reasons: string[];
  stage?: string;
  fundingRound?: string;
  description?: string;
}

export interface CandidateFilters {
  location?: string;
  techRoute?: string;
  sortBy?: 'signalCount' | 'recent' | 'priority';
}

export interface CandidateListResponse {
  total: number;
  candidates: Candidate[];
}
