import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';

export interface FritzingConnector {
  id: string;
  svgId: string;
}

export interface FritzingPart {
  id: string;
  name: string;
  svgContent: string;
  connectors: FritzingConnector[];
  width: number;
  height: number;
  viewBox: string;
}

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });

export const parseFritzingPart = (fzpText: string, svgText: string): FritzingPart => {
  const fzpData = parser.parse(fzpText);
  const domParser = new DOMParser();
  const svgDoc = domParser.parseFromString(svgText, 'image/svg+xml');
  const svgEl = svgDoc.querySelector('svg');
  if (!svgEl) throw new Error('Invalid SVG');

  const viewBoxAttr = svgEl.getAttribute('viewBox');
  const widthAttr = svgEl.getAttribute('width') || '';
  const heightAttr = svgEl.getAttribute('height') || '';

  const viewBox = viewBoxAttr || `0 0 ${parseFloat(widthAttr) || 100} ${parseFloat(heightAttr) || 100}`;
  const vb = viewBox.split(/[ ,]+/).map(parseFloat);
  const vbW = vb[2];
  const vbH = vb[3];
  const aspectRatio = vbW / vbH;

  const connectors: FritzingConnector[] = [];
  const fzpConnectors = fzpData.module.connectors?.connector;
  if (fzpConnectors) {
    const connList = Array.isArray(fzpConnectors) ? fzpConnectors : [fzpConnectors];
    connList.forEach((c: any) => {
      let svgId = c.views?.breadboardView?.p?.svgId || c.views?.breadboardView?.svgId || `${c.id}pin`;
      connectors.push({ id: c.id, svgId });
    });
  }

  // --- SMART SCALE CALCULATION ---
  const toPx = (dim: string) => {
    const val = parseFloat(dim);
    if (dim.includes('mm')) return (val / 25.4) * 150;
    if (dim.includes('in')) return val * 150;
    return (val / 90) * 150; // Fallback assume 90 DPI
  };

  let width = widthAttr && !widthAttr.includes('%') ? toPx(widthAttr) : 150;
  let height = heightAttr && !heightAttr.includes('%') ? toPx(heightAttr) : width / aspectRatio;
  
  // Refine scale based on pin spacing only if physical info is missing or seems wrong
  const shadowContainer = document.createElement('div');
  shadowContainer.style.cssText = 'position:absolute;visibility:hidden;left:-9999px;';
  shadowContainer.innerHTML = svgText;
  document.body.appendChild(shadowContainer);
  const shadowSvg = shadowContainer.querySelector('svg')!;
  
  const pins: {x: number, y: number}[] = [];
  connectors.slice(0, 20).forEach(c => {
    const el = (shadowSvg.getElementById(c.svgId) || shadowSvg.querySelector(`[id$="${c.svgId}"]`)) as any;
    if (el && typeof el.getBBox === 'function') {
      const b = el.getBBox();
      pins.push({ x: b.x + b.width/2, y: b.y + b.height/2 });
    }
  });

  if (pins.length >= 2) {
    let minDist = Infinity;
    for(let i=0; i<pins.length; i++) {
      for(let j=i+1; j<pins.length; j++) {
        const d = Math.sqrt(Math.pow(pins[i].x - pins[j].x, 2) + Math.pow(pins[i].y - pins[j].y, 2));
        if (d > 1 && d < minDist) minDist = d;
      }
    }

    if (minDist !== Infinity) {
      // 0.1 inch is the target unit.
      // If minDist corresponds to N * 0.1 inch, we find N.
      // Standard Fritzing pitches in ViewBox units: 7.2, 10.0, 9.0, 9.6
      const pitchCandidate = minDist;
      // Heuristic: If it's a pushbutton, the min dist might be 0.2 inch.
      // We assume the true pitch is the closest multiple of 0.1 inch DPI.
      const rawDpi = 150 * (pitchCandidate / 15); // This doesn't make sense, let's rethink.
      
      // Let's assume the SVG author used a standard DPI: 72, 90, 96 or 100.
      const possibleDpis = [72, 90, 96, 100, 500, 1000];
      const detectedDpi = possibleDpis.reduce((p, c) => 
        Math.abs(widthAttr.includes('px') ? (parseFloat(widthAttr)/vbW)*c : 1 - (pitchCandidate/15)*c) // logic loop
      , 90);
      
      // Simplify: Trust physical width/height if it exists and results in plausible pin pitch.
      const currentPitch = (minDist / vbW) * width;
      const pitchInInches = currentPitch / 150;
      
      // If the resulting pitch is very far from common ones (0.1, 0.2, 0.05), adjust.
      const targetPitches = [0.1, 0.2, 0.3, 0.05];
      const closestTarget = targetPitches.reduce((p, c) => Math.abs(c - pitchInInches) < Math.abs(p - pitchInInches) ? c : p);
      
      if (Math.abs(pitchInInches - closestTarget) > 0.01) {
        const correction = closestTarget / pitchInInches;
        width *= correction;
        height *= correction;
      }
    }
  }

  document.body.removeChild(shadowContainer);

  svgEl.setAttribute('width', '100%');
  svgEl.setAttribute('height', '100%');
  const svgContent = new XMLSerializer().serializeToString(svgEl);

  return { id: `fzp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, name: fzpData.module.title || 'Part', svgContent, connectors, width, height, viewBox };
};

export const loadFullPartByFzpPath = async (fzpPath: string): Promise<FritzingPart> => {
  const fzpRes = await fetch(fzpPath);
  const fzpText = await fzpRes.text();
  const fzpData = parser.parse(fzpText);
  const svgUrl = `/parts/fritzing-parts/svg/core/${fzpData.module.views.breadboardView.layers.image}`;
  const svgRes = await fetch(svgUrl);
  return parseFritzingPart(fzpText, await svgRes.text());
};

export const loadFzpz = async (file: File): Promise<FritzingPart> => {
  const zip = new JSZip();
  const content = await zip.loadAsync(file);
  const fzp = Object.keys(content.files).find(n => n.endsWith('.fzp'))!;
  const svg = Object.keys(content.files).find(n => n.includes('breadboard') && n.endsWith('.svg'))!;
  return parseFritzingPart(await content.files[fzp].async('text'), await content.files[svg].async('text'));
};
