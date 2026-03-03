// 信号相关API

import { apiClient, useMock } from './client';
import { SignalDetail, SignalFilters, SignalListResponse } from '../types';
import { realWorldSignals } from '../data/realWorldSignals';
import { BackendPapersResponse } from '../types/backend';
import { adaptPapersResponse, adaptPaperToSignalDetail } from '../adapters/paperAdapter';

export const signalApi = {
  /**
   * 获取信号列表
   */
  getSignals: async (filters?: SignalFilters): Promise<SignalListResponse> => {
    if (useMock) {
      // Mock实现
      await new Promise(resolve => setTimeout(resolve, 300));
      
      let filteredSignals = [...realWorldSignals];
      
      if (filters?.type && filters.type !== '全部') {
        filteredSignals = filteredSignals.filter(s => s.type === filters.type);
      }
      
      if (filters?.priority && filters.priority !== 'all') {
        filteredSignals = filteredSignals.filter(s => s.priority === filters.priority);
      }

      if (filters?.timeRange && filters.timeRange !== 'all') {
        const days = parseInt(filters.timeRange);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        filteredSignals = filteredSignals.filter(s => new Date(s.timestamp) >= cutoffDate);
      }

      const page = filters?.page || 1;
      const pageSize = filters?.pageSize || 20;
      const start = (page - 1) * pageSize;
      const paginatedSignals = filteredSignals.slice(start, start + pageSize);
      
      return {
        total: filteredSignals.length,
        page,
        pageSize,
        signals: paginatedSignals,
      };
    }

    // 真实API实现
    try {
      // 论文类型：使用真实API
      if (filters?.type === '论文') {
        const response = await apiClient.get<BackendPapersResponse>('/papers', {
          page: filters?.page || 1,
          page_size: filters?.pageSize || 20,
        });

        const paperSignals = adaptPapersResponse(response.papers);

        return {
          total: response.total,
          page: response.page,
          pageSize: response.page_size,
          signals: paperSignals,
        };
      }

      // 其他类型：使用Mock数据
      if (filters?.type && filters.type !== '全部') {
        const mockSignals = realWorldSignals.filter(s => s.type === filters.type);
        return {
          total: mockSignals.length,
          page: 1,
          pageSize: mockSignals.length,
          signals: mockSignals,
        };
      }

      // 全部类型：混合真实论文 + Mock其他类型
      const paperResponse = await apiClient.get<BackendPapersResponse>('/papers', {
        page: 1,
        page_size: 20, // 只取前20篇论文
      });
      const paperSignals = adaptPapersResponse(paperResponse.papers);
      const otherSignals = realWorldSignals.filter(s => s.type !== '论文');
      
      // 合并并按时间排序（最新的在前）
      const allSignals = [...paperSignals, ...otherSignals].sort((a, b) => {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });

      return {
        total: paperResponse.total + otherSignals.length,
        page: 1,
        pageSize: allSignals.length,
        signals: allSignals,
      };
    } catch (error) {
      console.error('Failed to fetch papers from API, falling back to mock:', error);
      const filteredSignals = realWorldSignals.filter(s => 
        !filters?.type || filters.type === '全部' || s.type === filters.type
      );
      return {
        total: filteredSignals.length,
        page: 1,
        pageSize: filteredSignals.length,
        signals: filteredSignals,
      };
    }
  },

  /**
   * 获取单个信号详情
   */
  getSignalById: async (id: string): Promise<SignalDetail> => {
    if (useMock) {
      await new Promise(resolve => setTimeout(resolve, 200));
      const signal = realWorldSignals.find(s => s.id === id);
      if (!signal) {
        throw new Error(`Signal not found: ${id}`);
      }
      return {
        ...signal,
        whyImportant: [
          '代表量子科技领域重要进展',
          '涉及核心技术突破或产业化应用',
          '与国家战略规划高度相关',
        ],
      };
    }

    // 真实API - 论文详情
    if (id.startsWith('paper-')) {
      const paperId = id.replace('paper-', '');
      try {
        // 直接调用 GET /papers/{id} 单篇详情接口
        const paper = await apiClient.get<any>(`/papers/${paperId}`);
        return adaptPaperToSignalDetail(paper);
      } catch (error) {
        console.error('Failed to fetch paper detail:', error);
        throw new Error(`Paper not found: ${paperId}`);
      }
    }

    return apiClient.get<SignalDetail>(`/signals/${id}`);
  },
};
