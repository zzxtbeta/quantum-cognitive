import { Signal, SignalFilters, SignalListResponse, SignalDetail } from '../types';
import { realWorldSignals } from '../data/realWorldSignals';

export interface ISignalService {
  getSignals(filters?: SignalFilters): Promise<SignalListResponse>;
  getSignalById(id: string): Promise<SignalDetail>;
  searchSignals(query: string): Promise<Signal[]>;
}

class MockSignalService implements ISignalService {
  private signals: Signal[] = realWorldSignals;

  async getSignals(filters?: SignalFilters): Promise<SignalListResponse> {
    await this.delay(300);
    let filtered = [...this.signals];
    if (filters?.type && filters.type !== '全部') filtered = filtered.filter(s => s.type === filters.type);
    if (filters?.priority && filters.priority !== 'all') filtered = filtered.filter(s => s.priority === filters.priority);
    if (filters?.timeRange) {
      const days = parseInt(filters.timeRange);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      filtered = filtered.filter(s => new Date(s.timestamp) >= cutoffDate);
    }
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 20;
    const start = (page - 1) * pageSize;
    return {
      total: filtered.length,
      page,
      pageSize,
      signals: filtered.slice(start, start + pageSize),
    };
  }

  async getSignalById(id: string): Promise<SignalDetail> {
    await this.delay(200);
    const signal = this.signals.find(s => s.id === id);
    if (!signal) throw new Error(`Signal ${id} not found`);
    return signal as SignalDetail;
  }

  async searchSignals(query: string): Promise<Signal[]> {
    await this.delay(250);
    const lowerQuery = query.toLowerCase();
    return this.signals.filter(s => 
      s.title.toLowerCase().includes(lowerQuery) || s.summary.toLowerCase().includes(lowerQuery)
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const mockSignalService = new MockSignalService();
