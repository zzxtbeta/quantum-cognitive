interface ResearchTagCloudProps {
  tags: string[];
  maxTags?: number;
  size?: 'sm' | 'md';
  clickable?: boolean;
  onTagClick?: (tag: string) => void;
}

const sizeClasses = {
  sm: 'text-xs px-1.5 py-0.5',
  md: 'text-xs px-2 py-1',
};

export default function ResearchTagCloud({
  tags,
  maxTags = 5,
  size = 'sm',
  clickable = false,
  onTagClick,
}: ResearchTagCloudProps) {
  const displayTags = tags.slice(0, maxTags);
  const remainingCount = tags.length - maxTags;

  return (
    <div className="flex flex-wrap gap-1.5">
      {displayTags.map((tag) => (
        <span
          key={tag}
          onClick={() => clickable && onTagClick?.(tag)}
          className={`
            ${sizeClasses[size]}
            bg-[rgba(59,130,246,0.06)] text-slate-300
            border border-[rgba(59,130,246,0.12)]
            rounded
            ${clickable ? 'cursor-pointer hover:bg-blue-500/15 hover:border-blue-400/40 hover:text-blue-300 transition-colors' : ''}
          `}
        >
          {tag}
        </span>
      ))}
      {remainingCount > 0 && (
        <span className={`${sizeClasses[size]} bg-[rgba(59,130,246,0.04)] text-slate-500 rounded`}>
          +{remainingCount}
        </span>
      )}
    </div>
  );
}
