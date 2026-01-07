
import React, { useEffect, useRef } from 'react';
import * as lucide from 'lucide-react';

interface IconProps {
  name: string;
  size?: number;
  className?: string;
}

const Icon: React.FC<IconProps> = ({ name, size = 20, className }) => {
  // Use indexed access to get the component from the lucide object
  const LucideIcon = (lucide as any)[name];

  if (!LucideIcon) {
    return <span className="text-xs text-gray-400">?</span>;
  }

  return <LucideIcon size={size} className={className} />;
};

export default Icon;
