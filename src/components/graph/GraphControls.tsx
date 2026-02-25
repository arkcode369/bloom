import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ZoomIn, ZoomOut, Maximize2, RefreshCw, Layers, Sparkles, X, Box, Square, Pin, Lasso, ScanSearch, ExternalLink, Tag as TagIcon } from 'lucide-react';
import type { TagInfo } from '@/hooks/useGraphData';

export type ViewMode = '2d' | '3d';

interface GraphControlsProps {
  showDomains: boolean;
  onShowDomainsChange: (show: boolean) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onRefresh: () => void;
  activationEnabled?: boolean;
  onActivationChange?: (enabled: boolean) => void;
  hasFocus?: boolean;
  onClearFocus?: () => void;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  hasPinnedNodes?: boolean;
  onUnpinAll?: () => void;
  brushMode?: boolean;
  onToggleBrushMode?: () => void;
  brushSelectedCount?: number;
  onFocusBrushSelection?: () => void;
  onOpenBrushNode?: () => void;
  onClearBrush?: () => void;
  availableTags?: TagInfo[];
  onBulkTag?: (tagId: string) => void;
}

export function GraphControls({
  showDomains,
  onShowDomainsChange,
  onZoomIn,
  onZoomOut,
  onFitView,
  onRefresh,
  activationEnabled,
  onActivationChange,
  hasFocus,
  onClearFocus,
  viewMode = '2d',
  onViewModeChange,
  hasPinnedNodes,
  onUnpinAll,
  brushMode,
  onToggleBrushMode,
  brushSelectedCount = 0,
  onFocusBrushSelection,
  onOpenBrushNode,
  onClearBrush,
  availableTags = [],
  onBulkTag,
}: GraphControlsProps) {
  const { t } = useTranslation();
  const [showTagPicker, setShowTagPicker] = useState(false);
  
  return (
    <motion.div
      className="absolute bottom-4 right-4 flex flex-col gap-2"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {/* Focus Mode Indicator */}
      <AnimatePresence>
        {hasFocus && onClearFocus && (
          <motion.div
            key="focus-badge"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.18 }}
            className="bg-primary/90 backdrop-blur-sm border border-primary rounded-lg px-3 py-2 flex items-center gap-2"
          >
            <span className="text-xs text-primary-foreground font-medium">{t('graph.focus_mode')}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFocus}
              className="h-6 w-6 p-0 hover:bg-primary-foreground/20"
            >
              <X className="h-3 w-3 text-primary-foreground" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* View Mode Toggle */}
      {onViewModeChange && (
        <div className="bg-card/80 backdrop-blur-sm border rounded-lg p-2 flex items-center gap-1">
          <Button
            variant={viewMode === '2d' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('2d')}
            className="h-7 px-2 gap-1"
            title={t('graph.view_2d')}
          >
            <Square className="h-3.5 w-3.5" />
            <span className="text-xs">{t('graph.view_2d')}</span>
          </Button>
          <Button
            variant={viewMode === '3d' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('3d')}
            className="h-7 px-2 gap-1"
            title={t('graph.view_3d')}
          >
            <Box className="h-3.5 w-3.5" />
            <span className="text-xs">{t('graph.view_3d')}</span>
          </Button>
        </div>
      )}

      {/* Domain Toggle - Only show in 2D mode */}
      {viewMode === '2d' && (
        <div className="bg-card/80 backdrop-blur-sm border rounded-lg p-2 flex items-center gap-2">
          <Layers className="h-4 w-4 text-muted-foreground" />
          <Label htmlFor="show-domains" className="text-xs cursor-pointer">
            {t('graph.domains')}
          </Label>
          <Switch
            id="show-domains"
            checked={showDomains}
            onCheckedChange={onShowDomainsChange}
            className="scale-75"
          />
        </div>
      )}

      {/* Activation Toggle */}
      {onActivationChange && (
        <div className="bg-card/80 backdrop-blur-sm border rounded-lg p-2 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-muted-foreground" />
          <Label htmlFor="activation" className="text-xs cursor-pointer">
            {t('graph.activation')}
          </Label>
          <Switch
            id="activation"
            checked={activationEnabled ?? false}
            onCheckedChange={onActivationChange}
            className="scale-75"
          />
        </div>
      )}

      {/* Brush Multi-Select — only shown in 2D mode */}
      {onToggleBrushMode && viewMode === '2d' && (
        <div className="bg-card/80 backdrop-blur-sm border rounded-lg p-1">
          <Button
            variant={brushMode ? 'secondary' : 'ghost'}
            size="sm"
            onClick={onToggleBrushMode}
            className="h-8 gap-2 justify-start w-full"
            title={t('graph.brush_select', 'Select nodes in area')}
          >
            <Lasso className="h-4 w-4" />
            <span className="text-xs">
              {brushMode
                ? brushSelectedCount > 0
                  ? `${brushSelectedCount} selected`
                  : 'Drag to select'
                : 'Select Area'}
            </span>
          </Button>

          {/* Actions appear once at least one node is selected */}
          {brushSelectedCount > 0 && (
            <div className="flex flex-col gap-0.5 mt-1 pt-1 border-t border-border/50">
              {onFocusBrushSelection && (
                <Button variant="ghost" size="sm" onClick={onFocusBrushSelection}
                  className="h-7 gap-2 justify-start w-full text-xs">
                  <ScanSearch className="h-3.5 w-3.5" />
                  <span>Focus Selection</span>
                </Button>
              )}
              {onOpenBrushNode && (
                <Button variant="ghost" size="sm" onClick={onOpenBrushNode}
                  className="h-7 gap-2 justify-start w-full text-xs">
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Open {brushSelectedCount > 1 ? 'All Notes' : 'Note'}</span>
                </Button>
              )}
              {onBulkTag && availableTags.length > 0 && (
                <>
                  <Button variant="ghost" size="sm"
                    onClick={() => setShowTagPicker(p => !p)}
                    className="h-7 gap-2 justify-start w-full text-xs">
                    <TagIcon className="h-3.5 w-3.5" />
                    <span>Tag Selection</span>
                  </Button>
                  {showTagPicker && (
                    <div className="flex flex-wrap gap-1 px-1 py-1 max-w-[160px]">
                      {availableTags.map(tag => (
                        <button
                          key={tag.id}
                          onClick={() => { onBulkTag(tag.id); setShowTagPicker(false); }}
                          className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-opacity hover:opacity-80"
                          style={{ backgroundColor: tag.color, color: '#fff' }}
                        >
                          {tag.icon && <span>{tag.icon}</span>}
                          {tag.name}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
              {onClearBrush && (
                <Button variant="ghost" size="sm" onClick={() => { onClearBrush(); setShowTagPicker(false); }}
                  className="h-7 gap-2 justify-start w-full text-xs text-muted-foreground">
                  <X className="h-3.5 w-3.5" />
                  <span>Clear</span>
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Unpin All — visible when at least one node is pinned */}
      {onUnpinAll && hasPinnedNodes && (
        <div className="bg-card/80 backdrop-blur-sm border rounded-lg p-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onUnpinAll}
            className="h-8 gap-2 justify-start w-full"
            title={t('graph.unpin_all', 'Unpin all nodes')}
          >
            <Pin className="h-4 w-4 text-muted-foreground line-through" />
            <span className="text-xs">{t('graph.unpin_all', 'Unpin All')}</span>
          </Button>
        </div>
      )}

      {/* Zoom Controls */}
      <div className="bg-card/80 backdrop-blur-sm border rounded-lg p-2 flex flex-col gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onZoomIn}
          className="h-8 gap-2 justify-start"
          title={t('graph.zoom_in')}
        >
          <ZoomIn className="h-4 w-4" />
          <span className="text-xs">{t('graph.zoom_in')}</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onZoomOut}
          className="h-8 gap-2 justify-start"
          title={t('graph.zoom_out')}
        >
          <ZoomOut className="h-4 w-4" />
          <span className="text-xs">{t('graph.zoom_out')}</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onFitView}
          className="h-8 gap-2 justify-start"
          title={t('graph.fit_view')}
        >
          <Maximize2 className="h-4 w-4" />
          <span className="text-xs">{t('graph.fit_view')}</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          className="h-8 gap-2 justify-start"
          title={t('graph.refresh')}
        >
          <RefreshCw className="h-4 w-4" />
          <span className="text-xs">{t('graph.refresh')}</span>
        </Button>
      </div>
    </motion.div>
  );
}

interface GraphLegendProps {
  tags: TagInfo[];
  visibleTags: Set<string>;
  onToggleTag: (tagId: string) => void;
  nodeCount: number;
  linkCount: number;
  zoomPercent: number;
}

export function GraphLegend({
  tags,
  visibleTags,
  onToggleTag,
  nodeCount,
  linkCount,
  zoomPercent,
}: GraphLegendProps) {
  const { t } = useTranslation();
  
  return (
    <div className="absolute top-4 left-4 bg-card/80 backdrop-blur-sm border rounded-lg p-3 text-xs space-y-2 max-h-[60%] overflow-y-auto">
      <div className="font-medium text-sm mb-2">{t('graph.tag_domains')}</div>
      
      {tags.length === 0 ? (
        <p className="text-muted-foreground">{t('graph.no_tags_defined')}</p>
      ) : (
        tags.map(tag => (
          <div
            key={tag.id}
            className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded px-1 -mx-1"
            onClick={() => onToggleTag(tag.id)}
          >
            <div
              className="w-3 h-3 rounded-full border"
              style={{
                backgroundColor: visibleTags.has(tag.id) ? tag.color : 'transparent',
                borderColor: tag.color,
              }}
            />
            <span className={visibleTags.has(tag.id) ? '' : 'text-muted-foreground line-through'}>
              {tag.name}
            </span>
          </div>
        ))
      )}

      <div className="border-t pt-2 mt-2 space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-muted border" />
          <span>{t('graph.no_tags')}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ background: 'conic-gradient(#ef4444, #3b82f6, #22c55e, #ef4444)' }} />
          <span>{t('graph.multi_tag')}</span>
        </div>
      </div>

      <div className="text-muted-foreground border-t pt-2 mt-2">
        {t('graph.node_size_hint')}
      </div>
    </div>
  );
}

interface GraphStatsProps {
  nodeCount: number;
  linkCount: number;
  zoomPercent: number;
}

export function GraphStats({ nodeCount, linkCount, zoomPercent }: GraphStatsProps) {
  const { t } = useTranslation();
  
  return (
    <div className="absolute top-4 right-4 bg-card/80 backdrop-blur-sm border rounded-lg px-3 py-2 text-xs">
      <span className="font-medium">{nodeCount}</span> {t('graph.nodes')} · 
      <span className="font-medium ml-1">{linkCount}</span> {t('graph.links')} · 
      <span className="ml-1">{zoomPercent}%</span>
    </div>
  );
}
