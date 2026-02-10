import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useProfile, AvatarStyle } from '@/hooks/useProfile';
import { useTheme } from '@/hooks/useTheme';
import ProfileAvatar, { AVATAR_STYLES, COLOR_PALETTES } from './ProfileAvatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Sun,
  Moon,
  Monitor,
  Leaf,
  Check,
  Heart,
  Flower2,
} from 'lucide-react';

interface OnboardingWizardProps {
  onComplete: () => void;
}

const STEPS = ['welcome', 'name', 'avatar', 'bio', 'theme', 'complete'] as const;
type Step = typeof STEPS[number];

export default function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const { theme, setTheme } = useTheme();
  const { completeOnboarding, defaultColors } = useProfile();
  
  const [currentStep, setCurrentStep] = useState<Step>('welcome');
  const [displayName, setDisplayName] = useState('');
  const [avatarStyle, setAvatarStyle] = useState<AvatarStyle>('beam');
  const [avatarColors, setAvatarColors] = useState<string[]>(defaultColors);
  const [bio, setBio] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentStepIndex = STEPS.indexOf(currentStep);
  const progress = ((currentStepIndex) / (STEPS.length - 1)) * 100;

  const avatarName = displayName || 'User';

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex]);
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex]);
    }
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    
    try {
      await completeOnboarding.mutateAsync({
        display_name: displayName || null,
        avatar_style: avatarStyle,
        avatar_colors: avatarColors,
        bio: bio || null,
      });

      // Trigger confetti!
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#9DC08B', '#B4A7D6', '#F4A896', '#FCD34D'],
      });

      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      setIsSubmitting(false);
    }
  };

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0,
    }),
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'welcome':
        return (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center space-y-6"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
              className="w-24 h-24 mx-auto rounded-3xl bg-primary/10 flex items-center justify-center"
            >
              <span className="text-5xl">🌸</span>
            </motion.div>
            
            <div className="space-y-2">
              <h1 className="text-3xl font-bold">Welcome to Bloom!</h1>
              <p className="text-muted-foreground max-w-md mx-auto">
                Let's personalize your experience. This will only take a minute. 🌱
              </p>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex justify-center gap-2 text-muted-foreground text-sm"
            >
              <Flower2 className="h-4 w-4 text-pink-400" />
              <span>Your personal knowledge garden awaits</span>
              <Flower2 className="h-4 w-4 text-pink-400" />
            </motion.div>

            <Button onClick={handleNext} size="lg" className="gap-2">
              Let's Go
              <ArrowRight className="h-4 w-4" />
            </Button>
          </motion.div>
        );

      case 'name':
        return (
          <motion.div
            key="name"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <div className="text-4xl mb-2">👋</div>
              <h2 className="text-2xl font-semibold">What should we call you?</h2>
              <p className="text-muted-foreground">
                This is how you'll appear in Bloom
              </p>
            </div>

            <div className="space-y-4 max-w-sm mx-auto">
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  placeholder="e.g., Alex, Creative Gardener, 🌻 Sunny"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="text-center text-lg"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                {displayName ? (
                  <>
                    <span>Looking good,</span>
                    <span className="font-medium text-foreground">{displayName}</span>
                    <span>✨</span>
                  </>
                ) : (
                  <span>You can always change this later</span>
                )}
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="ghost" onClick={handleBack} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleNext} className="gap-2">
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        );

      case 'avatar':
        return (
          <motion.div
            key="avatar"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-semibold">Choose Your Avatar</h2>
              <p className="text-muted-foreground">
                Click on any avatar you like!
              </p>
            </div>

            {/* Avatar Grid - Show ALL combinations */}
            <div className="space-y-4 max-h-[400px] overflow-y-auto px-2">
              {COLOR_PALETTES.map(({ name, colors }) => (
                <div key={name} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5">
                      {colors.slice(0, 3).map((color, i) => (
                        <div
                          key={i}
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">{name}</span>
                  </div>
                  <div className="grid grid-cols-6 gap-2">
                    {AVATAR_STYLES.map(({ value, label }) => {
                      const isSelected = avatarStyle === value && JSON.stringify(avatarColors) === JSON.stringify(colors);
                      return (
                        <motion.button
                          key={`${name}-${value}`}
                          onClick={() => {
                            setAvatarStyle(value);
                            setAvatarColors(colors);
                          }}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className={cn(
                            'relative flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all',
                            isSelected
                              ? 'border-primary bg-primary/10 shadow-md'
                              : 'border-transparent hover:border-muted-foreground/30 hover:bg-muted/50'
                          )}
                          title={`${label} - ${name}`}
                        >
                          <ProfileAvatar
                            name={avatarName}
                            size={40}
                            style={value}
                            colors={colors}
                          />
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center shadow-sm"
                            >
                              <Check className="h-3 w-3 text-primary-foreground" />
                            </motion.div>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Selected Preview */}
            <div className="flex items-center justify-center gap-4 p-4 rounded-xl bg-muted/50">
              <ProfileAvatar
                name={avatarName}
                size={64}
                style={avatarStyle}
                colors={avatarColors}
              />
              <div className="text-left">
                <p className="text-sm font-medium">Selected Avatar</p>
                <p className="text-xs text-muted-foreground">
                  {AVATAR_STYLES.find(s => s.value === avatarStyle)?.label} • {COLOR_PALETTES.find(p => JSON.stringify(p.colors) === JSON.stringify(avatarColors))?.name}
                </p>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="ghost" onClick={handleBack} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleNext} className="gap-2">
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        );

      case 'bio':
        return (
          <motion.div
            key="bio"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <div className="text-4xl mb-2">✍️</div>
              <h2 className="text-2xl font-semibold">Tell us about yourself</h2>
              <p className="text-muted-foreground">
                A short bio to personalize your space (optional)
              </p>
            </div>

            <div className="space-y-4 max-w-md mx-auto">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="bio">Bio</Label>
                  <span className={cn(
                    'text-xs',
                    bio.length > 140 ? 'text-amber-500' : 'text-muted-foreground'
                  )}>
                    {bio.length}/160
                  </span>
                </div>
                <Textarea
                  id="bio"
                  placeholder="e.g., Avid reader, coffee enthusiast ☕, collecting thoughts one note at a time..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value.slice(0, 160))}
                  rows={3}
                  className="resize-none"
                />
              </div>

              <div className="text-center text-sm text-muted-foreground">
                <span>💡 Tip: You can skip this and add it later!</span>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="ghost" onClick={handleBack} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleNext} className="gap-2">
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        );

      case 'theme':
        return (
          <motion.div
            key="theme"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <div className="text-4xl mb-2">🎨</div>
              <h2 className="text-2xl font-semibold">Choose Your Theme</h2>
              <p className="text-muted-foreground">
                Light, dark, or match your system
              </p>
            </div>

            <RadioGroup
              value={theme}
              onValueChange={(value) => setTheme(value as 'light' | 'dark' | 'system')}
              className="grid grid-cols-3 gap-4 max-w-md mx-auto"
            >
              {[
                { value: 'light', label: 'Light', icon: Sun, emoji: '☀️' },
                { value: 'dark', label: 'Dark', icon: Moon, emoji: '🌙' },
                { value: 'system', label: 'System', icon: Monitor, emoji: '💻' },
              ].map(({ value, label, icon: Icon, emoji }) => (
                <Label
                  key={value}
                  htmlFor={`theme-${value}`}
                  className={cn(
                    'flex flex-col items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all',
                    theme === value
                      ? 'border-primary bg-primary/5'
                      : 'border-muted hover:border-muted-foreground/30'
                  )}
                >
                  <RadioGroupItem value={value} id={`theme-${value}`} className="sr-only" />
                  <span className="text-3xl">{emoji}</span>
                  <span className="text-sm font-medium">{label}</span>
                </Label>
              ))}
            </RadioGroup>

            <div className="flex justify-between">
              <Button variant="ghost" onClick={handleBack} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleNext} className="gap-2">
                Finish
                <Sparkles className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        );

      case 'complete':
        return (
          <motion.div
            key="complete"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-6"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
            >
              <ProfileAvatar
                name={avatarName}
                size={120}
                style={avatarStyle}
                colors={avatarColors}
                className="mx-auto ring-4 ring-primary/20"
              />
            </motion.div>
            
            <div className="space-y-2">
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-3xl font-bold"
              >
                You're all set! 🎉
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-muted-foreground"
              >
                {displayName ? `Welcome to Bloom, ${displayName}!` : 'Welcome to Bloom!'}
              </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex items-center justify-center gap-2 text-primary"
            >
              <Heart className="h-4 w-4 fill-current" />
              <span className="text-sm font-medium">
                Your knowledge garden is ready to bloom
              </span>
              <Heart className="h-4 w-4 fill-current" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Button
                onClick={handleComplete}
                size="lg"
                className="gap-2"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Leaf className="h-4 w-4 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  <>
                    <Leaf className="h-4 w-4" />
                    Start Blooming
                  </>
                )}
              </Button>
            </motion.div>
          </motion.div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-background via-background to-primary/5">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ y: [0, -20, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-20 left-10 text-4xl opacity-20"
        >
          🌱
        </motion.div>
        <motion.div
          animate={{ y: [0, 20, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-40 right-20 text-3xl opacity-20"
        >
          🌷
        </motion.div>
        <motion.div
          animate={{ y: [0, -15, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-40 left-20 text-3xl opacity-20"
        >
          🌻
        </motion.div>
        <motion.div
          animate={{ y: [0, 15, 0] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-20 right-10 text-4xl opacity-20"
        >
          🍃
        </motion.div>
      </div>

      {/* Progress bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-muted">
        <motion.div
          className="h-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Progress dots */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 flex gap-2">
        {STEPS.slice(0, -1).map((step, i) => (
          <motion.div
            key={step}
            className={cn(
              'w-2 h-2 rounded-full transition-colors',
              i <= currentStepIndex ? 'bg-primary' : 'bg-muted'
            )}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: i * 0.1 }}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="flex items-center justify-center min-h-screen p-6">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait">
            {renderStep()}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
