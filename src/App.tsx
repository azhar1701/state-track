import { Toaster as Sonner } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/features/auth/AuthContext";
import Navbar from "@/components/layout/Navbar";
import CommandMenu from "@/components/layout/CommandMenu";
import { OfflineIndicator } from "@/components/layout/OfflineIndicator";
import PageLoader from "@/components/layout/PageLoader";
import { Suspense, lazy, memo, useMemo } from "react";
import ErrorBoundary from "@/components/layout/ErrorBoundary";
import { useOutboxSync } from "@/features/reports/useOutboxSync";
import { useAuth } from "@/features/auth/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePWAUpdateToast } from "@/hooks/usePWAUpdateToast";
import { BottomNav } from "@/components/layout/BottomNav";
import { InstallPrompt } from "@/components/layout/InstallPrompt";
import { KeyboardShortcuts } from "@/components/layout/KeyboardShortcuts";
import { NotificationPrompt } from "@/components/layout/NotificationPrompt";
const Home = lazy(() => import("@/features/home/Home"));
const Auth = lazy(() => import("@/features/auth/Auth"));
const MapView = lazy(() => import("@/features/map/MapView"));
const ReportForm = lazy(() => import("@/features/reports/ReportForm"));
const AdminDashboard = lazy(() => import("@/features/admin/AdminDashboard"));
const NotFound = lazy(() => import("@/views/NotFound"));
const ReportSuccess = lazy(() => import("@/features/reports/ReportSuccess"));
const MyReports = lazy(() => import("@/features/reports/MyReports"));
const HelpCenter = lazy(() => import("@/views/HelpCenter"));
const GeoDataManager = lazy(() => import("@/features/geodata/GeoDataManager"));

// TanStack Query removed

const AppInner = memo(() => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  useOutboxSync(user?.id);
  usePWAUpdateToast();

  const mainStyle = useMemo(() => ({
    paddingBottom: isMobile && user ? '72px' : '0'
  }), [isMobile, user]);

  return (
    <>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 z-50 bg-primary text-primary-foreground px-3 py-1 rounded-md">Lewati ke konten utama</a>
      <Navbar />
      <OfflineIndicator />
      <main id="main-content" className="min-h-[calc(100vh-3.5rem)]" style={mainStyle}>
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/home" element={<Home />} />
              <Route path="/state-track" element={<Navigate to="/" replace />} />
              <Route path="/state-track/*" element={<Navigate to="/" replace />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/map" element={<MapView />} />
              <Route path="/report" element={<ReportForm />} />
              <Route path="/report/success" element={<ReportSuccess />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/me/reports" element={<MyReports />} />
              <Route path="/help" element={<HelpCenter />} />
              <Route path="/assets" element={<Navigate to="/admin?tab=geo" replace />} />
              <Route path="/admin/geo" element={<Navigate to="/admin?tab=geo" replace />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>
      {isMobile && user && <BottomNav />}
      <InstallPrompt />
      <NotificationPrompt />
      <KeyboardShortcuts />
      <CommandMenu />
    </>
  );
});

AppInner.displayName = 'AppInner';

const rawBase = import.meta.env.BASE_URL || "/";
// Normalize trailing slashes so /state-track and /state-track/ both work
const basename = rawBase === "/" ? "/" : rawBase.replace(/\/+$/, "");

const App = () => (
  <>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <Sonner />
        <BrowserRouter basename={basename} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AuthProvider>
            <AppInner />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </>
);

export default App;
