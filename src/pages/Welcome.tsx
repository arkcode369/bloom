import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  BookOpen,
  Brain,
  Loader2,
  Globe,
  Link2,
  Search,
  Calendar,
  Lightbulb,
  Shield,
  Check,
  Flower2,
  Tag,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { languages, type LanguageCode } from "@/i18n";
import i18n from "@/i18n";

// ─── Floating Petal Particles ───────────────────────────────────────────
const FloatingPetal = ({ delay, x, size }: { delay: number; x: number; size: number }) => (
  <motion.div
    className="absolute pointer-events-none"
    style={{ left: `${x}%`, top: -20 }}
    initial={{ y: -20, opacity: 0, rotate: 0 }}
    animate={{
      y: ["0vh", "105vh"],
      opacity: [0, 0.6, 0.4, 0],
      rotate: [0, 180, 360],
      x: [0, Math.random() > 0.5 ? 30 : -30, 0],
    }}
    transition={{
      duration: 12 + Math.random() * 8,
      delay,
      repeat: Infinity,
      ease: "linear",
    }}
  >
    <div
      className="rounded-full bg-gradient-to-br from-[hsl(var(--petal))] to-[hsl(var(--lavender))]"
      style={{
        width: size,
        height: size * 0.6,
        opacity: 0.3,
        filter: "blur(1px)",
      }}
    />
  </motion.div>
);

// ─── Animated Background ────────────────────────────────────────────────
const WelcomeBackground = ({ step }: { step: number }) => {
  const backgrounds = [
    "from-[hsl(60,20%,96%)] via-[hsl(100,20%,94%)] to-[hsl(259,25%,95%)]",
    "from-[hsl(100,25%,95%)] via-[hsl(60,20%,96%)] to-[hsl(14,50%,95%)]",
    "from-[hsl(100,30%,94%)] via-[hsl(100,15%,97%)] to-[hsl(45,60%,95%)]",
    "from-[hsl(259,30%,95%)] via-[hsl(60,15%,97%)] to-[hsl(100,20%,95%)]",
    "from-[hsl(14,50%,95%)] via-[hsl(45,40%,96%)] to-[hsl(100,20%,96%)]",
    "from-[hsl(45,50%,95%)] via-[hsl(100,20%,96%)] to-[hsl(259,20%,96%)]",
  ];

  const darkBackgrounds = [
    "from-[hsl(225,15%,8%)] via-[hsl(225,12%,10%)] to-[hsl(259,12%,10%)]",
    "from-[hsl(100,10%,8%)] via-[hsl(225,12%,10%)] to-[hsl(14,10%,10%)]",
    "from-[hsl(100,12%,9%)] via-[hsl(225,11%,10%)] to-[hsl(45,10%,10%)]",
    "from-[hsl(259,12%,9%)] via-[hsl(225,11%,10%)] to-[hsl(100,8%,10%)]",
    "from-[hsl(14,12%,9%)] via-[hsl(45,10%,10%)] to-[hsl(100,8%,10%)]",
    "from-[hsl(45,12%,9%)] via-[hsl(100,8%,10%)] to-[hsl(259,8%,10%)]",
  ];

  return (
    <div className="absolute inset-0 overflow-hidden">
      <motion.div
        key={`bg-${step}`}
        className={`absolute inset-0 bg-gradient-to-br ${backgrounds[step]} dark:hidden`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.8 }}
      />
      <motion.div
        key={`bg-dark-${step}`}
        className={`absolute inset-0 bg-gradient-to-br ${darkBackgrounds[step]} hidden dark:block`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.8 }}
      />

      {/* Floating orbs */}
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full blur-[120px] opacity-20 dark:opacity-10"
        style={{ background: "hsl(var(--primary))" }}
        animate={{ x: ["-10%", "5%", "-10%"], y: ["-10%", "5%", "-10%"] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute right-0 bottom-0 w-[400px] h-[400px] rounded-full blur-[100px] opacity-15 dark:opacity-[0.08]"
        style={{ background: "hsl(var(--petal))" }}
        animate={{ x: ["10%", "-5%", "10%"], y: ["10%", "-5%", "10%"] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute left-1/2 top-1/2 w-[300px] h-[300px] rounded-full blur-[80px] opacity-10 dark:opacity-[0.05]"
        style={{ background: "hsl(var(--lavender))" }}
        animate={{ x: ["-50%", "-40%", "-50%"], y: ["-50%", "-60%", "-50%"] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Floating petals */}
      {Array.from({ length: 8 }).map((_, i) => (
        <FloatingPetal key={i} delay={i * 2.5} x={10 + Math.random() * 80} size={6 + Math.random() * 10} />
      ))}

      {/* Grain texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
};

// ─── Step Progress Indicator ────────────────────────────────────────────
const StepIndicator = ({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) => (
  <div className="flex items-center gap-2">
    {Array.from({ length: totalSteps }).map((_, i) => (
      <motion.div
        key={i}
        className="relative h-1.5 rounded-full overflow-hidden"
        animate={{
          width: i === currentStep ? 32 : 8,
          backgroundColor:
            i === currentStep
              ? "hsl(var(--primary))"
              : i < currentStep
                ? "hsl(var(--primary) / 0.5)"
                : "hsl(var(--muted-foreground) / 0.2)",
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      />
    ))}
  </div>
);

// ─── Language Flag ──────────────────────────────────────────────────────
const LanguageFlag = ({ code }: { code: string }) => {
  const flags: Record<string, string> = { en: "🇬🇧", id: "🇮🇩", ja: "🇯🇵" };
  return <span className="text-3xl">{flags[code] || "🌐"}</span>;
};

// ─── Feature Card Component ────────────────────────────────────────────
const FeatureItem = ({
  icon: Icon, title, description, color, delay,
}: {
  icon: React.ElementType; title: string; description: string; color: string; delay: number;
}) => (
  <motion.div
    className="flex items-start gap-4 group"
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
  >
    <motion.div
      className={`w-11 h-11 rounded-xl ${color} flex items-center justify-center flex-shrink-0 shadow-sm`}
      whileHover={{ scale: 1.1, rotate: 5 }}
      transition={{ type: "spring", stiffness: 400 }}
    >
      <Icon className="h-5 w-5 text-white" />
    </motion.div>
    <div className="pt-0.5">
      <h4 className="font-display font-bold text-[15px] tracking-tight text-foreground">{title}</h4>
      <p className="text-sm text-muted-foreground leading-relaxed mt-0.5">{description}</p>
    </div>
  </motion.div>
);

// ─── Animated Bloom Logo ────────────────────────────────────────────────
const BloomLogo = ({ size = 64 }: { size?: number }) => (
  <motion.div
    className="relative"
    style={{ width: size, height: size }}
    initial={{ scale: 0, rotate: -180 }}
    animate={{ scale: 1, rotate: 0 }}
    transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
  >
    <motion.div
      className="absolute inset-0 rounded-2xl"
      style={{
        background: "linear-gradient(135deg, hsl(var(--primary) / 0.3), hsl(var(--petal) / 0.3))",
        filter: "blur(12px)",
      }}
      animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
    />
    <div className="relative w-full h-full bg-gradient-to-br from-primary to-[hsl(var(--petal))] rounded-2xl flex items-center justify-center shadow-lg">
      <Flower2 className="text-white" style={{ width: size * 0.5, height: size * 0.5 }} />
    </div>
  </motion.div>
);

// ─── Main Welcome Component ─────────────────────────────────────────────
const Welcome = () => {
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [direction, setDirection] = useState(0);
  const [selectedLang, setSelectedLang] = useState<LanguageCode>(
    () => (localStorage.getItem("i18nextLng") as LanguageCode) || "en"
  );
  const { onboard } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const TOTAL_STEPS = 6;

  const handleLanguageChange = (code: LanguageCode) => {
    setSelectedLang(code);
    i18n.changeLanguage(code);
  };

  const handleComplete = async () => {
    if (!displayName.trim()) return;
    setIsSubmitting(true);
    try {
      const { error } = await onboard(displayName);
      if (error) {
        console.error("Workspace creation failed:", error);
        toast.error(t("welcome.workspace_error"));
      } else {
        toast.success(t("welcome.workspace_created"));
        navigate("/app");
      }
    } catch (err) {
      toast.error(t("welcome.unexpected_error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const goNext = () => {
    setDirection(1);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  };

  const goBack = () => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 0));
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && step < TOTAL_STEPS - 1) goNext();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [step]);

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0, scale: 0.96 }),
    center: { x: 0, opacity: 1, scale: 1 },
    exit: (dir: number) => ({ x: dir < 0 ? 80 : -80, opacity: 0, scale: 0.96 }),
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
      <WelcomeBackground step={step} />

      {/* Step indicator */}
      <motion.div
        className="absolute top-6 z-20"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <StepIndicator currentStep={step} totalSteps={TOTAL_STEPS} />
      </motion.div>

      {/* Main content */}
      <div className="w-full max-w-lg z-10">
        <AnimatePresence mode="wait" custom={direction}>
          {/* ─── Step 0: Language Selection ──────────────────── */}
          {step === 0 && (
            <motion.div
              key="language"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-8"
            >
              <div className="text-center space-y-5">
                <div className="flex justify-center">
                  <BloomLogo size={72} />
                </div>
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                  <h1 className="font-display text-4xl font-bold tracking-tight text-foreground">Bloom Notes</h1>
                  <p className="text-muted-foreground mt-2 text-lg font-body">{t("welcome.choose_language")}</p>
                </motion.div>
              </div>

              <div className="space-y-3">
                {languages.map((lang, i) => (
                  <motion.button
                    key={lang.code}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                    onClick={() => handleLanguageChange(lang.code)}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-300
                      ${selectedLang === lang.code
                        ? "border-primary bg-primary/5 dark:bg-primary/10 shadow-md shadow-primary/10"
                        : "border-transparent bg-card/60 dark:bg-card/40 hover:bg-card/80 dark:hover:bg-card/60 hover:border-border"
                      } backdrop-blur-xl cursor-pointer group`}
                  >
                    <LanguageFlag code={lang.code} />
                    <div className="text-left flex-1">
                      <p className="font-display font-bold text-foreground">{lang.nativeName}</p>
                      <p className="text-sm text-muted-foreground">{lang.name}</p>
                    </div>
                    <AnimatePresence>
                      {selectedLang === lang.code && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          className="w-7 h-7 rounded-full bg-primary flex items-center justify-center"
                        >
                          <Check className="h-4 w-4 text-primary-foreground" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.button>
                ))}
              </div>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
                <Button className="w-full h-13 text-base font-semibold rounded-xl group bg-primary hover:bg-primary/90" onClick={goNext} size="lg">
                  {t("welcome.continue")}
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </motion.div>
            </motion.div>
          )}

          {/* ─── Step 1: Welcome Introduction ───────────────── */}
          {step === 1 && (
            <motion.div
              key="intro"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-8"
            >
              <div className="text-center space-y-5">
                <div className="flex justify-center"><BloomLogo size={80} /></div>
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-3">
                  <h1 className="font-display text-4xl font-bold tracking-tight text-foreground leading-tight">{t("welcome.title")}</h1>
                  <p className="text-muted-foreground text-lg font-body leading-relaxed max-w-sm mx-auto">{t("welcome.subtitle")}</p>
                </motion.div>
              </div>

              {/* Animated knowledge graph hero */}
              <motion.div
                className="relative h-40 rounded-2xl overflow-hidden bg-gradient-to-br from-primary/10 via-[hsl(var(--lavender-light))] to-[hsl(var(--petal-light))] dark:from-primary/5 dark:via-[hsl(var(--lavender)/0.1)] dark:to-[hsl(var(--petal)/0.1)] border border-border/50"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                {[
                  { x: "20%", y: "30%", size: 40, delay: 0.6, color: "var(--primary)" },
                  { x: "50%", y: "50%", size: 52, delay: 0.8, color: "var(--petal)" },
                  { x: "75%", y: "35%", size: 36, delay: 1.0, color: "var(--lavender)" },
                  { x: "35%", y: "65%", size: 30, delay: 1.2, color: "var(--sunlight)" },
                  { x: "65%", y: "70%", size: 34, delay: 1.1, color: "var(--primary)" },
                ].map((node, i) => (
                  <motion.div
                    key={i}
                    className="absolute rounded-full flex items-center justify-center shadow-lg"
                    style={{ left: node.x, top: node.y, width: node.size, height: node.size, background: `hsl(${node.color})`, transform: "translate(-50%, -50%)" }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 0.85 }}
                    transition={{ delay: node.delay, type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <motion.div className="w-2 h-2 rounded-full bg-white/80" animate={{ scale: [1, 1.5, 1] }} transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }} />
                  </motion.div>
                ))}
                <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 0 }}>
                  {[["20%","30%","50%","50%"],["50%","50%","75%","35%"],["50%","50%","35%","65%"],["35%","65%","65%","70%"],["75%","35%","65%","70%"]].map(([x1,y1,x2,y2], i) => (
                    <motion.line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="hsl(var(--primary) / 0.25)" strokeWidth={1.5} initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ delay: 1.3 + i * 0.1, duration: 0.6 }} />
                  ))}
                </svg>
              </motion.div>

              {/* Badges */}
              <motion.div className="grid grid-cols-3 gap-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
                {[
                  { icon: Shield, label: t("welcome.privacy_badge"), color: "bg-primary/10 text-primary" },
                  { icon: Brain, label: t("welcome.smart_badge"), color: "bg-[hsl(var(--lavender-light))] text-[hsl(var(--lavender-dark))]" },
                  { icon: Sparkles, label: t("welcome.offline_badge"), color: "bg-[hsl(var(--petal-light))] text-[hsl(var(--petal-dark))]" },
                ].map((badge, i) => (
                  <motion.div key={i} className={`flex flex-col items-center gap-2 p-3 rounded-xl ${badge.color}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 + i * 0.1 }} whileHover={{ y: -2 }}>
                    <badge.icon className="h-5 w-5" />
                    <span className="text-xs font-semibold text-center">{badge.label}</span>
                  </motion.div>
                ))}
              </motion.div>

              <div className="flex gap-3">
                <Button variant="ghost" onClick={goBack} className="h-12 px-4 rounded-xl"><ArrowLeft className="h-4 w-4" /></Button>
                <Button className="flex-1 h-12 text-base font-semibold rounded-xl group" onClick={goNext} size="lg">
                  {t("welcome.discover_features")}
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* ─── Step 2: Writing & Notes Features ───────────── */}
          {step === 2 && (
            <motion.div
              key="features-writing"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-7"
            >
              <div className="space-y-2">
                <motion.div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
                  <BookOpen className="h-3.5 w-3.5" />
                  {t("welcome.feature_tag_write")}
                </motion.div>
                <motion.h2 className="font-display text-3xl font-bold tracking-tight" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>{t("welcome.feature_write_title")}</motion.h2>
                <motion.p className="text-muted-foreground text-base" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>{t("welcome.feature_write_desc")}</motion.p>
              </div>

              {/* Editor mockup */}
              <motion.div className="rounded-2xl border border-border/60 bg-card/60 dark:bg-card/40 backdrop-blur-xl overflow-hidden shadow-lg" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/40 bg-muted/30">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-400/60" />
                  </div>
                  <span className="text-xs text-muted-foreground font-mono ml-2">my-ideas.md</span>
                </div>
                <div className="p-5 space-y-3 font-body text-sm">
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="text-foreground">
                    <span className="text-muted-foreground font-mono text-xs">#</span>{" "}
                    <span className="font-display font-bold text-lg">{t("welcome.editor_heading")}</span>
                  </motion.div>
                  <motion.p className="text-muted-foreground leading-relaxed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>{t("welcome.editor_body")}</motion.p>
                  <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.9 }} className="flex items-center gap-1">
                    <span className="text-muted-foreground">{t("welcome.editor_link_prefix")}</span>
                    <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary font-semibold text-xs border border-primary/20">[[{t("welcome.editor_wikilink")}]]</span>
                  </motion.div>
                  <motion.div className="flex gap-2 mt-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }}>
                    <span className="px-2 py-0.5 rounded-full bg-[hsl(var(--lavender-light))] text-[hsl(var(--lavender-dark))] text-xs font-semibold">#{t("welcome.editor_tag1")}</span>
                    <span className="px-2 py-0.5 rounded-full bg-[hsl(var(--sunlight-light))] text-[hsl(var(--petal-dark))] text-xs font-semibold">#{t("welcome.editor_tag2")}</span>
                  </motion.div>
                </div>
              </motion.div>

              <div className="space-y-3">
                <FeatureItem icon={Link2} title={t("welcome.feat_wikilinks")} description={t("welcome.feat_wikilinks_desc")} color="bg-primary" delay={0.5} />
                <FeatureItem icon={Tag} title={t("welcome.feat_tags")} description={t("welcome.feat_tags_desc")} color="bg-[hsl(var(--lavender))]" delay={0.6} />
                <FeatureItem icon={Search} title={t("welcome.feat_search")} description={t("welcome.feat_search_desc")} color="bg-[hsl(var(--petal))]" delay={0.7} />
              </div>

              <div className="flex gap-3">
                <Button variant="ghost" onClick={goBack} className="h-12 px-4 rounded-xl"><ArrowLeft className="h-4 w-4" /></Button>
                <Button className="flex-1 h-12 text-base font-semibold rounded-xl group" onClick={goNext}>{t("welcome.next")}<ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" /></Button>
              </div>
            </motion.div>
          )}

          {/* ─── Step 3: Knowledge Graph ─────────────────────── */}
          {step === 3 && (
            <motion.div
              key="features-graph"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-7"
            >
              <div className="space-y-2">
                <motion.div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[hsl(var(--lavender-light))] text-[hsl(var(--lavender-dark))] text-xs font-semibold" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
                  <Brain className="h-3.5 w-3.5" />
                  {t("welcome.feature_tag_think")}
                </motion.div>
                <motion.h2 className="font-display text-3xl font-bold tracking-tight" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>{t("welcome.feature_think_title")}</motion.h2>
                <motion.p className="text-muted-foreground text-base" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>{t("welcome.feature_think_desc")}</motion.p>
              </div>

              {/* Animated knowledge graph */}
              <motion.div className="relative h-52 rounded-2xl border border-border/60 bg-card/40 dark:bg-card/30 backdrop-blur-xl overflow-hidden" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <svg className="absolute inset-0 w-full h-full">
                  {[{ x1:"50%",y1:"45%",x2:"25%",y2:"25%",d:0.8 },{ x1:"50%",y1:"45%",x2:"78%",y2:"30%",d:0.9 },{ x1:"50%",y1:"45%",x2:"30%",y2:"72%",d:1.0 },{ x1:"50%",y1:"45%",x2:"72%",y2:"75%",d:1.1 },{ x1:"25%",y1:"25%",x2:"15%",y2:"55%",d:1.2 },{ x1:"78%",y1:"30%",x2:"88%",y2:"60%",d:1.3 },{ x1:"30%",y1:"72%",x2:"72%",y2:"75%",d:1.4 }].map((line, i) => (
                    <motion.line key={i} x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} stroke="hsl(var(--primary) / 0.2)" strokeWidth={1.5} initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ delay: line.d, duration: 0.5 }} />
                  ))}
                </svg>
                {[
                  { x:"50%",y:"45%",s:56,c:"var(--primary)",label:t("welcome.graph_center"),d:0.6,isBig:true },
                  { x:"25%",y:"25%",s:38,c:"var(--lavender)",label:t("welcome.graph_n1"),d:0.7,isBig:false },
                  { x:"78%",y:"30%",s:34,c:"var(--petal)",label:t("welcome.graph_n2"),d:0.8,isBig:false },
                  { x:"30%",y:"72%",s:32,c:"var(--sunlight)",label:t("welcome.graph_n3"),d:0.9,isBig:false },
                  { x:"72%",y:"75%",s:36,c:"var(--primary)",label:t("welcome.graph_n4"),d:1.0,isBig:false },
                  { x:"15%",y:"55%",s:26,c:"var(--lavender)",label:"",d:1.1,isBig:false },
                  { x:"88%",y:"60%",s:24,c:"var(--petal)",label:"",d:1.2,isBig:false },
                ].map((node, i) => (
                  <motion.div key={i} className="absolute flex flex-col items-center gap-1" style={{ left: node.x, top: node.y, transform: "translate(-50%, -50%)", zIndex: node.isBig ? 10 : 5 }} initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: node.d, type: "spring", stiffness: 300, damping: 20 }}>
                    <motion.div className="rounded-full shadow-lg flex items-center justify-center" style={{ width: node.s, height: node.s, background: `hsl(${node.c})` }} animate={node.isBig ? { boxShadow: ["0 0 0px 0px hsl(var(--primary) / 0.2)","0 0 20px 8px hsl(var(--primary) / 0.15)","0 0 0px 0px hsl(var(--primary) / 0.2)"] } : {}} transition={{ duration: 3, repeat: Infinity }} whileHover={{ scale: 1.2 }}>
                      {node.isBig && <Brain className="h-6 w-6 text-white" />}
                    </motion.div>
                    {node.label && <span className="text-[10px] font-semibold text-muted-foreground whitespace-nowrap">{node.label}</span>}
                  </motion.div>
                ))}
              </motion.div>

              <div className="space-y-3">
                <FeatureItem icon={Brain} title={t("welcome.feat_graph")} description={t("welcome.feat_graph_desc")} color="bg-[hsl(var(--lavender))]" delay={0.5} />
                <FeatureItem icon={Lightbulb} title={t("welcome.feat_discover")} description={t("welcome.feat_discover_desc")} color="bg-[hsl(var(--sunlight))]" delay={0.6} />
              </div>

              <div className="flex gap-3">
                <Button variant="ghost" onClick={goBack} className="h-12 px-4 rounded-xl"><ArrowLeft className="h-4 w-4" /></Button>
                <Button className="flex-1 h-12 text-base font-semibold rounded-xl group" onClick={goNext}>{t("welcome.next")}<ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" /></Button>
              </div>
            </motion.div>
          )}

          {/* ─── Step 4: Planning & Productivity ────────────── */}
          {step === 4 && (
            <motion.div
              key="features-plan"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-7"
            >
              <div className="space-y-2">
                <motion.div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[hsl(var(--petal-light))] text-[hsl(var(--petal-dark))] text-xs font-semibold" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
                  <Calendar className="h-3.5 w-3.5" />
                  {t("welcome.feature_tag_plan")}
                </motion.div>
                <motion.h2 className="font-display text-3xl font-bold tracking-tight" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>{t("welcome.feature_plan_title")}</motion.h2>
                <motion.p className="text-muted-foreground text-base" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>{t("welcome.feature_plan_desc")}</motion.p>
              </div>

              {/* Planner mockup */}
              <motion.div className="rounded-2xl border border-border/60 bg-card/60 dark:bg-card/40 backdrop-blur-xl overflow-hidden shadow-lg" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <div className="px-5 py-3 border-b border-border/40 bg-muted/30 flex items-center justify-between">
                  <span className="font-display font-bold text-sm">{t("welcome.planner_title")}</span>
                  <span className="text-xs text-muted-foreground font-mono">{t("welcome.planner_date")}</span>
                </div>
                <div className="p-4 space-y-2.5">
                  {[
                    { time: "09:00", task: t("welcome.planner_t1"), done: true, color: "bg-primary" },
                    { time: "10:30", task: t("welcome.planner_t2"), done: true, color: "bg-[hsl(var(--lavender))]" },
                    { time: "14:00", task: t("welcome.planner_t3"), done: false, color: "bg-[hsl(var(--petal))]" },
                    { time: "16:00", task: t("welcome.planner_t4"), done: false, color: "bg-[hsl(var(--sunlight))]" },
                  ].map((item, i) => (
                    <motion.div key={i} className="flex items-center gap-3" initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 + i * 0.12 }}>
                      <span className="text-xs text-muted-foreground font-mono w-10 flex-shrink-0">{item.time}</span>
                      <div className={`w-1 h-8 rounded-full ${item.color} ${item.done ? "opacity-100" : "opacity-40"}`} />
                      <span className={`text-sm flex-1 ${item.done ? "line-through text-muted-foreground" : "text-foreground"}`}>{item.task}</span>
                      {item.done && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.8 + i * 0.12, type: "spring" }}>
                          <Check className="h-4 w-4 text-primary" />
                        </motion.div>
                      )}
                    </motion.div>
                  ))}
                </div>
                <div className="px-5 py-3 border-t border-border/40 bg-muted/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground font-semibold">{t("welcome.activity_label")}</span>
                  </div>
                  <div className="flex gap-[3px]">
                    {Array.from({ length: 28 }).map((_, i) => {
                      const levels = [0,0,1,2,0,1,3,0,2,1,0,4,2,1,3,0,1,2,0,1,4,2,0,1,3,2,1,0];
                      const colors = ["bg-muted","bg-primary/25","bg-primary/45","bg-primary/70","bg-primary"];
                      return <motion.div key={i} className={`w-2.5 h-2.5 rounded-[2px] ${colors[levels[i]]}`} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.0 + i * 0.02 }} />;
                    })}
                  </div>
                </div>
              </motion.div>

              <div className="space-y-3">
                <FeatureItem icon={Calendar} title={t("welcome.feat_planner")} description={t("welcome.feat_planner_desc")} color="bg-[hsl(var(--petal))]" delay={0.5} />
                <FeatureItem icon={Sparkles} title={t("welcome.feat_activity")} description={t("welcome.feat_activity_desc")} color="bg-primary" delay={0.6} />
              </div>

              <div className="flex gap-3">
                <Button variant="ghost" onClick={goBack} className="h-12 px-4 rounded-xl"><ArrowLeft className="h-4 w-4" /></Button>
                <Button className="flex-1 h-12 text-base font-semibold rounded-xl group" onClick={goNext}>{t("welcome.get_started")}<ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" /></Button>
              </div>
            </motion.div>
          )}

          {/* ─── Step 5: Create Workspace ───────────────────── */}
          {step === 5 && (
            <motion.div
              key="workspace"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-7"
            >
              <div className="text-center space-y-4">
                <motion.div className="flex justify-center" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 15 }}>
                  <div className="w-16 h-16 bg-gradient-to-br from-primary to-[hsl(var(--petal))] rounded-2xl flex items-center justify-center shadow-lg">
                    <Flower2 className="h-8 w-8 text-white" />
                  </div>
                </motion.div>
                <motion.h2 className="font-display text-3xl font-bold tracking-tight" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>{t("welcome.workspace_title")}</motion.h2>
                <motion.p className="text-muted-foreground text-base" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>{t("welcome.workspace_desc")}</motion.p>
              </div>

              <motion.div className="space-y-3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <Label htmlFor="display-name" className="text-sm font-semibold">{t("welcome.workspace_label")}</Label>
                <Input
                  id="display-name"
                  placeholder={t("welcome.workspace_placeholder")}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="h-14 text-lg rounded-xl border-2 focus:border-primary bg-card/60 backdrop-blur-xl"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleComplete()}
                />
              </motion.div>

              {/* Summary */}
              <motion.div className="rounded-xl bg-muted/30 dark:bg-muted/20 p-4 space-y-2.5 border border-border/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                <div className="flex items-center gap-3 text-sm">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{t("welcome.summary_language")}</span>
                  <span className="ml-auto font-semibold">{languages.find((l) => l.code === selectedLang)?.nativeName}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{t("welcome.summary_storage")}</span>
                  <span className="ml-auto font-semibold text-primary">{t("welcome.summary_local")}</span>
                </div>
              </motion.div>

              <div className="flex gap-3">
                <Button variant="ghost" onClick={goBack} className="h-12 px-4 rounded-xl"><ArrowLeft className="h-4 w-4" /></Button>
                <Button
                  className="flex-1 h-13 text-base font-semibold rounded-xl group bg-gradient-to-r from-primary to-[hsl(var(--petal))] hover:opacity-90 transition-opacity"
                  onClick={handleComplete}
                  disabled={!displayName.trim() || isSubmitting}
                  size="lg"
                >
                  {isSubmitting ? (
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" />{t("welcome.creating")}</>
                  ) : (
                    <><Sparkles className="mr-2 h-4 w-4" />{t("welcome.create_workspace")}</>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Keyboard hint */}
      <motion.div className="absolute bottom-5 z-20" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}>
        {step < TOTAL_STEPS - 1 && (
          <p className="text-xs text-muted-foreground/50">
            <kbd className="px-1.5 py-0.5 rounded bg-muted/50 text-[10px] font-mono">Enter</kbd>{" "}
            {t("welcome.press_continue")}
          </p>
        )}
      </motion.div>
    </div>
  );
};

export default Welcome;
