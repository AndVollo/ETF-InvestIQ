import { createBrowserRouter } from 'react-router-dom'
import App from './App'
import Dashboard from './pages/Dashboard'
import BucketsPage from './pages/Buckets'
import SmartDeposit from './pages/SmartDeposit'
import DrawdownTest from './pages/DrawdownTest'
import SectorAnalysis from './pages/SectorAnalysis'
import UniverseBrowser from './pages/UniverseBrowser'
import ManageUniverse from './pages/ManageUniverse'
import Architect from './pages/Architect'
import AuditTrail from './pages/AuditTrail'
import Settings from './pages/Settings'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import { RequireAuth } from './components/common/RequireAuth'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/signup', element: <SignupPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },
  {
    path: '/',
    element: <RequireAuth><App /></RequireAuth>,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'buckets', element: <BucketsPage /> },
      { path: 'deposit', element: <SmartDeposit /> },
      { path: 'drawdown', element: <DrawdownTest /> },
      { path: 'sectors', element: <SectorAnalysis /> },
      { path: 'universe', element: <UniverseBrowser /> },
      { path: 'universe/manage', element: <ManageUniverse /> },
      { path: 'architect', element: <Architect /> },
      { path: 'audit', element: <AuditTrail /> },
      { path: 'settings', element: <Settings /> },
    ],
  },
])
