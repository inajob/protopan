import React from 'react';

export interface HoleInfo {
  id: string;
  x: number;
  y: number;
}

interface BreadboardProps {
  onHoleClick?: (hole: HoleInfo) => void;
  selectedHoleId?: string | null;
}

const Breadboard: React.FC<BreadboardProps> = ({ onHoleClick, selectedHoleId }) => {
  const rows = 30;
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
        style={{ cursor: 'pointer', transition: 'all 0.1s' }}
        onClick={() => onHoleClick?.({ id, x: cx, y: cy })}
      />
    );
  };

  const holes = [];
  for (let r = 0; r < rows; r++) {
    const x = offsetX + r * spacing;
    // Top Rails
    holes.push(renderHole(x, offsetY, `p1-${r}`));
    holes.push(renderHole(x, offsetY + spacing, `p2-${r}`));
    
    // Main Grid
    for (let c = 0; c < cols; c++) {
      holes.push(renderHole(x, offsetY + spacing * 3 + c * spacing, `g1-${r}-${c}`));
      holes.push(renderHole(x, offsetY + spacing * 9 + c * spacing, `g2-${r}-${c}`));
    }
    
    // Bottom Rails
    holes.push(renderHole(x, offsetY + spacing * 15, `p3-${r}`));
    holes.push(renderHole(x, offsetY + spacing * 16, `p4-${r}`));
  }

  const lineStartX = offsetX - 5;
  const lineEndX = offsetX + (rows - 1) * spacing + 5;

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <svg width={500} height={300} style={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '8px' }}>
        {/* Base */}
        <rect x={10} y={10} width={480} height={280} rx={10} fill="#f8f8f8" stroke="#ddd" strokeWidth="2" />
        
        {/* Top Power Rail Lines */}
        <line x1={lineStartX} y1={offsetY - 8} x2={lineEndX} y2={offsetY - 8} stroke="red" strokeWidth="2" opacity="0.6" />
        <line x1={lineStartX} y1={offsetY + spacing + 8} x2={lineEndX} y2={offsetY + spacing + 8} stroke="blue" strokeWidth="2" opacity="0.6" />

        {/* Bottom Power Rail Lines */}
        <line x1={lineStartX} y1={offsetY + spacing * 15 - 8} x2={lineEndX} y2={offsetY + spacing * 15 - 8} stroke="red" strokeWidth="2" opacity="0.6" />
        <line x1={lineStartX} y1={offsetY + spacing * 16 + 8} x2={lineEndX} y2={offsetY + spacing * 16 + 8} stroke="blue" strokeWidth="2" opacity="0.6" />

        {holes}
      </svg>
    </div>
  );
};

export default Breadboard;
