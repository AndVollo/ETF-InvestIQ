import { createBrowserRouter } from 'react-router-dom'
import App from './App'
import Dashboard from './pages/Dashboard'
import BucketsPage from './pages/Buckets'
import SmartDeposit from './pages/SmartDeposit'
import DrawdownTest from './pages/DrawdownTest'
import SectorAnalysis from './pages/SectorAnalysis'
import UniverseBrowser from './pages/UniverseBrowser'
import Architect from './pages/Architect'
import AuditTrail from './pages/AuditTrail'
import Settings from './pages/Settings'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'buckets', element: <BucketsPage /> },
      { path: 'deposit', element: <SmartDeposit /> },
      { path: 'drawdown', element: <DrawdownTest /> },
      { path: 'sectors', element: <SectorAnalysis /> },
      { path: 'universe', element: <UniverseBrowser /> },
      { path: 'architect', element: <Architect /> },
      { path: 'audit', element: <AuditTrail /> },
      { path: 'settings', element: <Settings /> },
    ],
  },
])
