import React, { useRef, useState, useEffect } from 'react';
import Draggable from 'react-draggable';
import type { FritzingPart } from '../utils/FritzingPartLoader';

interface Props {
  part: FritzingPart;
  rotation: number;
  initialPos?: { x: number; y: number };
  onClick?: () => void;
  isDeleteMode?: boolean;
}

const FritzingPartComponent: React.FC<Props> = ({ part, rotation, initialPos = { x: 100, y: 100 }, onClick, isDeleteMode }) => {
  const nodeRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [connectorPositions, setConnectorPositions] = useState<Array<{ x: number, y: number, id: string }>>([]);

  useEffect(() => {
    if (nodeRef.current) {
      const svgElement = nodeRef.current.querySelector('svg');
      if (svgElement) {
        const positions: Array<{ x: number, y: number, id: string }> = [];
        part.connectors.forEach(conn => {
          const pinEl = svgElement.getElementById(conn.svgId);
          if (pinEl) {
            try {
              const bbox = (pinEl as any).getBBox();
              positions.push({
                x: bbox.x + bbox.width / 2,
                y: bbox.y + bbox.height / 2,
                id: conn.id
              });
            } catch (e) {
              // Ignore errors if SVG is not yet in layout
            }
          }
        });
        setConnectorPositions(positions);
      }
    }
  }, [part]);

  return (
    <Draggable 
      nodeRef={nodeRef}
      defaultPosition={initialPos} 
      grid={[15, 15]}
      disabled={isDeleteMode}
      onStart={() => setIsDragging(false)}
      onDrag={() => setIsDragging(true)}
      onStop={() => {
        setTimeout(() => setIsDragging(false), 100);
      }}
    >
      <div 
        ref={nodeRef}
        style={{ position: 'absolute', zIndex: 15 }}
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
            transform: `rotate(${rotation}deg)`,
            transition: 'transform 0.2s ease-in-out',
            display: 'block',
            width: `${part.width}px`,
            height: `${part.height}px`,
            position: 'relative'
          }}
        >
          {/* Main SVG Content */}
          <div 
            dangerouslySetInnerHTML={{ __html: part.svgContent }} 
            style={{ 
              width: '100%', 
              height: '100%',
              pointerEvents: 'none' // Let the parent container handle clicks
            }}
          />
          
          {/* Overlay Guide for Pins */}
          <svg
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none'
            }}
            viewBox={part.viewBox}
          >
            {connectorPositions.map(pos => (
              <circle
                key={pos.id}
                cx={pos.x}
                cy={pos.y}
                r={2} // Slightly larger for visibility
                fill="#FFD700"
                stroke="#000"
                strokeWidth={0.5}
                opacity={0.7}
              />
            ))}
          </svg>

          <div style={{ 
            fontSize: '10px', 
            textAlign: 'center', 
            background: 'rgba(255,255,255,0.7)', 
            borderRadius: '3px', 
            pointerEvents: 'none', 
            whiteSpace: 'nowrap', 
            position: 'absolute', 
            bottom: '-15px',
            left: '50%',
            transform: 'translateX(-50%)'
          }}>
            {part.name}
          </div>
        </div>
      </div>
    </Draggable>
  );
};

export default FritzingPartComponent;
