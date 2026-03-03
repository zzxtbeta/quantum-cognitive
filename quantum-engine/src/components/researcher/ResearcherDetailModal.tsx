import { X, Mail, Link2, Building2, GraduationCap, Briefcase, Tag, Send, Bookmark } from 'lucide-react';
import { Researcher } from '../../types/people';
import InstitutionBadge from './InstitutionBadge';
import ResearchTagCloud from './ResearchTagCloud';

interface ResearcherDetailModalProps {
  researcher: Researcher;
  onClose: () => void;
}

export default function ResearcherDetailModal({ researcher, onClose }: ResearcherDetailModalProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="glass-card rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-[rgba(5,5,14,0.95)] backdrop-blur-lg border-b border-[rgba(59,130,246,0.12)] p-6 flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <InstitutionBadge institution={researcher.institution} />
              {researcher.department && (
                <span className="text-sm text-slate-400">{researcher.department}</span>
              )}
            </div>
            <h2 className="text-2xl font-bold text-white">
              {researcher.name}
              {researcher.nameEn && (
                <span className="ml-2 text-lg font-normal text-slate-500">
                  {researcher.nameEn}
                </span>
              )}
            </h2>
            <p className="text-slate-400 mt-1">{researcher.title}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-2 hover:bg-[rgba(59,130,246,0.1)] rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Research Tags */}
          {researcher.researchTags.length > 0 && (
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-blue-400 mb-3">
                <Tag className="w-4 h-4" />
                研究方向
              </h3>
              <ResearchTagCloud tags={researcher.researchTags} maxTags={10} size="md" />
            </div>
          )}

          {/* Contact Info */}
          <div className="grid grid-cols-2 gap-4">
            {researcher.email && (
              <div className="bg-[rgba(59,130,246,0.05)] rounded-lg p-4 border border-[rgba(59,130,246,0.08)]">
                <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
                  <Mail className="w-4 h-4" />
                  邮箱
                </div>
                <a
                  href={`mailto:${researcher.email}`}
                  className="text-blue-400 hover:text-blue-300 transition-colors"
                >
                  {researcher.email}
                </a>
              </div>
            )}
            {researcher.url && (
              <div className="bg-[rgba(59,130,246,0.05)] rounded-lg p-4 border border-[rgba(59,130,246,0.08)]">
                <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
                  <Link2 className="w-4 h-4" />
                  个人主页
                </div>
                <a
                  href={researcher.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 transition-colors truncate block"
                >
                  {researcher.url}
                </a>
              </div>
            )}
          </div>

          {/* Research Direction Detail */}
          {researcher.researchDirection && (
            <div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 border border-blue-500/20 rounded-lg p-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-blue-400 mb-2">
                <Building2 className="w-4 h-4" />
                详细研究方向
              </h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                {researcher.researchDirection}
              </p>
            </div>
          )}

          {/* Education */}
          {researcher.education && researcher.education.length > 0 && (
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-3">
                <GraduationCap className="w-4 h-4" />
                教育背景
              </h3>
              <div className="space-y-2">
                {researcher.education.map((edu, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-sm">
                    {edu.year && (
                      <span className="text-slate-500 min-w-[60px]">{edu.year}</span>
                    )}
                    <div>
                      {edu.degree && <span className="text-blue-300 mr-2">{edu.degree}</span>}
                      {edu.school && <span className="text-slate-300">{edu.school}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Career */}
          {researcher.career && researcher.career.length > 0 && (
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-3">
                <Briefcase className="w-4 h-4" />
                工作经历
              </h3>
              <div className="space-y-2">
                {researcher.career.map((career, idx) => (
                  <div key={idx} className="text-sm text-slate-400">
                    {career.text}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Biography */}
          {researcher.biography && (
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-3">
                <span className="text-lg">📄</span>
                个人简介
              </h3>
              <div className="bg-[rgba(59,130,246,0.05)] rounded-lg p-4 border border-[rgba(59,130,246,0.08)] max-h-60 overflow-y-auto">
                <pre className="text-sm text-slate-300 whitespace-pre-wrap font-sans leading-relaxed">
                  {researcher.biography}
                </pre>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-[rgba(59,130,246,0.12)]">
            <button className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 hover:bg-blue-600 rounded-lg font-semibold transition-colors">
              <Send className="w-4 h-4" />
              发送到 Chat
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 px-4 py-3 glass-card rounded-lg hover:bg-[rgba(59,130,246,0.08)] font-semibold transition-colors">
              <Bookmark className="w-4 h-4" />
              加入关注
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
