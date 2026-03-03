import { useState, useEffect, useCallback } from 'react';
import { signalApi } from '../api/signals';
import { Signal, SignalFilters } from '../types';

export const useSignals = (initialFilters?: SignalFilters) => {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [filters, setFilters] = useState<SignalFilters>(initialFilters || {});

  const fetchSignals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await signalApi.getSignals(filters);
      setSignals(response.signals);
    } catch (err) {
      setError(err as Error);
      console.error('Failed to fetch signals:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchSignals();
  }, [fetchSignals]);

  const updateFilters = useCallback((newFilters: Partial<SignalFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const refresh = useCallback(() => {
    fetchSignals();
  }, [fetchSignals]);

  return {
    signals,
    loading,
    error,
    filters,
    updateFilters,
    refresh,
  };
};

export const useSignalDetail = (signalId: string | null) => {
  const [signal, setSignal] = useState<Signal | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!signalId) {
      setSignal(null);
      return;
    }

    const fetchSignalDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await signalApi.getSignalById(signalId);
        setSignal(data);
      } catch (err) {
        setError(err as Error);
        console.error('Failed to fetch signal detail:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSignalDetail();
  }, [signalId]);

  return { signal, loading, error };
};
