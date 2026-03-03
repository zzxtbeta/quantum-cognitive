// 研究人员相关类型定义

// 标准化职称层级
export type TitleLevel =
  | 'pi'           // 首席科学家/PI/院士/院长
  | 'professor'    // 教授/研究员/博导
  | 'associate'    // 副教授/副研究员
  | 'postdoc'      // 博士后/助理研究员
  | 'phd'          // 博士生
  | 'other';       // 其他/未知

// 机构枚举
export type Institution =
  | 'baqis'        // 北京量子院
  | 'qscgba'       // 粤港澳量子中心
  | 'tsinghua'     // 清华
  | 'ustc'         // 中科大
  | 'zju'          // 浙大
  | 'other';

// 教育背景
export interface Education {
  year?: string;
  degree?: string;
  school?: string;
  field?: string;
}

// 工作经历
export interface Career {
  period?: string;
  position?: string;
  organization?: string;
  text?: string;
}

// 公司关联
export interface CompanyLink {
  companyId: string;
  companyName: string;
  role: 'founder' | 'advisor' | 'employee' | 'unknown';
  joinDate?: string;
}

// 研究人员基础信息
export interface Researcher {
  id: string;                    // 唯一标识：institution_name
  name: string;                  // 姓名
  nameEn?: string;               // 英文名
  url: string;                   // 个人主页
  title: string;                 // 职称
  titleNormalized: TitleLevel;   // 标准化职称
  email: string;                 // 邮箱（可能为空）

  // 机构信息
  institution: Institution;      // 所属机构
  institutionRaw: string;        // 原始机构名称
  department?: string;           // 部门

  // 研究方向
  researchDirection?: string;    // 研究方向原始文本
  researchTags: string[];        // 提取的研究标签

  // 详细信息
  biography: string;             // 完整简介
  education?: Education[];       // 教育背景
  career?: Career[];             // 工作经历

  // 关联信息（后期填充）
  paperCount?: number;           // 关联论文数量
  companyLinks?: CompanyLink[];  // 关联公司
}

// 原始数据类型（从Parquet转换）
export interface RawPeopleData {
  name: string;
  url: string;
  title: string;
  email: string;
  institution: string;
  department: string;
  research_direction: string;
  biography: string;
}

// 筛选参数
export interface ResearcherFilters {
  institution?: Institution[];
  titleLevel?: TitleLevel[];
  researchTag?: string;
  hasEmail?: boolean;
  hasBiography?: boolean;
  hasHomepage?: boolean;
  searchQuery?: string;
  page?: number;
  pageSize?: number;
}

// 响应类型
export interface ResearcherListResponse {
  total: number;
  page: number;
  pageSize: number;
  researchers: Researcher[];
}

// 职称显示配置
export const TITLE_CONFIG: Record<TitleLevel, { label: string; color: string; order: number }> = {
  pi: { label: '首席/PI', color: 'text-red-500', order: 0 },
  professor: { label: '教授', color: 'text-cyan-500', order: 1 },
  associate: { label: '副教授', color: 'text-amber-500', order: 2 },
  postdoc: { label: '博士后', color: 'text-blue-500', order: 3 },
  phd: { label: '博士生', color: 'text-slate-400', order: 4 },
  other: { label: '其他', color: 'text-slate-500', order: 5 },
};

// 机构显示配置
export const INSTITUTION_CONFIG: Record<Institution, { name: string; shortName: string; color: string; icon: string }> = {
  baqis: { name: '北京量子信息科学研究院', shortName: '北京量子院', color: 'bg-blue-600', icon: '' },
  qscgba: { name: '粤港澳大湾区量子科学中心', shortName: '粤港澳量子中心', color: 'bg-purple-600', icon: '' },
  tsinghua: { name: '清华大学', shortName: '清华', color: 'bg-red-600', icon: '' },
  ustc: { name: '中国科学技术大学', shortName: '中科大', color: 'bg-indigo-600', icon: '' },
  zju: { name: '浙江大学', shortName: '浙大', color: 'bg-emerald-600', icon: '' },
  other: { name: '其他机构', shortName: '其他', color: 'bg-slate-600', icon: '' },
};
