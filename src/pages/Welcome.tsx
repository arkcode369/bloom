import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Sparkles, ArrowRight, BookOpen, Share2, Brain, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const Welcome = () => {
  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { onboard } = useAuth();
  const navigate = useNavigate();

  const handleComplete = async () => {
    if (!displayName.trim()) return;
    setIsSubmitting(true);
    try {
      const { error } = await onboard(displayName);
      if (error) {
        console.error("Workspace creation failed:", error);
        toast.error(`Failed to create workspace: ${error.message}`);
      } else {
        toast.success("Workspace created!");
        navigate("/app");
      }
    } catch (err) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[100px]" />
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-md z-10"
          >
            <Card className="border-none shadow-2xl bg-card/50 backdrop-blur-xl">
              <CardHeader className="text-center pb-2">
                <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-3xl font-bold tracking-tight">Welcome to Bloom</CardTitle>
                <CardDescription className="text-lg">
                  Your personal second brain, right on your desktop.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-4">
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                      <Brain className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium">Networked Thought</h4>
                      <p className="text-sm text-muted-foreground">Connect notes with [[wikilinks]] to see how your ideas bloom.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                      <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium">Privacy First</h4>
                      <p className="text-sm text-muted-foreground">Everything is stored locally on your machine. No clouds, no tracking.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                      <Share2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium">Hebbian Learning</h4>
                      <p className="text-sm text-muted-foreground">Your graph evolves based on how you use your notes.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full h-12 text-lg group" onClick={() => setStep(2)}>
                  Let's get started
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-md z-10"
          >
            <Card className="border-none shadow-2xl bg-card/50 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-2xl font-bold">Name your workspace</CardTitle>
                <CardDescription>
                  This will be the name of your local second brain.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="display-name">Workspace Name</Label>
                  <Input
                    id="display-name"
                    placeholder="e.g. My Second Brain"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="h-12 text-lg"
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && handleComplete()}
                  />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-3">
                <Button 
                  className="w-full h-12 text-lg" 
                  onClick={handleComplete}
                  disabled={!displayName.trim() || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Workspace"
                  )}
                </Button>
                <Button variant="ghost" onClick={() => setStep(1)}>
                  Back
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Welcome;
