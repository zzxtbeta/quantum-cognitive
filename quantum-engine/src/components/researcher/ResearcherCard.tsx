import { Mail, Link2, Building2, ChevronRight, GripVertical } from 'lucide-react';
import { Researcher } from '../../types/people';
import { useLayout } from '../../contexts/LayoutContext';
import InstitutionBadge from './InstitutionBadge';
import TitleBadge from './TitleBadge';
import ResearchTagCloud from './ResearchTagCloud';

interface ResearcherCardProps {
  researcher: Researcher;
  onClick?: () => void;
}

export default function ResearcherCard({ researcher, onClick }: ResearcherCardProps) {
  const { setDraggedItem, isChatOpen } = useLayout();

  const handleDragStart = (e: React.DragEvent) => {
    setDraggedItem({
      type: 'researcher',
      id: researcher.id,
      title: researcher.name,
      summary: `${researcher.institutionRaw} · ${researcher.title} · ${researcher.researchTags.slice(0, 3).join(', ')}`,
    });
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  return (
    <div
      draggable={isChatOpen}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={onClick}
      className={`glass-card rounded-xl p-4 cursor-pointer group relative transition-all duration-200 flex flex-col h-full ${isChatOpen ? 'cursor-grab active:cursor-grabbing' : ''}`}
    >
      {/* Drag Handle */}
      {isChatOpen && (
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="w-4 h-4 text-[#8892aa]" />
        </div>
      )}

      {/* Header: Institution Badge */}
      <div className="flex items-center justify-between mb-3">
        <InstitutionBadge institution={researcher.institution} size="sm" />
        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-400 transition-colors" />
      </div>

      {/* Name & Title */}
      <div className="mb-2">
        <h3 className="text-sm font-semibold text-[#e0e8ff] group-hover:text-blue-300 transition-colors mb-1 leading-snug">
          {researcher.name}
          {researcher.nameEn && (
            <span className="ml-2 text-xs font-normal text-[#8892aa]">
              {researcher.nameEn}
            </span>
          )}
        </h3>
        <TitleBadge title={researcher.titleNormalized} originalTitle={researcher.title} />
      </div>

      {/* Department */}
      {researcher.department && (
        <div className="flex items-center gap-1.5 text-xs text-[#8892aa] mb-2">
          <Building2 className="w-3 h-3" />
          <span className="truncate">{researcher.department}</span>
        </div>
      )}

      {/* Research Tags */}
      {researcher.researchTags.length > 0 && (
        <div className="mb-3">
          <ResearchTagCloud tags={researcher.researchTags} maxTags={4} />
        </div>
      )}

      {/* Spacer to push footer down */}
      <div className="flex-1" />

      {/* Footer: Contact Info Indicators */}
      <div className="flex items-center gap-3 pt-2.5 border-t border-[rgba(59,130,246,0.1)]">
        <div className={`flex items-center gap-1 text-[11px] ${researcher.email ? 'text-green-400/80' : 'text-[rgba(59,130,246,0.2)]'}`}>
          <Mail className="w-3 h-3" />
          <span>{researcher.email ? '有邮箱' : '无邮箱'}</span>
        </div>
        <div className={`flex items-center gap-1 text-[11px] ${researcher.url ? 'text-blue-400/80' : 'text-[rgba(59,130,246,0.2)]'}`}>
          <Link2 className="w-3 h-3" />
          <span>{researcher.url ? '有主页' : '无主页'}</span>
        </div>
        <div className={`flex items-center gap-1 text-[11px] ${researcher.biography?.length > 50 ? 'text-amber-400/80' : 'text-[rgba(59,130,246,0.2)]'}`}>
          <span className="w-3 h-3 flex items-center justify-center text-[10px]">📄</span>
          <span>{researcher.biography?.length > 50 ? '有简介' : '简介短'}</span>
        </div>
      </div>
    </div>
  );
}
