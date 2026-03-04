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
  const widthAttr = svgEl.getAttribute('width') || '100';
  const heightAttr = svgEl.getAttribute('height') || '100';

  // Helper to parse physical dimensions to 150 DPI (15px = 0.1in)
  const toPx = (dim: string) => {
    const val = parseFloat(dim);
    if (dim.includes('mm')) return (val / 25.4) * 150;
    if (dim.includes('in')) return val * 150;
    return (val / 96) * 150; // Assume 96 DPI for raw pixels
  };

  let width = toPx(widthAttr);
  let height = toPx(heightAttr);

  // If viewBox is missing, create it from physical dimensions
  const viewBox = viewBoxAttr || `0 0 ${parseFloat(widthAttr)} ${parseFloat(heightAttr)}`;
  const vb = viewBox.split(/[ ,]+/).map(parseFloat);
  
  // Aspect Ratio must be preserved
  const aspectRatio = vb[2] / vb[3];
  if (widthAttr.includes('%') || !widthAttr) {
    // If no physical size, guess from connectors later? 
    // For now, use 100px as base
    width = 150;
    height = width / aspectRatio;
  }

  // Cleanup connectors metadata only
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

  // Set SVG to fill the container we provide
  svgEl.setAttribute('width', '100%');
  svgEl.setAttribute('height', '100%');
  svgEl.removeAttribute('x');
  svgEl.removeAttribute('y');
  const svgContent = new XMLSerializer().serializeToString(svgEl);

  return {
    id: `fzp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    name: fzpData.module.title || 'Fritzing Part',
    svgContent,
    connectors,
    width,
    height,
    viewBox
  };
};

export const loadPartFromUrl = async (fzpUrl: string, svgUrl: string): Promise<FritzingPart> => {
  const [fzpRes, svgRes] = await Promise.all([fetch(fzpUrl), fetch(svgUrl)]);
  return parseFritzingPart(await fzpRes.text(), await svgRes.text());
};

export const loadFzpz = async (file: File): Promise<FritzingPart> => {
  const zip = new JSZip();
  const content = await zip.loadAsync(file);
  const fzp = Object.keys(content.files).find(n => n.endsWith('.fzp'))!;
  const svg = Object.keys(content.files).find(n => n.includes('breadboard') && n.endsWith('.svg'))!;
  return parseFritzingPart(await content.files[fzp].async('text'), await content.files[svg].async('text'));
};
