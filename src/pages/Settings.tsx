import { Routes, Route, Navigate } from 'react-router-dom';
import { SettingsSidebar } from '@/components/settings/SettingsSidebar';
import GeneralSettings from './settings/GeneralSettings';
import ConnectionSettings from './settings/whatsapp/ConnectionSettings';

export default function Settings() {
  return (
    <div className="flex h-full">
      <SettingsSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="container max-w-4xl py-6">
          <Routes>
            <Route index element={<GeneralSettings />} />
            <Route path="whatsapp">
              <Route index element={<Navigate to="connection" replace />} />
              <Route path="connection" element={<ConnectionSettings />} />
              <Route path="numbers" element={<div className="p-6">Phone Numbers - Coming Soon</div>} />
              <Route path="templates" element={<div className="p-6">Templates - Coming Soon</div>} />
              <Route path="rules" element={<div className="p-6">Messaging Rules - Coming Soon</div>} />
              <Route path="webhooks" element={<div className="p-6">Webhooks - Coming Soon</div>} />
              <Route path="compliance" element={<div className="p-6">Compliance - Coming Soon</div>} />
            </Route>
            <Route path="team" element={<div className="p-6">Team & Access - Coming Soon</div>} />
            <Route path="billing" element={<div className="p-6">Billing - Coming Soon</div>} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
