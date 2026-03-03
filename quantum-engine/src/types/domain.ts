// 领域/知识地图相关类型定义

export type TechNodeType = 'category' | 'route';
export type TechTrend = 'rising' | 'stable' | 'declining' | 'early';

export interface TechNode {
  id: string;
  name: string;
  type: TechNodeType;
  parentId?: string;
  description: string;
  stage: string;
  trend: TechTrend;
  signalCount: number;
  companyCount: number;
  paperCount?: number; // 论文数量
  children?: TechNode[];
}

export interface DomainTreeResponse {
  domains: TechNode[];
}

export interface DomainDetail extends TechNode {
  keyProblems?: string[];
  relatedCompanies?: Array<{
    id: string;
    name: string;
    location: string;
    stage: string;
  }>;
  relatedSignals?: Array<{
    id: string;
    title: string;
    type: string;
    timestamp: string;
  }>;
}
