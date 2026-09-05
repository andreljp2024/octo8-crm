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
import CrmSales from '@/pages/CrmSales';
import Customer360 from '@/pages/Customer360';
import AiAutomation from '@/pages/AiAutomation';
import TenantSettings from '@/pages/TenantSettings';
import KnowledgeBase from '@/pages/KnowledgeBase';
import Reports from '@/pages/Reports';

export default function App() {
  return (
    <BrowserRouter>
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
          <Route path="/settings" element={<TenantSettings />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
}

