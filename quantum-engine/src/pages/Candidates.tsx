import { useCandidates } from '../hooks/useCandidates';

export default function Candidates() {
  const { loading } = useCandidates();

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6 animate-fade-up">
        <h1 className="font-display text-4xl text-shimmer tracking-widest mb-1">CANDIDATES</h1>
        <p className="text-[#8892aa] text-sm">AI 推荐的潜在投资标的</p>
      </div>

      {/* Content */}
      {loading ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <div className="inline-block w-8 h-8 border-2 border-blue-500/30 border-t-blue-400 rounded-full animate-spin"></div>
          <p className="text-[#8892aa] mt-4 text-sm">加载中...</p>
        </div>
      ) : (
        <div className="glass-card rounded-xl p-16 text-center">
          <div className="text-6xl mb-6 opacity-25">🎯</div>
          <p className="text-[#c8d4f0] text-base mb-2 font-medium">候选标的分析功能开发中</p>
          <p className="text-[#8892aa] text-sm mb-1">
            将基于实时信号、论文数据和人才动向，由 AI 自动识别投资标的
          </p>
          <p className="text-[#8892aa] text-sm">敬请期待</p>
        </div>
      )}
    </div>
  );
}
