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
        const x1 = selectedHole.x + BB_X;
        const y1 = selectedHole.y + BB_Y;
        const x2 = hole.x + BB_X;
        const y2 = hole.y + BB_Y;
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
      {/* Sidebar */}
      <div className="sidebar">
        <div style={{ padding: '20px' }}>
          <h3>Library</h3>
          <input 
            type="text" className="sidebar-search" placeholder="Search components..." 
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
          {isLoading && <p style={{ fontSize: '12px' }}>Loading component...</p>}
          {filteredIndex.map(p => (
            <div key={p.path} onClick={() => addPartFromLib(p)} style={{ padding: '10px 0', cursor: 'pointer', borderBottom: '1px solid #eee', fontSize: '13px', color: '#333' }}>
              {p.name}
            </div>
          ))}
          {search.length > 1 && filteredIndex.length === 0 && <p style={{ fontSize: '12px', color: '#999' }}>No results.</p>}
        </div>
      </div>

      <div className="main-area">
        {/* Modern Native Toolbar */}
        <div className="toolbar">
          <div className="tool-group">
            <button onClick={addLed} className="tool-button primary">＋ LED</button>
            <input type="file" accept=".fzpz" onChange={handleFileUpload} id="fzpz-upload" style={{ display: 'none' }} />
            <label htmlFor="fzpz-upload" className="tool-button">Import .fzpz</label>
          </div>

          <div className="tool-group">
            <button onClick={() => setShowLabels(!showLabels)} className={`tool-button ${showLabels ? 'active' : ''}`}>
              {showLabels ? '● Labels' : '○ Labels'}
            </button>
            <button onClick={() => setIsTransparentMode(!isTransparentMode)} className={`tool-button ${isTransparentMode ? 'active' : ''}`}>
              {isTransparentMode ? '● X-Ray' : '○ X-Ray'}
            </button>
          </div>

          <div className="tool-group">
            <button onClick={() => setIsDeleteMode(!isDeleteMode)} className={`tool-button danger ${isDeleteMode ? 'active' : ''}`}>
              {isDeleteMode ? 'Stop Deleting' : 'Delete Mode'}
            </button>
          </div>

          <div style={{ flex: 1 }} />
          <span style={{ fontSize: '12px', color: '#8e8e93' }}>Breadboard Editor v0.1</span>
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
