// src/components/NavBar.jsx

import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Box, Button, Flex } from "@radix-ui/themes";
import { PersonIcon } from "@radix-ui/react-icons";
import { useAuth } from "../auth/hooks/useAuth.js";
import AccountModal from "./account/AccountModal.jsx";

export default function NavBar() {
  const { user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [drawer, setDrawer] = useState(false);

  useEffect(() => { setDrawer(false); }, [location.pathname]);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") setDrawer(false); };
    document.addEventListener("keydown", onKey);
    document.body.classList.toggle("no-scroll", drawer);
    return () => { document.removeEventListener("keydown", onKey); document.body.classList.remove("no-scroll"); };
  }, [drawer]);

  const isActive = (path) => location.pathname === path;

  return (
    <Box asChild className="navbar">
      <header>
        <div className="nav-wrap">
          <Link to="/" className="nav-brand">
            <img src="https://msutemmnckhpwnwrwvrl.supabase.co/storage/v1/object/public/website-images/astro-logos/ASTRO%20logo%20final%20-%20black%20transparent.png" alt="ASTRO Meals" />
          </Link>

          {/* Desktop */}
          <Flex gap="3" align="center" className="nav-links">
            {user ? (
              <>
                {user.email && (
                  <button type="button" className="email-pill clickable" onClick={() => setOpen(true)}>
                    {user.email}
                  </button>
                )}
                <Button variant={isActive("/plan") ? "solid" : "soft"} asChild><Link to="/plan">Plan</Link></Button>
                <Button variant={isActive("/recipes") ? "solid" : "soft"} asChild><Link to="/recipes">Recipes</Link></Button>
                <Button variant={isActive("/learn") ? "solid" : "soft"} asChild><Link to="/learn">Learn</Link></Button>
                <Button variant={isActive("/profile") ? "solid" : "soft"} asChild><Link to="/profile"><PersonIcon /> Profile</Link></Button>
              </>
            ) : (
              <>
                <Button variant={isActive("/") ? "solid" : "soft"} asChild><Link to="/">Home</Link></Button>
                <Button variant={isActive("/demo") ? "solid" : "soft"} asChild><Link to="/demo">Demo</Link></Button>
                <Button variant={isActive("/login") ? "solid" : "soft"} asChild><Link to="/login">Log in</Link></Button>
              </>
            )}
          </Flex>

          {/* Burger */}
          <button
            className={`nav-burger ${drawer ? "is-open" : ""}`}
            aria-label={drawer ? "Close menu" : "Open menu"}
            aria-expanded={drawer}
            aria-controls="nav-drawer"
            onClick={() => setDrawer(v => !v)}
          >
            <span/><span/><span/>
          </button>
        </div>

        {/* Overlay */}
        <div className={`nav-overlay ${drawer ? "show" : ""}`} onClick={() => setDrawer(false)} />

        {/* Drawer */}
        <aside id="nav-drawer" className={`nav-drawer ${drawer ? "open" : ""}`} role="dialog" aria-modal="true">
          <div className="nav-drawer-inner">
            <div className="nav-drawer-header">
              <button className="close-x" aria-label="Close menu" onClick={() => setDrawer(false)}>×</button>
            </div>

            <nav className="nav-drawer-links">
              {user && user.email && (
                <button type="button" className="email-pill clickable" onClick={() => { setDrawer(false); setOpen(true); }}>
                  {user.email}
                </button>
              )}
              <Link className={isActive("/plan") ? "active" : ""} to="/plan">Plan</Link>
              <Link className={isActive("/recipes") ? "active" : ""} to="/recipes">Recipes</Link>
              <Link className={isActive("/learn") ? "active" : ""} to="/learn">Learn</Link>
              <Link className={isActive("/profile") ? "active" : ""} to="/profile">Profile</Link>
              {!user && <Link className={isActive("/demo") ? "active" : ""} to="/demo">Demo</Link>}
              {!user && <Link className={isActive("/login") ? "active" : ""} to="/login">Log in</Link>}
            </nav>
          </div>
        </aside>

        {/* Account modal */}
        <AccountModal open={open} onOpenChange={setOpen} />

      </header>
    </Box>
  );
}
