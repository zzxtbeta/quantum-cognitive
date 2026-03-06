import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import Chat from '../pages/Chat';
import { useLayout } from '../contexts/LayoutContext';
import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Layout() {
  const { 
    isSidebarCollapsed, 
    toggleSidebar, 
    isChatOpen, 
    chatWidth, 
    setChatWidth,
    addChatReference,
    draggedItem,
  } = useLayout();
  
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<HTMLDivElement>(null);

  // 处理拖拽调整宽度
  const handleMouseDown = () => {
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const newWidth = window.innerWidth - e.clientX;
      const maxWidth = Math.floor(window.innerWidth * 0.72);
      if (newWidth >= 280 && newWidth <= maxWidth) {
        setChatWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, setChatWidth]);

  // 处理拖放到Chat区域
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedItem && isChatOpen) {
      addChatReference(draggedItem);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const sidebarWidth = isSidebarCollapsed ? 0 : 240;
  const mainWidth = isChatOpen 
    ? `calc(100% - ${sidebarWidth}px - ${chatWidth}px)` 
    : `calc(100% - ${sidebarWidth}px)`;

  return (
    <div className="min-h-screen" style={{ background: 'var(--th-bg)', transition: 'background 0.25s ease' }}>
      {/* Animated ambient background */}
      <div className="bg-ambient" aria-hidden="true">
        <div className="bg-ambient-dot" />
      </div>
      <div className="grid-overlay" aria-hidden="true" />

      <Navbar />

      <div className="flex pt-16 min-h-screen relative">
        {/* Sidebar */}
        <div
          className="transition-all duration-300 ease-in-out flex-shrink-0"
          style={{ width: isSidebarCollapsed ? 0 : 240 }}
        >
          {!isSidebarCollapsed && <Sidebar />}
        </div>

        {/* Sidebar Toggle Button — z-[62] 确保在 Sidebar(backdrop-blur stacking ctx) 和 Navbar(z-50) 之上 */}
        <button
          onClick={toggleSidebar}
          className="fixed top-1/2 -translate-y-1/2 z-[62] group transition-all duration-300"
          style={{ left: isSidebarCollapsed ? '4px' : '228px' }}
        >
          <div className="relative">
            <div className="absolute inset-0 bg-blue-500/20 blur-lg opacity-0 group-hover:opacity-100 transition-opacity rounded-full" />
            <div
              className="relative border group-hover:border-blue-500/50 rounded-r-md py-3 px-1.5 transition-all duration-300"
              style={{ background: 'var(--th-bg-elevated)', borderColor: 'var(--th-border)' }}
            >
              <div className="flex flex-col items-center gap-0.5">
                {isSidebarCollapsed ? (
                  <>
                    <ChevronRight className="w-3 h-3 text-[#8892aa] group-hover:text-blue-400 transition-colors" />
                    <div className="w-0.5 h-4 bg-[rgba(59,130,246,0.2)] group-hover:bg-blue-400 rounded-full transition-colors" />
                  </>
                ) : (
                  <>
                    <div className="w-0.5 h-4 bg-[rgba(59,130,246,0.2)] group-hover:bg-blue-400 rounded-full transition-colors" />
                    <ChevronLeft className="w-3 h-3 text-[#8892aa] group-hover:text-blue-400 transition-colors" />
                  </>
                )}
              </div>
            </div>
          </div>
        </button>

        {/* Main Content */}
        <main
          className="flex-shrink-0 pb-10 pt-6 transition-all duration-300 relative z-10"
          style={{
            width: mainWidth,
            paddingLeft: isSidebarCollapsed ? '28px' : '20px',
            paddingRight: '20px',
          }}
        >
          <Outlet />
        </main>

        {/* Chat Panel */}
        {isChatOpen && (
          <>
            {/* Resize Handle */}
            <div
              ref={resizeRef}
              onMouseDown={handleMouseDown}
              className="w-px bg-[rgba(59,130,246,0.15)] hover:bg-blue-500/40 cursor-col-resize transition-colors flex-shrink-0 relative group"
            >
              <div className="absolute inset-y-0 -left-2 -right-2" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-16 bg-[rgba(59,130,246,0.25)] group-hover:bg-blue-400/60 rounded-full transition-colors" />
            </div>

            {/* Chat Content */}
            <div
              className="flex-shrink-0 h-[calc(100vh-4rem)] sticky top-16 relative z-10"
              style={{ width: chatWidth }}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <Chat />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

