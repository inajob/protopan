import React, { useRef, useState } from 'react';
import Draggable from 'react-draggable';

interface PartProps {
  name: string;
  rotation: number;
  initialPos?: { x: number; y: number };
  onClick?: () => void;
  isDeleteMode?: boolean;
}

const DraggablePart: React.FC<PartProps> = ({ name, rotation, initialPos = { x: 50, y: 50 }, onClick, isDeleteMode }) => {
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
      onStop={() => {
        // Delay resetting isDragging to block the click event that follows mouseup
        setTimeout(() => setIsDragging(false), 100);
      }}
    >
      <div 
        ref={nodeRef}
        style={{ position: 'absolute', zIndex: 10 }}
      >
        <div
          onClick={(e) => {
            e.stopPropagation();
            if (!isDragging) {
              onClick?.();
            }
          }}
          style={{
            cursor: isDeleteMode ? 'pointer' : 'grab',
            border: isDeleteMode ? '2px solid red' : 'none',
            borderRadius: '4px',
            padding: '2px',
            transform: `rotate(${rotation}deg)`,
            transition: 'transform 0.2s ease-in-out',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}
        >
          {name === 'LED' && (
            <svg width={30} height={50} viewBox="0 0 30 50">
              <circle cx={15} cy={15} r={12} fill="rgba(255, 0, 0, 0.7)" stroke="red" strokeWidth="2" />
              <line x1={10} y1={25} x2={10} y2={45} stroke="#888" strokeWidth="2" />
              <line x1={20} y1={25} x2={20} y2={50} stroke="#888" strokeWidth="2" />
            </svg>
          )}
          <div style={{ fontSize: '10px', background: 'rgba(255,255,255,0.7)', borderRadius: '3px', pointerEvents: 'none', whiteSpace: 'nowrap' }}>
            {name}
          </div>
        </div>
      </div>
    </Draggable>
  );
};

export default DraggablePart;
