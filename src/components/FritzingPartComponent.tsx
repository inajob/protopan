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
    // 1. Create a shadow element to measure actual positions without layout interference
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.visibility = 'hidden';
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
          // Precise relative pixel within the SVG block
          const pxX = rect.left + rect.width / 2 - svgRect.left;
          const pxY = rect.top + rect.height / 2 - svgRect.top;
          
          // Map back to ViewBox for the overlay circle
          const vx = (pxX / svgRect.width) * vbW + vbX;
          const vy = (pxY / svgRect.height) * vbH + vbY;
          
          guides.push({ id: conn.id, x: vx, y: vy, pxX, pxY });
        }
      });

      if (guides.length > 0) {
        setPinGuides(guides.map(g => ({ id: g.id, x: g.x, y: g.y })));
        const first = guides[0];
        // Pin 1 will be the anchor (0,0) for the component
        setAnchor({ x: first.pxX, y: first.pxY });
        setIsReady(true);
      }
      document.body.removeChild(container);
    };

    calibrate();
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
