// 信号相关类型定义

// 论文作为独立信号类型
// 新闻信号包含五大类型：政策规划、融资事件、产业化进展、技术发布、人才组织
export type SignalType = '论文' | '政策规划' | '融资事件' | '产业化进展' | '技术发布' | '人才组织';
export type SignalPriority = 'high' | 'mid' | 'low';

export interface Signal {
  id: string;
  title: string;
  type: SignalType;
  source: string;
  timestamp: string;
  priority: SignalPriority;
  summary: string;
  relatedEntities: {
    companies: number;
    people: number;
    technologies: number;
  };
  metadata?: any; // 用于存储原始数据（如论文的详细字段）
}

export interface SignalDetail extends Signal {
  content?: string;
  structuredInfo?: Record<string, any>;
  relatedSignals?: string[];
  whyImportant?: string[];
}

export interface SignalFilters {
  type?: SignalType | '全部';
  priority?: SignalPriority | 'all';
  timeRange?: '7' | '30' | '90' | 'all';
  page?: number;
  pageSize?: number;
}

export interface SignalListResponse {
  total: number;
  page: number;
  pageSize: number;
  signals: Signal[];
}
