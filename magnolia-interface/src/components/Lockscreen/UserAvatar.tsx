import React from 'react';

interface UserAvatarProps {
  src: string;
  name?: string;
  size?: 'small' | 'large';
  isSelected?: boolean;
  onClick?: () => void;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({ 
  src, 
  name, 
  size = 'small', 
  isSelected = false, 
  onClick 
}) => {
  const sizeClasses = size === 'large' ? 'w-[480px] h-[480px]' : 'w-[120px] h-[120px]';
  const borderClasses = isSelected ? 'border-4 border-[#6750a4]' : 'border-2 border-transparent';

  return (
    <div 
      className={`relative rounded-full overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 ${sizeClasses} ${borderClasses} bg-white/10 glass-panel shadow-lg`}
      onClick={onClick}
    >
      <img 
        src={src} 
        alt={name || "User profile"} 
        className="w-full h-full object-cover pointer-events-none"
      />
      {isSelected && (
        <div className="absolute inset-0 bg-[#6750a4]/10 pointer-events-none" />
      )}
    </div>
  );
};
