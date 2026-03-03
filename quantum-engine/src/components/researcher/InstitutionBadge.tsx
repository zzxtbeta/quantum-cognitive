import { Institution, INSTITUTION_CONFIG } from '../../types/people';

interface InstitutionBadgeProps {
  institution: Institution;
  showFullName?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
  lg: 'text-base px-3 py-1.5',
};

export default function InstitutionBadge({
  institution,
  showFullName = false,
  size = 'md',
}: InstitutionBadgeProps) {
  const config = INSTITUTION_CONFIG[institution];

  return (
    <span
      className={`
        inline-flex items-center
        font-semibold rounded
        ${config.color}
        ${sizeClasses[size]}
      `}
      style={{ color: '#ffffff' }}
      title={config.name}
    >
      {showFullName ? config.name : config.shortName}
    </span>
  );
}
