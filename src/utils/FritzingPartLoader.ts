import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';

export interface FritzingConnector {
  id: string;
  svgId: string;
  legId?: string;
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

  // --- REFINED DPI DETECTION ---
  let dpi = 72; // Default for many Fritzing parts (Illustrator base)
  
  const parseToInches = (dim: string): number | null => {
    const val = parseFloat(dim);
    if (dim.includes('mm')) return val / 25.4;
    if (dim.includes('in')) return val;
    if (dim.includes('pt')) return val / 72;
    if (dim.includes('pc')) return val / 6;
    return null;
  };

  const widthInInches = parseToInches(widthAttr);
  if (widthInInches && widthInInches > 0) {
    dpi = vbW / widthInInches;
  } else {
    // If no explicit physical unit, check if it's likely 72, 90, or 96
    // Arduino Nano uses 50.4px for 0.7in -> 50.4 / 0.7 = 72 DPI
    const commonDpis = [72, 90, 96, 100];
    const detectedDpi = vbW / (parseFloat(widthAttr) / 72); // loop logic? No.
    
    // Most Fritzing parts where px == viewBox units are 72 DPI
    if (Math.abs(parseFloat(widthAttr) - vbW) < 0.1) {
      dpi = 72; 
    } else {
      dpi = 90; // Inkscape default
    }
  }

  // Final scale factor to reach our internal 150 DPI (15px = 0.1in)
  const scaleFactor = 150 / dpi;
  const width = vbW * scaleFactor;
  const height = vbH * scaleFactor;

  const connectors: FritzingConnector[] = [];
  const fzpConnectors = fzpData.module.connectors?.connector;
  if (fzpConnectors) {
    const connList = Array.isArray(fzpConnectors) ? fzpConnectors : [fzpConnectors];
    connList.forEach((c: any) => {
      const breadboardView = c.views?.breadboardView?.p;
      const connP = Array.isArray(breadboardView) ? breadboardView[0] : breadboardView;
      connectors.push({ id: c.id, svgId: connP?.svgId || `${c.id}pin`, legId: connP?.legId });
    });
  }

  svgEl.setAttribute('width', '100%');
  svgEl.setAttribute('height', '100%');
  svgEl.setAttribute('preserveAspectRatio', 'xMinYMin meet');
  const svgContent = new XMLSerializer().serializeToString(svgEl);

  console.log(`Loaded ${fzpData.module.title}: WidthAttr=${widthAttr}, vbW=${vbW}, Detected DPI=${dpi}, Scale=${scaleFactor}`);

  return { id: `fzp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, name: fzpData.module.title || 'Part', svgContent, connectors, width, height, viewBox };
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
