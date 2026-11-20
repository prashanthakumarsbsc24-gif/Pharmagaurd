import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import RegionSwitcher from './RegionSwitcher';
import { useAuth } from '../context/AuthContext';
import { InventoryProvider } from '../context/InventoryContext';

export default function AppLayout() {
  const { region } = useAuth();
  const [navOpen, setNavOpen] = useState(false);
  const today = new Intl.DateTimeFormat(region.locale, { dateStyle: 'full' }).format(new Date());

  return (
    <InventoryProvider>
      <a className="skip-link" href="#main">Skip to content</a>
      <div className="shell">
        <Sidebar open={navOpen} onNavigate={() => setNavOpen(false)} />
        {navOpen && <button className="scrim" aria-label="Close menu" onClick={() => setNavOpen(false)} />}
        <div className="main">
          <div className="topbar">
            <div className="topbar-left">
              <button className="icon-btn menu-btn" onClick={() => setNavOpen(true)} aria-label="Open menu"><Menu size={20} /></button>
              <span className="today">{today}</span>
            </div>
            <RegionSwitcher />
          </div>
          <main id="main" className="content">
            <Outlet />
          </main>
        </div>
      </div>
    </InventoryProvider>
  );
}
