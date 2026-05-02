import React from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';

import { Layout } from './components/Layout';
import { defaultBranchId, readSession } from './lib/session';
import { BillRequestsPage } from './pages/BillRequestsPage';
import { LoginPage } from './pages/LoginPage';
import { PendingOrdersPage } from './pages/PendingOrdersPage';
import { ServiceQueuePage } from './pages/ServiceQueuePage';
import { TableDetailPage } from './pages/TableDetailPage';
import { TablesPage } from './pages/TablesPage';

function PublicRoute({ children }: { children: React.ReactNode }) {
  const session = readSession();
  const branchId = defaultBranchId();
  if (session?.accessToken && branchId) {
    return <Navigate replace to="/tables" />;
  }
  return <>{children}</>;
}

function ProtectedLayout() {
  const session = readSession();
  const branchId = defaultBranchId();

  if (!session?.accessToken || !branchId) {
    return <Navigate replace to="/" />;
  }

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicRoute><LoginPage /></PublicRoute>} path="/" />
        <Route element={<ProtectedLayout />}>
          <Route element={<Navigate replace to="/tables" />} path="*" />
          <Route element={<TablesPage />} path="/tables" />
          <Route element={<PendingOrdersPage />} path="/pending-orders" />
          <Route element={<ServiceQueuePage />} path="/service-queue" />
          <Route element={<TableDetailPage />} path="/table-detail/:id" />
          <Route element={<TableDetailPage />} path="/table-detail" />
          <Route element={<BillRequestsPage />} path="/bill-requests" />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
