import { TitleLevel, TITLE_CONFIG } from '../../types/people';

interface TitleBadgeProps {
  title: TitleLevel;
  originalTitle?: string;
  showOriginal?: boolean;
}

export default function TitleBadge({ title, originalTitle, showOriginal = false }: TitleBadgeProps) {
  const config = TITLE_CONFIG[title];

  return (
    <span
      className={`
        inline-flex items-center gap-1
        text-xs font-medium
        ${config.color}
      `}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      <span>{showOriginal && originalTitle ? originalTitle : config.label}</span>
    </span>
  );
}
