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

export const loadFzpz = async (file: File): Promise<FritzingPart> => {
  const zip = new JSZip();
  const content = await zip.loadAsync(file);
  
  const fzpFile = Object.keys(content.files).find(name => name.endsWith('.fzp'));
  if (!fzpFile) throw new Error('No .fzp file found');

  const fzpText = await content.files[fzpFile].async('text');
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });
  const fzpData = parser.parse(fzpText);

  const connectors: FritzingConnector[] = [];
  const fzpConnectors = fzpData.module.connectors?.connector;
  if (fzpConnectors) {
    const connList = Array.isArray(fzpConnectors) ? fzpConnectors : [fzpConnectors];
    connList.forEach((c: any) => {
      const svgId = c.views?.breadboardView?.p?.svgId;
      if (svgId) {
        connectors.push({ id: c.id, svgId });
      }
    });
  }

  const svgFileName = Object.keys(content.files).find(name => name.includes('breadboard') && name.endsWith('.svg'));
  if (!svgFileName) throw new Error('No breadboard SVG found');

  let svgContent = await content.files[svgFileName].async('text');
  svgContent = svgContent.replace(/<\?xml.*\?>/, '').replace(/<!DOCTYPE.*>/, '');

  const widthMatch = svgContent.match(/width="([\d.]+)([a-z%]*)"/);
  const heightMatch = svgContent.match(/height="([\d.]+)([a-z%]*)"/);
  const viewBoxMatch = svgContent.match(/viewBox="([\d. ]+)"/);
  
  const parseDim = (valStr: string | null, unit: string | null) => {
    if (!valStr) return 100;
    const val = parseFloat(valStr);
    if (unit === 'mm') return (val / 25.4) * 150;
    if (unit === 'in') return val * 150;
    // For px or no unit, assume standard 96 DPI
    return (val / 96) * 150; 
  };

  const width = parseDim(widthMatch ? widthMatch[1] : null, widthMatch ? widthMatch[2] : null);
  const height = parseDim(heightMatch ? heightMatch[1] : null, heightMatch ? heightMatch[2] : null);

  // CRITICAL: Force SVG to scale to container
  svgContent = svgContent.replace(/width="[\d.]+[a-z%]*"/, 'width="100%"');
  svgContent = svgContent.replace(/height="[\d.]+[a-z%]*"/, 'height="100%"');

  return {
    id: `fzp-${Date.now()}`,
    name: fzpData.module.title || 'Fritzing Part',
    svgContent,
    connectors,
    width,
    height,
    viewBox: viewBoxMatch ? viewBoxMatch[1] : `0 0 ${widthMatch ? widthMatch[1] : width} ${heightMatch ? heightMatch[1] : height}`,
  };
};
