import React, { useState } from 'react';
import { getInitials } from '../utils/staywiseModel';

interface AvatarDisplayProps {
  name: string;
  avatarUrl: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<AvatarDisplayProps['size']>, string> = {
  sm: 'h-8 w-8 text-[11px]',
  md: 'h-9 w-9 text-xs',
  lg: 'h-11 w-11 text-sm',
  xl: 'h-20 w-20 text-xl',
};

export const AvatarDisplay: React.FC<AvatarDisplayProps> = ({
  name,
  avatarUrl,
  size = 'md',
  className = '',
}) => {
  const [imgFailed, setImgFailed] = useState(false);

  const showImage = Boolean(avatarUrl) && !imgFailed;

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#edeaff] font-semibold text-[#5b47d6] select-none ${SIZE_CLASSES[size]} ${className}`}
    >
      {showImage ? (
        <img
          src={avatarUrl ?? undefined}
          alt={`Ảnh đại diện của ${name}`}
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span>{getInitials(name)}</span>
      )}
    </span>
  );
};
