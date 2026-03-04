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

  const connectors: FritzingConnector[] = [];
  const fzpConnectors = fzpData.module.connectors?.connector;
  if (fzpConnectors) {
    const connList = Array.isArray(fzpConnectors) ? fzpConnectors : [fzpConnectors];
    connList.forEach((c: any) => {
      let svgId = c.views?.breadboardView?.p?.svgId || c.views?.breadboardView?.svgId;
      if (!svgId) svgId = `${c.id}pin`;
      connectors.push({ id: c.id, svgId });
    });
  }

  let scaleFactor = 1.0;
  
  // CRITICAL FIX: Temporarily add SVG to body to use getBBox()
  const shadowContainer = document.createElement('div');
  shadowContainer.style.position = 'absolute';
  shadowContainer.style.left = '-9999px';
  shadowContainer.style.visibility = 'hidden';
  shadowContainer.innerHTML = svgText;
  document.body.appendChild(shadowContainer);
  
  const shadowSvg = shadowContainer.querySelector('svg');
  const pins: {x: number, y: number}[] = [];
  
  if (shadowSvg) {
    connectors.forEach(c => {
      const el = (shadowSvg.getElementById(c.svgId) || shadowSvg.querySelector(`[id$="${c.svgId}"]`)) as any;
      if (el && typeof el.getBBox === 'function') {
        const b = el.getBBox();
        pins.push({ x: b.x + b.width/2, y: b.y + b.height/2 });
      }
    });
  }

  if (pins.length >= 2) {
    let minDist = Infinity;
    for(let i=0; i<pins.length; i++) {
      for(let j=i+1; j<pins.length; j++) {
        const d = Math.sqrt(Math.pow(pins[i].x - pins[j].x, 2) + Math.pow(pins[i].y - pins[j].y, 2));
        // Use a small epsilon to ignore identical points
        if (d > 0.5 && d < minDist) minDist = d;
      }
    }

    if (minDist !== Infinity) {
      // Common Fritzing DPIs represented as pitch in ViewBox units
      const possiblePitches = [7.2, 10.0, 9.0, 9.6, 3.6, 5.0, 2.54]; 
      const closestPitch = possiblePitches.reduce((prev, curr) => 
        Math.abs(curr - minDist) < Math.abs(prev - minDist) ? curr : prev
      );

      if (Math.abs(minDist - closestPitch) < 1.0) {
        const effectiveGridPitch = (closestPitch <= 5.0 && closestPitch > 2.0) ? closestPitch * 2 : closestPitch;
        scaleFactor = 15 / effectiveGridPitch;
      } else {
        scaleFactor = 15 / minDist;
      }
    }
  }

  document.body.removeChild(shadowContainer);

  // Safety fallback if no pins or weird scale
  if (pins.length < 2 || scaleFactor > 20 || scaleFactor < 0.05) {
    const toPx = (dim: string) => {
      const val = parseFloat(dim);
      if (dim.includes('mm')) return (val / 25.4) * 150;
      if (dim.includes('in')) return val * 150;
      return (val / 90) * 150;
    };
    scaleFactor = widthAttr && !widthAttr.includes('%') ? toPx(widthAttr) / vbW : 150 / 90;
  }

  const width = vbW * scaleFactor;
  const height = vbH * scaleFactor;

  svgEl.setAttribute('width', '100%');
  svgEl.setAttribute('height', '100%');
  svgEl.setAttribute('preserveAspectRatio', 'xMinYMin meet');
  const svgContent = new XMLSerializer().serializeToString(svgEl);

  return { id: `fzp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, name: fzpData.module.title || 'Fritzing Part', svgContent, connectors, width, height, viewBox };
};

export const loadFullPartByFzpPath = async (fzpPath: string): Promise<FritzingPart> => {
  const fzpRes = await fetch(fzpPath);
  const fzpText = await fzpRes.text();
  const fzpData = parser.parse(fzpText);
  const relativeSvgPath = fzpData.module.views.breadboardView.layers.image;
  const svgUrl = `/parts/fritzing-parts/svg/core/${relativeSvgPath}`;
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
