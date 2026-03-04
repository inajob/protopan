import React, { useRef, useState, useEffect, useMemo } from 'react';
import Draggable from 'react-draggable';
import type { FritzingPart } from '../utils/FritzingPartLoader';

interface Props {
  part: FritzingPart;
  rotation: number;
  initialPos?: { x: number; y: number };
  onClick?: () => void;
  isDeleteMode?: boolean;
  isTransparent?: boolean;
  showLabel?: boolean;
}

const FritzingPartComponent: React.FC<Props> = ({ part, rotation, initialPos = { x: 105, y: 105 }, onClick, isDeleteMode, isTransparent, showLabel = true }) => {
  const nodeRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [pinGuides, setPinGuides] = useState<Array<{ id: string, x: number, y: number }>>([]);
  const [anchor, setAnchor] = useState({ x: 0, y: 0 });
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const updatePositions = () => {
      if (!nodeRef.current) return;
      const svg = nodeRef.current.querySelector('svg');
      if (!svg) return;

      const guides: any[] = [];
      const svgRect = svg.getBoundingClientRect();
      const viewBox = svg.viewBox.baseVal;
      
      const vbW = viewBox.width || svg.clientWidth || 100;
      const vbH = viewBox.height || svg.clientHeight || 100;
      const vbX = viewBox.x || 0;
      const vbY = viewBox.y || 0;

      part.connectors.forEach(conn => {
        const el = svg.getElementById(conn.svgId) || svg.querySelector(`[id$="${conn.svgId}"]`);
        if (el) {
          const rect = el.getBoundingClientRect();
          const x = ((rect.left + rect.width / 2 - svgRect.left) / svgRect.width) * vbW + vbX;
          const y = ((rect.top + rect.height / 2 - svgRect.top) / svgRect.height) * vbH + vbY;
          guides.push({ id: conn.id, x, y });
        }
      });

      if (guides.length > 0) {
        setPinGuides(guides);
        const first = guides[0];
        const pxX = ((first.x - vbX) / vbW) * part.width;
        const pxY = ((first.y - vbY) / vbH) * part.height;
        setAnchor({ x: -pxX, y: -pxY });
        setIsReady(true);
      }
    };

    const timer = setTimeout(updatePositions, 300);
    return () => clearTimeout(timer);
  }, [part]);

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
      <div ref={nodeRef} style={{ position: 'absolute', zIndex: 15, visibility: isReady ? 'visible' : 'hidden' }}>
        <div
          onClick={(e) => {
            e.stopPropagation();
            if (!isDragging) onClick?.();
          }}
          style={{
            transform: `translate(${anchor.x}px, ${anchor.y}px) rotate(${rotation}deg)`,
            transformOrigin: `${-anchor.x}px ${-anchor.y}px`,
            transition: 'transform 0.2s ease-in-out, opacity 0.3s ease',
            display: 'block',
            width: `${part.width}px`,
            height: `${part.height}px`,
            position: 'relative',
            opacity: isTransparent ? 0.4 : 1,
          }}
        >
          <div dangerouslySetInnerHTML={{ __html: part.svgContent }} style={{ width: '100%', height: '100%', pointerEvents: 'none' }} />
          
          <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible', zIndex: 25 }} viewBox={part.viewBox}>
            {pinGuides.map(g => (
              <circle key={g.id} cx={g.x} cy={g.y} r={Math.max(part.width, part.height) / 100} fill="#FF3D00" stroke="white" strokeWidth={Math.max(part.width, part.height) / 400} opacity={0.8} />
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
