import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Link2,
  Tag,
  Network,
  Star,
  Search,
  FileText,
  Keyboard,
  Leaf,
  Command,
  Calendar,
  Clock,
  Zap,
  FileCode,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface HelpPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function HelpPanel({ open, onOpenChange }: HelpPanelProps) {
  const { t } = useTranslation();

  const features = [
    {
      id: 'wikilinks',
      icon: <Link2 className="h-5 w-5 text-primary" />,
      title: t('help.wikilinks_title'),
      description: t('help.wikilinks_desc'),
      tip: t('help.wikilinks_tip'),
    },
    {
      id: 'tags',
      icon: <Tag className="h-5 w-5 text-emerald-500" />,
      title: t('help.tags_title'),
      description: t('help.tags_desc'),
      tip: t('help.tags_tip'),
    },
    {
      id: 'graph',
      icon: <Network className="h-5 w-5 text-purple-500" />,
      title: t('help.graph_title'),
      description: t('help.graph_desc'),
      tip: t('help.graph_tip'),
    },
    {
      id: 'planner',
      icon: <Calendar className="h-5 w-5 text-blue-500" />,
      title: t('help.planner_title'),
      description: t('help.planner_desc'),
      tip: t('help.planner_tip'),
    },
    {
      id: 'writing',
      icon: <Activity className="h-5 w-5 text-rose-500" />,
      title: t('help.writing_title'),
      description: t('help.writing_desc'),
      tip: t('help.writing_tip'),
    },
    {
      id: 'quick-capture',
      icon: <Zap className="h-5 w-5 text-amber-500" />,
      title: t('help.quick_capture_title'),
      description: t('help.quick_capture_desc'),
      tip: t('help.quick_capture_tip'),
    },
    {
      id: 'templates',
      icon: <FileCode className="h-5 w-5 text-cyan-500" />,
      title: t('help.templates_title'),
      description: t('help.templates_desc'),
      tip: t('help.templates_tip'),
    },
    {
      id: 'starred',
      icon: <Star className="h-5 w-5 text-amber-400" />,
      title: t('help.starred_title'),
      description: t('help.starred_desc'),
      tip: t('help.starred_tip'),
    },
    {
      id: 'search',
      icon: <Search className="h-5 w-5 text-indigo-500" />,
      title: t('help.search_title'),
      description: t('help.search_desc'),
      tip: t('help.search_tip'),
    },
  ];

  const modKey = navigator.platform.includes('Mac') ? '⌘' : 'Ctrl';
  const shortcuts = [
    { keys: [modKey, 'K'], description: t('search.placeholder').split('...')[0] },
    { keys: [modKey, 'N'], description: t('sidebar.new_note') },
    { keys: [modKey, 'G'], description: t('sidebar.graph_view') },
    { keys: [modKey, 'S'], description: t('common.save') },
    { keys: [modKey, ','], description: t('sidebar.settings') },
    { keys: ['[['], description: t('help.wikilinks_title') },
    { keys: ['/'], description: 'Slash commands' },
    { keys: [modKey, 'B'], description: 'Bold text' },
    { keys: [modKey, 'I'], description: 'Italic text' },
    { keys: [modKey, '\\'], description: 'Toggle Sidebar' },
    { keys: ['Alt', 'Shift', 'N'], description: 'Global Quick Capture' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Leaf className="h-4 w-4 text-primary" />
            </div>
            <span>{t('help.title')}</span>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Explore Bloom Notes features and keyboard shortcuts to boost your productivity.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="features" className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="features" className="gap-2">
              <FileText className="h-4 w-4" />
              {t('help.features')}
            </TabsTrigger>
            <TabsTrigger value="shortcuts" className="gap-2">
              <Keyboard className="h-4 w-4" />
              {t('help.shortcuts')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="features" className="mt-4">
            <ScrollArea className="h-[350px] pr-4">
              <div className="space-y-4">
                {features.map((feature) => (
                  <div
                    key={feature.id}
                    className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-lg bg-background flex items-center justify-center shrink-0 shadow-sm">
                        {feature.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm mb-1">{feature.title}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {feature.description}
                        </p>
                        {feature.tip && (
                          <p className="text-xs text-primary mt-2 flex items-center gap-1">
                            <span className="font-medium">💡 Tip:</span> {feature.tip}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="shortcuts" className="mt-4">
            <ScrollArea className="h-[350px] pr-4">
              <div className="space-y-2">
                {shortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, i) => (
                        <React.Fragment key={i}>
                          <kbd className="px-2 py-1 text-xs font-mono bg-muted border rounded shadow-sm">
                            {key}
                          </kbd>
                          {i < shortcut.keys.length - 1 && (
                            <span className="text-muted-foreground text-xs">+</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 rounded-lg bg-gradient-to-br from-primary/10 to-transparent border border-primary/20">
                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                  <Command className="h-4 w-4" />
                  {t('help.command_palette')}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {t('help.command_palette_desc')}
                </p>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
