import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import RequireRole from './components/auth/RequireRole';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/auth/LoginPage';

import EodEntryPage from './pages/operator/EodEntryPage';
import EodHistoryPage from './pages/operator/EodHistoryPage';
import CorrectionsPage from './pages/operator/CorrectionsPage';
import MyPerformancePage from './pages/operator/MyPerformancePage';

import ApprovalsPage from './pages/do/ApprovalsPage';
import CentresPage from './pages/do/CentresPage';

import RateCardPage from './pages/co/RateCardPage';
import HolidaysPage from './pages/co/HolidaysPage';
import DivisionsPage from './pages/co/DivisionsPage';

import MisReportPage from './pages/shared/MisReportPage';

function HomeRedirect() {
  const { role } = useAuth();
  const target = {
    operator: '/eod/new',
    do: '/approvals',
    ro: '/reports/region',
    co: '/reports/circle',
  }[role];
  return <Navigate to={target || '/login'} replace />;
}

function ScopedMisReport({ scopeType, title }) {
  const { scope } = useAuth();
  const scopeId = { division: scope.divisionId, region: scope.regionId, circle: scope.circleId }[scopeType];
  return <MisReportPage scopeType={scopeType} scopeId={scopeId} title={title} />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            element={
              <RequireRole>
                <AppLayout />
              </RequireRole>
            }
          >
            <Route path="/" element={<HomeRedirect />} />

            {/* Operator */}
            <Route path="/eod/new" element={<RequireRole roles={['operator']}><EodEntryPage /></RequireRole>} />
            <Route path="/eod/history" element={<RequireRole roles={['operator']}><EodHistoryPage /></RequireRole>} />
            <Route path="/eod/corrections" element={<RequireRole roles={['operator']}><CorrectionsPage /></RequireRole>} />
            <Route path="/reports/mine" element={<RequireRole roles={['operator']}><MyPerformancePage /></RequireRole>} />

            {/* DO */}
            <Route path="/approvals" element={<RequireRole roles={['do']}><ApprovalsPage /></RequireRole>} />
            <Route path="/centres" element={<RequireRole roles={['do']}><CentresPage /></RequireRole>} />
            <Route
              path="/reports/division"
              element={<RequireRole roles={['do']}><ScopedMisReport scopeType="division" title="Division MIS" /></RequireRole>}
            />

            {/* RO */}
            <Route
              path="/reports/region"
              element={<RequireRole roles={['ro']}><ScopedMisReport scopeType="region" title="Region MIS" /></RequireRole>}
            />

            {/* CO */}
            <Route
              path="/reports/circle"
              element={<RequireRole roles={['co']}><ScopedMisReport scopeType="circle" title="Circle MIS" /></RequireRole>}
            />
            <Route
  path="/divisions"
  element={
    <RequireRole roles={['co']}>
      <DivisionsPage />
    </RequireRole>
  }
/>

<Route
  path="/rate-card"
  element={
    <RequireRole roles={['co']}>
      <RateCardPage />
    </RequireRole>
  }
/>

<Route
  path="/holidays"
  element={
    <RequireRole roles={['co']}>
      <HolidaysPage />
    </RequireRole>
  }
/>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
