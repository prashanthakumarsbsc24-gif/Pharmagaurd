import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, ChartColumn, TrendingDown, Factory, ArchiveX, PackageMinus, ScrollText, LogOut,
} from 'lucide-react';
import Logo from './Logo';
import { useAuth } from '../context/AuthContext';
import { useInventory } from '../context/InventoryContext';
import { DISPOSAL_AFTER_DAYS } from '../utils/inventory';

export default function Sidebar({ open, onNavigate }) {
  const { user, logout } = useAuth();
  const { items, summary } = useInventory();
  const disposalCount = items.filter((i) => i.daysLeft < -DISPOSAL_AFTER_DAYS).length;

  const groups = [
    { label: 'Inventory', links: [
      { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
      { to: '/analytics', label: 'Analytics', icon: ChartColumn },
    ] },
    { label: 'Risk', links: [
      { to: '/losses', label: 'Losses', icon: TrendingDown, count: summary.counts.expired },
      { to: '/expired', label: 'Disposal queue', icon: ArchiveX, count: disposalCount },
      { to: '/low-stock', label: 'Low stock', icon: PackageMinus, count: summary.lowStock },
    ] },
    { label: 'Planning', links: [{ to: '/demand', label: 'Demand & production', icon: Factory }] },
    { label: 'Compliance', links: [{ to: '/audit', label: 'Audit trail', icon: ScrollText }] },
  ];

  return (
    <aside className={`sidebar${open ? ' open' : ''}`} aria-label="Primary">
      <div className="brand">
        <Logo size={34} />
        <div>
          <strong>PharmaGuard</strong>
          <span>Inventory & expiry control</span>
        </div>
      </div>

      <nav className="nav">
        {groups.map((g) => (
          <div key={g.label} className="nav-group">
            <p className="nav-label">{g.label}</p>
            {g.links.map(({ to, label, icon: Icon, end, count }) => (
              <NavLink key={to} to={to} end={end} className="nav-link" onClick={onNavigate}>
                <Icon size={18} aria-hidden="true" />
                <span>{label}</span>
                {count > 0 && <span className="nav-count">{count > 999 ? '999+' : count}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="account">
        <div className="avatar" aria-hidden="true">{user.username.slice(0, 2).toUpperCase()}</div>
        <div className="account-text">
          <strong title={user.username}>{user.username}</strong>
          <span title={user.role}>{user.role}</span>
        </div>
        <button className="icon-btn icon-btn-inverse" onClick={logout} aria-label="Sign out" title="Sign out">
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
}
