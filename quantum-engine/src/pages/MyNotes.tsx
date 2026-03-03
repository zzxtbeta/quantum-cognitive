import { FileText, Plus, Search, Calendar, Tag, GripVertical } from 'lucide-react';
import { useState } from 'react';
import { useAppContext, Note } from '../contexts/AppContext';
import { useLayout } from '../contexts/LayoutContext';
import NoteDetailModal from '../components/NoteDetailModal';

export default function MyNotes() {
  const { notes, removeNote } = useAppContext();
  const { setDraggedItem, isChatOpen } = useLayout();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6 animate-fade-up">
        <h1 className="font-display text-4xl text-shimmer tracking-widest mb-1">MY NOTES</h1>
        <p className="text-[#8892aa] text-sm">
          我的投研笔记 · <span className="text-blue-400 font-medium">{notes.length}</span> 篇笔记
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 mb-5">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8892aa] pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索笔记标题、内容或标签..."
            className="w-full bg-[rgba(16,16,31,0.6)] border border-[rgba(59,130,246,0.15)] rounded-lg pl-10 pr-4 py-2.5 text-sm text-[#e0e8ff] placeholder:text-[#8892aa] focus:outline-none focus:border-blue-500/50 focus:shadow-glow-sm transition-all"
          />
        </div>
        <button className="btn-glow flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold text-sm transition-all shadow-glow-sm whitespace-nowrap border border-blue-500">
          <Plus className="w-4 h-4" />
          新建笔记
        </button>
      </div>

      {/* Notes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredNotes.map((note, index) => {
          const handleDragStart = (e: React.DragEvent) => {
            setDraggedItem({
              type: 'note',
              id: note.id,
              title: note.title,
              summary: note.content.substring(0, 100),
            });
            e.dataTransfer.effectAllowed = 'copy';
          };

          const handleDragEnd = () => {
            setDraggedItem(null);
          };

          return (
            <div
              key={note.id}
              draggable={isChatOpen}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onClick={() => setSelectedNote(note)}
              className={`glass-card rounded-xl p-5 cursor-pointer group animate-fade-up relative ${
                isChatOpen ? 'cursor-grab active:cursor-grabbing' : ''
              }`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {isChatOpen && (
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <GripVertical className="w-4 h-4 text-[#8892aa]" />
                </div>
              )}
            {/* Header */}
            <div className="flex items-start gap-3 mb-3">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center flex-shrink-0 text-white">
                <FileText className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm mb-0.5 group-hover:text-blue-300 transition-colors line-clamp-2 text-[#e0e8ff]">
                  {note.title}
                </h3>
                <div className="flex items-center gap-1.5 text-[11px] text-[#8892aa]">
                  <Calendar className="w-3 h-3" />
                  {note.updatedAt}
                </div>
              </div>
            </div>

            {/* Content Preview */}
            <p className="text-sm text-[#8892aa] mb-3 line-clamp-3 leading-relaxed">
              {note.content}
            </p>

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {note.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 bg-[rgba(59,130,246,0.06)] text-[#8892aa] text-[11px] border border-[rgba(59,130,246,0.12)] rounded-full flex items-center gap-1"
                >
                  <Tag className="w-2.5 h-2.5" />
                  {tag}
                </span>
              ))}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-[rgba(59,130,246,0.1)] flex items-center justify-between text-[11px]">
              <span className="text-[#8892aa]">{note.relatedSignals} 条关联信号</span>
              <span className="text-blue-400 group-hover:text-blue-300 font-semibold transition-colors">
                查看详情 →
              </span>
            </div>
          </div>
          );
        })}
      </div>

      {/* Note Detail Modal */}
      {selectedNote && (
        <NoteDetailModal
          note={selectedNote}
          onClose={() => setSelectedNote(null)}
          onEdit={() => {
            setSelectedNote(null);
            alert('编辑功能开发中，敬请期待');
          }}
          onDelete={(noteId) => {
            removeNote(noteId);
          }}
        />
      )}

      {filteredNotes.length === 0 && (
        <div className="glass-card rounded-xl p-12 text-center">
          <div className="text-5xl mb-4 opacity-40">📝</div>
          <p className="text-[#c8d4f0] text-base mb-2 font-medium">
            {searchQuery ? '没有找到匹配的笔记' : '还没有创建任何笔记'}
          </p>
          <p className="text-[#8892aa] text-sm mb-6">
            {searchQuery ? '尝试使用其他关键词搜索' : '开始记录你的投研思考和分析'}
          </p>
          {!searchQuery && (
            <button className="btn-glow px-6 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-md font-semibold transition-all shadow-glow-sm text-sm">
              创建第一篇笔记
            </button>
          )}
        </div>
      )}
    </div>
  );
}
