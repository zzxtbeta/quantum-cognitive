import { useEffect, useState, useCallback } from 'react';
import { X, RefreshCw, Wrench, ChevronDown, ChevronUp, Loader2, Brain, MessageSquare } from 'lucide-react';
import { fetchSkills } from '../api/skills';
import type { SkillItem } from '../types/skill';

interface SkillsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const SCOPE_CONFIG = {
  'deep-research': {
    label: '深度研究',
    color: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
    icon: Brain,
  },
  'chat-agent': {
    label: '对话助手',
    color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    icon: MessageSquare,
  },
  'unknown': {
    label: '未知',
    color: 'bg-gray-500/15 text-gray-400 border-gray-500/20',
    icon: Wrench,
  },
} as const;

function SkillCard({ skill }: { skill: SkillItem }) {
  const [expanded, setExpanded] = useState(false);
  const scopeCfg = SCOPE_CONFIG[skill.scope] ?? SCOPE_CONFIG['unknown'];
  const ScopeIcon = scopeCfg.icon;

  return (
    <div className="rounded-lg border border-[var(--th-divider)] bg-[var(--th-bg-hover)] overflow-hidden">
      {/* Card header */}
      <div className="px-3.5 py-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* scope badge */}
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${scopeCfg.color}`}>
              <ScopeIcon className="w-3 h-3" />
              {scopeCfg.label}
            </span>
            {/* name badge */}
            <span className="px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 text-[11px] font-mono border border-blue-500/20">
              {skill.name}
            </span>
            {/* version */}
            <span className="text-[10px] text-[var(--th-text-muted)]">v{skill.version}</span>
          </div>
          <button
            onClick={() => setExpanded(v => !v)}
            className="flex-shrink-0 p-0.5 text-[var(--th-text-muted)] hover:text-[var(--th-text)] transition-colors"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* agent name */}
        {skill.agent && (
          <p className="text-[10px] text-[var(--th-text-muted)] mb-1.5">
            Agent: <span className="font-mono text-[var(--th-text)]">{skill.agent}</span>
          </p>
        )}

        <p className="text-xs text-[var(--th-text)] leading-relaxed">{skill.description}</p>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-3.5 pb-3 border-t border-[var(--th-divider)] pt-2.5 space-y-2.5">
          {/* tools */}
          {skill.allowed_tools.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-[var(--th-text-muted)] mb-1.5 font-medium">工具</p>
              <div className="flex flex-wrap gap-1">
                {skill.allowed_tools.map(t => (
                  <span key={t} className="px-1.5 py-0.5 rounded bg-[var(--th-bg-card)] text-[10px] font-mono text-[var(--th-text-muted)] border border-[var(--th-divider)]">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
          {/* body preview */}
          {skill.body_preview && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-[var(--th-text-muted)] mb-1.5 font-medium">指令预览</p>
              <p className="text-xs text-[var(--th-text-muted)] leading-relaxed whitespace-pre-wrap font-mono">
                {skill.body_preview}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SkillsPanel({ isOpen, onClose }: SkillsPanelProps) {
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [scopes, setScopes] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSkills();
      setSkills(data.skills);
      setScopes(data.scopes ?? {});
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) load();
  }, [isOpen, load]);

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-[var(--th-bg-card)] border-l border-[var(--th-divider)]">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-[var(--th-divider)] flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Wrench className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-medium text-[var(--th-text)]">已注册 Skills</span>
          {!loading && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {skills.length} 个
            </span>
          )}
          {/* scope counts */}
          {!loading && Object.entries(scopes).map(([scope, count]) => {
            const cfg = SCOPE_CONFIG[scope as keyof typeof SCOPE_CONFIG] ?? SCOPE_CONFIG['unknown'];
            return (
              <span key={scope} className={`text-[10px] px-1.5 py-0.5 rounded-full border ${cfg.color}`}>
                {cfg.label} {count}
              </span>
            );
          })}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={load}
            disabled={loading}
            title="刷新"
            className="p-1.5 text-[var(--th-text-muted)] hover:text-[var(--th-text)] hover:bg-[var(--th-bg-hover)] rounded-md transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-[var(--th-text-muted)] hover:text-[var(--th-text)] hover:bg-[var(--th-bg-hover)] rounded-md transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-2">
        {loading && skills.length === 0 && (
          <div className="flex items-center justify-center py-12 text-[var(--th-text-muted)]">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            <span className="text-sm">加载中…</span>
          </div>
        )}

        {error && (
          <div className="text-xs text-red-400 px-3 py-2 rounded-md bg-red-500/10 border border-red-500/20">
            {error}
          </div>
        )}

        {!loading && !error && skills.length === 0 && (
          <div className="py-12 text-center">
            <div className="w-10 h-10 rounded-full bg-[var(--th-bg-hover)] flex items-center justify-center mx-auto mb-3">
              <Wrench className="w-5 h-5 text-[var(--th-text-muted)]" />
            </div>
            <p className="text-sm text-[var(--th-text-muted)]">还没有 Skills</p>
          </div>
        )}

        {/* deep-research skills 优先展示 */}
        {['deep-research', 'chat-agent', 'unknown'].map(scope => {
          const group = skills.filter(s => s.scope === scope);
          if (group.length === 0) return null;
          const cfg = SCOPE_CONFIG[scope as keyof typeof SCOPE_CONFIG] ?? SCOPE_CONFIG['unknown'];
          const ScopeIcon = cfg.icon;
          return (
            <div key={scope}>
              <div className={`flex items-center gap-1.5 px-1 py-1.5 mb-1.5`}>
                <ScopeIcon className={`w-3.5 h-3.5 ${cfg.color.split(' ')[1]}`} />
                <span className={`text-[11px] font-medium ${cfg.color.split(' ')[1]}`}>{cfg.label}</span>
                <span className="text-[10px] text-[var(--th-text-muted)]">{group.length} 个技能</span>
              </div>
              <div className="space-y-2 mb-3">
                {group.map(skill => <SkillCard key={skill.name} skill={skill} />)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-3.5 py-2.5 border-t border-[var(--th-divider)] flex-shrink-0">
        <p className="text-[10px] text-[var(--th-text-muted)] leading-relaxed">
          Skills 按需激活（Progressive Disclosure）— Agent 匹配到相关任务时才读取完整指令。
        </p>
      </div>
    </div>
  );
}
