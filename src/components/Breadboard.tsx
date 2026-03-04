import React from 'react';

export interface HoleInfo {
  id: string;
  x: number;
  y: number;
}

interface BreadboardProps {
  rows?: number;
  onHoleClick?: (hole: HoleInfo) => void;
  selectedHoleId?: string | null;
}

const Breadboard: React.FC<BreadboardProps> = ({ rows = 30, onHoleClick, selectedHoleId }) => {
  const cols = 5;
  const spacing = 15;
  const offsetX = 30; 
  const offsetY = 30;

  const renderHole = (cx: number, cy: number, id: string) => {
    const isSelected = selectedHoleId === id;
    return (
      <circle
        key={id}
        cx={cx}
        cy={cy}
        r={isSelected ? 5 : 3}
        fill={isSelected ? "#FF9800" : "#444"}
        stroke={isSelected ? "#E65100" : "#222"}
        strokeWidth={isSelected ? 2 : 0.5}
        style={{ cursor: 'pointer' }}
        onClick={() => onHoleClick?.({ id, x: cx, y: cy })}
      />
    );
  };

  const holes = [];
  for (let r = 0; r < rows; r++) {
    const x = offsetX + r * spacing;
    holes.push(renderHole(x, offsetY, `p1-${r}`));
    holes.push(renderHole(x, offsetY + spacing, `p2-${r}`));
    for (let c = 0; c < cols; c++) {
      holes.push(renderHole(x, offsetY + spacing * 3 + c * spacing, `g1-${r}-${c}`));
      holes.push(renderHole(x, offsetY + spacing * 9 + c * spacing, `g2-${r}-${c}`));
    }
    holes.push(renderHole(x, offsetY + spacing * 15, `p3-${r}`));
    holes.push(renderHole(x, offsetY + spacing * 16, `p4-${r}`));
  }

  const bbWidth = (rows - 1) * spacing + offsetX * 2;

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <svg width={bbWidth} height={300} style={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '8px', display: 'block' }}>
        <rect x={10} y={10} width={bbWidth - 20} height={280} rx={10} fill="#f8f8f8" stroke="#ddd" strokeWidth="2" />
        
        {/* Power Rail Lines */}
        <line x1={offsetX-5} y1={offsetY - 8} x2={offsetX+(rows-1)*spacing+5} y2={offsetY - 8} stroke="red" strokeWidth="2" opacity="0.5" />
        <line x1={offsetX-5} y1={offsetY + spacing + 8} x2={offsetX+(rows-1)*spacing+5} y2={offsetY + spacing + 8} stroke="blue" strokeWidth="2" opacity="0.5" />
        <line x1={offsetX-5} y1={offsetY + spacing * 15 - 8} x2={offsetX+(rows-1)*spacing+5} y2={offsetY + spacing * 15 - 8} stroke="red" strokeWidth="2" opacity="0.5" />
        <line x1={offsetX-5} y1={offsetY + spacing * 16 + 8} x2={offsetX+(rows-1)*spacing+5} y2={offsetY + spacing * 16 + 8} stroke="blue" strokeWidth="2" opacity="0.5" />
        
        {holes}
      </svg>
    </div>
  );
};

export default Breadboard;
