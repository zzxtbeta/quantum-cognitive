import { useState, useEffect, useCallback } from 'react';
import { companyApi } from '../api/companies';
import { Candidate, CandidateFilters } from '../types';

export const useCandidates = (initialFilters?: CandidateFilters) => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [filters, setFilters] = useState<CandidateFilters>(initialFilters || {});

  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await companyApi.getCandidates(filters);
      setCandidates(response.candidates);
    } catch (err) {
      setError(err as Error);
      console.error('Failed to fetch candidates:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  const updateFilters = useCallback((newFilters: Partial<CandidateFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  return {
    candidates,
    loading,
    error,
    filters,
    updateFilters,
    refresh: fetchCandidates,
  };
};
