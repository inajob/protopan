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
  const [isHovered, setIsHovered] = useState(false);
  const [hoveredPinId, setHoveredPinId] = useState<string | null>(null);
  const [pinGuides, setPinGuides] = useState<Array<{ id: string, name: string, x: number, y: number }>>([]);
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
          // Use rounded pixel coordinates for anchor to prevent sub-pixel drift
          guides.push({ id: conn.id, name: conn.name, x: vx, y: vy, pxX: Math.round(pxX), pxY: Math.round(pxY) });
        }
      });

      if (guides.length > 0) {
        setPinGuides(guides.map(g => ({ id: g.id, name: g.name, x: g.x, y: g.y })));
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
      position={{ x: Math.round(initialPos.x), y: Math.round(initialPos.y) }} 
      grid={[15, 15]}
      disabled={isDeleteMode}
      onStart={() => {
        setIsDragging(false);
      }}
      onDrag={() => {
        setIsDragging(true);
      }}
      onStop={(_, data) => {
        if (isDragging) {
          setTimeout(() => setIsDragging(false), 50);
        }
        // Round to nearest 15 to ensure grid alignment
        onMove(Math.round(data.x / 15) * 15, Math.round(data.y / 15) * 15);
      }}
    >
      <div 
        ref={nodeRef} 
        style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          zIndex: isDragging ? 100 : 15, 
          visibility: isReady ? 'visible' : 'hidden'
        }}
      >
        <div
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={(e) => {
            if (isDeleteMode) {
              e.stopPropagation();
              onClick?.();
              return;
            }
            if (isDragging) {
              e.stopPropagation();
            }
          }}
          className={`part-container ${isDeleteMode ? 'delete-mode' : ''} ${isDragging ? 'dragging' : ''}`}
          style={{
            transform: `rotate(${rotation}deg)`,
            transformOrigin: `${anchor.x}px ${anchor.y}px`, // Use explicit anchor point
            transition: isDragging ? 'none' : 'transform 0.2s ease-in-out',
            pointerEvents: 'auto'
          }}
        >
          <div
            style={{
              transform: `translate(${-anchor.x}px, ${-anchor.y}px)`,
              width: `${part.width}px`,
              height: `${part.height}px`,
              position: 'relative',
              opacity: isTransparent ? 0.4 : 1,
              transition: 'opacity 0.3s ease',
            }}
          >
            {!isDeleteMode && (
              <div 
                className="rotate-indicator" 
                style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isDragging) onClick?.();
                }}
              >
                ↻
              </div>
            )}
            <div dangerouslySetInnerHTML={{ __html: part.svgContent }} style={{ width: '100%', height: '100%', pointerEvents: 'none' }} />
            
            <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible', zIndex: 25 }} viewBox={part.viewBox}>
              {pinGuides.map(g => (
                <g 
                  key={g.id} 
                  style={{ pointerEvents: 'auto' }}
                  onMouseEnter={() => setHoveredPinId(g.id)}
                  onMouseLeave={() => setHoveredPinId(null)}
                >
                  <circle cx={g.x} cy={g.y} r={Math.max(part.width, part.height) / 150} fill="#FF3D00" stroke="white" strokeWidth={Math.max(part.width, part.height) / 600} opacity={0.8} />
                  {hoveredPinId === g.id && g.name && (
                    <g style={{ transform: `rotate(${-rotation}deg)`, transformOrigin: `${g.x}px ${g.y}px` }}>
                      <text 
                        x={g.x} 
                        y={g.y - Math.max(part.width, part.height) / 50} 
                        fontSize={Math.max(part.width, part.height) / 40} 
                        fill="#333" 
                        textAnchor="middle" 
                        style={{ paintOrder: 'stroke', stroke: 'white', strokeWidth: 2, fontWeight: 'bold' }}
                      >
                        {g.name}
                      </text>
                    </g>
                  )}
                </g>
              ))}
            </svg>
            
            {showLabel && (
              <div style={{ 
                fontSize: '10px', 
                textAlign: 'center', 
                background: 'rgba(255,255,255,0.7)', 
                borderRadius: '3px', 
                pointerEvents: 'none', 
                position: 'absolute', 
                bottom: '-15px', 
                left: '50%', 
                transform: `translateX(-50%) rotate(${-rotation}deg)`,
                whiteSpace: 'nowrap' 
              }}>
                {part.name}
              </div>
            )}
          </div>
        </div>
      </div>
    </Draggable>
  );
};

export default FritzingPartComponent;
