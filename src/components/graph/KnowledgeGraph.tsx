import React, { useEffect, useRef, useState, useCallback, lazy, Suspense, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import * as d3 from 'd3';
import { useGraphData, GraphNode } from '@/hooks/useGraphData';
import { useNotes } from '@/hooks/useNotes';
import { useGraphInteractions } from '@/hooks/useGraphInteractions';
import { useTags, useAddTagToNote } from '@/hooks/useTags';
import { cn } from '@/lib/utils';
import { Loader2, Search, X, ScanSearch, ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { GraphControls, GraphLegend, GraphStats, ViewMode } from './GraphControls';
import { expandHull, hullToPath, createPieArcs, calculateTagCenters, buildAdjacencyMap, getKHopNeighbors, calculateActivationIntensity } from './graphUtils';
import { generateNodePreviewHTML } from './NodePreviewTooltip';
// Lazy load 3D component for better performance
const Graph3D = lazy(() => import('./Graph3D'));

interface KnowledgeGraphProps {
  onSelectNote: (noteId: string) => void;
  selectedNoteId?: string | null;
  className?: string;
}

interface SimNode extends GraphNode, d3.SimulationNodeDatum { }
interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  source: SimNode | string;
  target: SimNode | string;
}

export default function KnowledgeGraph({
  onSelectNote,
  selectedNoteId,
  className,
}: KnowledgeGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<SimNode, SimLink> | null>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const prevShowDomainsRef = useRef(true);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  const { data: graphData, isLoading, refetch } = useGraphData();
  const { data: notes } = useNotes();
  const { data: allTags } = useTags();
  const { logEdgeInteraction, logNoteAccess } = useGraphInteractions();
  const addTagToNote = useAddTagToNote();
  const [zoom, setZoom] = useState(1);
  const [showDomains, setShowDomains] = useState(true);
  const [visibleTags, setVisibleTags] = useState<Set<string>>(new Set());
  const [activationEnabled, setActivationEnabled] = useState(true);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('2d');
  const [brushMode, setBrushMode] = useState(false);
  const [brushSelectedIds, setBrushSelectedIds] = useState<Set<string>>(new Set());
  const brushModeRef = useRef(false);
  useEffect(() => { brushModeRef.current = brushMode; }, [brushMode]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResultIndex, setSearchResultIndex] = useState(0);
  const [focusGroupIds, setFocusGroupIds] = useState<Set<string>>(new Set());

  // Ref to call zoomToFit on the 3D graph imperatively
  const graph3dFitRef = useRef<(() => void) | null>(null);

  // Build note contents map for tooltips
  const noteContents = useMemo(() => {
    const map = new Map<string, string | null>();
    notes?.forEach(note => {
      map.set(note.id, note.content);
    });
    return map;
  }, [notes]);

  // Stable key for all tag IDs — only changes when tags are actually added/removed
  const allTagIdsKey = useMemo(() => {
    if (!graphData?.allTags) return '';
    return graphData.allTags.map(t => t.id).sort().join(',');
  }, [graphData?.allTags]);

  // Initialize visible tags when data loads — only when tag set actually changes
  useEffect(() => {
    if (graphData?.allTags && graphData.allTags.length > 0) {
      setVisibleTags(new Set(graphData.allTags.map(t => t.id)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allTagIdsKey]);

  const toggleTag = useCallback((tagId: string) => {
    setVisibleTags(prev => {
      const next = new Set(prev);
      if (next.has(tagId)) {
        next.delete(tagId);
      } else {
        next.add(tagId);
      }
      return next;
    });
  }, []);

  const handleNodeHover = useCallback((nodeId: string | null) => {
    setHoveredNodeId(nodeId);
  }, []);

  const handleNodeClick = useCallback((nodeId: string) => {
    setFocusNodeId(nodeId);
  }, []);

  const handleClearFocus = useCallback(() => {
    setFocusNodeId(null);
    setFocusGroupIds(new Set());
  }, []);

  // Use refs for values that should NOT trigger simulation restart
  const selectedNoteIdRef = useRef(selectedNoteId);
  const noteContentsRef = useRef(noteContents);
  const hoveredNodeIdRef = useRef(hoveredNodeId);
  const activationEnabledRef = useRef(activationEnabled);
  const focusNodeIdRef = useRef(focusNodeId);
  const showDomainsRef = useRef(showDomains);
  const visibleTagsRef = useRef(visibleTags);
  const onSelectNoteRef = useRef(onSelectNote);
  const logEdgeInteractionRef = useRef(logEdgeInteraction);
  const logNoteAccessRef = useRef(logNoteAccess);

  // Keep refs in sync
  useEffect(() => { selectedNoteIdRef.current = selectedNoteId; }, [selectedNoteId]);
  useEffect(() => { noteContentsRef.current = noteContents; }, [noteContents]);
  useEffect(() => { hoveredNodeIdRef.current = hoveredNodeId; }, [hoveredNodeId]);
  useEffect(() => { activationEnabledRef.current = activationEnabled; }, [activationEnabled]);
  useEffect(() => { focusNodeIdRef.current = focusNodeId; }, [focusNodeId]);
  useEffect(() => { showDomainsRef.current = showDomains; }, [showDomains]);
  useEffect(() => { visibleTagsRef.current = visibleTags; }, [visibleTags]);
  useEffect(() => { onSelectNoteRef.current = onSelectNote; }, [onSelectNote]);
  useEffect(() => { logEdgeInteractionRef.current = logEdgeInteraction; }, [logEdgeInteraction]);
  useEffect(() => { logNoteAccessRef.current = logNoteAccess; }, [logNoteAccess]);
  const focusGroupIdsRef = useRef<Set<string>>(new Set());
  const searchQueryRef = useRef('');
  useEffect(() => { focusGroupIdsRef.current = focusGroupIds; }, [focusGroupIds]);
  useEffect(() => { searchQueryRef.current = searchQuery; }, [searchQuery]);

  // Store adjacency map ref for dynamic activation updates
  const adjacencyMapRef = useRef<Map<string, Set<string>>>(new Map());
  // Store D3 node selection ref for dynamic updates
  const nodeSelectionRef = useRef<d3.Selection<SVGGElement, SimNode, SVGGElement, unknown> | null>(null);
  const linkSelectionRef = useRef<d3.Selection<SVGPathElement, SimLink, SVGGElement, unknown> | null>(null);
  const simNodesRef = useRef<SimNode[]>([]);
  // Preserve node positions across React Query refetches
  const prevSimNodesRef = useRef<SimNode[]>([]);

  // Dynamic activation update (without re-running simulation)
  const updateActivationGlow = useCallback(() => {
    const nodeSelection = nodeSelectionRef.current;
    if (!nodeSelection) return;

    // Search takes visual priority — let updateSearchHighlight handle opacity
    if (searchQueryRef.current.trim()) return;

    const adjacencyMap = adjacencyMapRef.current;
    const hovId = hoveredNodeIdRef.current;
    const actEnabled = activationEnabledRef.current;
    const focId = focusNodeIdRef.current;
    const selId = selectedNoteIdRef.current;
    const groupFocusIds = focusGroupIdsRef.current;
    const hasGroupFocus = groupFocusIds.size > 0;

    // Activation source: hovered node takes priority, fall back to focused node.
    // This makes the toggle visibly meaningful even without hovering.
    const activationSource = hovId ?? (actEnabled && focId ? focId : null);
    const activationSet = actEnabled && activationSource
      ? getKHopNeighbors(activationSource, adjacencyMap, 2)
      : new Map<string, number>();
    if (activationSource && actEnabled) activationSet.set(activationSource, 0);

    const focusSet = focId
      ? getKHopNeighbors(focId, adjacencyMap, 2)
      : new Map<string, number>();
    if (focId) focusSet.set(focId, 0);

    nodeSelection.each(function (d) {
      const g = d3.select(this);
      const radius = 8 + Math.min(d.linkCount * 2, 12);
      const isSelected = d.id === selId;
      const activationDistance = activationSet.get(d.id) ?? -1;
      const activationIntensity = calculateActivationIntensity(activationDistance);

      // Focus mode dimming — group focus (brush selection) takes priority over single-node focus
      const isFocused = hasGroupFocus
        ? groupFocusIds.has(d.id)
        : (!focId || focusSet.has(d.id) || d.id === focId);
      g.style('opacity', isFocused ? 1 : 0.12);

      // Remove existing glow
      g.selectAll('.activation-glow').remove();

      // ── Multi-ring activation glow ─────────────────────────────────
      if (activationIntensity > 0) {
        const nodeColor = d.tags[0]?.color || 'hsl(var(--primary))';
        const isSrc    = activationDistance === 0;  // the activated source node
        const isDirect = activationDistance === 1;  // 1st-hop neighbor
        // 2nd-hop: activationDistance === 2 (activationIntensity === 0.3)

        if (isSrc) {
          // 3 concentric pulsing rings for the source node
          g.insert('circle', ':first-child')
            .attr('class', 'activation-glow ag-src-outer')
            .attr('r', radius + 26)
            .attr('fill', nodeColor)
            .attr('filter', 'url(#ag-lg)');
          g.insert('circle', ':first-child')
            .attr('class', 'activation-glow ag-src-mid')
            .attr('r', radius + 13)
            .attr('fill', nodeColor)
            .attr('filter', 'url(#ag-sm)');
          g.insert('circle', ':first-child')
            .attr('class', 'activation-glow ag-src-inner')
            .attr('r', radius + 5)
            .attr('fill', 'white')
            .attr('filter', 'url(#ag-sm)');
        } else if (isDirect) {
          // 2 rings for direct neighbors
          g.insert('circle', ':first-child')
            .attr('class', 'activation-glow ag-n1-outer')
            .attr('r', radius + 18)
            .attr('fill', nodeColor)
            .attr('filter', 'url(#ag-lg)');
          g.insert('circle', ':first-child')
            .attr('class', 'activation-glow ag-n1-inner')
            .attr('r', radius + 7)
            .attr('fill', nodeColor)
            .attr('filter', 'url(#ag-sm)');
        } else {
          // Single soft ring for 2-hop nodes
          g.insert('circle', ':first-child')
            .attr('class', 'activation-glow ag-n2')
            .attr('r', radius + 9)
            .attr('fill', nodeColor)
            .attr('filter', 'url(#ag-sm)');
        }
      }

      // Update selected stroke
      g.selectAll('circle:not(.activation-glow):not(.star-indicator)').each(function () {
        d3.select(this)
          .attr('stroke', isSelected ? 'hsl(var(--primary))' : 'hsl(var(--border))')
          .attr('stroke-width', isSelected ? 3 : 1.5);
      });
      g.selectAll('path').each(function () {
        d3.select(this)
          .attr('stroke', isSelected ? 'hsl(var(--primary))' : 'hsl(var(--border))')
          .attr('stroke-width', isSelected ? 3 : 1);
      });
    });

    // Apply focus mode dimming to links too
    if (linkSelectionRef.current) {
      linkSelectionRef.current.style('opacity', (d) => {
        const srcId = typeof d.source === 'string' ? d.source : (d.source as SimNode).id;
        const tgtId = typeof d.target === 'string' ? d.target : (d.target as SimNode).id;
        if (hasGroupFocus) {
          return (groupFocusIds.has(srcId) || groupFocusIds.has(tgtId)) ? null : '0.04';
        }
        if (!focId) return null;
        const focused = focusSet.has(srcId) || focusSet.has(tgtId) || srcId === focId || tgtId === focId;
        return focused ? null : '0.04';
      });
    }
  }, []);

  useEffect(() => { updateActivationGlow(); }, [hoveredNodeId, focusNodeId, focusGroupIds, selectedNoteId, activationEnabled, updateActivationGlow]);

  // Compute matching node IDs from the current search query
  const searchResultIds = useMemo(() => {
    if (!searchQuery.trim() || !graphData) return [];
    const q = searchQuery.trim().toLowerCase();
    return graphData.nodes.filter(n => n.title.toLowerCase().includes(q)).map(n => n.id);
  }, [searchQuery, graphData]);

  // Highlight search matches: ring on matches, dim everything else
  const updateSearchHighlight = useCallback(() => {
    const nodeSelection = nodeSelectionRef.current;
    if (!nodeSelection) return;
    const query = searchQueryRef.current.trim().toLowerCase();
    nodeSelection.each(function (d) {
      const g = d3.select(this);
      g.selectAll('.search-ring').remove();
      if (!query) { g.style('opacity', null); return; }
      const matches = d.title.toLowerCase().includes(query);
      g.style('opacity', matches ? 1 : 0.08);
      if (matches) {
        const radius = 8 + Math.min(d.linkCount * 2, 12);
        g.insert('circle', ':first-child')
          .attr('class', 'search-ring')
          .attr('r', radius + 6)
          .attr('fill', 'none')
          .attr('stroke', 'hsl(var(--primary))')
          .attr('stroke-width', 2.5)
          .attr('stroke-dasharray', '4 2');
      }
    });
    if (linkSelectionRef.current) {
      linkSelectionRef.current.style('opacity', (d) => {
        if (!query) return null;
        const srcId = typeof d.source === 'string' ? d.source : (d.source as SimNode).id;
        const tgtId = typeof d.target === 'string' ? d.target : (d.target as SimNode).id;
        const nodes = simNodesRef.current;
        const sm = nodes.find(n => n.id === srcId)?.title.toLowerCase().includes(query) ?? false;
        const tm = nodes.find(n => n.id === tgtId)?.title.toLowerCase().includes(query) ?? false;
        return (sm || tm) ? null : '0.04';
      });
    }
  }, []);

  useEffect(() => { updateSearchHighlight(); }, [searchResultIds, updateSearchHighlight]);
  // Restore activation glow when search is cleared
  useEffect(() => { if (!searchQuery.trim()) updateActivationGlow(); }, [searchQuery, updateActivationGlow]);

  // Smooth pan + zoom to a node in 2D
  const flyToNode2D = useCallback((nodeId: string) => {
    const node = simNodesRef.current.find(n => n.id === nodeId);
    if (!node || node.x == null || node.y == null) return;
    if (!svgRef.current || !zoomBehaviorRef.current || !containerRef.current) return;
    const w = containerRef.current.clientWidth;
    const h = containerRef.current.clientHeight;
    const scale = 1.8;
    d3.select(svgRef.current)
      .transition().duration(600)
      .call(zoomBehaviorRef.current.transform,
        d3.zoomIdentity.translate(w / 2 - scale * node.x, h / 2 - scale * node.y).scale(scale));
  }, []);

  const runSimulation = useCallback(() => {
    if (!svgRef.current || !containerRef.current || !graphData) return;

    const svg = d3.select(svgRef.current);
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Clear previous content
    svg.selectAll('*').remove();

    // ── SVG glow filter defs (used by activation-glow rings) ──────────
    const defs = svg.append('defs');
    // Small blur (tight inner glow)
    defs.append('filter')
      .attr('id', 'ag-sm')
      .attr('x', '-120%').attr('y', '-120%')
      .attr('width', '340%').attr('height', '340%')
      .append('feGaussianBlur')
      .attr('stdDeviation', '5');
    // Large blur (diffuse outer halo)
    defs.append('filter')
      .attr('id', 'ag-lg')
      .attr('x', '-200%').attr('y', '-200%')
      .attr('width', '500%').attr('height', '500%')
      .append('feGaussianBlur')
      .attr('stdDeviation', '12');
    // ──────────────────────────────────────────────────────────────────

    if (graphData.nodes.length === 0) {
      setZoom(1);
      return;
    }

    // Build adjacency map for activation spreading
    const adjacencyMap = buildAdjacencyMap(graphData.links);
    adjacencyMapRef.current = adjacencyMap;

    // Create copies of data for D3, reusing settled positions from previous render
    // to avoid resetting the graph on React Query background refetches
    const prevNodesMap = new Map(prevSimNodesRef.current.map(n => [n.id, n]));
    const simNodes: SimNode[] = graphData.nodes.map(d => {
      const prev = prevNodesMap.get(d.id);
      if (prev && prev.x !== undefined && prev.y !== undefined) {
        return { ...d, x: prev.x, y: prev.y, vx: 0, vy: 0 };
      }
      return { ...d };
    });
    const simLinks: SimLink[] = graphData.links.map(d => ({ ...d }));
    simNodesRef.current = simNodes;
    prevSimNodesRef.current = simNodes;

    // Calculate tag cluster centers
    const tagCenters = calculateTagCenters(width, height, graphData.allTags, graphData.nodes.length);

    // Create container group for zoom/pan
    const g = svg.append('g');

    // Domain hulls group (rendered behind everything)
    const hullsGroup = g.append('g').attr('class', 'hulls');

    // Setup zoom behavior with translateExtent to keep user near the graph
    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .translateExtent([[-width * 1.5, -height * 1.5], [width * 2.5, height * 2.5]])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        setZoom(event.transform.k);
      });

    zoomBehaviorRef.current = zoomBehavior;
    svg.call(zoomBehavior);

    // Adaptive spacing based on node count
    const nodeCount = simNodes.length;
    const chargeStrength = nodeCount <= 10 ? -120 : nodeCount <= 30 ? -180 : -240;
    const linkDistance = nodeCount <= 10 ? 55 : nodeCount <= 30 ? 70 : 90;
    const collisionRadius = nodeCount <= 10 ? 16 : nodeCount <= 30 ? 22 : 28;
    const centerStrength = nodeCount <= 10 ? 0.12 : nodeCount <= 30 ? 0.08 : 0.04;
    const clusterStrength = nodeCount <= 10 ? 0.25 : nodeCount <= 30 ? 0.18 : 0.12;

    // Build per-node target positions driven by tag cluster centers
    // Using d3.forceX / forceY is more stable than a custom velocity-mutation force
    const simulation = d3.forceSimulation<SimNode>(simNodes)
      .force('link', d3.forceLink<SimNode, SimLink>(simLinks)
        .id(d => d.id)
        .distance(linkDistance)
        .strength(0.5))
      .force('charge', d3.forceManyBody().strength(chargeStrength))
      .force('center', d3.forceCenter(width / 2, height / 2).strength(centerStrength))
      .force('collision', d3.forceCollide<SimNode>().radius(collisionRadius).strength(0.8))
      .force('x', d3.forceX<SimNode>(d => {
        if (d.primaryTag) {
          const c = tagCenters.get(d.primaryTag.id);
          if (c) return c.x;
        }
        return width / 2;
      }).strength(clusterStrength))
      .force('y', d3.forceY<SimNode>(d => {
        if (d.primaryTag) {
          const c = tagCenters.get(d.primaryTag.id);
          if (c) return c.y;
        }
        return height / 2;
      }).strength(clusterStrength))
      .stop();

    simulationRef.current = simulation;

    // Pre-run ticks when graph is newly loaded so initial render looks settled
    const hasNewNodes = simNodes.some(n => !prevNodesMap.has(n.id));
    if (hasNewNodes) {
      for (let i = 0; i < 150; ++i) simulation.tick();
    }

    // Draw links
    const link = g.append('g')
      .attr('class', 'links')
      .selectAll<SVGPathElement, SimLink>('path')
      .data(simLinks)
      .join('path')
      .attr('fill', 'none')
      .attr('stroke', 'hsl(var(--muted-foreground))')
      .attr('stroke-opacity', d => {
        const strength = (d as SimLink & { strength?: number }).strength ?? 1.0;
        return 0.2 + (strength * 0.4);
      })
      .attr('stroke-width', d => {
        const strength = (d as SimLink & { strength?: number }).strength ?? 1.0;
        return 1.0 + (strength * 2.0);
      });

    // Store link selection for focus mode dimming
    linkSelectionRef.current = link as any;

    // Draw nodes
    const node = g.append('g')
      .attr('class', 'nodes')
      .selectAll<SVGGElement, SimNode>('g')
      .data(simNodes)
      .join('g')
      .attr('cursor', 'pointer')
      .call(d3.drag<SVGGElement, SimNode>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          // Pin the node in place after dragging
          d.fx = event.x;
          d.fy = event.y;
        }));

    // Double-click on a node to unpin it and let it float freely again
    node.on('dblclick', (event, d) => {
      event.stopPropagation();
      d.fx = null;
      d.fy = null;
      simulation.alpha(0.2).restart();
    });

    // Store node selection ref for dynamic updates
    nodeSelectionRef.current = node as any;

    // Render node circles (static — activation glow is handled separately)
    node.each(function (d) {
      const g = d3.select(this);
      const radius = 8 + Math.min(d.linkCount * 2, 12);
      const isSelected = d.id === selectedNoteIdRef.current;

      if (d.tags.length > 1) {
        const arcs = createPieArcs(d.tags, radius);
        arcs.forEach(arc => {
          g.append('path')
            .attr('d', arc.path)
            .attr('fill', arc.color)
            .attr('stroke', isSelected ? 'hsl(var(--primary))' : 'hsl(var(--border))')
            .attr('stroke-width', isSelected ? 3 : 1);
        });
      } else {
        const color = d.tags.length === 1 ? d.tags[0].color : 'hsl(var(--muted))';
        g.append('circle')
          .attr('r', radius)
          .attr('fill', isSelected ? 'hsl(var(--primary))' : color)
          .attr('stroke', isSelected ? 'hsl(var(--primary))' : 'hsl(var(--border))')
          .attr('stroke-width', isSelected ? 3 : 1.5);
      }

      if (d.isStarred) {
        g.append('circle')
          .attr('r', 3)
          .attr('cy', -radius - 4)
          .attr('fill', 'hsl(45, 93%, 47%)')
          .attr('class', 'star-indicator');
      }
    });

    // Click and hover handlers with tooltip
    node
      .on('click', (event, d) => {
        event.stopPropagation();
        handleNodeClick(d.id);
        // Log note access for Hebbian learning
        logNoteAccessRef.current(d.id);
        // Log edge traversal if clicking from an already-selected adjacent note
        const prevSel = selectedNoteIdRef.current;
        if (prevSel && prevSel !== d.id) {
          const neighbors = adjacencyMapRef.current.get(d.id);
          if (neighbors?.has(prevSel)) {
            logEdgeInteractionRef.current(d.id, prevSel, 'traverse');
          }
        }
        onSelectNoteRef.current(d.id);
      })
      .on('mouseenter', function (event, d) {
        handleNodeHover(d.id);
        // Log hover interactions with direct neighbors for Hebbian learning
        const neighbors = adjacencyMapRef.current.get(d.id);
        neighbors?.forEach(neighborId =>
          logEdgeInteractionRef.current(d.id, neighborId, 'hover')
        );
        d3.select(this).select('circle:not(.activation-glow):not(.star-indicator), path')
          .transition()
          .duration(150)
          .attr('transform', 'scale(1.15)');

        showNodeTooltip(event, d, noteContentsRef.current);
      })
      .on('mousemove', function (event) {
        moveNodeTooltip(event);
      })
      .on('mouseleave', function (event, d) {
        handleNodeHover(null);
        d3.select(this).select('circle:not(.activation-glow):not(.star-indicator), path')
          .transition()
          .duration(150)
          .attr('transform', 'scale(1)');

        hideNodeTooltip();
      });

    // Node labels
    node.append('text')
      .text(d => d.title.length > 18 ? d.title.slice(0, 15) + '...' : d.title)
      .attr('x', d => 12 + Math.min(d.linkCount * 2, 12))
      .attr('y', 4)
      .attr('font-size', '10px')
      .attr('fill', 'hsl(var(--foreground))')
      .attr('pointer-events', 'none');

    // Function to render domain hulls with smooth transitions
    const renderHulls = (animate = false) => {
      const duration = animate ? 300 : 0;

      if (!showDomainsRef.current) {
        // Fade out existing hulls
        hullsGroup.selectAll('*')
          .transition()
          .duration(duration)
          .style('opacity', 0)
          .remove();
        return;
      }

      graphData.allTags.forEach(tag => {
        if (!visibleTagsRef.current.has(tag.id)) return;

        const tagNodes = simNodes.filter(n =>
          n.tags.some(t => t.id === tag.id) &&
          n.x !== undefined &&
          n.y !== undefined
        );

        const hullId = `hull-${tag.id}`;
        const labelId = `label-${tag.id}`;

        if (tagNodes.length >= 3) {
          const points = tagNodes.map(n => [n.x!, n.y!] as [number, number]);
          const hull = d3.polygonHull(points);

          if (hull) {
            const expandedHullPoints = expandHull(hull, 40);
            const pathData = hullToPath(expandedHullPoints);

            // Update or create hull path
            let hullPath = hullsGroup.select(`#${hullId}`);
            if (hullPath.empty()) {
              hullPath = hullsGroup.append('path')
                .attr('id', hullId)
                .attr('fill', tag.color)
                .attr('fill-opacity', 0)
                .attr('stroke', tag.color)
                .attr('stroke-opacity', 0)
                .attr('stroke-width', 2)
                .attr('stroke-dasharray', '5,5');
            }

            hullPath
              .transition()
              .duration(duration)
              .attr('d', pathData)
              .attr('fill-opacity', 0.08)
              .attr('stroke-opacity', 0.3);

            // Update or create label
            const centroid = d3.polygonCentroid(expandedHullPoints);
            let label = hullsGroup.select(`#${labelId}`);
            if (label.empty()) {
              label = hullsGroup.append('text')
                .attr('id', labelId)
                .attr('text-anchor', 'middle')
                .attr('font-size', '12px')
                .attr('font-weight', '500')
                .attr('fill', tag.color)
                .style('opacity', 0)
                .text(tag.name);
            }

            label
              .transition()
              .duration(duration)
              .attr('x', centroid[0])
              .attr('y', centroid[1] - (Math.max(...points.map(p => Math.abs(p[1] - centroid[1]))) + 20))
              .style('opacity', 1);
          }
        } else if (tagNodes.length > 0) {
          // For 1-2 nodes, show a circle
          const cx = tagNodes.reduce((sum, n) => sum + (n.x || 0), 0) / tagNodes.length;
          const cy = tagNodes.reduce((sum, n) => sum + (n.y || 0), 0) / tagNodes.length;

          let circle = hullsGroup.select(`#${hullId}`);
          const circleNode = circle.node() as SVGElement | null;
          if (circle.empty() || (circleNode && circleNode.tagName !== 'circle')) {
            hullsGroup.select(`#${hullId}`).remove();
            circle = hullsGroup.append('circle')
              .attr('id', hullId)
              .attr('r', 50)
              .attr('fill', tag.color)
              .attr('fill-opacity', 0)
              .attr('stroke', tag.color)
              .attr('stroke-opacity', 0)
              .attr('stroke-width', 2)
              .attr('stroke-dasharray', '5,5');
          }

          circle
            .transition()
            .duration(duration)
            .attr('cx', cx)
            .attr('cy', cy)
            .attr('fill-opacity', 0.08)
            .attr('stroke-opacity', 0.3);

          let label = hullsGroup.select(`#${labelId}`);
          if (label.empty()) {
            label = hullsGroup.append('text')
              .attr('id', labelId)
              .attr('text-anchor', 'middle')
              .attr('font-size', '12px')
              .attr('font-weight', '500')
              .attr('fill', tag.color)
              .style('opacity', 0)
              .text(tag.name);
          }

          label
            .transition()
            .duration(duration)
            .attr('x', cx)
            .attr('y', cy - 60)
            .style('opacity', 1);
        }
      });
    };

    // Update positions on simulation tick
    let tickCount = 0;
    simulation.alpha(hasNewNodes ? 0.1 : 0.5).restart();

    simulation.on('tick', () => {
      link.attr('d', d => {
        const sx = (d.source as SimNode).x || 0;
        const sy = (d.source as SimNode).y || 0;
        const tx = (d.target as SimNode).x || 0;
        const ty = (d.target as SimNode).y || 0;
        const dx = tx - sx;
        const dy = ty - sy;
        const dr = Math.sqrt(dx * dx + dy * dy) * 2.2;
        return `M${sx},${sy}A${dr},${dr} 0 0,1 ${tx},${ty}`;
      });

      node.attr('transform', d => `translate(${d.x || 0},${d.y || 0})`);

      // Throttle hull re-computation: only every 5 ticks, or immediately on domain toggle
      tickCount++;
      const shouldAnimate = prevShowDomainsRef.current !== showDomainsRef.current;
      if (shouldAnimate || tickCount % 5 === 0) {
        renderHulls(shouldAnimate);
        prevShowDomainsRef.current = showDomainsRef.current;
      }
    });

    // Initial zoom to fit
    setTimeout(() => {
      const bounds = g.node()?.getBBox();
      if (bounds && bounds.width > 0 && bounds.height > 0) {
        const fullWidth = bounds.width;
        const fullHeight = bounds.height;
        const midX = bounds.x + fullWidth / 2;
        const midY = bounds.y + fullHeight / 2;

        const scaleX = width / fullWidth;
        const scaleY = height / fullHeight;
        const scale = Math.min(scaleX, scaleY) * 0.8;
        const clampedScale = Math.max(0.1, Math.min(scale, 1.5));

        const translate = [width / 2 - clampedScale * midX, height / 2 - clampedScale * midY];

        svg.transition()
          .duration(500)
          .call(
            zoomBehavior.transform,
            d3.zoomIdentity.translate(translate[0], translate[1]).scale(clampedScale)
          );
      }
    }, 1000);

    return () => {
      simulation.stop();
      hideNodeTooltip();
    };
  }, [graphData, viewMode]);

  // Tooltip helper functions
  const moveNodeTooltip = useCallback((event: { clientX: number; clientY: number }) => {
    if (!tooltipRef.current || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const tipW = tooltipRef.current.offsetWidth || 300;
    const tipH = tooltipRef.current.offsetHeight || 120;

    // Position to the right/below the cursor, clamped inside container bounds
    let x = event.clientX - rect.left + 15;
    let y = event.clientY - rect.top - 10;
    x = Math.min(x, rect.width - tipW - 8);
    y = Math.min(y, rect.height - tipH - 8);
    x = Math.max(x, 8);
    y = Math.max(y, 8);

    tooltipRef.current.style.left = `${x}px`;
    tooltipRef.current.style.top = `${y}px`;
  }, []);

  const showNodeTooltip = useCallback((event: { clientX: number; clientY: number }, d: SimNode, contents: Map<string, string | null>) => {
    if (!containerRef.current) return;

    // Create tooltip if it doesn't exist
    if (!tooltipRef.current) {
      tooltipRef.current = document.createElement('div');
      tooltipRef.current.className = 'absolute pointer-events-none z-50 transition-opacity duration-150';
      containerRef.current.appendChild(tooltipRef.current);
    }

    const content = contents.get(d.id) ?? null;
    tooltipRef.current.innerHTML = generateNodePreviewHTML(d.title, d.tags, content, d.linkCount);
    tooltipRef.current.style.opacity = '1';
    moveNodeTooltip(event);
  }, [moveNodeTooltip]);

  const hideNodeTooltip = useCallback(() => {
    if (tooltipRef.current) {
      tooltipRef.current.style.opacity = '0';
    }
  }, []);

  useEffect(() => {
    if (viewMode === '2d') {
      runSimulation();
    }
    return () => {
      // Stop simulation when leaving 2D view
      if (viewMode !== '2d' && simulationRef.current) {
        simulationRef.current.stop();
      }
    };
  }, [runSimulation, viewMode]);

  // Gently reheat simulation when domain visibility changes (no full restart)
  useEffect(() => {
    if (viewMode === '2d' && simulationRef.current) {
      simulationRef.current.alpha(0.3).restart();
    }
  }, [showDomains, visibleTags, viewMode]);

  // Handle resize — use ResizeObserver to only rescale the SVG viewport
  // without triggering a full simulation rebuild (preserves pan/zoom state)
  useEffect(() => {
    if (!containerRef.current) return;
    let debounceTimer: ReturnType<typeof setTimeout>;
    const observer = new ResizeObserver(() => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (!svgRef.current || !containerRef.current || viewMode !== '2d') return;
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;
        d3.select(svgRef.current)
          .attr('width', w)
          .attr('height', h);
        // Nudge the center force to the new centre — low alpha so nodes drift, not snap
        if (simulationRef.current) {
          const center = simulationRef.current.force<d3.ForceCenter<SimNode>>('center');
          if (center) {
            center.x(w / 2).y(h / 2);
            simulationRef.current.alpha(0.08).restart();
          }
        }
      }, 200);
    });
    observer.observe(containerRef.current);
    return () => {
      clearTimeout(debounceTimer);
      observer.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode]);

  // Unpin all nodes and restart simulation
  const handleUnpinAll = useCallback(() => {
    simNodesRef.current.forEach(n => { n.fx = null; n.fy = null; });
    if (simulationRef.current) simulationRef.current.alpha(0.5).restart();
  }, []);

  // d3.brush() — multi-select nodes in a rectangular region
  // Brush is a separate overlay that gets toggled on/off via brushMode state.
  useEffect(() => {
    if (!svgRef.current || viewMode !== '2d') return;
    const svg = d3.select(svgRef.current);

    if (!brushMode) {
      svg.select('.brush-layer').remove();
      svg.style('cursor', null);
      return;
    }

    // Disable zoom-drag while brush is active by temporarily filtering events
    const zoomBehavior = zoomBehaviorRef.current;
    if (zoomBehavior) {
      svg.on('.zoom', null); // detach zoom while brush is active
    }

    const brushLayer = svg.append('g').attr('class', 'brush-layer');
    const brush = d3.brush()
      .extent([[0, 0], [containerRef.current?.clientWidth ?? 800, containerRef.current?.clientHeight ?? 600]])
      .on('end', (event) => {
        if (!event.selection) {
          setBrushSelectedIds(new Set());
          // Restore visual selection
          nodeSelectionRef.current?.selectAll('circle:not(.activation-glow):not(.star-indicator), path')
            .attr('stroke-width', null);
          return;
        }
        const [[x0, y0], [x1, y1]] = event.selection as [[number, number], [number, number]];
        // Get the current transform to convert screen coords → SVG coords
        const transform = d3.zoomTransform(svgRef.current!);
        const [sx0, sy0] = transform.invert([x0, y0]);
        const [sx1, sy1] = transform.invert([x1, y1]);
        const selected = new Set<string>();
        simNodesRef.current.forEach(n => {
          if (n.x != null && n.y != null &&
            n.x >= sx0 && n.x <= sx1 &&
            n.y >= sy0 && n.y <= sy1) {
            selected.add(n.id);
          }
        });
        setBrushSelectedIds(selected);
        // Highlight selected nodes
        nodeSelectionRef.current?.each(function (d) {
          const isSelected = selected.has(d.id);
          d3.select(this)
            .selectAll('circle:not(.activation-glow):not(.star-indicator), path')
            .attr('stroke', isSelected ? 'hsl(var(--primary))' : null)
            .attr('stroke-width', isSelected ? 3 : null);
          d3.select(this).style('opacity', isSelected || selected.size === 0 ? 1 : 0.3);
        });
      });

    brushLayer.call(brush as any);
    // Style brush selection rect
    brushLayer.select('.selection')
      .attr('fill', 'hsl(var(--primary) / 0.12)')
      .attr('stroke', 'hsl(var(--primary))')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '4 2');

    return () => {
      brushLayer.remove();
      // Re-attach zoom
      if (zoomBehavior && svgRef.current) {
        d3.select(svgRef.current).call(zoomBehavior);
      }
    };
  }, [brushMode, viewMode]);

  // Focus the brush-selected nodes as a group (dims everything outside)
  const handleFocusBrushSelection = useCallback(() => {
    if (brushSelectedIds.size === 0) return;
    setFocusGroupIds(new Set(brushSelectedIds));
    setBrushSelectedIds(new Set());
    setBrushMode(false);
    nodeSelectionRef.current?.each(function () {
      d3.select(this).style('opacity', null)
        .selectAll('circle:not(.activation-glow):not(.star-indicator), path')
        .attr('stroke', null).attr('stroke-width', null);
    });
    linkSelectionRef.current?.style('opacity', null);
  }, [brushSelectedIds]);

  // Open the first note in the brush selection
  // In Tauri: opens ALL selected nodes as pop-out windows.
  // Falls back to selecting the first node when running in browser.
  const handleOpenBrushNode = useCallback(async () => {
    if (brushSelectedIds.size === 0) return;
    const ids = [...brushSelectedIds];
    // Select the first note in the main panel regardless
    const firstId = ids[0];
    onSelectNoteRef.current(firstId);
    flyToNode2D(firstId);
    // Try to open each selected note as a Tauri pop-out window
    try {
      const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
      await Promise.all(ids.map(async (id, i) => {
        const label = `note-popup-${id.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
        const existing = await WebviewWindow.getByLabel(label);
        if (existing) {
          await existing.show();
          await existing.setFocus();
          return;
        }
        // Stagger windows slightly so they don't all stack
        const offset = i * 24;
        new WebviewWindow(label, {
          url: `/note/${id}`,
          title: 'Note',
          width: 800,
          height: 600,
          x: 100 + offset,
          y: 80 + offset,
          resizable: true,
          decorations: true,
        });
      }));
    } catch {
      // Not in Tauri — single-note fallback already handled above
    }
  }, [brushSelectedIds, flyToNode2D]);

  // Clear brush selection and restore visual state
  const handleClearBrush = useCallback(() => {
    setBrushSelectedIds(new Set());
    setBrushMode(false);
    nodeSelectionRef.current?.each(function () {
      d3.select(this).style('opacity', null)
        .selectAll('circle:not(.activation-glow):not(.star-indicator), path')
        .attr('stroke', null).attr('stroke-width', null);
    });
    linkSelectionRef.current?.style('opacity', null);
    setTimeout(updateActivationGlow, 30);
  }, [updateActivationGlow]);

  // Bulk-tag all brush-selected notes with the given tag
  const handleBulkTag = useCallback(async (tagId: string) => {
    const ids = [...brushSelectedIds];
    if (ids.length === 0) return;
    await Promise.all(ids.map(id => addTagToNote.mutateAsync({ noteId: id, tagId })));
  }, [brushSelectedIds, addTagToNote]);

  const handleZoomIn = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().duration(300).call(
      zoomBehaviorRef.current.scaleBy,
      1.3
    );
  };

  const handleZoomOut = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().duration(300).call(
      zoomBehaviorRef.current.scaleBy,
      0.7
    );
  };

  const handleFitView = () => {
    if (viewMode === '3d') {
      graph3dFitRef.current?.();
      return;
    }
    if (!svgRef.current || !zoomBehaviorRef.current || !containerRef.current) return;
    const svg = d3.select(svgRef.current);
    // Compute bounding box of all graph content (the inner <g> group)
    const g = svg.select<SVGGElement>('g');
    const bounds = g.node()?.getBBox();
    if (!bounds || bounds.width === 0 || bounds.height === 0) {
      svg.transition().duration(500).call(zoomBehaviorRef.current.transform, d3.zoomIdentity);
      setZoom(1);
      return;
    }
    const w = containerRef.current.clientWidth;
    const h = containerRef.current.clientHeight;
    const scale = Math.min(w / bounds.width, h / bounds.height) * 0.85;
    const clampedScale = Math.max(0.1, Math.min(scale, 2));
    const midX = bounds.x + bounds.width / 2;
    const midY = bounds.y + bounds.height / 2;
    const tx = w / 2 - clampedScale * midX;
    const ty = h / 2 - clampedScale * midY;
    svg.transition().duration(500).call(
      zoomBehaviorRef.current.transform,
      d3.zoomIdentity.translate(tx, ty).scale(clampedScale)
    );
  };

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center', className)}>
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!graphData || graphData.nodes.length === 0) {
    return (
      <div className={cn('flex items-center justify-center', className)}>
        <div className="text-center">
          <p className="text-muted-foreground">No notes to display</p>
          <p className="text-sm text-muted-foreground/70">Create some notes and links to see your knowledge graph</p>
        </div>
      </div>
    );
  }

  const zoomPercent = isNaN(zoom) ? 100 : Math.round(zoom * 100);

  return (
    <div ref={containerRef} className={cn('relative w-full h-full bg-background', className)}>
      {/* Graph Search Bar — 2D only */}
      {viewMode === '2d' && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 w-64">
          <div className="relative flex items-center">
            <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none z-10" />
            <Input
              className="pl-8 pr-20 h-8 text-xs bg-card/90 backdrop-blur-sm shadow-sm"
              placeholder="Search notes…"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setSearchResultIndex(0); }}
              onKeyDown={e => {
                if (e.key === 'Escape') {
                  setSearchQuery('');
                } else if (e.key === 'Enter' || e.key === 'ArrowDown') {
                  e.preventDefault();
                  const next = searchResultIds.length === 0 ? 0 : (searchResultIndex + 1) % searchResultIds.length;
                  setSearchResultIndex(next);
                  if (searchResultIds[next]) flyToNode2D(searchResultIds[next]);
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  const prev = searchResultIds.length === 0 ? 0 : (searchResultIndex - 1 + searchResultIds.length) % searchResultIds.length;
                  setSearchResultIndex(prev);
                  if (searchResultIds[prev]) flyToNode2D(searchResultIds[prev]);
                }
              }}
            />
            {searchQuery && (
              <div className="absolute right-2 flex items-center gap-1.5">
                {searchResultIds.length > 0 && (
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {Math.min(searchResultIndex + 1, searchResultIds.length)}/{searchResultIds.length}
                  </span>
                )}
                {searchQuery && searchResultIds.length === 0 && (
                  <span className="text-xs text-muted-foreground">0</span>
                )}
                <button
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SVG always stays mounted so svgRef is never null when runSimulation fires.
          Hidden via display:none in 3D mode to avoid layout interference. */}
      <svg
        ref={svgRef}
        className="absolute inset-0 w-full h-full"
        style={{
          cursor: brushMode ? 'crosshair' : 'grab',
          display: viewMode === '2d' ? undefined : 'none',
        }}
      />

      {/* 3D view — fades in/out */}
      <AnimatePresence initial={false}>
        {viewMode === '3d' && (
          <motion.div
            key="view-3d"
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Suspense fallback={
              <div className="w-full h-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            }>
              <Graph3D
                nodes={graphData.nodes}
                links={graphData.links}
                selectedNoteId={selectedNoteId}
                onSelectNote={onSelectNote}
                width={containerRef.current?.clientWidth || 800}
                height={containerRef.current?.clientHeight || 600}
                noteContents={noteContents}
                allTags={graphData.allTags}
                showDomains={showDomains}
                visibleTags={visibleTags}
                fitViewRef={graph3dFitRef}
                activationEnabled={activationEnabled}
                focusNodeId={focusNodeId}
              />
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>

      <GraphControls
        showDomains={showDomains}
        onShowDomainsChange={setShowDomains}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFitView={handleFitView}
        onRefresh={() => refetch()}
        activationEnabled={activationEnabled}
        onActivationChange={setActivationEnabled}
        hasFocus={!!focusNodeId || focusGroupIds.size > 0}
        onClearFocus={handleClearFocus}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onUnpinAll={handleUnpinAll}
        hasPinnedNodes={simNodesRef.current.some(n => n.fx != null || n.fy != null)}
        brushMode={brushMode}
        onToggleBrushMode={() => setBrushMode(p => !p)}
        brushSelectedCount={brushSelectedIds.size}
        onFocusBrushSelection={handleFocusBrushSelection}
        onOpenBrushNode={handleOpenBrushNode}
        onClearBrush={handleClearBrush}
        availableTags={allTags ?? []}
        onBulkTag={handleBulkTag}
      />

      {viewMode === '2d' && (
        <GraphLegend
          tags={graphData.allTags}
          visibleTags={visibleTags}
          onToggleTag={toggleTag}
          nodeCount={graphData.nodes.length}
          linkCount={graphData.links.length}
          zoomPercent={zoomPercent}
        />
      )}

      {viewMode === '3d' && (
        <GraphLegend
          tags={graphData.allTags}
          visibleTags={visibleTags}
          onToggleTag={toggleTag}
          nodeCount={graphData.nodes.length}
          linkCount={graphData.links.length}
          zoomPercent={100}
        />
      )}

      <GraphStats
        nodeCount={graphData.nodes.length}
        linkCount={graphData.links.length}
        zoomPercent={viewMode === '3d' ? 100 : zoomPercent}
      />
    </div>
  );
}
