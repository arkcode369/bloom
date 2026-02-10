import React, { useRef, useCallback, useEffect, useMemo } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import type { GraphNode, GraphLink, TagInfo } from '@/hooks/useGraphData';
import { getWordCount, getReadingTime, getContentPreviewText } from '@/hooks/useWritingStats';

interface Graph3DProps {
  nodes: GraphNode[];
  links: GraphLink[];
  selectedNoteId?: string | null;
  onSelectNote: (noteId: string) => void;
  width: number;
  height: number;
  noteContents?: Map<string, string | null>;
}

export default function Graph3D({
  nodes,
  links,
  selectedNoteId,
  onSelectNote,
  width,
  height,
  noteContents,
}: Graph3DProps) {
  const fgRef = useRef<any>();

  // Prepare graph data
  const graphData = useMemo(() => ({
    nodes: nodes.map(node => ({
      ...node,
      // Preserve original properties
      val: 1 + Math.min(node.linkCount * 0.5, 3), // Node size based on links
    })),
    links: links.map(link => ({ ...link })),
  }), [nodes, links]);

  // Get node color based on tags
  const getNodeColor = useCallback((node: any) => {
    if (node.id === selectedNoteId) {
      return 'hsl(142, 71%, 45%)'; // Primary color for selected
    }
    if (node.tags && node.tags.length > 0) {
      return node.tags[0].color;
    }
    return '#6b7280'; // Muted gray for no tags
  }, [selectedNoteId]);

  // Handle node click
  const handleNodeClick = useCallback((node: any) => {
    onSelectNote(node.id);
    
    // Animate camera to focus on clicked node
    if (fgRef.current) {
      const distance = 150;
      const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);
      fgRef.current.cameraPosition(
        { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
        node,
        1000
      );
    }
  }, [onSelectNote]);

  // Focus on selected node when it changes
  useEffect(() => {
    if (selectedNoteId && fgRef.current) {
      const node = graphData.nodes.find(n => n.id === selectedNoteId);
      if (node && (node as any).x !== undefined) {
        const distance = 150;
        const distRatio = 1 + distance / Math.hypot((node as any).x || 0, (node as any).y || 0, (node as any).z || 0);
        fgRef.current.cameraPosition(
          { x: ((node as any).x || 0) * distRatio, y: ((node as any).y || 0) * distRatio, z: ((node as any).z || 0) * distRatio },
          node,
          800
        );
      }
    }
  }, [selectedNoteId, graphData.nodes]);

  // Get node label for tooltip with content preview
  const getNodeLabel = useCallback((node: any) => {
    const content = noteContents?.get(node.id);
    const preview = getContentPreviewText(content, 100);
    const wordCount = getWordCount(content);
    const readingTime = getReadingTime(wordCount);

    // Escape HTML to prevent rendering issues
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    
    const tagHtml = node.tags?.slice(0, 3).map((tag: TagInfo) => 
      `<span style="background: ${esc(tag.color)}20; color: ${esc(tag.color)}; padding: 2px 6px; border-radius: 9999px; font-size: 10px; margin-right: 4px;">#${esc(tag.name)}</span>`
    ).join('') || '';

    return `<div style="max-width: 280px; padding: 12px; background: rgba(0,0,0,0.9); border-radius: 8px; color: white; font-family: system-ui, sans-serif;">
      <div style="font-weight: 600; font-size: 13px; margin-bottom: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${esc(node.title)}</div>
      ${tagHtml ? `<div style="margin-bottom: 8px;">${tagHtml}</div>` : ''}
      ${preview ? `<p style="font-size: 11px; color: #9ca3af; margin-bottom: 8px; line-height: 1.4;">${esc(preview)}</p>` : ''}
      <div style="display: flex; gap: 12px; font-size: 10px; color: #9ca3af;">
        <span>🔗 ${node.linkCount} links</span>
        <span>📖 ${readingTime} min read</span>
      </div>
    </div>`;
  }, [noteContents]);

  return (
    <ForceGraph3D
      ref={fgRef}
      graphData={graphData}
      width={width}
      height={height}
      backgroundColor="rgba(0,0,0,0)"
      nodeColor={getNodeColor}
      nodeVal="val"
      nodeLabel={getNodeLabel}
      nodeOpacity={0.9}
      nodeResolution={16}
      linkColor={() => 'rgba(156, 163, 175, 0.4)'}
      linkWidth={1}
      linkOpacity={0.6}
      onNodeClick={handleNodeClick}
      enableNodeDrag={true}
      enableNavigationControls={true}
      showNavInfo={false}
      d3AlphaDecay={0.02}
      d3VelocityDecay={0.3}
      cooldownTime={3000}
    />
  );
}
