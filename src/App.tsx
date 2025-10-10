import { Toaster as Sonner } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
// Removed TanStack Query per request
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import CommandMenu from "@/components/CommandMenu";
import PageLoader from "@/components/PageLoader";
import { Suspense, lazy } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useOutboxSync } from "@/hooks/useOutboxSync";
import { useAuth } from "@/hooks/useAuth";
const Home = lazy(() => import("./pages/Home"));
const Auth = lazy(() => import("./pages/Auth"));
const MapView = lazy(() => import("./pages/MapView"));
const ReportForm = lazy(() => import("./pages/ReportForm"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ReportSuccess = lazy(() => import("./pages/ReportSuccess"));
const MyReports = lazy(() => import("./pages/MyReports"));
const HelpCenter = lazy(() => import("./pages/HelpCenter"));
const GeoDataManager = lazy(() => import("./pages/GeoDataManager"));

// TanStack Query removed

const AppInner = () => {
  const { user } = useAuth();
  useOutboxSync(user?.id);
  return (
    <>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 z-50 bg-primary text-primary-foreground px-3 py-1 rounded-md">Lewati ke konten utama</a>
      <Navbar />
      <main id="main-content" className="min-h-[calc(100vh-3.5rem)]">{/* 3.5rem ~ navbar height */}
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Home />} />
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
      <CommandMenu />
    </>
  );
};

const App = () => (
  <>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
  <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <AppInner />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </>
);

export default App;
