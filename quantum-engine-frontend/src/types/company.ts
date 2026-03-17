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

// ── 公司库数据模型 ────────────────────────────────────────────────────────────

export interface Company {
  id: number;
  name: string;
  credit_code: string | null;
  alias: string | null;
  reg_status: string | null;
  company_type: string | null;
  legal_person_name: string | null;
  legal_person_type: string | null;
  reg_capital: string | null;
  reg_capital_currency: string | null;
  actual_capital: string | null;
  actual_capital_currency: string | null;
  reg_number: string | null;
  tax_number: string | null;
  org_number: string | null;
  establish_time: string | null;
  end_date: string | null;
  province: string | null;
  city: string | null;
  district: string | null;
  reg_location: string | null;
  industry: string | null;
  scale: string | null;
  social_staff_num: number | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  description: string | null;
  company_profile: string | null;
  business_scope: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompanyFilters {
  page?: number;
  page_size?: number;
  name?: string;
  legal_person?: string;
  province?: string;
  industry?: string;
  reg_status?: string;
}

export interface CompanyListResponse {
  total: number;
  page: number;
  page_size: number;
  items: Company[];
}
