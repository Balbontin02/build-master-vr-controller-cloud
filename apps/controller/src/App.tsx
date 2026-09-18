import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Header } from './components/Header';
import { ControlPage } from './pages/ControlPage';
import { QuestPage } from './pages/QuestPage';
import { SetupPage } from './pages/SetupPage';
import { DiagnosticsPage } from './pages/DiagnosticsPage';
import { SimulatorPage } from './pages/SimulatorPage';

export function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
          <Routes>
            <Route path="/" element={<Navigate to="/control" replace />} />
            <Route path="/control" element={<ControlPage />} />
            <Route path="/quest" element={<QuestPage />} />
            <Route path="/setup" element={<SetupPage />} />
            <Route path="/diagnostics" element={<DiagnosticsPage />} />
            <Route path="/simulator" element={<SimulatorPage />} />
            <Route path="*" element={<Navigate to="/control" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}