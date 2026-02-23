import React, { useEffect, useRef, useState, useCallback, lazy, Suspense, useMemo } from 'react';
import * as d3 from 'd3';
import { useGraphData, GraphNode } from '@/hooks/useGraphData';
import { useNotes } from '@/hooks/useNotes';
import { useGraphInteractions } from '@/hooks/useGraphInteractions';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
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
  const { logEdgeInteraction, logNoteAccess } = useGraphInteractions();
  const [zoom, setZoom] = useState(1);
  const [showDomains, setShowDomains] = useState(true);
  const [visibleTags, setVisibleTags] = useState<Set<string>>(new Set());
  const [activationEnabled, setActivationEnabled] = useState(true);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('2d');

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

  // Store adjacency map ref for dynamic activation updates
  const adjacencyMapRef = useRef<Map<string, Set<string>>>(new Map());
  // Store D3 node selection ref for dynamic updates
  const nodeSelectionRef = useRef<d3.Selection<SVGGElement, SimNode, SVGGElement, unknown> | null>(null);
  const linkSelectionRef = useRef<d3.Selection<SVGLineElement, SimLink, SVGGElement, unknown> | null>(null);
  const simNodesRef = useRef<SimNode[]>([]);
  // Preserve node positions across React Query refetches
  const prevSimNodesRef = useRef<SimNode[]>([]);

  // Dynamic activation update (without re-running simulation)
  const updateActivationGlow = useCallback(() => {
    const nodeSelection = nodeSelectionRef.current;
    if (!nodeSelection) return;

    const adjacencyMap = adjacencyMapRef.current;
    const hovId = hoveredNodeIdRef.current;
    const actEnabled = activationEnabledRef.current;
    const focId = focusNodeIdRef.current;
    const selId = selectedNoteIdRef.current;

    const activationSet = actEnabled && hovId
      ? getKHopNeighbors(hovId, adjacencyMap, 2)
      : new Map<string, number>();
    if (hovId && actEnabled) activationSet.set(hovId, 0);

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

      // Focus mode dimming — fade nodes outside the 2-hop focus neighbourhood
      const isFocused = !focId || focusSet.has(d.id) || d.id === focId;
      g.style('opacity', isFocused ? 1 : 0.12);

      // Remove existing glow
      g.selectAll('.activation-glow').remove();

      // Add glow effect for activated nodes
      if (activationIntensity > 0) {
        const glowColor = activationIntensity === 1 ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))';
        const glowRadius = radius + (activationIntensity * 8);
        const glowOpacity = 0.3 * activationIntensity;

        g.insert('circle', ':first-child')
          .attr('r', glowRadius)
          .attr('fill', glowColor)
          .attr('opacity', 0)
          .attr('class', 'activation-glow')
          .transition()
          .duration(200)
          .attr('opacity', glowOpacity);
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
        if (!focId) return null; // no focus: use default opacity
        const srcId = typeof d.source === 'string' ? d.source : (d.source as SimNode).id;
        const tgtId = typeof d.target === 'string' ? d.target : (d.target as SimNode).id;
        const focused = focusSet.has(srcId) || focusSet.has(tgtId) || srcId === focId || tgtId === focId;
        return focused ? null : '0.04';
      });
    }
  }, []);

  useEffect(() => { updateActivationGlow(); }, [hoveredNodeId, focusNodeId, selectedNoteId, activationEnabled, updateActivationGlow]);

  const runSimulation = useCallback(() => {
    if (!svgRef.current || !containerRef.current || !graphData) return;

    const svg = d3.select(svgRef.current);
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Clear previous content
    svg.selectAll('*').remove();

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

    // Setup zoom behavior
    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        setZoom(event.transform.k);
      });

    zoomBehaviorRef.current = zoomBehavior;
    svg.call(zoomBehavior);

    // Custom cluster force
    const clusterForce = (alpha: number) => {
      const strength = 0.15 * alpha;
      const vt = visibleTagsRef.current;
      for (const node of simNodes) {
        if (node.primaryTag && vt.has(node.primaryTag.id)) {
          const center = tagCenters.get(node.primaryTag.id);
          if (center) {
            node.vx = (node.vx || 0) + (center.x - (node.x || 0)) * strength;
            node.vy = (node.vy || 0) + (center.y - (node.y || 0)) * strength;
          }
        }
      }
    };

    // Adaptive spacing based on node count
    const nodeCount = simNodes.length;
    const chargeStrength = nodeCount <= 10 ? -100 : nodeCount <= 30 ? -150 : -200;
    const linkDistance = nodeCount <= 10 ? 50 : nodeCount <= 30 ? 65 : 80;
    const collisionRadius = nodeCount <= 10 ? 15 : nodeCount <= 30 ? 20 : 25;
    const centerStrength = nodeCount <= 10 ? 0.15 : nodeCount <= 30 ? 0.1 : 0.05;

    // Create simulation with adaptive forces
    const simulation = d3.forceSimulation<SimNode>(simNodes)
      .force('link', d3.forceLink<SimNode, SimLink>(simLinks)
        .id(d => d.id)
        .distance(linkDistance)
        .strength(0.5))
      .force('charge', d3.forceManyBody().strength(chargeStrength))
      .force('center', d3.forceCenter(width / 2, height / 2).strength(centerStrength))
      .force('collision', d3.forceCollide().radius(collisionRadius))
      .force('cluster', clusterForce)
      .force('radial', d3.forceRadial(
        Math.min(width, height) / 4 * (nodeCount <= 10 ? 0.5 : 1),
        width / 2,
        height / 2
      ).strength(nodeCount <= 10 ? 0.08 : 0.02));

    simulationRef.current = simulation;

    // Draw links
    const link = g.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(simLinks)
      .join('line')
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
          d.fx = null;
          d.fy = null;
        }));

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
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as SimNode).x || 0)
        .attr('y1', d => (d.source as SimNode).y || 0)
        .attr('x2', d => (d.target as SimNode).x || 0)
        .attr('y2', d => (d.target as SimNode).y || 0);

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
  }, [graphData]);

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
      {/* 2D Graph View */}
      {viewMode === '2d' && (
        <svg
          ref={svgRef}
          className="w-full h-full"
          style={{ cursor: 'grab' }}
        />
      )}

      {/* 3D Graph View */}
      {viewMode === '3d' && (
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
          />
        </Suspense>
      )}

      <GraphControls
        showDomains={showDomains}
        onShowDomainsChange={setShowDomains}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFitView={handleFitView}
        onRefresh={() => refetch()}
        activationEnabled={activationEnabled}
        onActivationChange={setActivationEnabled}
        hasFocus={!!focusNodeId}
        onClearFocus={handleClearFocus}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
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
