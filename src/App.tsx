import { useState } from 'react';
import './App.css';
import Breadboard from './components/Breadboard';
import type { HoleInfo } from './components/Breadboard';
import DraggablePart from './components/DraggablePart';
import Wire from './components/Wire';
import type { WireData } from './components/Wire';
import { loadFzpz, loadPartFromUrl } from './utils/FritzingPartLoader';
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

const LIBRARY_PARTS = [
  { name: 'Arduino Uno', fzp: '/parts/fritzing-parts/core/arduino_Uno_Rev3(fix).fzp', svg: '/parts/fritzing-parts/svg/core/breadboard/arduino_Uno_Rev3_breadboard.svg' },
  { name: 'Resistor', fzp: '/parts/fritzing-parts/core/resistor.fzp', svg: '/parts/fritzing-parts/svg/core/breadboard/resistor_220.svg' }
];

function App() {
  const [parts, setParts] = useState<PartInstance[]>([]);
  const [wires, setWires] = useState<WireData[]>([]);
  const [selectedHole, setSelectedHole] = useState<HoleInfo | null>(null);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [isTransparentMode, setIsTransparentMode] = useState(false);
  const [showLabels, setShowLabels] = useState(true);

  const BB_X = 60;
  const BB_Y = 60;

  const addLed = () => {
    setParts([...parts, { id: `led-${Date.now()}`, type: 'LED', x: 60, y: 60, rotation: 0 }]);
    setIsDeleteMode(false);
  };

  const addLibraryPart = async (libPart: typeof LIBRARY_PARTS[0]) => {
    try {
      const partData = await loadPartFromUrl(libPart.fzp, libPart.svg);
      setParts([...parts, { id: partData.id, type: 'FZP', x: 105, y: 105, rotation: 0, fzpData: partData }]);
    } catch (err) {
      console.error(err);
      alert('Failed to load part.');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const partData = await loadFzpz(file);
        setParts([...parts, { id: partData.id, type: 'FZP', x: 105, y: 105, rotation: 0, fzpData: partData }]);
      } catch (err) {
        console.error(err);
        alert('Failed to load Fritzing part.');
      }
    }
  };

  const deletePart = (id: string) => setParts(parts.filter(p => p.id !== id));
  const rotatePart = (id: string) => setParts(parts.map(p => p.id === id ? { ...p, rotation: (p.rotation + 90) % 360 } : p));
  const deleteWire = (id: string) => setWires(wires.filter(w => w.id !== id));

  const getWireColor = (x1: number, y1: number, x2: number, y2: number) => {
    const dist = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    const units = Math.round(dist / 15);
    const colorMap: Record<number, string> = { 1: '#8B4513', 2: '#FF0000', 3: '#FFA500', 4: '#FFFF00', 5: '#008000', 6: '#0000FF', 7: '#EE82EE', 8: '#808080', 9: '#FFFFFF', 10: '#000000' };
    return colorMap[units] || '#333333';
  };

  const handleHoleClick = (hole: HoleInfo) => {
    if (isDeleteMode) return;
    if (!selectedHole) {
      setSelectedHole(hole);
    } else {
      if (selectedHole.id !== hole.id) {
        const x1 = selectedHole.x + BB_X;
        const y1 = selectedHole.y + BB_Y;
        const x2 = hole.x + BB_X;
        const y2 = hole.y + BB_Y;
        setWires([...wires, { id: `wire-${Date.now()}`, from: { x: x1, y: y1 }, to: { x: x2, y: y2 }, color: getWireColor(x1, y1, x2, y2) }]);
      }
      setSelectedHole(null);
    }
  };

  return (
    <div className="editor-container" style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Breadboard Editor Proto</h1>
      <div className="toolbar" style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button onClick={addLed} style={{ padding: '8px 16px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Add LED</button>
        {LIBRARY_PARTS.map(lp => (
          <button key={lp.name} onClick={() => addLibraryPart(lp)} style={{ padding: '8px 16px', background: '#FF9800', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Add {lp.name}</button>
        ))}
        <input type="file" accept=".fzpz" onChange={handleFileUpload} id="fzpz-upload" style={{ display: 'none' }} />
        <label htmlFor="fzpz-upload" style={{ padding: '8px 16px', background: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Load .fzpz</label>

        <button onClick={() => setShowLabels(!showLabels)} style={{ padding: '8px 16px', background: '#00bcd4', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          {showLabels ? 'Hide Labels' : 'Show Labels'}
        </button>

        <button onClick={() => setIsTransparentMode(!isTransparentMode)} style={{ padding: '8px 16px', background: isTransparentMode ? '#673ab7' : '#9e9e9e', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          {isTransparentMode ? 'Opaque' : 'Transparent'}
        </button>

        <button onClick={() => setIsDeleteMode(!isDeleteMode)} style={{ padding: '8px 16px', background: isDeleteMode ? '#f44336' : '#9e9e9e', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          {isDeleteMode ? 'Exit Delete' : 'Delete Mode'}
        </button>
      </div>
      
      <div className={`canvas ${isDeleteMode ? 'delete-cursor' : ''}`} style={{ position: 'relative', border: '2px dashed #ccc', minHeight: '800px', background: '#fafafa', overflow: 'hidden' }}>
        <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 5 }}>
          <g style={{ pointerEvents: 'auto' }}>
            {wires.map(wire => (
              <Wire key={wire.id} wire={wire} onClick={() => deleteWire(wire.id)} isDeleteMode={isDeleteMode} />
            ))}
          </g>
        </svg>

        <div style={{ position: 'absolute', top: `${BB_Y}px`, left: `${BB_X}px` }}>
          <Breadboard onHoleClick={handleHoleClick} selectedHoleId={selectedHole?.id} />
        </div>
        
        {parts.map(part => (
          part.type === 'FZP' && part.fzpData ? (
            <FritzingPartComponent key={part.id} part={part.fzpData} rotation={part.rotation} initialPos={{ x: part.x, y: part.y }} onClick={() => isDeleteMode ? deletePart(part.id) : rotatePart(part.id)} isDeleteMode={isDeleteMode} isTransparent={isTransparentMode} showLabel={showLabels} />
          ) : (
            <DraggablePart key={part.id} name={part.type} rotation={part.rotation} initialPos={{ x: part.x, y: part.y }} onClick={() => isDeleteMode ? deletePart(part.id) : rotatePart(part.id)} isDeleteMode={isDeleteMode} isTransparent={isTransparentMode} showLabel={showLabels} />
          )
        ))}
      </div>
    </div>
  );
}

export default App;
