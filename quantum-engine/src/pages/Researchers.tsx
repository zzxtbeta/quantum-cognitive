import { useState, useMemo, useEffect } from 'react';
import { Search, Filter, GraduationCap, Mail, FileText, Globe, X, Users } from 'lucide-react';
import { useResearchers } from '../hooks/useResearchers';
import { Researcher, Institution, TitleLevel, INSTITUTION_CONFIG, TITLE_CONFIG } from '../types/people';
import ResearcherCard from '../components/researcher/ResearcherCard';
import ResearcherDetailModal from '../components/researcher/ResearcherDetailModal';
import InstitutionBadge from '../components/researcher/InstitutionBadge';

const institutions: Institution[] = ['ustc', 'baqis', 'qscgba', 'zju', 'tsinghua'];
const titleLevels: TitleLevel[] = ['pi', 'professor', 'associate', 'postdoc', 'phd'];

export default function Researchers() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInstitutions, setSelectedInstitutions] = useState<Institution[]>([]);
  const [selectedTitles, setSelectedTitles] = useState<TitleLevel[]>([]);
  const [hasEmail, setHasEmail] = useState(false);
  const [hasBiography, setHasBiography] = useState(false);
  const [hasHomepage, setHasHomepage] = useState(false);
  const [selectedResearcher, setSelectedResearcher] = useState<Researcher | null>(null);

  const [page, setPage] = useState(1);
  const pageSize = 30; // 每页显示数量

  // 当筛选条件变化时重置页码
  useEffect(() => {
    setPage(1);
  }, [selectedInstitutions, selectedTitles, searchQuery, hasEmail, hasBiography, hasHomepage]);

  const filters = useMemo(() => ({
    institution: selectedInstitutions.length > 0 ? selectedInstitutions : undefined,
    titleLevel: selectedTitles.length > 0 ? selectedTitles : undefined,
    searchQuery: searchQuery || undefined,
    hasEmail: hasEmail || undefined,
    hasBiography: hasBiography || undefined,
    hasHomepage: hasHomepage || undefined,
    page,
    pageSize,
  }), [selectedInstitutions, selectedTitles, searchQuery, hasEmail, hasBiography, hasHomepage, page]);

  const { researchers, loading, total, hasMore } = useResearchers({ initialFilters: filters });

  const toggleInstitution = (inst: Institution) => {
    setSelectedInstitutions(prev =>
      prev.includes(inst)
        ? prev.filter(i => i !== inst)
        : [...prev, inst]
    );
  };

  const toggleTitle = (title: TitleLevel) => {
    setSelectedTitles(prev =>
      prev.includes(title)
        ? prev.filter(t => t !== title)
        : [...prev, title]
    );
  };

  const clearFilters = () => {
    setSelectedInstitutions([]);
    setSelectedTitles([]);
    setHasEmail(false);
    setHasBiography(false);
    setHasHomepage(false);
    setSearchQuery('');
  };

  const hasActiveFilters = selectedInstitutions.length > 0 || selectedTitles.length > 0 || hasEmail || hasBiography || hasHomepage || searchQuery;

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6 animate-fade-up">
        <h1 className="font-display text-4xl text-shimmer tracking-widest mb-1">QUANTUM TALENT POOL</h1>
        <p className="text-[#8892aa] text-sm">
          量子科技领域研究人员 · 共 <span className="text-blue-400 font-medium">{loading ? '...' : total}</span> 人
        </p>
      </div>

      {/* Search Bar */}
      <div className="glass-card rounded-xl p-4 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8892aa] pointer-events-none" />
          <input
            type="text"
            placeholder="搜索姓名、机构、研究方向..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[rgba(16,16,31,0.6)] border border-[rgba(59,130,246,0.15)] rounded-lg pl-10 pr-4 py-2.5 text-[#e0e8ff] placeholder:text-[#8892aa] focus:outline-none focus:border-blue-500/50 focus:shadow-glow-sm transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-[rgba(59,130,246,0.1)] rounded transition-colors"
            >
              <X className="w-4 h-4 text-[#8892aa] hover:text-blue-400" />
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card rounded-xl p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-3.5 h-3.5 text-blue-400" />
          <span className="font-medium text-sm text-[#c8d4f0]">筛选条件</span>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="ml-auto text-xs text-[#8892aa] hover:text-blue-400 transition-colors"
            >
              清除全部
            </button>
          )}
        </div>

        {/* Institution Filters */}
        <div className="mb-3">
          <div className="text-[10px] text-[#8892aa] mb-2 uppercase tracking-widest">所属机构</div>
          <div className="flex flex-wrap gap-2">
            {institutions.map(inst => (
              <button
                key={inst}
                onClick={() => toggleInstitution(inst)}
                className={`transition-all ${selectedInstitutions.includes(inst) ? '' : 'opacity-60 hover:opacity-100'}`}
              >
                <InstitutionBadge institution={inst} size="sm" />
              </button>
            ))}
          </div>
        </div>

        {/* Title Filters */}
        <div className="mb-3">
          <div className="text-[10px] text-[#8892aa] mb-2 flex items-center gap-1 uppercase tracking-widest">
            <GraduationCap className="w-3 h-3" />
            职称级别
          </div>
          <div className="flex flex-wrap gap-1.5">
            {titleLevels.map(title => (
              <button
                key={title}
                onClick={() => toggleTitle(title)}
                className={`btn-glow px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  selectedTitles.includes(title)
                    ? 'bg-blue-600 text-white border border-blue-500 shadow-glow-sm'
                    : 'bg-[rgba(59,130,246,0.06)] border border-[rgba(59,130,246,0.15)] text-[#8892aa] hover:text-[#c8d4f0] hover:border-blue-500/30'
                }`}
              >
                {TITLE_CONFIG[title].label}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Filters — pills */}
        <div className="flex flex-wrap gap-1.5">
          {([
            { key: 'email', label: '有邮箱', icon: <Mail className="w-3 h-3" />, active: hasEmail, toggle: () => setHasEmail(v => !v) },
            { key: 'bio', label: '有简介', icon: <FileText className="w-3 h-3" />, active: hasBiography, toggle: () => setHasBiography(v => !v) },
            { key: 'web', label: '有主页', icon: <Globe className="w-3 h-3" />, active: hasHomepage, toggle: () => setHasHomepage(v => !v) },
          ] as const).map(item => (
            <button
              key={item.key}
              onClick={item.toggle}
              className={`btn-glow inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                item.active
                  ? 'bg-blue-600 text-white border border-blue-500 shadow-glow-sm'
                  : 'bg-[rgba(59,130,246,0.06)] border border-[rgba(59,130,246,0.15)] text-[#8892aa] hover:text-[#c8d4f0] hover:border-blue-500/30'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Active Filter Tags */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {searchQuery && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[rgba(59,130,246,0.1)] text-blue-300 text-xs rounded-full border border-[rgba(59,130,246,0.25)]">
              搜索: {searchQuery}
              <button onClick={() => setSearchQuery('')} className="hover:text-white ml-0.5">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {selectedInstitutions.map(inst => (
            <span key={inst} className="inline-flex items-center gap-1 px-2.5 py-1 bg-[rgba(59,130,246,0.08)] text-[#c8d4f0] text-xs rounded-full border border-[rgba(59,130,246,0.15)]">
              {INSTITUTION_CONFIG[inst].shortName}
              <button onClick={() => toggleInstitution(inst)} className="hover:text-white ml-0.5">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {selectedTitles.map(title => (
            <span key={title} className="inline-flex items-center gap-1 px-2.5 py-1 bg-[rgba(59,130,246,0.08)] text-[#c8d4f0] text-xs rounded-full border border-[rgba(59,130,246,0.15)]">
              {TITLE_CONFIG[title].label}
              <button onClick={() => toggleTitle(title)} className="hover:text-white ml-0.5">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Researchers Grid */}
      {loading ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <div className="inline-block w-8 h-8 border-2 border-blue-500/30 border-t-blue-400 rounded-full animate-spin"></div>
          <p className="text-[#8892aa] mt-4 text-sm">加载研究人员数据...</p>
        </div>
      ) : (
        <>
          {researchers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {researchers.map((researcher, index) => (
                <div
                  key={researcher.id}
                  className="animate-in fade-in slide-in-from-bottom-4 h-full"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <ResearcherCard
                    researcher={researcher}
                    onClick={() => setSelectedResearcher(researcher)}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-card rounded-xl p-12 text-center">
              <Users className="w-14 h-14 text-[rgba(59,130,246,0.2)] mx-auto mb-4" />
              <p className="text-[#c8d4f0] text-base mb-2 font-medium">未找到符合条件的研究人员</p>
              <p className="text-[#8892aa] text-sm">尝试调整筛选条件</p>
            </div>
          )}

          {/* Results Count & Load More */}
          <div className="text-center py-6 space-y-3">
            <p className="text-[#8892aa] text-xs">
              显示 <span className="text-blue-400">{researchers.length}</span> / <span className="text-blue-400">{total}</span> 条结果
            </p>
            {hasMore && (
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={loading}
                className="btn-glow px-6 py-2 bg-[rgba(59,130,246,0.08)] hover:bg-[rgba(59,130,246,0.15)] disabled:opacity-40 text-[#c8d4f0] text-sm font-medium rounded-lg transition-all border border-[rgba(59,130,246,0.2)] hover:border-blue-500/40"
              >
                {loading ? '加载中...' : '加载更多'}
              </button>
            )}
          </div>
        </>
      )}

      {/* Detail Modal */}
      {selectedResearcher && (
        <ResearcherDetailModal
          researcher={selectedResearcher}
          onClose={() => setSelectedResearcher(null)}
        />
      )}
    </div>
  );
}
