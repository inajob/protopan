import React, { useState, useRef } from 'react';
import Draggable from 'react-draggable';

export interface TextLabelData {
  id: string;
  x: number;
  y: number;
  text: string;
}

interface Props {
  label: TextLabelData;
  onMove: (x: number, y: number) => void;
  onUpdate: (text: string) => void;
  onDelete: () => void;
  isDeleteMode: boolean;
}

const TextLabel: React.FC<Props> = ({ label, onMove, onUpdate, onDelete, isDeleteMode }) => {
  const nodeRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);

  return (
    <Draggable
      nodeRef={nodeRef}
      position={{ x: label.x, y: label.y }}
      grid={[15, 15]}
      disabled={isDeleteMode || isEditing}
      onStop={(_, data) => onMove(data.x, data.y)}
    >
      <div
        ref={nodeRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: 300,
          cursor: isDeleteMode ? 'pointer' : (isEditing ? 'text' : 'move'),
          userSelect: 'none',
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (isDeleteMode) onDelete();
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          if (!isDeleteMode) setIsEditing(true);
        }}
      >
        {isEditing ? (
          <input
            autoFocus
            value={label.text}
            onChange={(e) => onUpdate(e.target.value)}
            onBlur={() => setIsEditing(false)}
            onKeyDown={(e) => { if (e.key === 'Enter') setIsEditing(false); }}
            style={{
              fontSize: '14px',
              fontFamily: 'sans-serif',
              border: '1px solid #0071e3',
              borderRadius: '3px',
              padding: '2px 4px',
              outline: 'none',
              background: 'white',
            }}
          />
        ) : (
          <div style={{
            fontSize: '14px',
            fontFamily: 'sans-serif',
            fontWeight: 'bold',
            color: '#333',
            background: 'rgba(255, 255, 255, 0.8)',
            padding: '2px 6px',
            borderRadius: '4px',
            border: isDeleteMode ? '1px solid red' : '1px solid transparent',
            whiteSpace: 'nowrap',
          }}>
            {label.text || 'Double click to edit'}
          </div>
        )}
      </div>
    </Draggable>
  );
};

export default TextLabel;
