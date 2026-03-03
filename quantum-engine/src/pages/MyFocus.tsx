import { Star, Building2, User, Lightbulb, Plus, Bell, TrendingUp, GripVertical } from 'lucide-react';
import { useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { useLayout } from '../contexts/LayoutContext';

export default function MyFocus() {
  const { focusItems } = useAppContext();
  const { setDraggedItem, isChatOpen } = useLayout();
  const [activeTab, setActiveTab] = useState<'all' | 'company' | 'person' | 'technology'>('all');

  const filteredItems = activeTab === 'all' 
    ? focusItems 
    : focusItems.filter(item => item.type === activeTab);

  const getIcon = (type: string) => {
    switch (type) {
      case 'company':
        return <Building2 className="w-5 h-5" />;
      case 'person':
        return <User className="w-5 h-5" />;
      case 'technology':
        return <Lightbulb className="w-5 h-5" />;
      default:
        return <Star className="w-5 h-5" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'company':
        return '公司';
      case 'person':
        return '人物';
      case 'technology':
        return '技术';
      default:
        return '';
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6 animate-fade-up">
        <h1 className="font-display text-4xl text-shimmer tracking-widest mb-1">MY FOCUS</h1>
        <p className="text-[#8892aa] text-sm">
          我的关注列表 · <span className="text-blue-400 font-medium">{focusItems.length}</span> 个关注对象
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex gap-1.5">
          {([
            { key: 'all', label: `全部 (${focusItems.length})` },
            { key: 'company', label: `公司 (${focusItems.filter(i => i.type === 'company').length})` },
            { key: 'person', label: `人物 (${focusItems.filter(i => i.type === 'person').length})` },
            { key: 'technology', label: `技术 (${focusItems.filter(i => i.type === 'technology').length})` },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`btn-glow px-3.5 py-1.5 rounded-md font-medium text-sm transition-all ${
                activeTab === tab.key
                  ? 'bg-blue-600 text-white shadow-glow-sm border border-blue-500'
                  : 'bg-[rgba(59,130,246,0.06)] border border-[rgba(59,130,246,0.15)] text-[#8892aa] hover:text-[#c8d4f0] hover:border-blue-500/30'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button className="btn-glow flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-md font-semibold text-sm transition-all shadow-glow-sm border border-blue-500">
          <Plus className="w-4 h-4" />
          添加关注
        </button>
      </div>

      {/* Focus Items */}
      <div className="space-y-4">
        {filteredItems.map((item, index) => {
          const handleDragStart = (e: React.DragEvent) => {
            setDraggedItem({
              type: item.type === 'company' ? 'candidate' : 'note',
              id: item.id,
              title: item.name,
              summary: item.description,
            });
            e.dataTransfer.effectAllowed = 'copy';
          };

          const handleDragEnd = () => {
            setDraggedItem(null);
          };

          return (
            <div
              key={item.id}
              draggable={isChatOpen}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              className={`glass-card rounded-xl p-5 animate-fade-up relative group ${
                isChatOpen ? 'cursor-grab active:cursor-grabbing' : ''
              }`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {isChatOpen && (
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <GripVertical className="w-4 h-4 text-[#8892aa]" />
                </div>
              )}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center flex-shrink-0 text-white">
                  {getIcon(item.type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-base text-[#e0e8ff]">{item.name}</h3>
                    <span className="px-2 py-0.5 bg-[rgba(59,130,246,0.08)] text-[#8892aa] text-[10px] border border-[rgba(59,130,246,0.15)] rounded-full">
                      {getTypeLabel(item.type)}
                    </span>
                  </div>
                  <p className="text-sm text-[#8892aa] mb-2 leading-relaxed">{item.description}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {item.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 bg-[rgba(59,130,246,0.06)] text-[#8892aa] text-[11px] border border-[rgba(59,130,246,0.12)] rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <button className="text-blue-400 hover:text-blue-300 transition-colors p-1">
                <Star className="w-4 h-4 fill-current" />
              </button>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[rgba(59,130,246,0.1)]">
              <div className="flex items-center gap-3 text-[11px] text-[#8892aa]">
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  {item.signalCount} 条新信号
                </span>
                <span>最后更新：{item.lastUpdate}</span>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1.5 bg-[rgba(59,130,246,0.08)] border border-[rgba(59,130,246,0.15)] hover:border-blue-500/30 text-blue-500 text-[11px] font-semibold rounded-md transition-all flex items-center gap-1">
                  <Bell className="w-3 h-3" />
                  提醒设置
                </button>
                <button className="btn-glow px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold rounded-md transition-all shadow-glow-sm">
                  查看详情
                </button>
              </div>
            </div>
          </div>
          );
        })}
      </div>

      {filteredItems.length === 0 && (
        <div className="glass-card rounded-xl p-12 text-center">
          <div className="text-5xl mb-4 opacity-40">⭐</div>
          <p className="text-[#c8d4f0] text-base mb-2 font-medium">还没有关注任何对象</p>
          <p className="text-[#8892aa] text-sm mb-6">从信号流、知识地图或候选标的中添加关注</p>
          <button className="btn-glow px-6 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-md font-semibold transition-all shadow-glow-sm text-sm">
            开始添加关注
          </button>
        </div>
      )}
    </div>
  );
}
