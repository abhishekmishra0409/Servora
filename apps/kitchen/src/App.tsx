import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { defaultBranchId, readSession } from './lib/session';
import { KitchenBoardPage } from './pages/KitchenBoardPage';
import { LoginPage } from './pages/LoginPage';
import { SettingsPage } from './pages/SettingsPage';
import { TicketDetailPage } from './pages/TicketDetailPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const session = readSession();
  const branchId = defaultBranchId();
  if (!session?.accessToken || !branchId) {
    return <Navigate replace to="/" />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<LoginPage />} path="/" />
        <Route element={<ProtectedRoute><KitchenBoardPage /></ProtectedRoute>} path="/board" />
        <Route element={<ProtectedRoute><TicketDetailPage /></ProtectedRoute>} path="/ticket/:id" />
        <Route element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} path="/settings" />
        <Route element={<Navigate replace to="/board" />} path="*" />
      </Routes>
    </BrowserRouter>
  );
}
