import React, { useRef, useState } from 'react';
import Draggable from 'react-draggable';

interface PartProps {
  name: string;
  rotation: number;
  initialPos?: { x: number; y: number };
  onClick?: () => void;
  isDeleteMode?: boolean;
  isTransparent?: boolean;
  showLabel?: boolean;
}

const DraggablePart: React.FC<PartProps> = ({ name, rotation, initialPos = { x: 60, y: 60 }, onClick, isDeleteMode, isTransparent, showLabel = true }) => {
  const nodeRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  return (
    <Draggable 
      nodeRef={nodeRef}
      defaultPosition={initialPos} 
      grid={[15, 15]}
      disabled={isDeleteMode}
      onStart={() => setIsDragging(false)}
      onDrag={() => setIsDragging(true)}
      onStop={() => { setTimeout(() => setIsDragging(false), 100); }}
    >
      <div ref={nodeRef} style={{ position: 'absolute', zIndex: 10 }}>
        <div
          onClick={(e) => {
            e.stopPropagation();
            if (!isDragging) onClick?.();
          }}
          className={`part-container ${isDeleteMode ? 'delete-mode' : ''}`}
          style={{
            cursor: isDeleteMode ? 'pointer' : 'grab',
            transform: `rotate(${rotation}deg)`,
            transformOrigin: `0 0`, 
            transition: 'transform 0.2s ease-in-out, opacity 0.3s ease',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            opacity: isTransparent ? 0.4 : 1,
            position: 'relative'
          }}
        >
          {!isDeleteMode && <div className="rotate-indicator">↻</div>}
          {name === 'LED' && (
            <svg width={60} height={60} viewBox="-15 -40 60 60" style={{ overflow: 'visible' }}>
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
