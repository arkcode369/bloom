import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { usePreferences } from '@/hooks/usePreferences';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sun,
  Moon,
  Monitor,
  Type,
  Save,
  Maximize2,
  Minimize2,
  RotateCcw,
  Trash2,
  Palette,
  Loader2,
  UserCircle,
  HardDrive,
  Globe,
  Tag,
  Edit3,
  Shield,
  Archive,
  Keyboard,
  Download,
  FileJson,
  Folder,
  X,
  Upload,
} from 'lucide-react';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { useExportWorkspace } from '@/hooks/useExport';
import { useImport } from '@/hooks/useImport';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import ProfileEditor from '@/components/profile/ProfileEditor';
import StorageUsage from '@/components/settings/StorageUsage';
import LanguageSwitcher from '@/components/settings/LanguageSwitcher';
import DefaultTagsPicker from '@/components/settings/DefaultTagsPicker';
import WritingSettings from '@/components/settings/WritingSettings';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type SettingsSection = 'profile' | 'appearance' | 'editor' | 'writing' | 'shortcuts' | 'storage' | 'language' | 'workspace';

const settingsSections: { id: SettingsSection; icon: React.ElementType; label: string }[] = [
  { id: 'profile', icon: UserCircle, label: 'settings.profile' },
  { id: 'appearance', icon: Palette, label: 'settings.theme' },
  { id: 'editor', icon: Type, label: 'settings.editor' },
  { id: 'writing', icon: Edit3, label: 'settings.writing' },
  { id: 'shortcuts', icon: Keyboard, label: 'settings.shortcuts' },
  { id: 'storage', icon: HardDrive, label: 'settings.storage' },
  { id: 'language', icon: Globe, label: 'settings.language' },
  { id: 'workspace', icon: Shield, label: 'settings.workspace' },
];

export default function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { deleteWorkspace } = useAuth();
  const { preferences, updateEditorPreference, updateStoragePreference, resetPreferences } = usePreferences();
  const { exportAsJSON, exportAllAsMarkdown } = useExportWorkspace();
  const { importJSON, importMarkdown } = useImport();

  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');

  // Workspace reset state
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const themeOptions = [
    { value: 'light', label: t('settings.light'), icon: Sun },
    { value: 'dark', label: t('settings.dark'), icon: Moon },
    { value: 'system', label: t('settings.system'), icon: Monitor },
  ] as const;

  const fontSizeOptions = [
    { value: 'small', label: t('editor.small'), size: '14px' },
    { value: 'medium', label: t('editor.medium'), size: '16px' },
    { value: 'large', label: t('editor.large'), size: '18px' },
  ] as const;

  const widthOptions = [
    { value: false, label: t('editor.centered'), icon: Minimize2 },
    { value: true, label: t('editor.full_width'), icon: Maximize2 },
  ] as const;

  const handleResetWorkspace = async () => {
    if (resetConfirmText !== 'RESET') return;

    setResetLoading(true);
    const { error } = await deleteWorkspace();
    setResetLoading(false);

    if (error) {
      toast.error(error.message || 'Failed to reset workspace');
    } else {
      toast.success('Workspace reset successfully');
      setShowResetDialog(false);
      onOpenChange(false);
    }
  };

  // Note: User type from DataAdapter doesn't include created_at in all implementations
  // For local SQLite, we can just leave it empty or show 'Local'
  const createdAt = '';

  const handleSelectDirectory = async (type: 'exportPath' | 'mediaPath') => {
    try {
      const selected = await openDialog({
        directory: true,
        multiple: false,
        title: type === 'exportPath' ? t('settings.export_path') : t('settings.media_path'),
      });

      if (selected && typeof selected === 'string') {
        updateStoragePreference(type, selected);
        toast.success('Path updated');
      }
    } catch (err) {
      console.error('Failed to select directory:', err);
      toast.error('Failed to select directory');
    }
  };

  const handleClearPath = (type: 'exportPath' | 'mediaPath') => {
    updateStoragePreference(type, null);
    toast.success('Path cleared');
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'profile':
        return <ProfileEditor />;

      case 'appearance':
        return (
          <div className="space-y-6">
            <section className="space-y-4">
              <div>
                <h3 className="text-sm font-medium">{t('settings.theme')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('settings.choose_theme')}
                </p>
              </div>

              <RadioGroup
                value={theme}
                onValueChange={(value) => setTheme(value as 'light' | 'dark' | 'system')}
                className="grid grid-cols-3 gap-3"
              >
                {themeOptions.map(({ value, label, icon: Icon }) => (
                  <Label
                    key={value}
                    htmlFor={`theme-${value}`}
                    className={cn(
                      'flex flex-col items-center gap-2 rounded-lg border-2 p-4 cursor-pointer transition-all duration-200 hover:bg-accent',
                      theme === value ? 'border-primary bg-primary/5 scale-[1.02]' : 'border-muted'
                    )}
                  >
                    <RadioGroupItem value={value} id={`theme-${value}`} className="sr-only" />
                    <Icon className="h-5 w-5" />
                    <span className="text-sm font-medium">{label}</span>
                  </Label>
                ))}
              </RadioGroup>
            </section>

            <Separator />

            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium">{t('settings.reset_preferences')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.restore_defaults')}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    resetPreferences();
                    toast.success('Preferences reset to defaults');
                  }}
                  className="gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  {t('common.reset')}
                </Button>
              </div>
            </section>

            <Separator />

            <section className="space-y-2">
              <h3 className="text-sm font-medium">{t('settings.about')}</h3>
              <p className="text-sm text-muted-foreground">
                Bloom v1.0 — Personal Knowledge Management
              </p>
            </section>
          </div>
        );

      case 'editor':
        return (
          <div className="space-y-6">
            {/* Font Size */}
            <section className="space-y-4">
              <div>
                <h3 className="text-sm font-medium">{t('editor.font_size')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('editor.font_size_hint')}
                </p>
              </div>
              <RadioGroup
                value={preferences.editor.fontSize}
                onValueChange={(value) => updateEditorPreference('fontSize', value as 'small' | 'medium' | 'large')}
                className="grid grid-cols-3 gap-3"
              >
                {fontSizeOptions.map(({ value, label, size }) => (
                  <Label
                    key={value}
                    htmlFor={`font-${value}`}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-lg border-2 p-4 cursor-pointer transition-all duration-200 hover:bg-accent',
                      preferences.editor.fontSize === value ? 'border-primary bg-primary/5' : 'border-muted'
                    )}
                  >
                    <RadioGroupItem value={value} id={`font-${value}`} className="sr-only" />
                    <span style={{ fontSize: size }} className="font-mono">Aa</span>
                    <span className="text-xs text-muted-foreground">{label}</span>
                  </Label>
                ))}
              </RadioGroup>
            </section>

            <Separator />

            {/* Default Editor Width */}
            <section className="space-y-4">
              <div>
                <h3 className="text-sm font-medium">{t('editor.default_width')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('editor.width_hint')}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {widthOptions.map(({ value, label, icon: Icon }) => (
                  <button
                    key={String(value)}
                    onClick={() => updateEditorPreference('isFullWidth', value)}
                    className={cn(
                      'flex flex-col items-center gap-2 rounded-lg border-2 p-4 cursor-pointer transition-all duration-200 hover:bg-accent',
                      preferences.editor.isFullWidth === value ? 'border-primary bg-primary/5' : 'border-muted'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-sm font-medium">{label}</span>
                  </button>
                ))}
              </div>
            </section>

            <Separator />

            {/* Auto-save Interval */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    {t('editor.auto_save')}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t('editor.auto_save_hint')}
                  </p>
                </div>
                <span className="text-sm font-medium bg-muted px-2 py-1 rounded">
                  {preferences.editor.autoSaveInterval}s
                </span>
              </div>
              <Slider
                value={[preferences.editor.autoSaveInterval]}
                onValueChange={([value]) => updateEditorPreference('autoSaveInterval', value)}
                min={1}
                max={10}
                step={1}
                className="w-full"
              />
            </section>

            <Separator />

            {/* Default Tags */}
            <section className="space-y-4">
              <div>
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  {t('editor.default_tags')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t('editor.default_tags_hint')}
                </p>
              </div>
              <DefaultTagsPicker />
            </section>
          </div>
        );

      case 'writing':
        return <WritingSettings />;

      case 'shortcuts': {
        const modKey = navigator.platform.includes('Mac') ? '⌘' : 'Ctrl';
        const shortcutsList = [
          { keys: [modKey, 'K'], desc: 'Search Notes' },
          { keys: [modKey, 'N'], desc: 'New Note' },
          { keys: [modKey, 'G'], desc: 'Graph View' },
          { keys: [modKey, 'S'], desc: 'Save' },
          { keys: [modKey, ','], desc: 'Settings' },
          { keys: [modKey, 'B'], desc: 'Bold' },
          { keys: [modKey, 'I'], desc: 'Italic' },
          { keys: [modKey, '\\'], desc: 'Toggle Sidebar' },
          { keys: ['/'], desc: 'Slash Commands' },
          { keys: ['[['], desc: 'Insert Wikilink' },
          { keys: ['Alt', 'Shift', 'N'], desc: 'Global Quick Capture' },
        ];
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Keyboard className="h-4 w-4" />
                Keyboard Shortcuts
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                All available keyboard shortcuts.
              </p>
            </div>
            <div className="space-y-1 rounded-lg border overflow-hidden">
              {shortcutsList.map((s, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex items-center justify-between px-4 py-2.5 text-sm',
                    i % 2 === 0 ? 'bg-muted/30' : ''
                  )}
                >
                  <span>{s.desc}</span>
                  <div className="flex items-center gap-1">
                    {s.keys.map((k, j) => (
                      <React.Fragment key={j}>
                        <kbd className="px-2 py-0.5 text-xs font-mono bg-muted border rounded shadow-sm">
                          {k}
                        </kbd>
                        {j < s.keys.length - 1 && (
                          <span className="text-muted-foreground text-xs">+</span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }

      case 'storage':
        return <StorageUsage />;

      case 'language':
        return <LanguageSwitcher />;

      case 'workspace':
        return (
          <div className="space-y-6">
            {/* Export */}
            <section className="space-y-4">
              <div>
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  {t('settings.export_workspace')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t('settings.export_workspace_desc')}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button variant="outline" className="gap-2 justify-start h-auto py-2.5" onClick={exportAsJSON}>
                  <FileJson className="h-4 w-4 text-amber-500 shrink-0" />
                  <span className="truncate">{t('settings.export_json')}</span>
                </Button>
                <Button variant="outline" className="gap-2 justify-start h-auto py-2.5" onClick={exportAllAsMarkdown}>
                  <Archive className="h-4 w-4 text-sky-500 shrink-0" />
                  <span className="truncate">{t('settings.export_notes_md')}</span>
                </Button>
              </div>
            </section>

            <Separator />

            {/* Import */}
            <section className="space-y-4">
              <div>
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  {t('settings.import_workspace')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t('settings.import_workspace_desc')}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button variant="outline" className="gap-2 justify-start h-auto py-2.5" onClick={importJSON}>
                  <FileJson className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span className="truncate">{t('settings.import_json')}</span>
                </Button>
                <Button variant="outline" className="gap-2 justify-start h-auto py-2.5" onClick={importMarkdown}>
                  <Archive className="h-4 w-4 text-indigo-500 shrink-0" />
                  <span className="truncate">{t('settings.import_markdown')}</span>
                </Button>
              </div>
            </section>

            <Separator />

            {/* Storage Paths */}
            <section className="space-y-4">
              <div className="space-y-4">
                {/* Export Path */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{t('settings.export_path')}</Label>
                  <p className="text-xs text-muted-foreground">{t('settings.export_path_desc')}</p>
                  <div className="flex gap-2">
                    <div className="flex-1 px-3 py-2 rounded-md bg-muted/50 text-xs font-mono truncate border flex items-center min-h-10">
                      {preferences.storage.exportPath || 'Default (Downloads)'}
                    </div>
                    <Button variant="secondary" size="sm" onClick={() => handleSelectDirectory('exportPath')} className="gap-1">
                      <Folder className="h-3.5 w-3.5" />
                      {t('settings.browse')}
                    </Button>
                    {preferences.storage.exportPath && (
                      <Button variant="ghost" size="sm" onClick={() => handleClearPath('exportPath')}>
                        <X className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Media Path */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{t('settings.media_path')}</Label>
                  <p className="text-xs text-muted-foreground">{t('settings.media_path_desc')}</p>
                  <div className="flex gap-2">
                    <div className="flex-1 px-3 py-2 rounded-md bg-muted/50 text-xs font-mono truncate border flex items-center min-h-10">
                      {preferences.storage.mediaPath || 'Default (App Data)'}
                    </div>
                    <Button variant="secondary" size="sm" onClick={() => handleSelectDirectory('mediaPath')} className="gap-1">
                      <Folder className="h-3.5 w-3.5" />
                      {t('settings.browse')}
                    </Button>
                    {preferences.storage.mediaPath && (
                      <Button variant="ghost" size="sm" onClick={() => handleClearPath('mediaPath')}>
                        <X className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <Separator />

            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium flex items-center gap-2 text-destructive">
                    <Trash2 className="h-4 w-4" />
                    {t('settings.reset_workspace')}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.reset_workspace_desc')}
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={() => setShowResetDialog(true)}
                >
                  {t('common.delete')}
                </Button>
              </div>
            </section>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px] h-[85vh] sm:h-[600px] overflow-hidden p-0 flex flex-col gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <DialogTitle>{t('settings.title')}</DialogTitle>
            <DialogDescription className="sr-only">
              Manage your profile, appearance, editor preferences, and workspace settings.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 flex min-h-0 overflow-hidden">
            {/* Sidebar Navigation */}
            <nav className="w-48 border-r bg-muted/30 p-2 shrink-0 overflow-y-auto">
              <div className="space-y-1">
                {settingsSections.map(({ id, icon: Icon, label }) => (
                  <button
                    key={id}
                    onClick={() => setActiveSection(id)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors text-left',
                      activeSection === id
                        ? 'bg-background shadow-sm font-medium'
                        : 'hover:bg-background/50 text-muted-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{t(label)}</span>
                  </button>
                ))}
              </div>
            </nav>

            {/* Content Area */}
            <div className="flex-1 h-full min-h-0">
              <ScrollArea className="h-full w-full">
                <motion.div
                  key={activeSection}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.15 }}
                  className="p-6"
                >
                  {renderContent()}
                </motion.div>
              </ScrollArea>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              {t('settings.reset_workspace')}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 text-foreground">
              <p>{t('settings.reset_warning')}</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground/80">
                <li>{t('settings.reset_list_notes')}</li>
                <li>{t('settings.reset_list_tags')}</li>
                <li>{t('settings.reset_list_links')}</li>
                <li>{t('settings.reset_list_profile')}</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4">
            <Label htmlFor="reset-confirm">{t('settings.type_reset')}</Label>
            <Input
              id="reset-confirm"
              value={resetConfirmText}
              onChange={(e) => setResetConfirmText(e.target.value)}
              placeholder="RESET"
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetWorkspace}
              disabled={resetConfirmText !== 'RESET' || resetLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {resetLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('settings.delete_everything')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
