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

  // Helper to parse dimensions correctly (15px = 0.1in)
  const toPx = (dim: string, fallback: number) => {
    if (!dim || dim.includes('%')) return fallback;
    const val = parseFloat(dim);
    if (dim.includes('mm')) return (val / 25.4) * 150;
    if (dim.includes('in')) return val * 150;
    return (val / 96) * 150; // Standardize 96dpi to 150dpi
  };

  const viewBox = viewBoxAttr || `0 0 ${parseFloat(widthAttr) || 100} ${parseFloat(heightAttr) || 100}`;
  const vb = viewBox.split(/[ ,]+/).map(parseFloat);
  const aspectRatio = vb[2] / vb[3];

  let width = toPx(widthAttr, 150); // Default to 1 inch wide if unknown
  let height = toPx(heightAttr, width / aspectRatio);

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

  // Force SVG to be a scalable block
  svgEl.setAttribute('width', '100%');
  svgEl.setAttribute('height', '100%');
  svgEl.setAttribute('preserveAspectRatio', 'xMinYMin meet');
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
