import { useState } from 'react';
import './App.css';
import Breadboard from './components/Breadboard';
import type { HoleInfo } from './components/Breadboard';
import DraggablePart from './components/DraggablePart';
import Wire from './components/Wire';
import type { WireData } from './components/Wire';
import { loadFzpz } from './utils/FritzingPartLoader';
import type { FritzingPart } from './utils/FritzingPartLoader';
import FritzingPartComponent from './components/FritzingPartComponent';

interface PartInstance {
  id: string;
  type: string;
  x: number;
  y: number;
  rotation: number;
  fzpData?: FritzingPart;
}

function App() {
  const [parts, setParts] = useState<PartInstance[]>([]);
  const [wires, setWires] = useState<WireData[]>([]);
  const [selectedHole, setSelectedHole] = useState<HoleInfo | null>(null);
  const [isDeleteMode, setIsDeleteMode] = useState(false);

  const BB_X = 50;
  const BB_Y = 50;

  const addLed = () => {
    setParts([...parts, { id: `led-${Date.now()}`, type: 'LED', x: 50, y: 50, rotation: 0 }]);
    setIsDeleteMode(false);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const partData = await loadFzpz(file);
        setParts([...parts, { 
          id: partData.id, 
          type: 'FZP', 
          x: 100, 
          y: 100, 
          rotation: 0,
          fzpData: partData 
        }]);
      } catch (err) {
        console.error('Failed to load Fritzing part:', err);
        alert('Failed to load Fritzing part. Make sure it is a valid .fzpz file.');
      }
    }
  };

  const deletePart = (id: string) => {
    setParts(parts.filter(p => p.id !== id));
  };

  const rotatePart = (id: string) => {
    setParts(parts.map(p => p.id === id ? { ...p, rotation: (p.rotation + 90) % 360 } : p));
  };

  const deleteWire = (id: string) => {
    setWires(wires.filter(w => w.id !== id));
  };

  const handleHoleClick = (hole: HoleInfo) => {
    if (isDeleteMode) return;
    if (!selectedHole) {
      setSelectedHole(hole);
    } else {
      if (selectedHole.id !== hole.id) {
        const newWire: WireData = {
          id: `wire-${Date.now()}`,
          from: { x: selectedHole.x + BB_X, y: selectedHole.y + BB_Y },
          to: { x: hole.x + BB_X, y: hole.y + BB_Y },
          color: '#333'
        };
        setWires([...wires, newWire]);
      }
      setSelectedHole(null);
    }
  };

  return (
    <div className="editor-container" style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Breadboard Editor Proto</h1>
      <div className="toolbar" style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <button 
          onClick={addLed} 
          style={{ padding: '8px 16px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Add LED
        </button>
        
        <input 
          type="file" 
          accept=".fzpz" 
          onChange={handleFileUpload}
          id="fzpz-upload"
          style={{ display: 'none' }}
        />
        <label 
          htmlFor="fzpz-upload"
          style={{ padding: '8px 16px', background: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Load .fzpz
        </label>

        <button 
          onClick={() => setIsDeleteMode(!isDeleteMode)} 
          style={{ 
            padding: '8px 16px', 
            background: isDeleteMode ? '#f44336' : '#9e9e9e', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: 'pointer',
            fontWeight: isDeleteMode ? 'bold' : 'normal'
          }}
        >
          {isDeleteMode ? 'Exit Delete Mode' : 'Delete Mode'}
        </button>
      </div>
      
      <div className={`canvas ${isDeleteMode ? 'delete-cursor' : ''}`} style={{ position: 'relative', border: '2px dashed #ccc', minHeight: '800px', background: '#fafafa', overflow: 'hidden' }}>
        <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 5 }}>
          <g style={{ pointerEvents: 'auto' }}>
            {wires.map(wire => (
              <Wire 
                key={wire.id} 
                wire={wire} 
                onClick={() => deleteWire(wire.id)}
                isDeleteMode={isDeleteMode}
              />
            ))}
          </g>
        </svg>

        <div style={{ position: 'absolute', top: `${BB_Y}px`, left: `${BB_X}px` }}>
          <Breadboard 
            onHoleClick={handleHoleClick} 
            selectedHoleId={selectedHole?.id} 
          />
        </div>
        
        {parts.map(part => (
          part.type === 'FZP' && part.fzpData ? (
            <FritzingPartComponent
              key={part.id}
              part={part.fzpData}
              rotation={part.rotation}
              initialPos={{ x: part.x, y: part.y }}
              onClick={() => isDeleteMode ? deletePart(part.id) : rotatePart(part.id)}
              isDeleteMode={isDeleteMode}
            />
          ) : (
            <DraggablePart 
              key={part.id} 
              name={part.type} 
              rotation={part.rotation}
              initialPos={{ x: part.x, y: part.y }} 
              onClick={() => isDeleteMode ? deletePart(part.id) : rotatePart(part.id)}
              isDeleteMode={isDeleteMode}
            />
          )
        ))}
      </div>
      
      {selectedHole && !isDeleteMode && (
        <div style={{ position: 'fixed', bottom: '20px', background: '#FF9800', color: 'white', padding: '10px 20px', borderRadius: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
          Select another hole to complete the wire
        </div>
      )}
    </div>
  );
}

export default App;
