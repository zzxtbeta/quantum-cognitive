import { useRef, useEffect, useState, useCallback } from 'react';
import { Send, Sparkles, Trash2, Square, AlertCircle, CheckCircle2, Wrench } from 'lucide-react';
import { useChat } from '../hooks/useChat';
import SkillsPanel from '../components/SkillsPanel';

const QUICK_QUESTIONS = [
  '超导量子计算目前的技术成熟度如何？',
  '中国量子科技赛道有哪些头部机构？',
  '量子纠错的主要技术路线对比？',
  '量子通信产业化进展如何？',
];

// 简单 Markdown 粗体渲染（**text**）
function InlineMarkdown({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**')
          ? <strong key={i} className="font-semibold text-[var(--th-text)]">{p.slice(2, -2)}</strong>
          : <span key={i}>{p}</span>
      )}
    </>
  );
}

function MessageContent({ content, isStreaming }: { content: string; isStreaming: boolean }) {
  if (!content && isStreaming) {
    // AI 占位动画
    return (
      <div className="flex items-center gap-1.5 py-1">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    );
  }
  // 按段落渲染
  const paragraphs = content.split('\n');
  return (
    <>
      {paragraphs.map((line, i) =>
        line === '' ? (
          <div key={i} className="h-2" />
        ) : (
          <p key={i} className="leading-relaxed">
            <InlineMarkdown text={line} />
          </p>
        )
      )}
    </>
  );
}

// 后端健康状态指示
function BackendStatus() {
  const [status, setStatus] = useState<'checking' | 'ok' | 'error'>('checking');

  useEffect(() => {
    fetch('/chat-api/health')
      .then(r => r.ok ? setStatus('ok') : setStatus('error'))
      .catch(() => setStatus('error'));
  }, []);

  if (status === 'checking') return null;

  return (
    <span className={`inline-flex items-center gap-1 text-[10px] ${status === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>
      {status === 'ok'
        ? <><CheckCircle2 className="w-3 h-3" />已连接</>
        : <><AlertCircle className="w-3 h-3" />后端离线</>
      }
    </span>
  );
}

export default function Chat() {
  const { messages, loading, error, threadId, sendMessage, clearMessages } = useChat();
  const [input, setInput] = useState('');
  const [showSkills, setShowSkills] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // textarea 自动伸缩
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  };

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    sendMessage(text);
  }, [input, loading, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickQuestion = (q: string) => {
    sendMessage(q);
  };

  // 最后一条 AI 消息是否仍在流式输出中
  const isLastAiStreaming = loading && messages.length > 0 && messages[messages.length - 1].role === 'assistant';

  return (
    <div className="h-full flex flex-col bg-[var(--th-bg-card)] backdrop-blur-2xl border-l border-[var(--th-divider)] relative">

      {/* ── Header ── */}
      <div className="px-5 py-4 border-b border-[var(--th-divider)]">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-0.5">
              <div className="w-7 h-7 rounded-md bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <h2 className="font-display text-xl text-shimmer tracking-widest">GRAVITY</h2>
            </div>
            <p className="text-xs text-[var(--th-text-muted)] pl-9">认知引擎 · <BackendStatus /></p>
          </div>
          {messages.length > 0 && (
            <button
              onClick={clearMessages}
              title="清空对话"
              className="p-1.5 hover:bg-[var(--th-bg-hover)] rounded-lg transition-colors text-[var(--th-text-muted)] hover:text-[var(--th-text)]"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setShowSkills(v => !v)}
            title="已注册 Skills"
            className={`p-1.5 rounded-lg transition-colors ${
              showSkills
                ? 'bg-blue-500/15 text-blue-400'
                : 'hover:bg-[var(--th-bg-hover)] text-[var(--th-text-muted)] hover:text-[var(--th-text)]'
            }`}
          >
            <Wrench className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Skills 面板（覆盖整个 Chat 区域）*/}
      <SkillsPanel isOpen={showSkills} onClose={() => setShowSkills(false)} />

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="pt-6">
            {/* 欢迎语 */}
            <div className="flex items-start gap-3 mb-6">
              <div className="w-7 h-7 rounded-md bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 mt-0.5">
                AI
              </div>
              <div className="flex-1 bg-[var(--th-bg-hover)] border border-[var(--th-divider)] rounded-xl px-4 py-3">
                <p className="text-sm text-[var(--th-text)] leading-relaxed">
                  你好！我是 GRAVITY 认知引擎，基于 Qwen3.5 驱动。
                  <br />可以问我量子科技赛道的技术、产业、投资等问题。
                </p>
              </div>
            </div>

            {/* 快速提问 */}
            <p className="text-[10px] text-[var(--th-text-muted)] uppercase tracking-widest mb-2 font-medium px-1">快速提问</p>
            <div className="grid grid-cols-2 gap-1.5">
              {QUICK_QUESTIONS.map(q => (
                <button
                  key={q}
                  onClick={() => handleQuickQuestion(q)}
                  className="p-2.5 bg-[var(--th-bg-hover)] border border-[var(--th-divider)] hover:bg-[var(--th-bg-active)] hover:border-blue-500/30 rounded-md transition-all text-left text-xs text-[var(--th-text-muted)] hover:text-[var(--th-text)] leading-snug"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => {
              const isUser = msg.role === 'user';
              const isThisStreaming = isLastAiStreaming && idx === messages.length - 1;
              return (
                <div key={msg.id} className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}>
                  {/* Avatar */}
                  {!isUser && (
                    <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0 mt-0.5">
                      AI
                    </div>
                  )}

                  {/* Bubble */}
                  <div className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm ${
                    isUser
                      ? 'bg-blue-600 text-white rounded-tr-sm'
                      : 'bg-[var(--th-accent-muted)] border border-[var(--th-divider)] text-[var(--th-text)] rounded-tl-sm'
                  }`}>
                    <MessageContent content={msg.content} isStreaming={isThisStreaming} />
                    <p className="text-[10px] opacity-40 mt-1.5 text-right">
                      {new Date(msg.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              );
            })}

            {/* 非流式 loading（还没收到 AI 消息时）*/}
            {loading && !isLastAiStreaming && (
              <div className="flex items-center gap-2 pl-8">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            )}

            {/* 错误提示 */}
            {error && !loading && (
              <div className="mx-1 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-xs text-red-400">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {error.message.includes('fetch') ? '无法连接到后端服务，请确认后端已启动' : error.message}
              </div>
            )}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Input ── */}
      <div className="px-4 pb-4 pt-2 border-t border-[rgba(59,130,246,0.10)]">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="输入问题，Enter 发送…"
            rows={1}
            disabled={loading}
            className="flex-1 bg-[var(--th-bg-input)] border border-[var(--th-border)] rounded-lg px-3.5 py-2.5 text-sm text-[var(--th-text)] placeholder:text-[var(--th-text-muted)] focus:outline-none focus:border-blue-500/50 transition-all resize-none overflow-hidden disabled:opacity-50"
            style={{ minHeight: '42px' }}
          />
          <button
            onClick={loading ? clearMessages : handleSend}
            title={loading ? '停止' : '发送'}
            className={`flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg transition-all ${
              loading
                ? 'bg-[var(--th-bg-hover)] hover:bg-red-500/20 text-[var(--th-text-muted)] hover:text-red-400'
                : input.trim()
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-glow-sm'
                  : 'bg-[var(--th-bg-hover)] text-[var(--th-text-muted)] cursor-not-allowed'
            }`}
          >
            {loading ? <Square className="w-4 h-4" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-[10px] text-[var(--th-text-muted)] mt-1.5">Enter 发送 · Shift+Enter 换行 · thread: {threadId.slice(-6)}</p>
      </div>

    </div>
  );
}