import { createContext, useContext, useState, ReactNode } from 'react';

// Focus Item Types
export interface FocusItem {
  id: string;
  type: 'company' | 'person' | 'technology';
  name: string;
  description: string;
  signalCount: number;
  lastUpdate: string;
  tags: string[];
}

// Note Types
export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  relatedSignals: number;
  createdAt: string;
  updatedAt: string;
}

interface AppContextType {
  focusItems: FocusItem[];
  notes: Note[];
  addFocusItem: (item: FocusItem) => void;
  removeFocusItem: (id: string) => void;
  addNote: (note: Note) => void;
  removeNote: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Initial mock data
const initialFocusItems: FocusItem[] = [
  {
    id: '1',
    type: 'company',
    name: '本源量子',
    description: '专注超导量子计算，已推出多款量子计算机原型机',
    signalCount: 8,
    lastUpdate: '2026-02-01',
    tags: ['超导量子计算', 'C轮', '合肥'],
  },
  {
    id: '2',
    type: 'person',
    name: '潘建伟',
    description: '中国科学技术大学教授，量子信息领域领军人物',
    signalCount: 12,
    lastUpdate: '2026-01-29',
    tags: ['中科大', '量子通信', '量子计算'],
  },
  {
    id: '3',
    type: 'technology',
    name: '拓扑量子纠错',
    description: '基于拓扑保护的量子纠错方案，容错阈值显著提升',
    signalCount: 5,
    lastUpdate: '2026-01-29',
    tags: ['量子纠错', '前沿技术'],
  },
];

const initialNotes: Note[] = [
  {
    id: '1',
    title: '本源量子投资分析',
    content: '本源量子是国内超导量子计算领域的领军企业，核心团队来自中科大潘建伟团队。公司已完成C轮融资，技术积累深厚，商业化进展顺利。建议重点关注其量子芯片研发进展和商业化应用落地情况...',
    tags: ['本源量子', '超导量子计算', '投资分析'],
    relatedSignals: 3,
    createdAt: '2026-02-01',
    updatedAt: '2026-02-01',
  },
  {
    id: '2',
    title: '量子通信行业观察',
    content: '量子通信是目前商业化进展最快的量子技术方向。国盾量子已经上市，启科量子等公司也在快速发展。政策支持力度大，市场需求明确。但需要注意技术路线的选择和市场竞争格局的变化...',
    tags: ['量子通信', '行业分析', '国盾量子'],
    relatedSignals: 5,
    createdAt: '2026-01-28',
    updatedAt: '2026-01-30',
  },
  {
    id: '3',
    title: '拓扑量子纠错技术突破',
    content: '中科大团队在Nature发表的拓扑量子纠错研究具有重要意义。容错阈值提升至2.1%，为构建实用化量子计算机提供了新路径。这一突破可能加速量子计算的商业化进程，值得持续关注相关公司的技术进展...',
    tags: ['量子纠错', '技术突破', '中科大'],
    relatedSignals: 2,
    createdAt: '2026-01-29',
    updatedAt: '2026-01-29',
  },
];

export function AppProvider({ children }: { children: ReactNode }) {
  const [focusItems, setFocusItems] = useState<FocusItem[]>(initialFocusItems);
  const [notes, setNotes] = useState<Note[]>(initialNotes);

  const addFocusItem = (item: FocusItem) => {
    // Check if already exists
    if (focusItems.some(f => f.id === item.id)) {
      return;
    }
    setFocusItems(prev => [item, ...prev]);
  };

  const removeFocusItem = (id: string) => {
    setFocusItems(prev => prev.filter(item => item.id !== id));
  };

  const addNote = (note: Note) => {
    setNotes(prev => [note, ...prev]);
  };

  const removeNote = (id: string) => {
    setNotes(prev => prev.filter(note => note.id !== id));
  };

  return (
    <AppContext.Provider
      value={{
        focusItems,
        notes,
        addFocusItem,
        removeFocusItem,
        addNote,
        removeNote,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
