import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';

export interface FritzingConnector {
  id: string;
  name: string;
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
  anchor: { x: number, y: number };
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

  const parseToInches = (dim: string): number | null => {
    const val = parseFloat(dim);
    if (dim.includes('mm')) return val / 25.4;
    if (dim.includes('in')) return val;
    if (dim.includes('pt')) return val / 72;
    if (dim.includes('pc')) return val / 6;
    return null;
  };

  let dpi = 90;
  const widthInInches = parseToInches(widthAttr);
  if (widthInInches && widthInInches > 0) {
    dpi = vbW / widthInInches;
  } else {
    // Arduino Nano and others: width="50.4px" viewBox="0 0 50.4 ..." => 72 DPI
    if (Math.abs(parseFloat(widthAttr) - vbW) < 0.1) dpi = 72;
  }

  // Target: 1 inch = 150px (15px per 0.1in)
  const scaleFactor = 150 / dpi;
  const width = vbW * scaleFactor;
  const height = vbH * scaleFactor;

  const connectors: FritzingConnector[] = [];
  const fzpConnectors = fzpData.module.connectors?.connector;
  if (fzpConnectors) {
    const connList = Array.isArray(fzpConnectors) ? fzpConnectors : [fzpConnectors];
    connList.forEach((c: any) => {
      const bv = c.views?.breadboardView?.p;
      const connP = Array.isArray(bv) ? bv[0] : bv;
      connectors.push({ 
        id: c.id, 
        name: c.name || '',
        svgId: connP?.svgId || `${c.id}pin`, 
        legId: connP?.legId 
      });
    });
  }

  svgEl.setAttribute('width', '100%');
  svgEl.setAttribute('height', '100%');
  svgEl.setAttribute('preserveAspectRatio', 'xMinYMin meet');
  const svgContent = new XMLSerializer().serializeToString(svgEl);

  return { id: `fzp-${Date.now()}`, name: fzpData.module.title || 'Part', svgContent, connectors, width, height, viewBox, anchor: {x:0, y:0} };
};

export const loadFullPartByFzpPath = async (fzpPath: string): Promise<FritzingPart> => {
  const fzpRes = await fetch(fzpPath);
  const fzpText = await fzpRes.text();
  const fzpData = parser.parse(fzpText);
  const relativeSvgPath = fzpData.module.views.breadboardView.layers.image;
  
  // Determine SVG base path based on FZP path
  let svgUrl = '';
  if (fzpPath.includes('fritzing-parts/core')) {
    svgUrl = `parts/fritzing-parts/svg/core/${relativeSvgPath}`;
  } else if (fzpPath.includes('fritzing-parts/contrib')) {
    svgUrl = `parts/fritzing-parts/svg/contrib/${relativeSvgPath}`;
  } else {
    // Fallback or other libraries
    const baseDir = fzpPath.substring(0, fzpPath.lastIndexOf('/core/') + 1) || 'parts/fritzing-parts/';
    svgUrl = `${baseDir}svg/core/${relativeSvgPath}`;
  }

  const svgRes = await fetch(svgUrl);
  return parseFritzingPart(fzpText, await svgRes.text());
};

export const loadFullPartByFzpzPath = async (fzpzPath: string): Promise<FritzingPart> => {
  const res = await fetch(fzpzPath);
  const blob = await res.blob();
  const zip = new JSZip();
  const content = await zip.loadAsync(blob);
  const fzpFile = Object.keys(content.files).find(n => n.endsWith('.fzp'))!;
  const svgFile = Object.keys(content.files).find(n => n.includes('breadboard') && n.endsWith('.svg'))!;
  return parseFritzingPart(await content.files[fzpFile].async('text'), await content.files[svgFile].async('text'));
};

export const loadFzpz = async (file: File): Promise<FritzingPart> => {
  const zip = new JSZip();
  const content = await zip.loadAsync(file);
  const fzp = Object.keys(content.files).find(n => n.endsWith('.fzp'))!;
  const svg = Object.keys(content.files).find(n => n.includes('breadboard') && n.endsWith('.svg'))!;
  return parseFritzingPart(await content.files[fzp].async('text'), await content.files[svg].async('text'));
};
