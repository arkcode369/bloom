import * as d3 from 'd3';
import type { TagInfo } from '@/hooks/useGraphData';

// Re-export pure graph algorithms from lib/graph so consumers can import
// from a single place without depending on a specific rendering context.
export {
  buildAdjacencyMap,
  getKHopNeighbors,
  calculateActivationIntensity,
} from '@/lib/graph/algorithms';

// Expand a convex hull by a certain padding amount
export function expandHull(hull: [number, number][], padding: number): [number, number][] {
  if (hull.length < 3) return hull;

  // Find centroid
  const centroid = d3.polygonCentroid(hull);
  
  // Expand each point away from centroid
  return hull.map(point => {
    const dx = point[0] - centroid[0];
    const dy = point[1] - centroid[1];
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) return point;
    const scale = (dist + padding) / dist;
    return [
      centroid[0] + dx * scale,
      centroid[1] + dy * scale,
    ] as [number, number];
  });
}

// Generate smooth path from hull points using cardinal spline
export function hullToPath(hull: [number, number][]): string {
  if (hull.length < 3) return '';
  
  const line = d3.line()
    .x(d => d[0])
    .y(d => d[1])
    .curve(d3.curveCardinalClosed.tension(0.7));
  
  return line(hull) || '';
}

// Parse hex or CSS color to RGB
export function parseColor(color: string): { r: number; g: number; b: number } {
  // Handle hex colors
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    // Support 3-digit shorthand (#rgb → #rrggbb)
    const full = hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex;
    const bigint = parseInt(full, 16);
    return {
      r: (bigint >> 16) & 255,
      g: (bigint >> 8) & 255,
      b: bigint & 255,
    };
  }
  // Resolve hsl(), rgb(), and CSS var() by painting onto a 1×1 canvas
  if (typeof document !== 'undefined') {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 1, 1);
        const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
        return { r, g, b };
      }
    } catch { /* fall through */ }
  }
  // Default fallback
  return { r: 139, g: 154, b: 124 };
}

// Convert RGB to HSL string for CSS
export function rgbToHsl(r: number, g: number, b: number): string {
  r /= 255;
  g /= 255;
  b /= 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
}

// Get tag color as HSL
export function getTagHsl(tag: TagInfo): string {
  const rgb = parseColor(tag.color);
  return rgbToHsl(rgb.r, rgb.g, rgb.b);
}

// Create pie arc generator for multi-tag nodes
export function createPieArcs(tags: TagInfo[], radius: number) {
  const pie = d3.pie<TagInfo>().value(() => 1).sort(null);
  const arc = d3.arc<d3.PieArcDatum<TagInfo>>()
    .innerRadius(0)
    .outerRadius(radius);
  
  return pie(tags).map(d => ({
    path: arc(d) || '',
    color: d.data.color,
    tag: d.data,
  }));
}

// Calculate cluster centers based on tag distribution (adaptive)
export function calculateTagCenters(
  width: number,
  height: number,
  tags: TagInfo[],
  nodeCount?: number
): Map<string, { x: number; y: number }> {
  const centers = new Map<string, { x: number; y: number }>();
  const count = tags.length;
  
  if (count === 0) return centers;
  
  // Distribute tags in a circle around the center
  const cx = width / 2;
  const cy = height / 2;
  
  // Adaptive radius - smaller for fewer nodes
  const effectiveNodeCount = nodeCount || 20;
  const radiusFactor = effectiveNodeCount <= 10 ? 0.15 : effectiveNodeCount <= 30 ? 0.22 : 0.3;
  const radius = Math.min(width, height) * radiusFactor;
  
  tags.forEach((tag, i) => {
    const angle = (2 * Math.PI * i) / count - Math.PI / 2;
    centers.set(tag.id, {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    });
  });
  
  return centers;
}
