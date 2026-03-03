import { useEffect, useState, useCallback } from 'react';
import { X, RefreshCw, Wrench, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { fetchSkills } from '../api/skills';
import type { SkillItem } from '../types/skill';

interface SkillsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

function SkillCard({ skill }: { skill: SkillItem }) {
  const [expanded, setExpanded] = useState(false);
  const lines = skill.when_to_use.split('\n').filter(Boolean);

  return (
    <div className="rounded-lg border border-[var(--th-divider)] bg-[var(--th-bg-hover)] overflow-hidden">
      {/* Card header */}
      <div className="px-3.5 py-3">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 text-[11px] font-mono border border-blue-500/20">
              {skill.name}
            </span>
            {skill.created_at && (
              <span className="text-[10px] text-[var(--th-text-muted)]">{skill.created_at}</span>
            )}
          </div>
          <button
            onClick={() => setExpanded(v => !v)}
            className="flex-shrink-0 p-0.5 text-[var(--th-text-muted)] hover:text-[var(--th-text)] transition-colors"
          >
            {expanded
              ? <ChevronUp className="w-3.5 h-3.5" />
              : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
        <p className="text-xs text-[var(--th-text)] leading-relaxed">{skill.description}</p>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-3.5 pb-3 border-t border-[var(--th-divider)] pt-2.5 space-y-2">
          {lines.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-[var(--th-text-muted)] mb-1.5 font-medium">适用场景</p>
              <ul className="space-y-1">
                {lines.map((l, i) => (
                  <li key={i} className="text-xs text-[var(--th-text-muted)] flex items-start gap-1.5 leading-relaxed">
                    <span className="text-blue-400 mt-0.5 flex-shrink-0">·</span>
                    <span>{l.replace(/^[-•]\s*/, '')}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {skill.instructions_preview && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-[var(--th-text-muted)] mb-1.5 font-medium">指令预览</p>
              <p className="text-xs text-[var(--th-text-muted)] leading-relaxed font-mono whitespace-pre-wrap">
                {skill.instructions_preview}
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSkills();
      setSkills(data.skills);
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
        <div className="flex items-center gap-2">
          <Wrench className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-medium text-[var(--th-text)]">已注册 Skills</span>
          {!loading && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {skills.length}
            </span>
          )}
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
            <p className="text-sm text-[var(--th-text-muted)] mb-1">还没有 Skills</p>
            <p className="text-xs text-[var(--th-text-muted)] opacity-60">
              在对话中说「把这个方法保存为 Skill」即可创建
            </p>
          </div>
        )}

        {skills.map(skill => (
          <SkillCard key={skill.name} skill={skill} />
        ))}
      </div>

      {/* Footer hint */}
      <div className="px-3.5 py-2.5 border-t border-[var(--th-divider)] flex-shrink-0">
        <p className="text-[10px] text-[var(--th-text-muted)] leading-relaxed">
          Skills 在新建对话时自动注入到 AI 上下文。保存新 Skill 后下一次对话即生效。
        </p>
      </div>
    </div>
  );
}
