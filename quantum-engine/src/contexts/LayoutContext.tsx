import { createContext, useContext, useState, ReactNode } from 'react';

interface DraggedItem {
  type: 'signal' | 'candidate' | 'note' | 'researcher';
  id: string;
  title: string;
  summary?: string;
}

interface LayoutContextType {
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  isChatOpen: boolean;
  toggleChat: () => void;
  chatWidth: number;
  setChatWidth: (width: number) => void;
  draggedItem: DraggedItem | null;
  setDraggedItem: (item: DraggedItem | null) => void;
  chatReferences: DraggedItem[];
  addChatReference: (item: DraggedItem) => void;
  removeChatReference: (id: string) => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export function LayoutProvider({ children }: { children: ReactNode }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatWidth, setChatWidth] = useState(400); // 默认400px
  const [draggedItem, setDraggedItem] = useState<DraggedItem | null>(null);
  const [chatReferences, setChatReferences] = useState<DraggedItem[]>([]);

  const toggleSidebar = () => setIsSidebarCollapsed(prev => !prev);
  const toggleChat = () => setIsChatOpen(prev => !prev);

  const addChatReference = (item: DraggedItem) => {
    setChatReferences(prev => {
      if (prev.find(ref => ref.id === item.id && ref.type === item.type)) {
        return prev;
      }
      return [...prev, item];
    });
  };

  const removeChatReference = (id: string) => {
    setChatReferences(prev => prev.filter(ref => ref.id !== id));
  };

  return (
    <LayoutContext.Provider
      value={{
        isSidebarCollapsed,
        toggleSidebar,
        isChatOpen,
        toggleChat,
        chatWidth,
        setChatWidth,
        draggedItem,
        setDraggedItem,
        chatReferences,
        addChatReference,
        removeChatReference,
      }}
    >
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error('useLayout must be used within LayoutProvider');
  }
  return context;
}
