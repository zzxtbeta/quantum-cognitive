import { Building2, User, Lightbulb, Bookmark, GripVertical } from 'lucide-react';
import { Signal } from '../types';
import { useLayout } from '../contexts/LayoutContext';

interface SignalCardProps {
  signal: Signal;
  onClick?: () => void;
}

const priorityConfig = {
  high: {
    dotColor: 'bg-red-500',
    gradientBar: 'from-red-500/60 via-red-500/20 to-transparent',
    badgeBg: 'bg-red-500/10',
    textColor: 'text-red-400',
    borderColor: 'border-red-500/25',
    label: '高',
  },
  mid: {
    dotColor: 'bg-amber-400',
    gradientBar: 'from-amber-400/60 via-amber-400/20 to-transparent',
    badgeBg: 'bg-amber-400/10',
    textColor: 'text-amber-400',
    borderColor: 'border-amber-400/25',
    label: '中',
  },
  low: {
    dotColor: 'bg-slate-500',
    gradientBar: 'from-slate-600/40 via-slate-600/10 to-transparent',
    badgeBg: 'bg-slate-700/40',
    textColor: 'text-slate-400',
    borderColor: 'border-slate-700/50',
    label: '低',
  },
};

export default function SignalCard({ signal, onClick }: SignalCardProps) {
  const config = priorityConfig[signal.priority];
  const { setDraggedItem, isChatOpen } = useLayout();

  const handleDragStart = (e: React.DragEvent) => {
    setDraggedItem({
      type: 'signal',
      id: signal.id,
      title: signal.title,
      summary: signal.summary,
    });
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  return (
    <article
      draggable={isChatOpen}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={onClick}
      className={`glass-card rounded-xl overflow-hidden cursor-pointer group relative transition-all duration-250 ${
        isChatOpen ? 'cursor-grab active:cursor-grabbing' : ''
      }`}
    >
      {/* top accent line */}
      <div className={`h-px w-full bg-gradient-to-r ${config.gradientBar} opacity-70 group-hover:opacity-100 transition-opacity`} />

      {isChatOpen && (
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <GripVertical className="w-4 h-4 text-[#8892aa]" />
        </div>
      )}

      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold rounded border ${config.badgeBg} ${config.textColor} ${config.borderColor}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor} dot-pulse`} />
              {config.label}
            </span>
            <span className="px-2.5 py-0.5 bg-[rgba(59,130,246,0.08)] border border-[rgba(59,130,246,0.18)] text-blue-500 text-[11px] font-semibold rounded">
              {signal.type}
            </span>
            <span className="text-[#8892aa] text-xs">{signal.timestamp}</span>
          </div>
          <button
            onClick={(e) => e.stopPropagation()}
            className="text-[#8892aa] hover:text-blue-400 transition-colors p-1 rounded hover:bg-blue-500/10"
          >
            <Bookmark className="w-4 h-4" />
          </button>
        </div>

        <h3 className="text-base font-semibold mb-1.5 text-[#e0e8ff] group-hover:text-blue-300 transition-colors leading-snug">
          {signal.title}
        </h3>
        <p className="text-[#8892aa] text-sm mb-4 leading-relaxed line-clamp-2">{signal.summary}</p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-[#8892aa]">
            <span className="flex items-center gap-1 hover:text-[#c8d4f0] transition-colors">
              <Building2 className="w-3.5 h-3.5" />
              {signal.relatedEntities.companies} 家公司
            </span>
            <span className="flex items-center gap-1 hover:text-[#c8d4f0] transition-colors">
              <User className="w-3.5 h-3.5" />
              {signal.relatedEntities.people} 位人物
            </span>
            <span className="flex items-center gap-1 hover:text-[#c8d4f0] transition-colors">
              <Lightbulb className="w-3.5 h-3.5" />
              {signal.relatedEntities.technologies} 条技术
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={(e) => e.stopPropagation()}
              className="btn-glow px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold rounded-md transition-all shadow-glow-sm"
            >
              查看详情
            </button>
            <button
              onClick={(e) => e.stopPropagation()}
              className="px-3 py-1.5 bg-[rgba(59,130,246,0.08)] border border-[rgba(59,130,246,0.18)] hover:border-blue-500/40 hover:bg-[rgba(59,130,246,0.15)] text-blue-500 text-[11px] font-semibold rounded-md transition-all"
            >
              Chat
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
