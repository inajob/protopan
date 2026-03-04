import React, { useRef, useState, useEffect } from 'react';
import Draggable from 'react-draggable';
import type { FritzingPart } from '../utils/FritzingPartLoader';

interface Props {
  part: FritzingPart;
  rotation: number;
  initialPos: { x: number; y: number };
  onMove: (x: number, y: number) => void;
  onClick?: () => void;
  isDeleteMode?: boolean;
  isTransparent?: boolean;
  showLabel?: boolean;
}

const FritzingPartComponent: React.FC<Props> = ({ part, rotation, initialPos, onMove, onClick, isDeleteMode, isTransparent, showLabel = true }) => {
  const nodeRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [pinGuides, setPinGuides] = useState<Array<{ id: string, x: number, y: number }>>([]);
  const [anchor, setAnchor] = useState({ x: 0, y: 0 });
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const container = document.createElement('div');
    container.style.cssText = 'position:absolute;visibility:hidden;left:-9999px;top:-9999px;';
    container.style.width = `${part.width}px`;
    container.style.height = `${part.height}px`;
    container.innerHTML = part.svgContent;
    document.body.appendChild(container);

    const calibrate = () => {
      const svg = container.querySelector('svg');
      if (!svg) return;
      const guides: any[] = [];
      const svgRect = svg.getBoundingClientRect();
      const viewBox = svg.viewBox.baseVal;
      const vbW = viewBox.width || 100;
      const vbH = viewBox.height || 100;
      const vbX = viewBox.x || 0;
      const vbY = viewBox.y || 0;

      part.connectors.forEach(conn => {
        const el = (svg.getElementById(conn.svgId) || svg.querySelector(`[id$="${conn.svgId}"]`)) as any;
        if (el) {
          const rect = el.getBoundingClientRect();
          const pxX = rect.left + rect.width / 2 - svgRect.left;
          const pxY = rect.top + rect.height / 2 - svgRect.top;
          const vx = (pxX / svgRect.width) * vbW + vbX;
          const vy = (pxY / svgRect.height) * vbH + vbY;
          guides.push({ id: conn.id, x: vx, y: vy, pxX, pxY });
        }
      });

      if (guides.length > 0) {
        setPinGuides(guides.map(g => ({ id: g.id, x: g.x, y: g.y })));
        setAnchor({ x: guides[0].pxX, y: guides[0].pxY });
        setIsReady(true);
      }
      document.body.removeChild(container);
    };
    calibrate();
  }, [part]);

  return (
    <Draggable 
      nodeRef={nodeRef}
      // Use absolute coordinate controlled by App.tsx
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
      {/* Outer wrapper MUST be at top:0, left:0 to align Draggable coordinates with Canvas */}
      <div ref={nodeRef} style={{ position: 'absolute', top: 0, left: 0, zIndex: 15, visibility: isReady ? 'visible' : 'hidden' }}>
        <div
          onClick={(e) => {
            e.stopPropagation();
            if (!isDragging) onClick?.();
          }}
          className={`part-container ${isDeleteMode ? 'delete-mode' : ''}`}
          style={{
            // Component is shifted so Pin 1 is at Draggable's (x,y)
            transform: `translate(${-anchor.x}px, ${-anchor.y}px) rotate(${rotation}deg)`,
            transformOrigin: `${anchor.x}px ${anchor.y}px`,
            transition: 'transform 0.2s ease-in-out, opacity 0.3s ease',
            display: 'block',
            width: `${part.width}px`,
            height: `${part.height}px`,
            position: 'relative',
            opacity: isTransparent ? 0.4 : 1,
          }}
        >
          {!isDeleteMode && <div className="rotate-indicator">↻</div>}
          <div dangerouslySetInnerHTML={{ __html: part.svgContent }} style={{ width: '100%', height: '100%', pointerEvents: 'none' }} />
          <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible', zIndex: 25 }} viewBox={part.viewBox}>
            {pinGuides.map(g => (
              <circle key={g.id} cx={g.x} cy={g.y} r={Math.max(part.width, part.height) / 150} fill="#FF3D00" stroke="white" strokeWidth={Math.max(part.width, part.height) / 600} opacity={0.8} />
            ))}
          </svg>
          {showLabel && (
            <div style={{ fontSize: '10px', textAlign: 'center', background: 'rgba(255,255,255,0.7)', borderRadius: '3px', pointerEvents: 'none', position: 'absolute', bottom: '-15px', left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap' }}>
              {part.name}
            </div>
          )}
        </div>
      </div>
    </Draggable>
  );
};

export default FritzingPartComponent;
