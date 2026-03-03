/**
 * 后端API响应类型定义
 */

// 论文作者
export interface BackendAuthor {
  name: string;
  affiliation: string;
}

// 研究问题
export interface BackendResearchProblem {
  detail: string;
  summary: string;
}

// 技术路线
export interface BackendTechRoute {
  detail: string;
  summary: string;
}

// 关键贡献
export interface BackendKeyContribution {
  detail: string;
  summary: string;
}

// 领域信息（v2.1新增）
export interface BackendDomain {
  id: number;
  name: string;
  level: 'domain' | 'direction' | 'technology';
}

// 论文对象
export interface BackendPaper {
  id: number;
  paper_id: number;
  title: string;
  abstract: string;
  authors: BackendAuthor[];
  publish_date: string;
  influence_score: number | null;
  extraction_id: number;
  research_problem: BackendResearchProblem | null;
  tech_route: BackendTechRoute | null;
  key_contributions: BackendKeyContribution[] | null;
  metrics: any | null;
  domain_ids: number[];
  domains?: BackendDomain[]; // v2.1新增：直接包含领域名称
  created_at: string;
  updated_at: string;
}

// 统计信息（v2.1新增）
export interface BackendStatistics {
  by_domain: Record<string, number>;
  by_year: Record<string, number>;
  top_authors: Array<{ name: string; count: number }>;
  top_institutions: Array<{ name: string; count: number }>;
}

// 论文列表响应
export interface BackendPapersResponse {
  total: number;
  page: number;
  page_size: number;
  papers: BackendPaper[];
  statistics?: BackendStatistics; // v2.1新增：可选的统计信息
}
