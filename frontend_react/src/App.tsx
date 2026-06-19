import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Skeleton } from "@/components/ui/skeleton";

const LoginPage = lazy(() => import("@/pages/LoginPage"));
const RegisterPage = lazy(() => import("@/pages/RegisterPage"));
const AuthCallbackPage = lazy(() => import("@/pages/AuthCallbackPage"));
const DashboardLayout = lazy(() => import("@/layouts/DashboardLayout"));
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="space-y-4 w-full max-w-md">
        <Skeleton className="h-8 w-48 mx-auto" />
        <Skeleton className="h-4 w-64 mx-auto" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/auth/callback" element={<AuthCallbackPage />} />

              {/* Protected routes */}
              <Route element={<ProtectedRoute />}>
                <Route element={<DashboardLayout />}>
                  <Route
                    path="/"
                    element={<Navigate to="/dashboard" replace />}
                  />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  {/* Placeholder routes for future modules */}
                  <Route
                    path="/users"
                    element={
                      <div className="flex items-center justify-center h-48 text-muted-foreground">
                        Users module coming soon
                      </div>
                    }
                  />
                  <Route
                    path="/offices"
                    element={
                      <div className="flex items-center justify-center h-48 text-muted-foreground">
                        Offices module coming soon
                      </div>
                    }
                  />
                  <Route
                    path="/goals"
                    element={
                      <div className="flex items-center justify-center h-48 text-muted-foreground">
                        Goals module coming soon
                      </div>
                    }
                  />
                  <Route
                    path="/objectives"
                    element={
                      <div className="flex items-center justify-center h-48 text-muted-foreground">
                        Objectives module coming soon
                      </div>
                    }
                  />
                  <Route
                    path="/plans"
                    element={
                      <div className="flex items-center justify-center h-48 text-muted-foreground">
                        Plans module coming soon
                      </div>
                    }
                  />
                </Route>
              </Route>

              {/* 404 */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
