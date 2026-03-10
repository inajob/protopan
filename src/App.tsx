import { useState, useEffect } from 'react';
import './App.css';
import Breadboard from './components/Breadboard';
import type { HoleInfo } from './components/Breadboard';
import Wire from './components/Wire';
import type { WireData } from './components/Wire';
import { loadFzpz, loadFullPartByFzpPath, loadFullPartByFzpzPath } from './utils/FritzingPartLoader';
import type { FritzingPart } from './utils/FritzingPartLoader';
import FritzingPartComponent from './components/FritzingPartComponent';

interface PartInstance {
  id: string; type: string; x: number; y: number; rotation: number; fzpData: FritzingPart;
}

interface LibEntry { name: string; path: string; type: 'fzp' | 'fzpz'; }

const BREADBOARD_SIZES = [
  { label: 'Tiny (17)', rows: 17 },
  { label: 'Half (30)', rows: 30 },
  { label: 'Full (63)', rows: 63 }
];

function App() {
  const [parts, setParts] = useState<PartInstance[]>([]);
  const [wires, setWires] = useState<WireData[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<{ x: number, y: number } | null>(null);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [isTransparentMode, setIsTransparentMode] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [bbRows, setBbRows] = useState(30);
  
  const [partIndex, setPartIndex] = useState<LibEntry[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const BB_X = 60;
  const BB_Y = 60;

  useEffect(() => {
    fetch('parts-index.json').then(r => r.json()).then(setPartIndex).catch(console.error);
  }, []);

  const addPartFromLib = async (entry: LibEntry) => {
    setIsLoading(true);
    try {
      let partData: FritzingPart;
      if (entry.type === 'fzpz') {
        partData = await loadFullPartByFzpzPath(entry.path);
      } else {
        partData = await loadFullPartByFzpPath(entry.path);
      }
      setParts([...parts, { id: partData.id, type: 'FZP', x: 210, y: 210, rotation: 0, fzpData: partData }]);
    } catch (err) { 
      console.error(err);
      alert('Failed to load part.'); 
    }
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

  const updatePartPos = (id: string, x: number, y: number) => {
    setParts(parts.map(p => p.id === id ? { ...p, x, y } : p));
  };

  const deletePart = (id: string) => setParts(parts.filter(p => p.id !== id));
  const rotatePart = (id: string) => setParts(parts.map(p => p.id === id ? { ...p, rotation: (p.rotation + 90) % 360 } : p));
  const deleteWire = (id: string) => setWires(wires.filter(w => w.id !== id));

  const handlePointClick = (absX: number, absY: number) => {
    if (isDeleteMode) return;
    if (!selectedPoint) {
      setSelectedPoint({ x: absX, y: absY });
    } else {
      if (selectedPoint.x !== absX || selectedPoint.y !== absY) {
        const x1 = selectedPoint.x;
        const y1 = selectedPoint.y;
        const x2 = absX;
        const y2 = absY;
        const dist = Math.sqrt(Math.pow(x2-x1, 2) + Math.pow(y2-y1, 2));
        const colorMap: any = { 15:'#8B4513', 30:'#FF0000', 45:'#FFA500', 60:'#FFFF00', 75:'#008000', 90:'#0000FF' };
        setWires([...wires, { id: `wire-${Date.now()}`, from: { x: x1, y: y1 }, to: { x: x2, y: y2 }, color: colorMap[Math.round(dist)] || '#333' }]);
      }
      setSelectedPoint(null);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (isDeleteMode) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    // Use scrollLeft/Top to get absolute coordinates within the scrollable area
    const x = e.clientX - rect.left + e.currentTarget.scrollLeft;
    const y = e.clientY - rect.top + e.currentTarget.scrollTop;
    const absX = Math.round(x / 15) * 15;
    const absY = Math.round(y / 15) * 15;
    handlePointClick(absX, absY);
  };

  const filteredIndex = search.length > 1 
    ? partIndex.filter(p => p.name.toLowerCase().includes(search.toLowerCase())).slice(0, 50)
    : [];

  return (
    <div className="editor-container">
      <div className="sidebar">
        <div style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <img src="icon.png" alt="Protopan Logo" style={{ width: '32px', height: '32px' }} />
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: '#0071e3', letterSpacing: '-0.5px' }}>Protopan</h1>
          </div>
          <input 
            type="text" className="sidebar-search" placeholder="Search components..." 
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
          {isLoading && <p style={{ fontSize: '12px' }}>Loading component...</p>}
          {filteredIndex.map(p => (
            <div key={p.path} onClick={() => addPartFromLib(p)} style={{ padding: '10px 0', cursor: 'pointer', borderBottom: '1px solid #eee', fontSize: '13px', color: '#333' }}>{p.name}</div>
          ))}
        </div>
      </div>

      <div className="main-area">
        <div className="toolbar">
          <div className="tool-group">
            <label htmlFor="fzpz-upload" className="tool-button">Import .fzpz</label>
            <input type="file" accept=".fzpz" onChange={handleFileUpload} id="fzpz-upload" style={{ display: 'none' }} />
          </div>
          <div className="tool-group">
            <select value={bbRows} onChange={(e) => setBbRows(Number(e.target.value))} style={{ padding: '4px 8px', fontSize: '13px', border: 'none', background: 'transparent', cursor: 'pointer' }}>
              {BREADBOARD_SIZES.map(s => ( <option key={s.rows} value={s.rows}>BB: {s.label}</option> ))}
            </select>
          </div>
          <div className="tool-group">
            <button onClick={() => setShowLabels(!showLabels)} className={`tool-button ${showLabels ? 'active' : ''}`}>Labels</button>
            <button onClick={() => setIsTransparentMode(!isTransparentMode)} className={`tool-button ${isTransparentMode ? 'active' : ''}`}>X-Ray</button>
          </div>
          <div className="tool-group">
            <button onClick={() => setIsDeleteMode(!isDeleteMode)} className={`tool-button danger ${isDeleteMode ? 'active' : ''}`}>Delete</button>
          </div>
        </div>
        
        <div className={`canvas ${isDeleteMode ? 'delete-cursor' : ''}`} onClick={handleCanvasClick}>
          <svg style={{ position: 'absolute', top: 0, left: 0, width: '4000px', height: '2000px', pointerEvents: 'none', zIndex: 200 }}>
            <g style={{ pointerEvents: 'auto' }}>
              {wires.map(wire => ( <Wire key={wire.id} wire={wire} onClick={() => deleteWire(wire.id)} isDeleteMode={isDeleteMode} /> ))}
              {selectedPoint && (
                <circle cx={selectedPoint.x} cy={selectedPoint.y} r={5} fill="#FF9800" opacity={0.6} />
              )}
            </g>
          </svg>
          <div style={{ position: 'absolute', top: `${BB_Y}px`, left: `${BB_X}px` }}>
            <Breadboard rows={bbRows} onHoleClick={(h) => handlePointClick(h.x + BB_X, h.y + BB_Y)} selectedHoleId={null} />
          </div>
          {parts.map(part => (
            <FritzingPartComponent 
              key={part.id} 
              part={part.fzpData} 
              rotation={part.rotation} 
              initialPos={{ x: part.x, y: part.y }} 
              onMove={(x, y) => updatePartPos(part.id, x, y)} 
              onClick={() => isDeleteMode ? deletePart(part.id) : rotatePart(part.id)} 
              isDeleteMode={isDeleteMode} 
              isTransparent={isTransparentMode} 
              showLabel={showLabels} 
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
