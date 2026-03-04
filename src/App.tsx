import { useState, useEffect } from 'react';
import './App.css';
import Breadboard from './components/Breadboard';
import type { HoleInfo } from './components/Breadboard';
import DraggablePart from './components/DraggablePart';
import Wire from './components/Wire';
import type { WireData } from './components/Wire';
import { loadFzpz, loadFullPartByFzpPath } from './utils/FritzingPartLoader';
import type { FritzingPart } from './utils/FritzingPartLoader';
import FritzingPartComponent from './components/FritzingPartComponent';

interface PartInstance {
  id: string; type: string; x: number; y: number; rotation: number; fzpData?: FritzingPart;
}

interface LibEntry { name: string; path: string; }

function App() {
  const [parts, setParts] = useState<PartInstance[]>([]);
  const [wires, setWires] = useState<WireData[]>([]);
  const [selectedHole, setSelectedHole] = useState<HoleInfo | null>(null);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [isTransparentMode, setIsTransparentMode] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  
  const [partIndex, setPartIndex] = useState<LibEntry[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // CRITICAL: Align breadboard to grid multiples (e.g., 60, 60)
  const BB_X = 60;
  const BB_Y = 60;

  useEffect(() => {
    fetch('/parts-index.json').then(r => r.json()).then(setPartIndex).catch(console.error);
  }, []);

  const addLed = () => setParts([...parts, { id: `led-${Date.now()}`, type: 'LED', x: 150, y: 150, rotation: 0 }]);

  const addPartFromLib = async (entry: LibEntry) => {
    setIsLoading(true);
    try {
      const partData = await loadFullPartByFzpPath(`/parts/fritzing-parts/core/${entry.path}`);
      setParts([...parts, { id: partData.id, type: 'FZP', x: 210, y: 210, rotation: 0, fzpData: partData }]);
    } catch (err) { alert('Failed to load part.'); }
    setIsLoading(false);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const partData = await loadFzpz(file);
        setParts([...parts, { id: partData.id, type: 'FZP', x: 210, y: 210, rotation: 0, fzpData: partData }]);
      } catch (err) { alert('Failed to load .fzpz'); }
    }
  };

  const deletePart = (id: string) => setParts(parts.filter(p => p.id !== id));
  const rotatePart = (id: string) => setParts(parts.map(p => p.id === id ? { ...p, rotation: (p.rotation + 90) % 360 } : p));
  const deleteWire = (id: string) => setWires(wires.filter(w => w.id !== id));

  const handleHoleClick = (hole: HoleInfo) => {
    if (isDeleteMode) return;
    if (!selectedHole) setSelectedHole(hole);
    else {
      if (selectedHole.id !== hole.id) {
        // Wire coordinates are relative to the canvas origin
        const x1 = selectedHole.x + BB_X;
        const y1 = selectedHole.y + BB_Y;
        const x2 = hole.x + BB_X;
        const y2 = hole.y + BB_Y;
        
        // Simple color logic by distance
        const dist = Math.sqrt(Math.pow(x2-x1, 2) + Math.pow(y2-y1, 2));
        const colorMap: any = { 15:'#8B4513', 30:'#FF0000', 45:'#FFA500', 60:'#FFFF00', 75:'#008000', 90:'#0000FF' };
        const color = colorMap[Math.round(dist)] || '#333';

        setWires([...wires, { id: `wire-${Date.now()}`, from: { x: x1, y: y1 }, to: { x: x2, y: y2 }, color }]);
      }
      setSelectedHole(null);
    }
  };

  const filteredIndex = search.length > 1 
    ? partIndex.filter(p => p.name.toLowerCase().includes(search.toLowerCase())).slice(0, 50)
    : [];

  return (
    <div className="editor-container">
      <div className="sidebar">
        <div style={{ padding: '15px' }}>
          <h3 style={{ margin: '0 0 10px 0' }}>Parts Library</h3>
          <input 
            type="text" placeholder="Search..." 
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 15px' }}>
          {isLoading && <p>Loading...</p>}
          {filteredIndex.map(p => (
            <div key={p.path} onClick={() => addPartFromLib(p)} style={{ padding: '8px 0', cursor: 'pointer', borderBottom: '1px solid #eee', fontSize: '12px' }}>{p.name}</div>
          ))}
        </div>
      </div>

      <div className="main-area">
        <div className="toolbar">
          <button onClick={addLed} style={{ padding: '8px 16px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Add LED</button>
          <input type="file" accept=".fzpz" onChange={handleFileUpload} id="fzpz-upload" style={{ display: 'none' }} />
          <label htmlFor="fzpz-upload" style={{ padding: '8px 16px', background: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Load .fzpz</label>
          <button onClick={() => setShowLabels(!showLabels)} style={{ padding: '8px 12px', background: '#00bcd4', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Labels</button>
          <button onClick={() => setIsTransparentMode(!isTransparentMode)} style={{ padding: '8px 12px', background: isTransparentMode ? '#673ab7' : '#9e9e9e', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Trans</button>
          <button onClick={() => setIsDeleteMode(!isDeleteMode)} style={{ padding: '8px 12px', background: isDeleteMode ? '#f44336' : '#9e9e9e', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Delete</button>
        </div>
        
        <div className={`canvas ${isDeleteMode ? 'delete-cursor' : ''}`}>
          <svg style={{ position: 'absolute', top: 0, left: 0, width: '3000px', height: '3000px', pointerEvents: 'none', zIndex: 5 }}>
            <g style={{ pointerEvents: 'auto' }}>
              {wires.map(wire => ( <Wire key={wire.id} wire={wire} onClick={() => deleteWire(wire.id)} isDeleteMode={isDeleteMode} /> ))}
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
    </div>
  );
}

export default App;
