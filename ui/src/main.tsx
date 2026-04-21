import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppShell from '@/components/layout/AppShell';
import { Toaster } from '@/components/ui/toaster';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Live from './pages/Live';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
    throw new Error('Root element not found');
}

ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
        <BrowserRouter>
            <AppShell>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/live" element={<Live />} />
                </Routes>
            </AppShell>
            <Toaster />
        </BrowserRouter>
    </React.StrictMode>,
);