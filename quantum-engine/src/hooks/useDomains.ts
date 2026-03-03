import { useState, useEffect, useCallback } from 'react';
import { domainApi } from '../api/domains';
import { TechNode, DomainDetail } from '../types';

export const useDomains = () => {
  const [domains, setDomains] = useState<TechNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchDomains = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await domainApi.getDomainTree();
      setDomains(response.domains);
    } catch (err) {
      setError(err as Error);
      console.error('Failed to fetch domains:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDomains();
  }, [fetchDomains]);

  return { domains, loading, error, refresh: fetchDomains };
};

export const useDomainDetail = (domainId: string | null) => {
  const [domain, setDomain] = useState<DomainDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!domainId) {
      setDomain(null);
      return;
    }

    const fetchDomainDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await domainApi.getDomainDetail(domainId);
        setDomain(data);
      } catch (err) {
        setError(err as Error);
        console.error('Failed to fetch domain detail:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDomainDetail();
  }, [domainId]);

  return { domain, loading, error };
};
