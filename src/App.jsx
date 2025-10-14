import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";

import AuthProviders from "./providers/AuthProvider.jsx";
import { useAuth } from "./auth/hooks/useAuth.js";

import NavBar from "./components/NavBar.jsx";
import Footer from "./components/Footer.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import PlanPage from "./pages/PlanPage.jsx";
import RecipesPage from "./pages/RecipesPage.jsx";
import LearnPage from "./pages/LearnPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import DemoPage from "./pages/DemoPage.jsx";

function RequireAuth({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return null;
  return user ? children : <Navigate to="/login" replace />;
}

function RequireGuest({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return children;
  return user ? <Navigate to="/plan" replace /> : children;
}

export default function App() {
  return (
    <AuthProviders>
      <BrowserRouter>
        <div className="app-shell">
          <header className="app-header"><NavBar /></header>
          <main className="app-main">
            <Routes>
              <Route path="/" element={<RequireGuest><LandingPage /></RequireGuest>} />
              <Route path="/demo" element={<RequireGuest><DemoPage /></RequireGuest>} />
              <Route path="/login" element={<RequireGuest><LoginPage /></RequireGuest>} />

              {/* Plan routes */}
              <Route path="/plan" element={<RequireAuth><PlanPage /></RequireAuth>} />
              <Route path="/plan/:userId/:planId" element={<RequireAuth><PlanPage /></RequireAuth>} />

              <Route path="/recipes" element={<RequireAuth><RecipesPage /></RequireAuth>} />
              <Route path="/learn" element={<RequireAuth><LearnPage /></RequireAuth>} />
              <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <footer><Footer /></footer>
        </div>
      </BrowserRouter>
    </AuthProviders>
  );
}
