/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import Telephony from '@/pages/Telephony';
import Omnichannel from '@/pages/Omnichannel';
import CrmSales from '@/pages/CrmSales';
import Customer360 from '@/pages/Customer360';
import AiAutomation from '@/pages/AiAutomation';
import Settings from '@/pages/Settings';
import TenantSettings from '@/pages/TenantSettings';
import KnowledgeBase from '@/pages/KnowledgeBase';
import Reports from '@/pages/Reports';
import Login from '@/pages/Login';

function ProtectedRoutes() {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/omnichannel" element={<Omnichannel />} />
        <Route path="/telephony" element={<Telephony />} />
        <Route path="/customers" element={<Customer360 />} />
        <Route path="/crm" element={<CrmSales />} />
        <Route path="/ai" element={<AiAutomation />} />
        <Route path="/knowledge" element={<KnowledgeBase />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={<ProtectedRoutes />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

