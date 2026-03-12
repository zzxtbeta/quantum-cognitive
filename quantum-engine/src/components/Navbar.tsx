import { Search, MessageSquare, ChevronDown, Cpu, Sun, Moon, Bot, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLayout } from '../contexts/LayoutContext';
import { useTheme } from '../contexts/ThemeContext';
import { getModels, switchModel, type ModelPreset } from '../api/chat';

const tracks = [
  { id: 'quantum', name: '量子科技', status: 'active' },
  { id: 'bci', name: '脑机接口', status: 'coming' },
  { id: 'embodied-ai', name: '具身智能', status: 'coming' },
  { id: 'synthetic-bio', name: '合成生物学', status: 'coming' },
  { id: 'fusion-energy', name: '核聚变能源', status: 'coming' },
  { id: 'space-tech', name: '商业航天', status: 'coming' },
];

export default function Navbar() {
  const navigate = useNavigate();
  const { isChatOpen, toggleChat } = useLayout();
  const { theme, toggleTheme } = useTheme();
  const [selectedTrack, setSelectedTrack] = useState('quantum');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activePreset, setActivePreset] = useState<string>('');
  const [modelPresets, setModelPresets] = useState<Record<string, ModelPreset>>({});
  const [modelSwitching, setModelSwitching] = useState(false);

  useEffect(() => {
    getModels()
      .then(data => {
        setActivePreset(data.active);
        setModelPresets(data.presets);
      })
      .catch(() => {}); // backend 未运行时静默失败
  }, []);

  const handleModelSwitch = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const preset = e.target.value;
    if (preset === activePreset || modelSwitching) return;
    setModelSwitching(true);
    try {
      const result = await switchModel(preset);
      setActivePreset(result.active);
      setToastMessage(`模型已切换至 ${result.display_name}`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch {
      setToastMessage('模型切换失败，请重试');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } finally {
      setModelSwitching(false);
    }
  };

  const handleTrackChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTrack = e.target.value;
    if (newTrack !== 'quantum') {
      const trackName = tracks.find(t => t.id === newTrack)?.name;
      setToastMessage(`${trackName}赛道正在建设中，敬请期待`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      e.target.value = 'quantum';
    } else {
      setSelectedTrack(newTrack);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/?search=${encodeURIComponent(searchQuery.trim())}`);
      setToastMessage(`搜索: ${searchQuery.trim()}`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    }
  };

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-50 border-b backdrop-blur-2xl transition-colors duration-300"
        style={{ background: 'var(--th-bg-nav)', borderBottomColor: 'var(--th-border)' }}
      >
        <div className="px-6 h-16 flex items-center justify-between">

          {/* ── Left: Logo + Track ─────────────────────── */}
          <div className="flex items-center gap-6">
            {/* Logo */}
            <div className="flex items-center gap-2.5 select-none">
              <div className="relative w-8 h-8 flex items-center justify-center">
                <div className="absolute inset-0 rounded bg-blue-600/20 animate-pulse" />
                <Cpu className="relative w-5 h-5 text-blue-400" />
              </div>
              <div className="flex flex-col leading-none">
                <span className="font-display text-[1.35rem] tracking-widest text-shimmer">
                  GRAVITY
                </span>
                <span className="text-[9px] tracking-[0.3em] text-[#8892aa] uppercase mt-0.5">
                  Cognitive Engine
                </span>
              </div>
            </div>

            {/* Divider */}
            <div className="h-5 w-px bg-[rgba(59,130,246,0.2)]" />

            {/* Track selector */}
            <div className="relative group flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 dot-pulse flex-shrink-0" />
              <select
                value={selectedTrack}
                onChange={handleTrackChange}
                className="bg-transparent border-none text-sm font-medium text-[#c8d4f0] cursor-pointer focus:outline-none appearance-none pr-6 hover:text-white transition-colors"
              >
                {tracks.map((track) => (
                  <option key={track.id} value={track.id} style={{ background: 'var(--th-bg-elevated)' }}>
                    {track.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8892aa] pointer-events-none group-hover:text-blue-400 transition-colors" />
            </div>
          </div>

          {/* ── Right: Search + Chat ───────────────────── */}
          <div className="flex items-center gap-3">
            <form onSubmit={handleSearch} className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8892aa] group-focus-within:text-blue-400 transition-colors pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索信号、公司、技术..."
                className="border rounded-md pl-9 pr-4 py-1.5 text-sm w-60 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all"
                style={{
                  background: 'var(--th-bg-input)',
                  borderColor: 'var(--th-border)',
                  color: 'var(--th-text)',
                }}
              />
            </form>

            {/* Model Switcher */}
            {Object.keys(modelPresets).length > 0 && (
              <div
                className="relative flex items-center gap-1.5 border rounded-md px-2 py-1.5 transition-colors"
                style={{
                  background: 'var(--th-bg-input)',
                  borderColor: 'var(--th-border)',
                }}
              >
                <Bot className="w-3.5 h-3.5 text-[#8892aa] flex-shrink-0" />
                <select
                  value={activePreset}
                  onChange={handleModelSwitch}
                  disabled={modelSwitching}
                  title="切换模型"
                  className="bg-transparent border-none text-xs font-medium text-[#c8d4f0] cursor-pointer focus:outline-none appearance-none pr-5 hover:text-white transition-colors disabled:opacity-60 disabled:cursor-wait"
                >
                  {Object.entries(modelPresets).map(([key, p]) => (
                    <option key={key} value={key} style={{ background: 'var(--th-bg-elevated)' }}>
                      {p.display_name}
                    </option>
                  ))}
                </select>
                {modelSwitching ? (
                  <Loader2 className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-blue-400 animate-spin pointer-events-none" />
                ) : (
                  <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#8892aa] pointer-events-none" />
                )}
              </div>
            )}

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? '切换亮色模式' : '切换暗色模式'}
              className="flex items-center justify-center w-8 h-8 rounded-md border transition-all hover:border-blue-400/60 hover:scale-105 active:scale-95"
              style={{
                background: 'var(--th-bg-input)',
                borderColor: 'var(--th-border)',
                color: 'var(--th-text-muted)',
              }}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>

            <button
              onClick={toggleChat}
              className={`btn-glow flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-semibold border transition-all ${
                isChatOpen
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'border hover:border-blue-500/60'
              }`}
              style={!isChatOpen ? {
                background: 'var(--th-bg-input)',
                borderColor: 'var(--th-border)',
                color: 'var(--th-text-nav)',
              } : {}}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Chat</span>
            </button>
          </div>
        </div>

        {/* Bottom edge glow line */}
        <div className="h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
      </nav>

      {/* Toast */}
      {showToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] animate-fade-up">
          <div className="glass-card rounded-lg px-6 py-3 shadow-glow flex items-center gap-3">
            <div className="w-1 h-7 bg-blue-500 rounded-full shadow-glow-sm" />
            <p className="text-sm text-[#c8d4f0]">{toastMessage}</p>
          </div>
        </div>
      )}
    </>
  );
}
