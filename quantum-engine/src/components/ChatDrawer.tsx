import { X, Send, Sparkles, FileText, Building2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useChat } from '../hooks/useChat';

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatDrawer({ isOpen, onClose }: ChatDrawerProps) {
  const { messages, loading, sendMessage, clearMessages } = useChat();
  const context = null as { type: 'signal' | 'company'; title: string } | null; // context panel reserved for future signal-drag feature
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    
    const message = input.trim();
    setInput('');
    await sendMessage(message);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestedQuestions = [
    '超导量子计算目前的技术成熟度如何？',
    '本源量子的核心竞争力是什么？',
    '量子通信领域有哪些投资机会？',
    '中国量子科技政策支持力度如何？',
  ];

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed right-0 top-0 h-full w-full md:w-[500px] bg-[var(--th-bg-card)] border-l border-[var(--th-divider)] z-[70] transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[rgba(59,130,246,0.12)]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 text-blue-400" />
              <h2 className="font-display text-2xl text-blue-400">GRAVAITY</h2>
            </div>
            <p className="text-xs text-[var(--th-text-muted)]">认知引擎 · AI分析助手</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[rgba(59,130,246,0.1)] rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Context Info */}
        {context && (
          <div className="px-6 py-3 bg-[rgba(59,130,246,0.08)] border-b border-[rgba(59,130,246,0.15)]">
            <div className="flex items-center gap-2 text-sm">
              {context.type === 'signal' && <FileText className="w-4 h-4 text-blue-400" />}
              {context.type === 'company' && <Building2 className="w-4 h-4 text-blue-400" />}
              <span className="text-[var(--th-text-muted)]">当前上下文：</span>
              <span className="text-blue-400 font-semibold">{context.title}</span>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 h-[calc(100vh-280px)]">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">💬</div>
              <p className="text-[var(--th-text-muted)] mb-6">开始与AI对话，获取深度分析</p>
              
              {/* Suggested Questions */}
              <div className="space-y-2">
                <p className="text-xs text-[var(--th-text-muted)] mb-3">试试这些问题：</p>
                {suggestedQuestions.map((question, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInput(question)}
                    className="w-full text-left px-4 py-3 glass-card rounded-lg text-sm text-slate-300 hover:text-white hover:bg-[rgba(59,130,246,0.08)] transition-colors"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-4 ${
                      message.role === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'glass-card text-slate-200'
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {message.content}
                    </p>
                    
                    {/* Sources */}
                    {message.sources && message.sources.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-700">
                        <p className="text-xs text-[var(--th-text-muted)] mb-2">引用来源：</p>
                        <div className="space-y-1">
                          {message.sources.map((source, idx) => (
                            <div
                              key={idx}
                              className="text-xs text-blue-300 hover:text-blue-200 cursor-pointer flex items-center gap-1"
                            >
                              <span>•</span>
                              <span>{source.title}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <p className="text-xs opacity-50 mt-2">
                      {new Date(message.timestamp).toLocaleTimeString('zh-CN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))}
              
              {loading && (
                <div className="flex justify-start">
                    <div className="bg-[rgba(59,130,246,0.06)] rounded-lg p-4 border border-[rgba(59,130,246,0.08)]">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input */}
        <div className="p-6 border-t border-[rgba(59,130,246,0.12)]">
          {messages.length > 0 && (
            <button
              onClick={clearMessages}
              className="text-xs text-[var(--th-text-muted)] hover:text-blue-400 mb-3 transition-colors"
            >
              清空对话
            </button>
          )}
          
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="输入你的问题..."
              className="flex-1 bg-[rgba(10,10,28,0.8)] border border-[rgba(59,130,246,0.12)] rounded-lg px-4 py-3 text-sm resize-none focus:outline-none focus:border-blue-400 transition-colors"
              rows={3}
              disabled={loading}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="px-4 bg-blue-500 hover:bg-blue-600 disabled:bg-[rgba(59,130,246,0.1)] disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          
          <p className="text-xs text-[var(--th-text-muted)] mt-2">
            按 Enter 发送，Shift + Enter 换行
          </p>
        </div>
      </div>
    </>
  );
}
