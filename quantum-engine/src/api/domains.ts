// 领域相关API
import { apiClient } from './client';
import { TechNode } from '../types';
import { mockTechNodes } from '../mock/domains';

export interface DomainNode {
  id: number;
  name: string;
  level: 'domain' | 'direction' | 'technology';
  parent_id: number | null;
  description?: string;
  paper_count: number;
  children?: DomainNode[];
}

export interface DomainsApiResponse {
  value: DomainNode[];
  Count: number;
}

// Qwen 富化数据索引：按节点名称匹配，优先使用富化的 description/stage/trend
const _mockByName = new Map<string, TechNode>(
  mockTechNodes.map(n => [n.name, n])
);

function adaptDomainToTechNode(domain: DomainNode, parentId?: string): TechNode {
  // level映射：domain → category, direction/technology → route
  const type: 'category' | 'route' = domain.level === 'domain' ? 'category' : 'route';
  
  // 优先使用 Qwen 富化的 description / stage / trend
  const enriched = _mockByName.get(domain.name);
  
  // description：富化 > API 有内容 > 降级
  const description = (enriched?.description) || domain.description || '';
  
  // stage：富化 > 按 paper_count 推断
  let stage = enriched?.stage || '';
  if (!stage) {
    if (domain.level === 'technology') {
      if (domain.paper_count > 50) stage = '工程化';
      else if (domain.paper_count > 20) stage = '实验室阶段';
      else stage = '理论研究';
    } else if (domain.level === 'direction') {
      stage = domain.paper_count > 100 ? '工程化早期' : '实验室阶段';
    } else {
      stage = '实验室阶段';
    }
  }
  
  // trend：富化 > 按 paper_count 推断
  let trend: 'rising' | 'stable' | 'declining' | 'early' = enriched?.trend || 'stable';
  if (!enriched?.trend) {
    if (domain.paper_count > 100) trend = 'rising';
    else if (domain.paper_count > 0) trend = 'early';
    else trend = 'early';
  }
  
  return {
    id: domain.id.toString(),
    name: domain.name,
    type,
    parentId,
    description,
    stage,
    trend,
    signalCount: domain.paper_count,
    companyCount: 0,
    paperCount: domain.paper_count,
    children: (domain.children && Array.isArray(domain.children)) 
      ? domain.children.map(child => adaptDomainToTechNode(child, domain.id.toString())) 
      : [],
  };
}

export const domainApi = {
  getDomains: async (params?: {
    level?: 'domain' | 'direction' | 'technology';
    parent_id?: number;
    min_paper_count?: number;
  }): Promise<DomainsApiResponse | DomainNode[]> => {
    return apiClient.get<DomainsApiResponse | DomainNode[]>('/gold/domains', params);
  },

  getDomainTree: async (): Promise<{ domains: TechNode[] }> => {
    try {
      console.log('🚀 [v2] Fetching domains from API... timestamp:', new Date().toISOString());
      const response = await domainApi.getDomains({ min_paper_count: 0 });
      
      console.log('🔍 [v2] Raw response:', {
        type: typeof response,
        isArray: Array.isArray(response),
        length: Array.isArray(response) ? response.length : 'N/A',
        keys: response && typeof response === 'object' ? Object.keys(response) : 'N/A',
        firstItem: Array.isArray(response) && response.length > 0 ? response[0] : null
      });
      
      // 判断响应格式：可能是 {value: [...]} 或直接是数组 [...]
      let domainsData: DomainNode[];
      
      if (Array.isArray(response)) {
        // 直接是数组
        domainsData = response;
        console.log('✅ [v2] Array format detected, length:', domainsData.length);
        if (domainsData.length > 0) {
          console.log('📦 [v2] First item:', {
            name: domainsData[0].name,
            level: domainsData[0].level,
            childrenCount: domainsData[0].children?.length || 0
          });
        }
      } else if (response && typeof response === 'object' && 'value' in response && Array.isArray((response as any).value)) {
        // 包装格式 {value: [...], Count: 1}
        domainsData = (response as any).value;
        console.log('✅ [v2] Wrapped format detected, length:', domainsData.length);
      } else {
        console.error('❌ [v2] Invalid format:', response);
        return { domains: [] };
      }
      
      if (domainsData.length === 0) {
        console.warn('⚠️ [v2] Empty data');
        return { domains: [] };
      }
      
      console.log('🔄 [v2] Starting tree flattening...');
      
      // 将树形结构扁平化为数组
      const flattenTree = (nodes: DomainNode[], parentId?: string): TechNode[] => {
        const result: TechNode[] = [];
        nodes.forEach(node => {
          const techNode = adaptDomainToTechNode(node, parentId);
          result.push(techNode);
          if (node.children && Array.isArray(node.children) && node.children.length > 0) {
            result.push(...flattenTree(node.children, node.id.toString()));
          }
        });
        return result;
      };
      
      const domains = flattenTree(domainsData);
      const categories = domains.filter(d => d.type === 'category');
      const routes = domains.filter(d => d.type === 'route');
      
      console.log('✅ [v2] Flattened successfully:', {
        total: domains.length,
        categories: categories.length,
        routes: routes.length
      });
      console.log('📋 [v2] Categories:', categories.map(c => c.name));
      console.log('📋 [v2] Routes (first 5):', routes.slice(0, 5).map(r => `${r.name} (parent: ${r.parentId})`));
      
      return { domains };
    } catch (error) {
      console.warn('⚠️ [v2] API unavailable, using enriched mock fallback:', error);
      return { domains: mockTechNodes };
    }
  },

  getDomainDetail: async (domainId: string): Promise<any> => {
    const response = await domainApi.getDomains({ min_paper_count: 0 });
    
    // 判断响应格式
    let domainsData: DomainNode[];
    if (Array.isArray(response)) {
      domainsData = response;
    } else if (response && Array.isArray(response.value)) {
      domainsData = response.value;
    } else {
      throw new Error('Invalid domains response format');
    }
    
    const findDomain = (domains: DomainNode[], id: string): DomainNode | null => {
      for (const domain of domains) {
        if (domain.id.toString() === id) return domain;
        if (domain.children) {
          const found = findDomain(domain.children, id);
          if (found) return found;
        }
      }
      return null;
    };
    const domain = findDomain(domainsData, domainId);
    if (!domain) throw new Error(`Domain not found: ${domainId}`);
    return domain;
  },

  getFlatDomains: async (): Promise<Map<number, DomainNode>> => {
    const response = await domainApi.getDomains({ min_paper_count: 0 });
    
    // 判断响应格式
    let domainsData: DomainNode[];
    if (Array.isArray(response)) {
      domainsData = response;
    } else if (response && Array.isArray(response.value)) {
      domainsData = response.value;
    } else {
      throw new Error('Invalid domains response format');
    }
    
    const domainMap = new Map<number, DomainNode>();
    const flattenDomains = (domains: DomainNode[]) => {
      domains.forEach(domain => {
        domainMap.set(domain.id, domain);
        if (domain.children && domain.children.length > 0) {
          flattenDomains(domain.children);
        }
      });
    };
    flattenDomains(domainsData);
    return domainMap;
  },
};
