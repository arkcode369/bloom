import { useQuery } from '@tanstack/react-query';
import { useDataAdapter } from '@/lib/data/DataProvider';
import { Note } from '@/lib/data/types';

export interface TagInfo {
  id: string;
  name: string;
  color: string;
  icon?: string | null;
}

export interface GraphNode {
  id: string;
  title: string;
  type: 'note';
  isStarred: boolean;
  linkCount: number;
  tags: TagInfo[];
  primaryTag: TagInfo | null;
}

export interface GraphLink {
  source: string;
  target: string;
  strength?: number;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
  allTags: TagInfo[];
}

export function useGraphData() {
  const adapter = useDataAdapter();

  return useQuery({
    queryKey: ['graph-data'],
    staleTime: 30_000, // 30s — prevent excessive refetches that restart the D3 simulation
    queryFn: async (): Promise<GraphData> => {
      // Fetch notes and tags first
      const [notes, tags, edgeStrengths] = await Promise.all([
        adapter.notes.getAll(),
        adapter.tags.getAll(),
        adapter.graph.getEdgeStrength()
      ]);

      // Then fetch links for all notes (using the already-fetched notes)
      const allLinks = await Promise.all(notes.map(n => adapter.links.getByNoteId(n.id)));

      // Note: adapter.notes.getAll() only returns non-archived notes by default in sqlite-adapter
      
      // Flatten links
      const incomingLinks = allLinks.flatMap(l => l.incoming);
      const outgoingLinks = allLinks.flatMap(l => l.outgoing);
      
      // De-duplicate links (since a link between A and B shows up in A's outgoing and B's incoming)
      const uniqueLinksMap = new Map<string, GraphLink>();
      [...incomingLinks, ...outgoingLinks].forEach(l => {
        const key = [l.source_note_id, l.target_note_id].sort().join('-');
        uniqueLinksMap.set(key, { source: l.source_note_id, target: l.target_note_id });
      });

      // Apply edge strengths to links
      edgeStrengths.forEach(es => {
        const key = [es.source_note_id, es.target_note_id].sort().join('-');
        const link = uniqueLinksMap.get(key);
        if (link) {
          link.strength = es.strength;
        } else {
          // If interaction exists but explicit link doesn't (co-access etc)
          // we could choose to show it as a weak edge or not.
          // For now, let's only show explicit links with strength boosts.
        }
      });
      
      const links = Array.from(uniqueLinksMap.values());

      // Fetch note tags for all notes
      const noteTagsResults = await Promise.all(
        notes.map(n => adapter.noteTags.getByNoteId(n.id))
      );

      // Build tags lookup map
      const tagsMap: Record<string, TagInfo> = {};
      tags.forEach(tag => {
        tagsMap[tag.id] = {
          id: tag.id,
          name: tag.name,
          color: tag.color || '#8B9A7C',
          icon: tag.icon ?? null,
        };
      });

      // Map tags to each note
      const noteTagsMap: Record<string, TagInfo[]> = {};
      notes.forEach((note, index) => {
        const nts = noteTagsResults[index];
        noteTagsMap[note.id] = nts.map(nt => ({
          id: nt.tag.id,
          name: nt.tag.name,
          color: nt.tag.color || '#8B9A7C',
        }));
      });

      // Count links per note
      const linkCounts: Record<string, number> = {};
      links.forEach(link => {
        linkCounts[link.source] = (linkCounts[link.source] || 0) + 1;
        linkCounts[link.target] = (linkCounts[link.target] || 0) + 1;
      });

      // Build nodes
      const graphNodes: GraphNode[] = notes.map(note => {
        const tagsForNote = noteTagsMap[note.id] || [];
        return {
          id: note.id,
          title: note.title,
          type: 'note' as const,
          isStarred: note.is_starred || false,
          linkCount: linkCounts[note.id] || 0,
          tags: tagsForNote,
          primaryTag: tagsForNote.length > 0 ? tagsForNote[0] : null,
        };
      });

      // Links already filtered and formatted
      const graphLinks: GraphLink[] = links;

      // All unique tags used in notes
      const allTags: TagInfo[] = Object.values(tagsMap);

      return {
        nodes: graphNodes,
        links: graphLinks,
        allTags,
      };
    },
  });
}
