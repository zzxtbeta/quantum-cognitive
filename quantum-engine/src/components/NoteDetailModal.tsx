import { X, Calendar, Tag, Edit, Trash2, ExternalLink } from 'lucide-react';
import { Note } from '../contexts/AppContext';

interface NoteDetailModalProps {
  note: Note;
  onClose: () => void;
  onEdit?: (note: Note) => void;
  onDelete?: (noteId: string) => void;
}

export default function NoteDetailModal({ note, onClose, onEdit, onDelete }: NoteDetailModalProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="glass-card rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-[rgba(5,5,14,0.95)] backdrop-blur-lg border-b border-[rgba(59,130,246,0.12)] p-6 flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <span className="px-2 py-1 bg-[rgba(59,130,246,0.1)] text-blue-400 text-xs font-bold rounded border border-[rgba(59,130,246,0.2)]">
                笔记
              </span>
              <span className="flex items-center gap-1 text-slate-500 text-xs">
                <Calendar className="w-3 h-3" />
                创建于 {note.createdAt}
              </span>
              {note.updatedAt !== note.createdAt && (
                <span className="text-slate-500 text-xs">
                  · 更新于 {note.updatedAt}
                </span>
              )}
            </div>
            <h2 className="text-2xl font-bold">{note.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-2 hover:bg-[rgba(59,130,246,0.1)] rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Tags */}
          {note.tags.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm text-slate-400 mb-3 flex items-center gap-2">
                <Tag className="w-4 h-4" />
                标签
              </h3>
              <div className="flex flex-wrap gap-2">
                {note.tags.filter(tag => tag).map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 bg-[rgba(59,130,246,0.06)] text-slate-300 text-sm rounded-lg border border-[rgba(59,130,246,0.1)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Note Content */}
          <div>
            <h3 className="font-semibold text-lg mb-3">笔记内容</h3>
            <div className="bg-[rgba(59,130,246,0.04)] rounded-lg p-6 border border-[rgba(59,130,246,0.08)]">
              <div className="prose prose-invert max-w-none">
                {note.content.split('\n').map((paragraph, idx) => (
                  <p key={idx} className="text-slate-300 leading-relaxed mb-3 last:mb-0">
                    {paragraph || '\u00A0'}
                  </p>
                ))}
              </div>
            </div>
          </div>

          {/* Related Signals */}
          {note.relatedSignals > 0 && (
            <div>
              <h3 className="font-semibold text-lg mb-3">关联信号</h3>
              <div className="bg-[rgba(59,130,246,0.05)] rounded-lg p-4 border border-[rgba(59,130,246,0.08)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <ExternalLink className="w-4 h-4" />
                    <span>共 {note.relatedSignals} 条关联信号</span>
                  </div>
                  <button className="text-blue-400 hover:text-blue-300 text-sm font-semibold transition-colors">
                    查看关联信号 →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="bg-[rgba(10,10,24,0.4)] rounded-lg p-4 border border-[rgba(59,130,246,0.08)]">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-500">创建时间</span>
                <p className="text-slate-200 mt-1">{note.createdAt}</p>
              </div>
              <div>
                <span className="text-slate-500">最后更新</span>
                <p className="text-slate-200 mt-1">{note.updatedAt}</p>
              </div>
              <div>
                <span className="text-slate-500">笔记ID</span>
                <p className="text-slate-200 mt-1 font-mono text-xs">{note.id}</p>
              </div>
              <div>
                <span className="text-slate-500">关联信号数</span>
                <p className="text-slate-200 mt-1">{note.relatedSignals} 条</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-[rgba(59,130,246,0.12)]">
            <button
              onClick={() => onEdit && onEdit(note)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 hover:bg-blue-600 rounded-lg font-semibold transition-colors"
            >
              <Edit className="w-4 h-4" />
              编辑笔记
            </button>
            <button
              onClick={() => {
                if (onDelete && confirm('确定要删除这篇笔记吗？')) {
                  onDelete(note.id);
                  onClose();
                }
              }}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-red-600/20 hover:text-red-500 hover:border-red-600/50 rounded font-semibold transition-all border border-slate-700"
            >
              <Trash2 className="w-4 h-4" />
              删除笔记
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
