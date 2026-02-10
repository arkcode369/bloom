import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNotes, useStarredNotes } from '@/hooks/useNotes';
import { useTagsWithCounts } from '@/hooks/useTags';
import { useProfile } from '@/hooks/useProfile';
import ProfileAvatar from '@/components/profile/ProfileAvatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Plus,
  FileText,
  Star,
  Network,
  Clock,
  Tag,
  Sparkles,
  ArrowRight,
  Leaf,
  Link2,
} from 'lucide-react';
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import FeatureTips from '@/components/onboarding/FeatureTips';

interface HomePageProps {
  onCreateNote: () => void;
  onOpenGraph: () => void;
  onSelectNote: (noteId: string) => void;
  onSelectTag: (tagId: string) => void;
  isCreating?: boolean;
}

export default function HomePage({
  onCreateNote,
  onOpenGraph,
  onSelectNote,
  onSelectTag,
  isCreating,
}: HomePageProps) {
  const { t } = useTranslation();
  const { profile } = useProfile();
  const { data: notes, isLoading } = useNotes();
  const { data: starredNotes } = useStarredNotes();
  const { data: tagsWithCounts } = useTagsWithCounts();

  const displayName = profile?.display_name || '';

  const recentNotes = notes?.slice(0, 5) || [];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('home.greeting_morning');
    if (hour < 18) return t('home.greeting_afternoon');
    return t('home.greeting_evening');
  };

  const formatNoteDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return t('dates.today');
    if (isYesterday(date)) return t('dates.yesterday');
    return formatDistanceToNow(date, { addSuffix: true });
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="h-full overflow-auto bg-gradient-to-br from-background via-background to-muted/20">
      <div className="max-w-5xl mx-auto px-6 py-8 lg:py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <ProfileAvatar
              name={displayName || 'Workspace'}
              size={48}
              style={profile?.avatar_style || 'beam'}
              colors={profile?.avatar_colors}
            />
            <div>
              <h1 className="text-2xl font-semibold">
                {getGreeting()}{displayName ? `, ${displayName}` : ''}
              </h1>
              <p className="text-muted-foreground text-sm">
                {format(new Date(), 'EEEE, MMMM d, yyyy')}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Feature Tips for New Users */}
        <div className="mb-6">
          <FeatureTips />
        </div>

        {/* Quick Actions */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8"
        >
          <motion.div variants={itemVariants}>
            <Button
              variant="outline"
              className="w-full h-auto py-4 flex flex-col items-center gap-2 hover:bg-primary/5 hover:border-primary/30 transition-all"
              onClick={onCreateNote}
              disabled={isCreating}
            >
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Plus className="h-5 w-5 text-primary" />
              </div>
              <span className="text-sm font-medium">{t('home.new_note')}</span>
            </Button>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Button
              variant="outline"
              className="w-full h-auto py-4 flex flex-col items-center gap-2 hover:bg-purple-500/5 hover:border-purple-500/30 transition-all"
              onClick={onOpenGraph}
            >
              <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Network className="h-5 w-5 text-purple-500" />
              </div>
              <span className="text-sm font-medium">{t('home.graph_view')}</span>
            </Button>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Button
              variant="outline"
              className="w-full h-auto py-4 flex flex-col items-center gap-2 hover:bg-amber-400/5 hover:border-amber-400/30 transition-all"
              onClick={() => starredNotes?.[0] && onSelectNote(starredNotes[0].id)}
              disabled={!starredNotes?.length}
            >
              <div className="h-10 w-10 rounded-lg bg-amber-400/10 flex items-center justify-center">
                <Star className="h-5 w-5 text-amber-400" />
              </div>
              <span className="text-sm font-medium">
                {t('home.starred')} ({starredNotes?.length || 0})
              </span>
            </Button>
          </motion.div>
        </motion.div>

        {/* Main Content Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid md:grid-cols-2 gap-6"
        >
          {/* Recent Notes */}
          <motion.div variants={itemVariants}>
            <Card className="border-muted/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  {t('home.recent_notes')}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {isLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-12 rounded-lg bg-muted/50 animate-pulse" />
                    ))}
                  </div>
                ) : recentNotes.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground mb-1">{t('home.plant_first_seedling')}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('home.use_wikilinks')}
                    </p>
                    <Button
                      variant="link"
                      className="mt-2 text-primary"
                      onClick={onCreateNote}
                    >
                      {t('home.create_first_note')} →
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {recentNotes.map(note => (
                      <button
                        key={note.id}
                        onClick={() => onSelectNote(note.id)}
                        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors text-left group"
                      >
                        {note.is_starred ? (
                          <Star className="h-4 w-4 text-amber-400 fill-amber-400 shrink-0" />
                        ) : (
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        <span className="flex-1 truncate text-sm">{note.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatNoteDate(note.updated_at)}
                        </span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Tags Overview */}
          <motion.div variants={itemVariants}>
            <Card className="border-muted/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  {t('home.tags')}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {!tagsWithCounts?.length ? (
                  <div className="text-center py-8">
                    <Tag className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground mb-1">{t('home.organize_garden')}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('home.create_tags_hint')}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {tagsWithCounts.map(tag => (
                      <button
                        key={tag.id}
                        onClick={() => onSelectTag(tag.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm hover:opacity-80 transition-opacity"
                        style={{ 
                          backgroundColor: `${tag.color}20`,
                          color: tag.color || '#8B9A7C',
                        }}
                      >
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: tag.color || '#8B9A7C' }}
                        />
                        {tag.name}
                        <span className="text-xs opacity-70">({tag.noteCount})</span>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Starred Notes */}
          {starredNotes && starredNotes.length > 0 && (
            <motion.div variants={itemVariants} className="md:col-span-2">
              <Card className="border-muted/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-400" />
                  {t('home.starred_notes')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {starredNotes.slice(0, 6).map(note => (
                      <button
                        key={note.id}
                        onClick={() => onSelectNote(note.id)}
                        className="flex items-center gap-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left"
                      >
                        <Star className="h-4 w-4 text-amber-400 fill-amber-400 shrink-0" />
                        <span className="truncate text-sm">{note.title}</span>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Stats Card */}
          <motion.div variants={itemVariants} className="md:col-span-2">
            <Card className="border-muted/50 bg-gradient-to-r from-primary/5 to-transparent">
              <CardContent className="py-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-2xl font-semibold">{notes?.length || 0}</p>
                      <p className="text-xs text-muted-foreground">{t('home.total_notes')}</p>
                    </div>
                    <div className="h-8 w-px bg-border" />
                    <div className="text-center">
                      <p className="text-2xl font-semibold">{starredNotes?.length || 0}</p>
                      <p className="text-xs text-muted-foreground">{t('home.starred')}</p>
                    </div>
                    <div className="h-8 w-px bg-border" />
                    <div className="text-center">
                      <p className="text-2xl font-semibold">{tagsWithCounts?.length || 0}</p>
                      <p className="text-xs text-muted-foreground">{t('home.tags')}</p>
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center gap-2 text-muted-foreground">
                    <Sparkles className="h-4 w-4" />
                    <span className="text-sm">{t('home.your_knowledge_growing')}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
