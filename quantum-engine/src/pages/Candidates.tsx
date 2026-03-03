import { useState } from 'react';
import { useCandidates } from '../hooks/useCandidates';
import { Building2, MapPin, TrendingUp, Star, GripVertical } from 'lucide-react';
import { useLayout } from '../contexts/LayoutContext';

export default function Candidates() {
  const { candidates, loading, updateFilters } = useCandidates();
  const { setDraggedItem, isChatOpen } = useLayout();
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [selectedTechRoute, setSelectedTechRoute] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'signalCount' | 'recent'>('signalCount');

  const locations = ['all', '合肥', '北京', '上海', '深圳', '杭州'];
  const techRoutes = ['all', '超导量子计算', '光量子计算', '量子通信', '量子传感', '量子软件'];

  const handleLocationChange = (location: string) => {
    setSelectedLocation(location);
    updateFilters({ location: location === 'all' ? undefined : location });
  };

  const handleTechRouteChange = (route: string) => {
    setSelectedTechRoute(route);
    updateFilters({ techRoute: route === 'all' ? undefined : route });
  };

  const handleSortChange = (sort: 'signalCount' | 'recent') => {
    setSortBy(sort);
    updateFilters({ sortBy: sort });
  };

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6 animate-fade-up">
        <h1 className="font-display text-4xl text-shimmer tracking-widest mb-1">CANDIDATES</h1>
        <p className="text-[#8892aa] text-sm">
          AI推荐的潜在投资标的 · 共 <span className="text-blue-400 font-medium">{candidates.length}</span> 家公司
        </p>
      </div>

      {/* Filters */}
      <div className="glass-card rounded-xl p-5 mb-6 space-y-5">
        {/* Location Filter */}
        <div>
          <label className="text-[10px] text-[#8892aa] mb-2.5 flex items-center gap-1.5 uppercase tracking-widest font-semibold">
            <MapPin className="w-3 h-3" /> 地区
          </label>
          <div className="flex flex-wrap gap-1.5">
            {locations.map((location) => (
              <button
                key={location}
                onClick={() => handleLocationChange(location)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                  selectedLocation === location
                    ? 'bg-blue-600 text-white shadow-glow-sm'
                    : 'bg-[rgba(59,130,246,0.06)] border border-[rgba(59,130,246,0.15)] text-[#8892aa] hover:text-[#c8d4f0] hover:border-blue-500/30 hover:bg-[rgba(59,130,246,0.10)]'
                }`}
              >
                {location === 'all' ? '全部' : location}
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: 'var(--th-border)' }} />

        {/* Tech Route Filter */}
        <div>
          <label className="text-[10px] text-[#8892aa] mb-2.5 flex items-center gap-1.5 uppercase tracking-widest font-semibold">
            <TrendingUp className="w-3 h-3" /> 技术路线
          </label>
          <div className="flex flex-wrap gap-1.5">
            {techRoutes.map((route) => (
              <button
                key={route}
                onClick={() => handleTechRouteChange(route)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                  selectedTechRoute === route
                    ? 'bg-blue-600 text-white shadow-glow-sm'
                    : 'bg-[rgba(59,130,246,0.06)] border border-[rgba(59,130,246,0.15)] text-[#8892aa] hover:text-[#c8d4f0] hover:border-blue-500/30 hover:bg-[rgba(59,130,246,0.10)]'
                }`}
              >
                {route === 'all' ? '全部路线' : route}
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: 'var(--th-border)' }} />

        {/* Sort */}
        <div>
          <label className="text-[10px] text-[#8892aa] mb-2.5 flex items-center gap-1.5 uppercase tracking-widest font-semibold">
            排序方式
          </label>
          <div className="flex gap-1.5">
            {(['signalCount', 'recent'] as const).map((s) => (
              <button
                key={s}
                onClick={() => handleSortChange(s)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                  sortBy === s
                    ? 'bg-blue-600 text-white shadow-glow-sm'
                    : 'bg-[rgba(59,130,246,0.06)] border border-[rgba(59,130,246,0.15)] text-[#8892aa] hover:text-[#c8d4f0] hover:border-blue-500/30 hover:bg-[rgba(59,130,246,0.10)]'
                }`}
              >
                {s === 'signalCount' ? '按信号数量' : '按最近更新'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Candidates List */}
      {loading ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <div className="inline-block w-8 h-8 border-2 border-blue-500/30 border-t-blue-400 rounded-full animate-spin"></div>
          <p className="text-[#8892aa] mt-4 text-sm">加载中...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {candidates.length > 0 ? (
            candidates.map((candidate, index) => {
              const handleDragStart = (e: React.DragEvent) => {
                setDraggedItem({
                  type: 'candidate',
                  id: candidate.id,
                  title: candidate.name,
                  summary: candidate.description || `${candidate.location} · ${candidate.techRoute}`,
                });
                e.dataTransfer.effectAllowed = 'copy';
              };

              const handleDragEnd = () => {
                setDraggedItem(null);
              };

              return (
                <div
                  key={candidate.id}
                  draggable={isChatOpen}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  className={`glass-card rounded-xl p-5 cursor-pointer group animate-fade-up relative ${
                    isChatOpen ? 'cursor-grab active:cursor-grabbing' : ''
                  }`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {isChatOpen && (
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <GripVertical className="w-4 h-4 text-[#8892aa]" />
                    </div>
                  )}
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-base group-hover:text-blue-300 transition-colors text-[#e0e8ff]">
                        {candidate.name}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-[#8892aa] mt-0.5">
                        <MapPin className="w-3 h-3" />
                        {candidate.location}
                        {candidate.fundingRound && (
                          <>
                            <span>·</span>
                            <span>{candidate.fundingRound}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <button className="text-[#8892aa] hover:text-blue-400 transition-colors p-1 rounded hover:bg-blue-500/10">
                    <Star className="w-4 h-4" />
                  </button>
                </div>

                {/* Tech Route */}
                <div className="mb-3">
                  <span className="px-2.5 py-0.5 bg-[rgba(59,130,246,0.1)] text-blue-300 text-xs font-semibold rounded border border-[rgba(59,130,246,0.2)]">
                    {candidate.techRoute}
                  </span>
                  {candidate.stage && (
                    <span className="ml-2 px-2.5 py-0.5 bg-[rgba(100,116,139,0.15)] text-[#8892aa] text-xs font-medium rounded border border-[rgba(100,116,139,0.2)]">
                      {candidate.stage}
                    </span>
                  )}
                </div>

                {/* Description */}
                {candidate.description && (
                  <p className="text-sm text-[#8892aa] mb-3 line-clamp-2 leading-relaxed">
                    {candidate.description}
                  </p>
                )}

                {/* Reasons */}
                <div className="mb-4">
                  <div className="text-[10px] text-[#8892aa] mb-1.5 flex items-center gap-1 uppercase tracking-widest">
                    <TrendingUp className="w-3 h-3" />
                    推荐原因
                  </div>
                  <div className="space-y-1">
                    {candidate.reasons.map((reason, idx) => (
                      <div key={idx} className="text-xs text-[#8892aa] flex items-start gap-2">
                        <span className="text-blue-400 mt-0.5">•</span>
                        <span>{reason}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-[rgba(59,130,246,0.1)]">
                  <div className="text-[11px] text-[#8892aa]">
                    {candidate.signalCount} 条相关信号
                  </div>
                  <div className="flex gap-2">
                    <button className="btn-glow px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold rounded-md transition-all shadow-glow-sm">
                      查看详情
                    </button>
                    <button className="px-3 py-1.5 bg-[rgba(59,130,246,0.08)] border border-[rgba(59,130,246,0.18)] hover:border-blue-500/40 text-blue-500 text-[11px] font-semibold rounded-md transition-all">
                      加入关注
                    </button>
                  </div>
                </div>
              </div>
              );
            })
          ) : (
            <div className="col-span-2 glass-card rounded-xl p-12 text-center">
              <div className="text-5xl mb-4 opacity-40">🎯</div>
              <p className="text-[#c8d4f0] text-base mb-2 font-medium">暂无符合条件的候选标的</p>
              <p className="text-[#8892aa] text-sm">尝试调整筛选条件</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
