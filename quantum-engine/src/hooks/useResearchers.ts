import { useState, useEffect, useCallback, useMemo } from 'react';
import { researcherApi } from '../api/researchers';
import { Researcher, ResearcherFilters, Institution, TitleLevel } from '../types/people';

interface UseResearchersOptions {
  initialFilters?: ResearcherFilters;
  autoFetch?: boolean;
}

interface UseResearchersReturn {
  researchers: Researcher[];
  loading: boolean;
  error: Error | null;
  filters: ResearcherFilters;
  updateFilters: (newFilters: Partial<ResearcherFilters>) => void;
  resetFilters: () => void;
  refresh: () => void;
  total: number;
  hasMore: boolean;
  loadMore: () => void;
}

export function useResearchers(options: UseResearchersOptions = {}): UseResearchersReturn {
  const { initialFilters = {}, autoFetch = true } = options;

  const [researchers, setResearchers] = useState<Researcher[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [filters, setFilters] = useState<ResearcherFilters>({
    page: 1,
    pageSize: 20,
    ...initialFilters,
  });
  const [total, setTotal] = useState(0);

  // 监听 initialFilters 变化，同步更新内部 filters
  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      ...initialFilters,
    }));
  }, [initialFilters]);

  const fetchResearchers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await researcherApi.getResearchers(filters);

      if (filters.page === 1) {
        setResearchers(response.researchers);
      } else {
        setResearchers(prev => {
          // 避免重复添加已存在的数据
          const existingIds = new Set(prev.map(r => r.id));
          const newResearchers = response.researchers.filter(r => !existingIds.has(r.id));
          return [...prev, ...newResearchers];
        });
      }

      setTotal(response.total);
    } catch (err) {
      setError(err as Error);
      console.error('Failed to fetch researchers:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    if (autoFetch) {
      fetchResearchers();
    }
  }, [fetchResearchers, autoFetch]);

  const updateFilters = useCallback((newFilters: Partial<ResearcherFilters>) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
      page: newFilters.searchQuery !== undefined ? 1 : (newFilters.page || prev.page),
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({ page: 1, pageSize: 20 });
  }, []);

  const refresh = useCallback(() => {
    setFilters(prev => ({ ...prev, page: 1 }));
    fetchResearchers();
  }, [fetchResearchers]);

  const loadMore = useCallback(() => {
    if (!loading && researchers.length < total) {
      setFilters(prev => ({ ...prev, page: (prev.page || 1) + 1 }));
    }
  }, [loading, researchers.length, total]);

  const hasMore = useMemo(() => {
    return researchers.length < total;
  }, [researchers.length, total]);

  return {
    researchers,
    loading,
    error,
    filters,
    updateFilters,
    resetFilters,
    refresh,
    total,
    hasMore,
    loadMore,
  };
}

/**
 * 获取单个研究人员详情
 */
export function useResearcherDetail(researcherId: string | null) {
  const [researcher, setResearcher] = useState<Researcher | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!researcherId) {
      setResearcher(null);
      return;
    }

    const fetchResearcher = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await researcherApi.getResearcherById(researcherId);
        setResearcher(data);
      } catch (err) {
        setError(err as Error);
        console.error('Failed to fetch researcher detail:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchResearcher();
  }, [researcherId]);

  return { researcher, loading, error };
}

/**
 * 获取统计信息
 */
export function useResearcherStatistics() {
  const [statistics, setStatistics] = useState<{
    total: number;
    byInstitution: Record<Institution, number>;
    byTitle: Record<TitleLevel, number>;
    topTags: [string, number][];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError(null);

      try {
        const stats = await researcherApi.getStatistics();
        setStatistics(stats);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return { statistics, loading, error };
}

/**
 * 搜索研究人员（带防抖）
 */
export function useResearcherSearch(debounceMs: number = 300) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Researcher[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await researcherApi.search(query, 10);
        setResults(data);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, debounceMs]);

  return { query, setQuery, results, loading };
}
