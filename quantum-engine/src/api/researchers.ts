/**
 * 研究人员相关 API
 * V1: 从本地 JSON 文件加载
 * V2: 后期切换到后端 API
 */

import { Researcher, ResearcherFilters, ResearcherListResponse, Institution, TitleLevel } from '../types/people';
import { adaptRawToResearcher } from '../adapters/researcherAdapter';

// 是否使用 mock 数据（开发测试用）
const USE_MOCK = false;

// 模拟数据（用于测试）
const mockResearchers: Researcher[] = [
  {
    id: 'ustc_潘建伟',
    name: '潘建伟',
    url: '',
    title: '固定岗科研人员',
    titleNormalized: 'pi',
    email: 'pan@ustc.edu.cn',
    institution: 'ustc',
    institutionRaw: '中国科学技术大学',
    department: '量子物理与量子信息研究部',
    researchDirection: '量子计算、量子通信、量子网络',
    researchTags: ['量子计算', '量子通信', '量子网络'],
    biography: '潘建伟，1970年3月生，浙江东阳人，实验物理学博士，中国科学技术大学教授、中国科学院院士...',
    education: [{ year: '1999', degree: '博士', school: '维也纳大学' }],
  },
  {
    id: 'tsinghua_姚期智',
    name: '姚期智',
    nameEn: 'Andrew Yao',
    url: 'https://cqi.tsinghua.edu.cn/rydw/jsxl/yaoqizhi.htm',
    title: '院长, 教授',
    titleNormalized: 'pi',
    email: '',
    institution: 'tsinghua',
    institutionRaw: '清华大学',
    department: '交叉信息研究院',
    researchDirection: '算法，密码学，量子计算，人工智能',
    researchTags: ['量子计算', '量子算法', '量子密码'],
    biography: '【教育背景】\n1972年，哈佛大学，物理学博士学位\n\n【工作经历】\n麻省理工学院数学系，助理教授...',
    education: [{ year: '1972', degree: '博士', school: '哈佛' }],
  },
  {
    id: 'baqis_某研究员',
    name: '张三',
    url: 'https://www.baqis.ac.cn/people/detail/?cid=615',
    title: '研究员',
    titleNormalized: 'professor',
    email: 'zhangsan@baqis.ac.cn',
    institution: 'baqis',
    institutionRaw: '北京量子信息科学研究院',
    department: '量子计算研究部',
    researchDirection: '超导量子计算',
    researchTags: ['超导量子', '量子计算'],
    biography: '从事超导量子计算研究...',
  },
];

/**
 * 从 JSON 文件加载所有研究人员数据
 */
async function loadFromJSON(): Promise<Researcher[]> {
  try {
    const response = await fetch('/data/people.json');
    if (!response.ok) {
      throw new Error(`Failed to load people.json: ${response.status}`);
    }
    const rawData = await response.json();
    return rawData.map(adaptRawToResearcher);
  } catch (error) {
    console.error('Failed to load researchers from JSON:', error);
    // 如果加载失败，返回 mock 数据
    return mockResearchers;
  }
}

/**
 * 应用筛选条件
 */
function applyFilters(researchers: Researcher[], filters?: ResearcherFilters): Researcher[] {
  if (!filters) return researchers;

  return researchers.filter(r => {
    // 机构筛选
    if (filters.institution?.length && !filters.institution.includes(r.institution)) {
      return false;
    }

    // 职称层级筛选
    if (filters.titleLevel?.length && !filters.titleLevel.includes(r.titleNormalized)) {
      return false;
    }

    // 研究方向标签筛选
    if (filters.researchTag && !r.researchTags.includes(filters.researchTag)) {
      return false;
    }

    // 是否有邮箱（检查非空字符串）
    if (filters.hasEmail && (!r.email || r.email.trim() === '')) {
      return false;
    }

    // 是否有简介（检查非空且有实质内容）
    if (filters.hasBiography && (!r.biography || r.biography.trim().length < 10)) {
      return false;
    }

    // 是否有主页
    if (filters.hasHomepage && (!r.homepage || r.homepage.trim() === '')) {
      return false;
    }

    // 搜索查询
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      const matchName = r.name.toLowerCase().includes(query);
      const matchNameEn = r.nameEn?.toLowerCase().includes(query) ?? false;
      const matchInstitution = r.institutionRaw.toLowerCase().includes(query);
      const matchDepartment = r.department?.toLowerCase().includes(query) ?? false;
      const matchTitle = r.title.toLowerCase().includes(query);
      const matchResearch = r.researchDirection?.toLowerCase().includes(query) ?? false;
      const matchTags = r.researchTags.some(t => t.toLowerCase().includes(query));

      if (!matchName && !matchNameEn && !matchInstitution && !matchDepartment && !matchTitle && !matchResearch && !matchTags) {
        return false;
      }
    }

    return true;
  });
}

/**
 * 研究人员 API
 */
export const researcherApi = {
  /**
   * 获取研究人员列表
   */
  getResearchers: async (filters?: ResearcherFilters): Promise<ResearcherListResponse> => {
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 300));
      const filtered = applyFilters(mockResearchers, filters);
      const page = filters?.page || 1;
      const pageSize = filters?.pageSize || 20;
      const start = (page - 1) * pageSize;
      const paginated = filtered.slice(start, start + pageSize);

      return {
        total: filtered.length,
        page,
        pageSize,
        researchers: paginated,
      };
    }

    // 从 JSON 加载
    const allResearchers = await loadFromJSON();
    const filtered = applyFilters(allResearchers, filters);

    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 20;
    const start = (page - 1) * pageSize;
    const paginated = filtered.slice(start, start + pageSize);

    return {
      total: filtered.length,
      page,
      pageSize,
      researchers: paginated,
    };
  },

  /**
   * 获取单个研究人员详情
   */
  getResearcherById: async (id: string): Promise<Researcher | null> => {
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 200));
      return mockResearchers.find(r => r.id === id) || null;
    }

    const allResearchers = await loadFromJSON();
    return allResearchers.find(r => r.id === id) || null;
  },

  /**
   * 获取统计信息
   */
  getStatistics: async () => {
    const allResearchers = await loadFromJSON();

    const byInstitution: Record<Institution, number> = {
      baqis: 0, qscgba: 0, tsinghua: 0, ustc: 0, zju: 0, other: 0
    };
    const byTitle: Record<TitleLevel, number> = {
      pi: 0, professor: 0, associate: 0, postdoc: 0, phd: 0, other: 0
    };
    const allTags: Record<string, number> = {};

    allResearchers.forEach(r => {
      byInstitution[r.institution]++;
      byTitle[r.titleNormalized]++;
      r.researchTags.forEach(tag => {
        allTags[tag] = (allTags[tag] || 0) + 1;
      });
    });

    return {
      total: allResearchers.length,
      byInstitution,
      byTitle,
      topTags: Object.entries(allTags)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10),
    };
  },

  /**
   * 按机构获取研究人员
   */
  getByInstitution: async (institution: Institution): Promise<Researcher[]> => {
    const allResearchers = await loadFromJSON();
    return allResearchers.filter(r => r.institution === institution);
  },

  /**
   * 搜索研究人员（全局搜索）
   */
  search: async (query: string, limit: number = 10): Promise<Researcher[]> => {
    const allResearchers = await loadFromJSON();
    const lowerQuery = query.toLowerCase();

    return allResearchers
      .filter(r => {
        return (
          r.name.toLowerCase().includes(lowerQuery) ||
          r.nameEn?.toLowerCase().includes(lowerQuery) ||
          r.institutionRaw.toLowerCase().includes(lowerQuery) ||
          r.researchTags.some(t => t.toLowerCase().includes(lowerQuery))
        );
      })
      .slice(0, limit);
  },
};
