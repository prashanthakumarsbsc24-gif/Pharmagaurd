import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import AppLayout from './components/AppLayout';
import { LoadingState } from './components/States';
import LoginPage from './pages/LoginPage';
import OverviewPage from './pages/OverviewPage';
import AnalyticsPage from './pages/AnalyticsPage';
import LossesPage from './pages/LossesPage';
import DemandPage from './pages/DemandPage';
import ExpiredPage from './pages/ExpiredPage';
import LowStockPage from './pages/LowStockPage';
import AuditPage from './pages/AuditPage';

export default function App() {
  const { user, booting } = useAuth();
  if (booting) return <LoadingState label="Starting PharmaGuard…" />;
  if (!user) return <LoginPage />;

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<OverviewPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="losses" element={<LossesPage />} />
          <Route path="demand" element={<DemandPage />} />
          <Route path="expired" element={<ExpiredPage />} />
          <Route path="low-stock" element={<LowStockPage />} />
          <Route path="audit" element={<AuditPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
