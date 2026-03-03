import { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { BackendPapersResponse } from '../types/backend';
import { adaptPaperToSignalDetail } from '../adapters/paperAdapter';
import { SignalDetail } from '../types';

export const useDomainPapers = (domainIds?: number[]) => {
  const [papers, setPapers] = useState<SignalDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!domainIds || domainIds.length === 0) {
      setPapers([]);
      setTotal(0);
      return;
    }

    const fetchPapers = async () => {
      setLoading(true);
      setError(null);
      try {
        console.log('🔍 Fetching papers for domain IDs:', domainIds);
        
        // API v2.1: domain_ids 使用 OR 逻辑，一次请求即可
        const response = await apiClient.get<BackendPapersResponse>('/papers', {
          domain_ids: domainIds.join(','),
          page: 1,
          page_size: 200,
          sort_by: 'publish_date',
          sort_order: 'desc',
        });
        
        console.log('📚 Papers fetched:', {
          domainIds,
          returned: response.papers.length,
          total: response.total,
        });
        
        // 保留完整元数据（abstract、research_problem、key_contributions等）
        const paperSignals = response.papers.map(adaptPaperToSignalDetail);
        
        setPapers(paperSignals);
        setTotal(response.total);
      } catch (err) {
        console.error('❌ Failed to fetch domain papers:', err);
        setError(err as Error);
        setPapers([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    };

    fetchPapers();
  }, [domainIds?.join(',')]);

  return { papers, loading, error, total };
};
