/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import Telephony from '@/pages/Telephony';
import Omnichannel from '@/pages/Omnichannel';
import PlaceholderPage from '@/pages/PlaceholderPage';

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/omnichannel" element={<Omnichannel />} />
          <Route path="/telephony" element={<Telephony />} />
          <Route path="/customers" element={<PlaceholderPage title="Customer 360" />} />
          <Route path="/crm" element={<PlaceholderPage title="CRM & Vendas" />} />
          <Route path="/ai" element={<PlaceholderPage title="IA & Automação" />} />
          <Route path="/settings" element={<PlaceholderPage title="Configurações do Tenant" />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
}

