import { useState, useMemo, useEffect } from 'react';
import { useDomains } from '../hooks/useDomains';
import { useDomainPapers } from '../hooks/useDomainPapers';
import { TechNode, SignalDetail } from '../types';
import { TrendingUp, TrendingDown, Minus, ChevronRight, Calendar, Users, ExternalLink, Sparkles } from 'lucide-react';
import SignalDetailModal from '../components/SignalDetailModal';
import { signalApi } from '../api/signals';

const trendIcons = {
  rising: <TrendingUp className="w-4 h-4 text-red-500" />,
  stable: <Minus className="w-4 h-4 text-slate-400" />,
  declining: <TrendingDown className="w-4 h-4 text-slate-500" />,
  early: <Minus className="w-4 h-4 text-slate-400" />,
};

const trendLabels = {
  rising: '🔥 上升',
  stable: '→ 稳定',
  declining: '↘ 下降',
  early: '→ 早期',
};

const stageProgress = {
  '理论研究': 20,
  '实验室阶段': 40,
  '工程化早期': 60,
  '工程化': 70,
  '商业化早期': 85,
  '商业化': 95,
};

export default function KnowledgeMap() {
  const { domains, loading, error } = useDomains();
  
  // 调试输出
  console.log('🎯 KnowledgeMap render:', {
    loading,
    error: error?.message,
    domainsCount: domains.length,
    domains: domains.slice(0, 3)
  });
  const [selectedNode, setSelectedNode] = useState<TechNode | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['1']); // 默认展开"量子"
  const [expandedDirections, setExpandedDirections] = useState<string[]>([]); // 展开的direction
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedPaper, setSelectedPaper] = useState<SignalDetail | null>(null);

  // 先定义categories和routes，因为后面会用到
  const categories = useMemo(() => {
    const cats = domains.filter((n) => n.type === 'category');
    console.log('📂 Categories:', cats.map(c => ({ id: c.id, name: c.name, type: typeof c.id })));
    return cats;
  }, [domains]);

  const routes = useMemo(() => {
    const rts = domains.filter((n) => n.type === 'route');
    console.log('🛤️ Routes:', rts.map(r => ({ id: r.id, name: r.name, parentId: r.parentId, parentIdType: typeof r.parentId })));
    return rts;
  }, [domains]);

  // 获取当前选中节点相关的论文
  const currentDomainIds = useMemo(() => {
    if (!selectedNode) return undefined;
    
    const nodeId = parseInt(selectedNode.id);
    
    // 如果选中的是direction（第二层），需要包含它下面所有technology的id
    if (selectedNode.type === 'route' && selectedNode.parentId) {
      // 检查parent是否是category（即当前节点是direction）
      const parent = domains.find(d => d.id === selectedNode.parentId);
      if (parent && parent.type === 'category') {
        // 这是direction节点，获取它下面所有technology的id
        const technologies = routes.filter(r => r.parentId === selectedNode.id);
        const techIds = technologies.map(t => parseInt(t.id));
        
        console.log('📌 Selected direction:', {
          name: selectedNode.name,
          id: nodeId,
          technologiesCount: techIds.length,
          techIds,
          allIds: [nodeId, ...techIds]
        });
        
        // 返回direction自己的id + 所有technology的id
        return [nodeId, ...techIds];
      }
    }
    
    // 否则就是technology节点或category节点，只用自己的id
    console.log('📌 Selected node:', {
      name: selectedNode.name,
      id: nodeId,
      type: selectedNode.type
    });
    
    return [nodeId];
  }, [selectedNode, domains, routes]);

  const { papers, loading: papersLoading, total: papersTotal } = useDomainPapers(currentDomainIds);
  
  // 调试论文数据
  console.log('📄 Papers for domain:', {
    domainIds: currentDomainIds,
    papersCount: papers.length,
    samplePapers: papers.slice(0, 2).map(p => ({
      title: p.title.substring(0, 50),
      domain_ids: p.metadata?.domain_ids
    }))
  });

  // 根据选中年份过滤论文
  const filteredPapers = useMemo(() => {
    if (selectedYear === 'all') return papers;
    return papers.filter(paper => {
      const paperDate = paper.metadata?.publish_date || paper.timestamp;
      return paperDate.startsWith(selectedYear);
    });
  }, [papers, selectedYear]);

  // 获取direction层（第二层）
  const getDirections = (categoryId: string) => {
    return routes.filter(r => r.parentId === categoryId);
  };

  // 获取technology层（第三层）
  const getTechnologies = (directionId: string) => {
    return routes.filter(r => r.parentId === directionId);
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const toggleDirection = (directionId: string) => {
    setExpandedDirections((prev) =>
      prev.includes(directionId)
        ? prev.filter((id) => id !== directionId)
        : [...prev, directionId]
    );
  };

  const handlePaperClick = async (paperId: string) => {
    // 优先从已加载的 papers 列表中查找（避免重复请求）
    const cached = papers.find(p => p.id === paperId);
    if (cached && (cached as any).metadata) {
      setSelectedPaper(cached as any);
      return;
    }
    // Fallback: 向后端请求单篇详情
    try {
      const detail = await signalApi.getSignalById(paperId);
      setSelectedPaper(detail);
    } catch (error) {
      console.error('Failed to fetch paper detail:', error);
    }
  };

  // 自动选中第一个technology节点
  useEffect(() => {
    if (!selectedNode && routes.length > 0) {
      // 找到第一个有parentId且其parent也有parentId的节点（即technology层）
      const firstTech = routes.find(r => {
        const parent = routes.find(p => p.id === r.parentId);
        return parent && parent.parentId; // parent是direction，有parentId指向domain
      });
      const nodeToSelect = firstTech || routes[0];
      
      if (nodeToSelect) {
        console.log('🎯 Auto-selecting first node:', nodeToSelect.name);
        setSelectedNode(nodeToSelect);
        
        // 自动展开相关的category和direction
        const parent = routes.find(p => p.id === nodeToSelect.parentId);
        if (parent) {
          if (!expandedDirections.includes(parent.id)) {
            setExpandedDirections(prev => [...prev, parent.id]);
          }
          if (parent.parentId) {
            const parentId = parent.parentId as string;
            if (!expandedCategories.includes(parentId)) {
              setExpandedCategories(prev => [...prev, parentId]);
            }
          }
        }
      }
    }
  }, [routes.length, selectedNode, expandedDirections, expandedCategories]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-2 border-blue-500/30 border-t-blue-400 rounded-full animate-spin mb-4"></div>
          <p className="text-slate-400">加载知识地图...</p>
        </div>
      </div>
    );
  }

  const currentNode = selectedNode;

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="font-display text-4xl text-shimmer tracking-widest mb-2">QUANTUM TECH MAP</h1>
        <p className="text-slate-400 text-sm">
          量子科技知识地图 · {routes.length} 条技术路线 · {categories.length} 个技术板块
        </p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Tree View */}
        <div className="col-span-5 glass-card rounded-xl p-6 h-[calc(100vh-16rem)] overflow-y-auto">
          <h2 className="font-display text-2xl text-blue-400 mb-6 sticky top-0 bg-[rgba(5,5,14,0.95)] pb-2">
            技术板块
          </h2>

          <div className="space-y-3">
            {categories.map((category) => {
              const directions = getDirections(category.id);
              const isCategoryExpanded = expandedCategories.includes(category.id);
              
              return (
                <div key={category.id} className="bg-[rgba(59,130,246,0.04)] rounded-lg border border-[rgba(59,130,246,0.08)] overflow-hidden">
                  {/* Category层 */}
                  <div
                    onClick={() => toggleCategory(category.id)}
                    className="p-4 cursor-pointer hover:bg-slate-800 transition-all flex items-center justify-between group"
                  >
                    <span className="flex items-center gap-3">
                      <div className={`transition-transform duration-200 ${isCategoryExpanded ? 'rotate-90' : ''}`}>
                        <ChevronRight className="w-5 h-5 text-blue-400" />
                      </div>
                      <span className="font-bold text-lg group-hover:text-blue-300 transition-colors">
                        {category.name}
                      </span>
                    </span>
                    <span className="px-3 py-1 bg-[rgba(59,130,246,0.06)] text-slate-400 text-xs font-semibold rounded-full group-hover:bg-blue-500/15 group-hover:text-blue-300 transition-all">
                      {directions.length} 个方向
                    </span>
                  </div>
                  
                  {/* Direction层 */}
                  {isCategoryExpanded && (
                    <div className="px-4 pb-3 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                      {directions.map((direction) => {
                        const technologies = getTechnologies(direction.id);
                        const isDirectionExpanded = expandedDirections.includes(direction.id);
                        
                        return (
                          <div key={direction.id} className="bg-[rgba(5,5,14,0.5)] rounded-lg overflow-hidden">
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleDirection(direction.id);
                              }}
                              className="p-3 cursor-pointer hover:bg-slate-800/80 transition-all flex items-center justify-between group"
                            >
                              <span className="flex items-center gap-2">
                                <div className={`transition-transform duration-200 ${isDirectionExpanded ? 'rotate-90' : ''}`}>
                                  <ChevronRight className="w-4 h-4 text-blue-300" />
                                </div>
                                <span className="font-semibold text-sm group-hover:text-blue-300 transition-colors">
                                  {direction.name}
                                </span>
                              </span>
                              <span className="px-2 py-0.5 bg-[rgba(59,130,246,0.06)] text-slate-500 text-xs rounded-full group-hover:bg-blue-500/15 group-hover:text-blue-300 transition-all">
                                {technologies.length} 项
                              </span>
                            </div>
                            
                            {/* Technology层 */}
                            {isDirectionExpanded && (
                              <div className="px-3 pb-2 space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                                {technologies.map((tech) => (
                                  <div
                                    key={tech.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedNode(tech);
                                    }}
                                    className={`group relative overflow-hidden rounded-lg transition-all duration-200 ${
                                      currentNode?.id === tech.id
                                        ? 'bg-gradient-to-r from-blue-600/20 to-purple-600/20 shadow-lg shadow-blue-600/10'
                                        : 'bg-[rgba(59,130,246,0.03)] hover:bg-[rgba(59,130,246,0.08)]'
                                    }`}
                                  >
                                    {/* 选中指示器 */}
                                    {currentNode?.id === tech.id && (
                                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-purple-500"></div>
                                    )}
                                    
                                    <div className="p-3 pl-4">
                                      <div className="flex items-center justify-between mb-1.5">
                                        <span className={`font-semibold text-sm transition-colors ${
                                          currentNode?.id === tech.id 
                                            ? 'text-blue-300' 
                                            : 'text-slate-200 group-hover:text-blue-300'
                                        }`}>
                                          {tech.name}
                                        </span>
                                        <span className="text-xs flex items-center gap-1">
                                          {trendIcons[tech.trend]}
                                        </span>
                                      </div>
                                      <div className="flex items-center justify-between text-xs">
                                        <span className={`transition-colors ${
                                          currentNode?.id === tech.id 
                                            ? 'text-blue-400/80' 
                                            : 'text-slate-500 group-hover:text-slate-400'
                                        }`}>
                                          {tech.stage}
                                        </span>
                                        <span className={`transition-colors ${
                                          currentNode?.id === tech.id 
                                            ? 'text-blue-400/80' 
                                            : 'text-slate-500 group-hover:text-slate-400'
                                        }`}>
                                          {tech.paperCount} 篇论文
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Detail Panel */}
        <div className="col-span-7 glass-card rounded-xl p-6 h-[calc(100vh-16rem)] overflow-y-auto">
          {currentNode ? (
            <>
              <div className="mb-6 pb-6 border-b border-slate-800/50">
                <div className="flex items-start justify-between mb-4">
                  <h2 className="font-display text-3xl text-blue-300">{currentNode.name}</h2>
                  <span className="px-4 py-2 bg-gradient-to-r from-red-600/20 to-cyan-600/20 text-red-500 text-sm font-bold rounded-lg border border-red-600/30 flex items-center gap-2 shadow-lg shadow-red-600/10">
                    {trendIcons[currentNode.trend]}
                    {trendLabels[currentNode.trend]}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    {currentNode.paperCount} 篇论文
                    {papersTotal > 0 && papersTotal !== currentNode.paperCount && (
                      <span className="text-xs text-blue-300">
                        (API返回 {papersTotal} 篇)
                      </span>
                    )}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                    {currentNode.companyCount} 家公司
                  </span>
                  <span className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-green-600"></div>
                    {currentNode.signalCount} 条信号
                  </span>
                </div>
              </div>

              <div className="space-y-6">
                {/* Description */}
                <div className="bg-gradient-to-br from-slate-800/50 to-slate-800/30 rounded-xl p-5 border border-slate-700/50">
                  <h3 className="font-semibold text-base mb-3 text-blue-400 flex items-center gap-2">
                    <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
                    技术简介
                  </h3>
                  <p className="text-slate-300 leading-relaxed text-sm">{currentNode.description}</p>
                </div>

                {/* Maturity */}
                <div className="bg-gradient-to-br from-slate-800/50 to-slate-800/30 rounded-xl p-5 border border-slate-700/50">
                  <h3 className="font-semibold text-base mb-4 text-blue-400 flex items-center gap-2">
                    <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
                    技术成熟度
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 h-4 bg-slate-900 rounded-full overflow-hidden shadow-inner">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-600 via-blue-400 to-indigo-500 transition-all duration-500 shadow-lg"
                          style={{ width: `${stageProgress[currentNode.stage as keyof typeof stageProgress] || 50}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-blue-300 min-w-[120px] px-3 py-1 bg-[rgba(59,130,246,0.1)] rounded-lg border border-[rgba(59,130,246,0.2)]">
                        {currentNode.stage}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500 px-1">
                      <span>理论研究</span>
                      <span>实验室</span>
                      <span>工程化</span>
                      <span>商业化</span>
                    </div>
                  </div>
                </div>

                {/* Academic Progress Timeline */}
                <div className="bg-gradient-to-br from-slate-800/50 to-slate-800/30 rounded-xl p-5 border border-slate-700/50">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="font-semibold text-base text-blue-400 flex items-center gap-2">
                      <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
                      学术进展时间线
                      {papersLoading && <span className="text-xs text-slate-500">(加载中...)</span>}
                      {!papersLoading && papersTotal > 0 && (
                        <span className="text-xs text-slate-400">
                          (共 {papersTotal} 篇{papers.length < papersTotal ? `，显示前 ${papers.length} 篇` : ''}{selectedYear !== 'all' ? `，筛选后 ${filteredPapers.length} 篇` : ''})
                        </span>
                      )}
                    </h3>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      className="bg-[rgba(5,5,14,0.9)] border border-[rgba(59,130,246,0.08)] rounded-lg px-3 py-2 text-sm font-medium cursor-pointer hover:border-blue-400 transition-colors focus:outline-none focus:border-blue-400"
                    >
                      <option value="all">全部年份</option>
                      <option value="2026">2026年</option>
                      <option value="2025">2025年</option>
                      <option value="2024">2024年</option>
                    </select>
                  </div>

                  {filteredPapers.length > 0 ? (
                    <>
                      <div className="space-y-3 mb-5">
                        {filteredPapers.map((paper, index) => {
                          const publishDate = paper.metadata?.publish_date || paper.timestamp;
                          const authors = paper.metadata?.authors || [];
                          const firstAuthor = authors[0];
                          const researchProblem = paper.metadata?.research_problem?.summary;
                          const keyContributions = paper.metadata?.key_contributions || [];
                          
                          const techRoute = (paper as any).metadata?.tech_route?.summary;
                          const abstract = (paper as any).metadata?.abstract as string | undefined;
                          const domainNames = ((paper as any).metadata?.domains as Array<{name:string;level:string}>|undefined)?.filter(d => d.level === 'technology').slice(0, 3);

                          return (
                            <div
                              key={paper.id}
                              onClick={() => handlePaperClick(paper.id)}
                              className="relative pl-5 animate-in fade-in slide-in-from-left-4"
                              style={{ animationDelay: `${index * 50}ms` }}
                            >
                              {/* Timeline connector */}
                              {index < filteredPapers.length - 1 && (
                                <div className="absolute left-[5px] top-5 bottom-0 w-px bg-gradient-to-b from-blue-500/40 via-blue-500/20 to-transparent"></div>
                              )}
                              {/* Timeline dot */}
                              <div className="absolute left-0 top-1.5 w-3 h-3 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 shadow-md shadow-blue-500/40 ring-2 ring-[rgba(5,5,14,1)] transition-all"></div>
                              
                              <div className="bg-[rgba(10,10,28,0.8)] rounded-lg p-4 hover:bg-[rgba(20,20,50,0.7)] transition-all cursor-pointer group border border-[rgba(59,130,246,0.08)] hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/5">
                                
                                {/* Title + meta row */}
                                <div className="mb-2.5">
                                  <h4 className="font-semibold text-sm leading-snug group-hover:text-blue-300 transition-colors mb-1.5 line-clamp-2">
                                    {paper.title}
                                  </h4>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[11px] text-slate-500 flex items-center gap-1">
                                      <Calendar className="w-3 h-3" />{publishDate}
                                    </span>
                                    {paper.metadata?.influence_score && (
                                      <span className="px-1.5 py-0.5 bg-[rgba(59,130,246,0.12)] text-blue-300 text-[11px] font-semibold rounded border border-[rgba(59,130,246,0.2)] flex items-center gap-1">
                                        <Sparkles className="w-3 h-3" />{paper.metadata.influence_score}
                                      </span>
                                    )}
                                    {/* domain tags */}
                                    {domainNames && domainNames.map((d, i) => (
                                      <span key={i} className="px-1.5 py-0.5 bg-[rgba(100,116,139,0.12)] text-slate-400 text-[10px] rounded border border-[rgba(100,116,139,0.15)]">{d.name}</span>
                                    ))}
                                  </div>
                                </div>

                                {/* Authors */}
                                {authors.length > 0 && (
                                  <div className="flex items-start gap-2 mb-2.5 text-xs">
                                    <Users className="w-3 h-3 text-blue-400/60 mt-0.5 flex-shrink-0" />
                                    <span className="text-slate-300 leading-snug">
                                      {authors.slice(0, 2).map((a: any) => a.name).join('、')}
                                      {authors.length > 2 && <span className="text-slate-500"> 等{authors.length}人</span>}
                                      {firstAuthor?.affiliation && <span className="text-slate-500 ml-1">· {firstAuthor.affiliation}</span>}
                                    </span>
                                  </div>
                                )}

                                {/* Research Problem OR Abstract */}
                                {researchProblem ? (
                                  <div className="bg-[rgba(59,130,246,0.07)] border border-[rgba(59,130,246,0.14)] rounded-md px-3 py-2 mb-2.5">
                                    <div className="text-[10px] text-blue-400 font-semibold uppercase tracking-wide mb-1">研究问题</div>
                                    <div className="text-xs text-slate-300 leading-relaxed line-clamp-2">{researchProblem}</div>
                                  </div>
                                ) : abstract ? (
                                  <div className="bg-[rgba(100,116,139,0.07)] border border-[rgba(100,116,139,0.12)] rounded-md px-3 py-2 mb-2.5">
                                    <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-1">摘要</div>
                                    <div className="text-xs text-slate-300 leading-relaxed line-clamp-2">{abstract}</div>
                                  </div>
                                ) : null}

                                {/* Tech Route */}
                                {techRoute && (
                                  <div className="flex items-start gap-1.5 mb-2.5 text-xs">
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[rgba(16,185,129,0.1)] text-emerald-400 border border-[rgba(16,185,129,0.18)] font-semibold flex-shrink-0 uppercase tracking-wide">路线</span>
                                    <span className="text-slate-400 leading-snug line-clamp-1">{techRoute}</span>
                                  </div>
                                )}

                                {/* Key Contributions */}
                                {keyContributions.length > 0 && (
                                  <div className="mb-2.5">
                                    <div className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wide mb-1.5">关键贡献</div>
                                    <div className="space-y-1">
                                      {keyContributions.slice(0, 2).map((contrib: any, idx: number) => (
                                        <div key={idx} className="flex items-start gap-1.5 text-xs">
                                          <span className="text-emerald-500/70 mt-0.5 flex-shrink-0">▸</span>
                                          <span className="text-slate-300 leading-relaxed line-clamp-1 flex-1">{contrib.summary || contrib.detail}</span>
                                        </div>
                                      ))}
                                      {keyContributions.length > 2 && (
                                        <div className="text-[11px] text-slate-500 ml-4">+ {keyContributions.length - 2} 项</div>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Footer */}
                                <div className="flex items-center justify-between pt-2 border-t border-slate-800/40">
                                  <div className="text-[11px] text-slate-500">
                                    {paper.metadata?.domain_ids?.length ? `${paper.metadata.domain_ids.length} 个相关领域` : ''}
                                  </div>
                                  <div className="flex items-center gap-1 text-xs text-blue-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span>查看详情</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Statistics */}
                      <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-800/50">
                        <div className="bg-[rgba(10,10,24,0.5)] rounded-lg p-3 text-center">
                          <div className="text-2xl font-bold text-blue-400 mb-1">{filteredPapers.length}</div>
                          <div className="text-xs text-slate-400">相关论文</div>
                        </div>
                        <div className="bg-[rgba(10,10,24,0.5)] rounded-lg p-3 text-center">
                          <div className="text-2xl font-bold text-blue-400 mb-1">
                            {new Set(filteredPapers.flatMap(p => p.metadata?.authors?.map((a: any) => a.name) || [])).size}
                          </div>
                          <div className="text-xs text-slate-400">核心作者</div>
                        </div>
                        <div className="bg-[rgba(10,10,24,0.5)] rounded-lg p-3 text-center">
                          <div className="text-2xl font-bold text-blue-400 mb-1">
                            {new Set(filteredPapers.map(p => p.metadata?.authors?.[0]?.affiliation).filter(Boolean)).size}
                          </div>
                          <div className="text-xs text-slate-400">研究机构</div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-12 text-slate-500">
                      <div className="text-5xl mb-3">📄</div>
                      <p className="text-sm">
                        {papersLoading ? '加载论文数据中...' : selectedYear === 'all' ? '暂无相关论文' : `${selectedYear}年暂无论文数据`}
                      </p>
                    </div>
                  )}
                </div>

                {/* Key Problems */}
                <div>
                  <h3 className="font-semibold text-lg mb-3 text-blue-400">关键问题</h3>
                  <div className="space-y-2">
                    <div className="bg-[rgba(59,130,246,0.05)] rounded-lg p-3 text-sm border border-[rgba(59,130,246,0.08)] hover:bg-[rgba(59,130,246,0.08)] transition-colors">
                      <span className="text-blue-400 font-semibold">•</span> 量子比特相干时间提升
                    </div>
                    <div className="bg-[rgba(59,130,246,0.05)] rounded-lg p-3 text-sm border border-[rgba(59,130,246,0.08)] hover:bg-[rgba(59,130,246,0.08)] transition-colors">
                      <span className="text-blue-400 font-semibold">•</span> 量子纠错码实现
                    </div>
                    <div className="bg-[rgba(59,130,246,0.05)] rounded-lg p-3 text-sm border border-[rgba(59,130,246,0.08)] hover:bg-[rgba(59,130,246,0.08)] transition-colors">
                      <span className="text-blue-400 font-semibold">•</span> 大规模量子芯片集成
                    </div>
                  </div>
                </div>

                {/* Related Companies */}
                <div>
                  <h3 className="font-semibold text-lg mb-3 text-blue-400">
                    关联公司 ({currentNode.companyCount})
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[rgba(59,130,246,0.05)] rounded-lg p-3 border border-[rgba(59,130,246,0.08)] hover:border-blue-400/40 transition-all cursor-pointer group">
                      <div className="font-semibold text-sm mb-1 group-hover:text-blue-300 transition-colors">
                        本源量子
                      </div>
                      <div className="text-xs text-slate-400">合肥 · C轮</div>
                    </div>
                    <div className="bg-[rgba(59,130,246,0.05)] rounded-lg p-3 border border-[rgba(59,130,246,0.08)] hover:border-blue-400/40 transition-all cursor-pointer group">
                      <div className="font-semibold text-sm mb-1 group-hover:text-blue-300 transition-colors">
                        国盾量子
                      </div>
                      <div className="text-xs text-slate-400">合肥 · 上市</div>
                    </div>
                    <div className="bg-[rgba(59,130,246,0.05)] rounded-lg p-3 border border-[rgba(59,130,246,0.08)] hover:border-blue-400/40 transition-all cursor-pointer group">
                      <div className="font-semibold text-sm mb-1 group-hover:text-blue-300 transition-colors">
                        启科量子
                      </div>
                      <div className="text-xs text-slate-400">北京 · A轮</div>
                    </div>
                  </div>
                </div>

                {/* Related Signals */}
                <div>
                  <h3 className="font-semibold text-lg mb-3 text-blue-400">
                    关联信号 ({currentNode.signalCount})
                  </h3>
                  <div className="space-y-2">
                    <div className="bg-[rgba(59,130,246,0.05)] rounded-lg p-3 border border-[rgba(59,130,246,0.08)] hover:bg-[rgba(59,130,246,0.08)] transition-colors cursor-pointer group">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold group-hover:text-blue-300 transition-colors">
                          本源量子完成C轮融资
                        </span>
                        <span className="text-xs text-slate-500">2026-02-01</span>
                      </div>
                      <div className="text-xs text-slate-400">融资 · 高优先级</div>
                    </div>
                    <div className="bg-[rgba(59,130,246,0.05)] rounded-lg p-3 border border-[rgba(59,130,246,0.08)] hover:bg-[rgba(59,130,246,0.08)] transition-colors cursor-pointer group">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold group-hover:text-blue-300 transition-colors">
                          Nature：新型拓扑量子纠错码突破
                        </span>
                        <span className="text-xs text-slate-500">2026-01-29</span>
                      </div>
                      <div className="text-xs text-slate-400">论文 · 高优先级</div>
                    </div>
                  </div>
                  <button className="w-full mt-3 py-2 glass-card rounded-lg text-sm font-semibold transition-colors hover:text-blue-300 hover:border-blue-500/40">
                    查看全部 {currentNode.signalCount} 条信号 →
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500">
              <div className="text-center">
                <div className="text-6xl mb-4">🗺️</div>
                <p>请从左侧选择一个技术路线</p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Paper Detail Modal */}
      {selectedPaper && (
        <SignalDetailModal
          signal={selectedPaper}
          onClose={() => setSelectedPaper(null)}
        />
      )}
    </div>
  );
}
