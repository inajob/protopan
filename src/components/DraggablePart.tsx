import React, { useRef, useState } from 'react';
import Draggable from 'react-draggable';

interface PartProps {
  name: string;
  rotation: number;
  initialPos: { x: number; y: number };
  onMove: (x: number, y: number) => void;
  onClick?: () => void;
  isDeleteMode?: boolean;
  isTransparent?: boolean;
  showLabel?: boolean;
}

const DraggablePart: React.FC<PartProps> = ({ name, rotation, initialPos, onMove, onClick, isDeleteMode, isTransparent, showLabel = true }) => {
  const nodeRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  // LED anchor (matching the visual dot)
  const anchorX = 7.5;
  const anchorY = 25;

  return (
    <Draggable 
      nodeRef={nodeRef}
      position={initialPos} 
      grid={[15, 15]}
      disabled={isDeleteMode}
      onStart={() => setIsDragging(false)}
      onDrag={() => setIsDragging(true)}
      onStop={(_, data) => {
        setTimeout(() => setIsDragging(false), 100);
        onMove(data.x, data.y);
      }}
    >
      <div ref={nodeRef} style={{ position: 'absolute', top: 0, left: 0, zIndex: 10 }}>
        <div
          onClick={(e) => {
            e.stopPropagation();
            if (!isDragging) onClick?.();
          }}
          className={`part-container ${isDeleteMode ? 'delete-mode' : ''}`}
          style={{
            cursor: isDeleteMode ? 'pointer' : 'grab',
            transform: `translate(${-anchorX}px, ${-anchorY}px) rotate(${rotation}deg)`,
            transformOrigin: `${anchorX}px ${anchorY}px`,
            transition: 'transform 0.2s ease-in-out, opacity 0.3s ease',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '30px',
            height: '30px',
            opacity: isTransparent ? 0.4 : 1,
            position: 'relative'
          }}
        >
          {!isDeleteMode && <div className="rotate-indicator">↻</div>}
          {name === 'LED' && (
            <svg width={30} height={30} viewBox="-15 -40 60 60" style={{ overflow: 'visible' }}>
              <circle cx={7.5} cy={-25} r={18} fill="rgba(255, 0, 0, 0.7)" stroke="red" strokeWidth="3" />
              <circle cx={2.5} cy={-30} r={5} fill="white" opacity="0.3" />
              <line x1={0} y1={-10} x2={0} y2={5} stroke="#888" strokeWidth="3" />
              <line x1={15} y1={-10} x2={15} y2={5} stroke="#888" strokeWidth="4" />
              <circle cx={0} cy={0} r={2.5} fill="#FF3D00" stroke="#FFF" strokeWidth="0.5" />
            </svg>
          )}
          {showLabel && (
            <div style={{ fontSize: '12px', fontWeight: 'bold', background: 'rgba(255,255,255,0.7)', borderRadius: '3px', pointerEvents: 'none', position: 'absolute', top: '25px', left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap' }}>
              {name}
            </div>
          )}
        </div>
      </div>
    </Draggable>
  );
};

export default DraggablePart;
