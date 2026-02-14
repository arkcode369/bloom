import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { PreferencesProvider } from "@/hooks/usePreferences";
import { DataProvider, WritingStatsProvider } from "@/lib/data";
import Index from "./pages/Index";
import Welcome from "./pages/Welcome";
import NoteWindow from "./pages/NoteWindow";
import NotFound from "./pages/NotFound";
import { WidgetPage } from "./pages/WidgetPage";
import { QuickCapturePage } from "./pages/QuickCapturePage";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

const AppContent = () => {
  const { loading, isOnboarded } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Routes>
      {/* Root redirect */}
      <Route
        path="/"
        element={<Navigate to={isOnboarded ? "/app" : "/welcome"} replace />}
      />

      {/* Welcome / Onboarding */}
      <Route
        path="/welcome"
        element={!isOnboarded ? <Welcome /> : <Navigate to="/app" replace />}
      />

      {/* Main App */}
      <Route
        path="/app"
        element={isOnboarded ? <Index /> : <Navigate to="/welcome" replace />}
      />

      {/* Standalone Note Window */}
      <Route
        path="/note/:id"
        element={isOnboarded ? <NoteWindow /> : <Navigate to="/welcome" replace />}
      />

      {/* Planner Widget Window */}
      <Route path="/widget" element={<WidgetPage />} />

      {/* Quick Capture Widget Window */}
      <Route path="/quick-capture" element={<QuickCapturePage />} />

      {/* Catch-all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <DataProvider>
      <WritingStatsProvider>
        <ThemeProvider>
          <PreferencesProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <AuthProvider>
                  <ErrorBoundary>
                    <AppContent />
                  </ErrorBoundary>
                </AuthProvider>
              </BrowserRouter>
            </TooltipProvider>
          </PreferencesProvider>
        </ThemeProvider>
      </WritingStatsProvider>
    </DataProvider>
  </QueryClientProvider>
);

export default App;
