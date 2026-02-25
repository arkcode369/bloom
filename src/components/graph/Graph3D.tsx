import React, { useRef, useCallback, useEffect, useMemo } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import type { ForceGraphMethods } from 'react-force-graph-3d';
import SpriteText from 'three-spritetext';
import type { GraphNode, GraphLink, TagInfo } from '@/hooks/useGraphData';
import { buildAdjacencyMap, getKHopNeighbors, calculateActivationIntensity } from './graphUtils';
import { generateNodePreviewHTML } from './NodePreviewTooltip';
import { useGraphInteractions } from '@/hooks/useGraphInteractions';
import * as THREE from 'three';

interface Graph3DProps {
  nodes: GraphNode[];
  links: GraphLink[];
  selectedNoteId?: string | null;
  onSelectNote: (noteId: string) => void;
  width: number;
  height: number;
  noteContents?: Map<string, string | null>;
  allTags?: TagInfo[];
  showDomains?: boolean;
  visibleTags?: Set<string>;
  fitViewRef?: React.MutableRefObject<(() => void) | null>;
  activationEnabled?: boolean;
  focusNodeId?: string | null;
}

export default function Graph3D({
  nodes,
  links,
  selectedNoteId,
  onSelectNote,
  width,
  height,
  noteContents,
  allTags,
  showDomains,
  visibleTags,
  fitViewRef,
  activationEnabled = true,
  focusNodeId,
}: Graph3DProps) {
  const fgRef = useRef<ForceGraphMethods>();
  const domainMeshesRef = useRef<THREE.Mesh[]>([]);
  const allTagsRef = useRef(allTags);
  const showDomainsRef = useRef(showDomains);
  const visibleTagsRef = useRef(visibleTags);

  // Per-node Three.js mesh map for dynamic material updates (emissive activation)
  const nodeObjectsMap = useRef<Map<string, THREE.Mesh>>(new Map());
  const selectedNoteIdRef = useRef(selectedNoteId);
  useEffect(() => { selectedNoteIdRef.current = selectedNoteId; }, [selectedNoteId]);

  const adjacencyMapRef = useRef<Map<string, Set<string>>>(new Map());

  const { logEdgeInteraction, logNoteAccess } = useGraphInteractions();

  // Keep refs in sync
  useEffect(() => { allTagsRef.current = allTags; }, [allTags]);
  useEffect(() => { showDomainsRef.current = showDomains; }, [showDomains]);
  useEffect(() => { visibleTagsRef.current = visibleTags; }, [visibleTags]);

  // Expose zoomToFit so parent (KnowledgeGraph) can call it via fitViewRef
  useEffect(() => {
    if (!fitViewRef) return;
    fitViewRef.current = () => {
      fgRef.current?.zoomToFit(700, 20);
    };
    return () => { if (fitViewRef) fitViewRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Rebuild adjacency map whenever links change
  useEffect(() => {
    adjacencyMapRef.current = buildAdjacencyMap(
      links.map(l => ({
        source: typeof l.source === 'string' ? l.source : (l.source as any).id,
        target: typeof l.target === 'string' ? l.target : (l.target as any).id,
      }))
    );
  }, [links]);

  // Clear node mesh map when graph data changes so stale entries don’t accumulate
  useEffect(() => {
    nodeObjectsMap.current.clear();
  }, [nodes]);

  // Update selected node’s material color when selection changes
  useEffect(() => {
    nodeObjectsMap.current.forEach((mesh, nodeId) => {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      const isSelected = nodeId === selectedNoteId;
      const node = nodes.find(n => n.id === nodeId);
      const baseColor = new THREE.Color(
        isSelected ? '#22c55e' : (node?.tags?.[0]?.color ?? '#6b7280')
      );
      mat.color.set(baseColor);
      mat.emissive.set(baseColor);
      mat.emissiveIntensity = isSelected ? 0.55 : 0;
    });
  }, [selectedNoteId, nodes]);

  // Setup lighting + UnrealBloom post-processing after renderer is ready
  useEffect(() => {
    let cancelled = false;
    // Poll via rAF until fgRef and postProcessingComposer are available
    const trySetup = () => {
      if (cancelled) return;
      const fg = fgRef.current as any;
      if (!fg?.scene || !fg?.postProcessingComposer) {
        requestAnimationFrame(trySetup);
        return;
      }
      const scene: THREE.Scene = typeof fg.scene === 'function' ? fg.scene() : fg.scene;
      if (!scene.getObjectByName('__bloom_ambient')) {
        const ambient = new THREE.AmbientLight(0xffffff, 1.6);
        ambient.name = '__bloom_ambient';
        scene.add(ambient);
        const dir = new THREE.DirectionalLight(0xffffff, 0.8);
        dir.position.set(100, 100, 100);
        dir.name = '__bloom_dir';
        scene.add(dir);
      }
      import('three/examples/jsm/postprocessing/UnrealBloomPass.js')
        .then(({ UnrealBloomPass }) => {
          if (cancelled) return;
          const composer = fg.postProcessingComposer();
          // Avoid adding multiple passes on HMR re-runs
          if (!composer._bloomAdded) {
            const bloom = new UnrealBloomPass(
              new THREE.Vector2(512, 512),
              0.75,   // strength
              0.45,   // radius
              0.12    // threshold — only objects brighter than this glow
            );
            composer.addPass(bloom);
            composer._bloomAdded = true;
          }
        })
        .catch(() => { /* UnrealBloomPass optional */ });
    };
    requestAnimationFrame(trySetup);
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup domain meshes on unmount
  useEffect(() => {
    return () => {
      domainMeshesRef.current.forEach(mesh => {
        mesh.geometry.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach(m => m.dispose());
        } else {
          mesh.material.dispose();
        }
      });
      domainMeshesRef.current = [];
    };
  }, []);

  // Prepare graph data
  const graphData = useMemo(() => ({
    nodes: nodes.map(node => ({
      ...node,
      // Preserve original properties
      val: 1 + Math.min(node.linkCount * 0.5, 3), // Node size based on links
    })),
    links: links.map(link => ({ ...link })),
  }), [nodes, links]);

  // Build custom THREE.js node: MeshStandardMaterial sphere + SpriteText label
  const getNodeThreeObject = useCallback((node: any) => {
    const nodeRadius = 4 * Math.sqrt(node.val || 1);
    const isSelected = node.id === selectedNoteIdRef.current;
    const baseColor = new THREE.Color(
      isSelected ? '#22c55e' : (node.tags?.[0]?.color ?? '#6b7280')
    );

    const geometry = new THREE.SphereGeometry(nodeRadius, 16, 16);
    const material = new THREE.MeshStandardMaterial({
      color: baseColor,
      emissive: baseColor,
      emissiveIntensity: isSelected ? 0.55 : 0,
      roughness: 0.3,
      metalness: 0.15,
      transparent: true,
      opacity: 0.92,
    });
    const mesh = new THREE.Mesh(geometry, material);

    // Store for dynamic emissive updates on hover
    nodeObjectsMap.current.set(node.id, mesh);

    // Floating text label via SpriteText (always faces camera)
    const label = node.title.length > 22 ? node.title.slice(0, 19) + '…' : node.title;
    const sprite = new SpriteText(label) as any;
    sprite.color = 'rgba(240,240,240,0.92)';
    sprite.textHeight = 2.8;
    sprite.backgroundColor = 'rgba(0,0,0,0.45)';
    sprite.padding = 1.2;
    sprite.borderRadius = 3;
    sprite.position.set(0, nodeRadius + 4, 0);
    mesh.add(sprite);

    return mesh;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Node hover: update all emissive materials + Hebbian log
  const handleNodeHover3D = useCallback((node: any) => {
    const hovId: string | null = node?.id ?? null;
    const activationMap = hovId
      ? getKHopNeighbors(hovId, adjacencyMapRef.current, 2)
      : new Map<string, number>();

    nodeObjectsMap.current.forEach((mesh, nodeId) => {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      const isSelected = nodeId === selectedNoteIdRef.current;
      if (nodeId === hovId) {
        // Source node: very bright — above bloom threshold
        mat.emissiveIntensity = 2.5;
        mat.opacity = 1.0;
      } else if (hovId) {
        const dist = activationMap.get(nodeId);
        if (dist !== undefined) {
          // dist=1 → 1.2, dist=2 → 0.6  (both above bloom threshold 0.12)
          mat.emissiveIntensity = calculateActivationIntensity(dist) * 2.0;
          mat.opacity = 0.95;
        } else {
          mat.emissiveIntensity = isSelected ? 0.55 : 0;
          // Dim non-activated nodes significantly
          mat.opacity = 0.07;
        }
      } else {
        mat.emissiveIntensity = isSelected ? 0.8 : 0;
        mat.opacity = 0.92;
      }
    });

    if (node) {
      const neighbors = adjacencyMapRef.current.get(node.id);
      neighbors?.forEach(neighborId =>
        logEdgeInteraction(node.id, neighborId, 'hover')
      );
    }
  }, [logEdgeInteraction]);

  // Focus / activation spreading from selectedNoteId even without hover
  // Runs when selectedNoteId, activationEnabled, or nodes change
  useEffect(() => {
    if (nodeObjectsMap.current.size === 0) return;
    const srcId = activationEnabled ? (focusNodeId ?? selectedNoteId) : null;
    if (!srcId) {
      // No focus: restore base state
      nodeObjectsMap.current.forEach((mesh, nodeId) => {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        const isSelected = nodeId === selectedNoteId;
        mat.emissiveIntensity = isSelected ? 0.8 : 0;
        mat.opacity = 0.92;
      });
      return;
    }
    const activationMap = getKHopNeighbors(srcId, adjacencyMapRef.current, 2);
    nodeObjectsMap.current.forEach((mesh, nodeId) => {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (nodeId === srcId) {
        mat.emissiveIntensity = 2.0;
        mat.opacity = 1.0;
      } else {
        const dist = activationMap.get(nodeId);
        if (dist !== undefined) {
          mat.emissiveIntensity = calculateActivationIntensity(dist) * 1.8;
          mat.opacity = 0.95;
        } else {
          mat.emissiveIntensity = 0;
          mat.opacity = 0.09;
        }
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNoteId, activationEnabled, focusNodeId]);

  const handleNodeClick = useCallback((node: any) => {
    if (!node) return;
    logNoteAccess(node.id);
    onSelectNote(node.id);

    // Animate camera to focus on clicked node
    if (fgRef.current) {
      const distance = 150;
      const distRatio = 1 + distance / Math.hypot(node.x || 1, node.y || 1, node.z || 1);
      fgRef.current.cameraPosition(
        { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
        node,
        1000
      );
    }
  }, [onSelectNote, logNoteAccess]);

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

  // Helper: get the THREE.Scene from ForceGraph3D ref
  const getScene = useCallback((): THREE.Scene | null => {
    if (!fgRef.current) return null;
    try {
      // react-force-graph-3d exposes scene() as a method
      if (typeof fgRef.current.scene === 'function') {
        return fgRef.current.scene();
      }
      // Fallback: some versions expose it as a property
      if (fgRef.current.scene instanceof THREE.Scene) {
        return fgRef.current.scene;
      }
    } catch { /* ignore */ }
    return null;
  }, []);

  // Render domain clusters as transparent spheres around tag groups
  const renderDomains = useCallback(() => {
    const scene = getScene();
    if (!scene) return;

    // Remove old domain meshes
    domainMeshesRef.current.forEach(mesh => {
      scene.remove(mesh);
      mesh.geometry.dispose();
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(m => m.dispose());
      } else {
        mesh.material.dispose();
      }
    });
    domainMeshesRef.current = [];

    const tags = allTagsRef.current;
    const domains = showDomainsRef.current;
    const visible = visibleTagsRef.current;

    if (!domains || !tags || !visible) return;

    // Get graph data with settled node positions
    let gNodes: any[] = [];
    try {
      const gData = typeof fgRef.current.graphData === 'function'
        ? fgRef.current.graphData()
        : fgRef.current.graphData;
      gNodes = gData?.nodes || [];
    } catch { return; }

    if (gNodes.length === 0) return;

    tags.forEach(tag => {
      if (!visible.has(tag.id)) return;

      // Find nodes with this tag that have settled positions
      const tagNodes = gNodes.filter((n: any) =>
        n.tags?.some((t: TagInfo) => t.id === tag.id) &&
        typeof n.x === 'number' && typeof n.y === 'number' && typeof n.z === 'number'
      );

      if (tagNodes.length < 2) return;

      // Calculate centroid & radius
      const cx = tagNodes.reduce((s: number, n: any) => s + n.x, 0) / tagNodes.length;
      const cy = tagNodes.reduce((s: number, n: any) => s + n.y, 0) / tagNodes.length;
      const cz = tagNodes.reduce((s: number, n: any) => s + n.z, 0) / tagNodes.length;

      const maxDist = tagNodes.reduce((max: number, n: any) => {
        const dx = n.x - cx;
        const dy = n.y - cy;
        const dz = n.z - cz;
        return Math.max(max, Math.sqrt(dx * dx + dy * dy + dz * dz));
      }, 0);

      const radius = maxDist + 30;
      const color = new THREE.Color(tag.color);

      // Create transparent sphere
      const geometry = new THREE.SphereGeometry(radius, 32, 32);
      const material = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.1,
        wireframe: false,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const sphere = new THREE.Mesh(geometry, material);
      sphere.position.set(cx, cy, cz);
      sphere.renderOrder = -1; // Render behind nodes

      // Also add a wireframe outline
      const wireGeo = new THREE.SphereGeometry(radius, 20, 20);
      const wireMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.25,
        wireframe: true,
      });
      const wireframe = new THREE.Mesh(wireGeo, wireMat);
      wireframe.position.set(cx, cy, cz);
      wireframe.renderOrder = -1;

      scene.add(sphere);
      scene.add(wireframe);
      domainMeshesRef.current.push(sphere, wireframe);
    });
  }, [getScene]);

  // Re-render domains when visibility toggles change — wait 300 ms for positions
  useEffect(() => {
    const t = setTimeout(renderDomains, 300);
    return () => clearTimeout(t);
  }, [showDomains, visibleTags, renderDomains]);

  // Node/link visibility: respect tag filter toggles from the legend
  const isNodeVisible = useCallback((node: any): boolean => {
    const vt = visibleTagsRef.current;
    if (!vt || vt.size === 0) return true;
    if (!node.tags || node.tags.length === 0) return true; // untagged always visible
    return (node.tags as Array<{ id: string }>).some(t => vt.has(t.id));
  }, []);

  const isLinkVisible = useCallback((link: any): boolean => {
    const srcId = typeof link.source === 'string' ? link.source : link.source?.id;
    const tgtId = typeof link.target === 'string' ? link.target : link.target?.id;
    const srcNode = nodes.find(n => n.id === srcId);
    const tgtNode = nodes.find(n => n.id === tgtId);
    return isNodeVisible(srcNode ?? {}) && isNodeVisible(tgtNode ?? {});
  }, [nodes, isNodeVisible]);

  // Link label: show strength % for actively reinforced Hebbian links
  // (removed — user prefers no labels on links)

  // Get node label for tooltip — uses shared generateNodePreviewHTML with dark mode for WebGL overlay
  const getNodeLabel = useCallback((node: any) => {
    const content = noteContents?.get(node.id) ?? null;
    return generateNodePreviewHTML(node.title, node.tags ?? [], content, node.linkCount, { dark: true });
  }, [noteContents]);

  return (
    <ForceGraph3D
      ref={fgRef}
      graphData={graphData}
      width={width}
      height={height}
      backgroundColor="rgba(0,0,0,0)"
      nodeThreeObject={getNodeThreeObject}
      nodeThreeObjectExtend={false}
      nodeVal="val"
      nodeLabel={getNodeLabel}
      nodeResolution={16}
      nodeVisibility={isNodeVisible}
      // Directional particles — intensity scales with Hebbian edge strength
      linkColor={() => 'rgba(156, 163, 175, 0.35)'}
      linkWidth={(link: any) => 0.8 + (link.strength ?? 0) * 2}
      linkOpacity={0.55}
      linkCurvature={0.1}
      linkVisibility={isLinkVisible}
      linkDirectionalArrowLength={3}
      linkDirectionalArrowRelPos={1}
      linkDirectionalArrowColor={() => 'rgba(156, 163, 175, 0.6)'}
      linkDirectionalParticles={(link: any) => (link.strength ?? 0) >= 0.25 ? 3 : 0}
      linkDirectionalParticleWidth={(link: any) => (link.strength ?? 0) * 3.5}
      linkDirectionalParticleSpeed={0.004}
      linkDirectionalParticleColor={() => 'hsl(142, 71%, 55%)'}
      // Warmup so initial layout is already spread out when first rendered
      warmupTicks={120}
      onNodeClick={handleNodeClick}
      onNodeHover={handleNodeHover3D}
      // Right-click to unpin a dragged node
      onNodeRightClick={(node: any) => {
        node.fx = undefined;
        node.fy = undefined;
        node.fz = undefined;
      }}
      // Pin node position after drag
      onNodeDragEnd={(node: any) => {
        node.fx = node.x;
        node.fy = node.y;
        node.fz = node.z;
      }}
      enableNodeDrag={true}
      enableNavigationControls={true}
      showNavInfo={false}
      d3AlphaDecay={0.025}
      d3VelocityDecay={0.35}
      cooldownTime={4000}
      onEngineStop={renderDomains}
    />
  );
}
