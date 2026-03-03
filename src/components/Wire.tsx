import React from 'react';

export interface WireData {
  id: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
  color: string;
}

interface WireProps {
  wire: WireData;
  onClick?: () => void;
  isDeleteMode?: boolean;
}

const Wire: React.FC<WireProps> = ({ wire, onClick, isDeleteMode }) => {
  const { from, to, color } = wire;
  
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2 - Math.sqrt(dx*dx + dy*dy) * 0.2;

  const pathData = `M ${from.x} ${from.y} Q ${mx} ${my} ${to.x} ${to.y}`;

  return (
    <g 
      style={{ cursor: isDeleteMode ? 'pointer' : 'default', pointerEvents: 'auto' }}
      onClick={(e) => {
        if (isDeleteMode) {
          e.stopPropagation();
          onClick?.();
        }
      }}
    >
      {/* Hitbox for easier clicking */}
      <path
        d={pathData}
        fill="none"
        stroke="transparent"
        strokeWidth="15"
        strokeLinecap="round"
      />
      {/* Wire Shadow */}
      <path
        d={pathData}
        fill="none"
        stroke="rgba(0,0,0,0.2)"
        strokeWidth="4"
        strokeLinecap="round"
        transform="translate(2, 2)"
      />
      {/* Main Wire */}
      <path
        d={pathData}
        fill="none"
        stroke={isDeleteMode ? 'red' : color}
        strokeWidth="3"
        strokeLinecap="round"
        opacity={isDeleteMode ? 0.6 : 1}
      />
    </g>
  );
};

export default Wire;
