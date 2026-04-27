import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppShell from '@/components/layout/AppShell';
import { Toaster } from '@/components/ui/toaster';
import { AuthInit } from '@/auth/AuthInit';
import RequireAuth from '@/auth/RequireAuth';
import Home from '@/pages/Home';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Profile from '@/pages/Profile';
import '@/index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
    throw new Error('Root element not found');
}

ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
        <BrowserRouter>
            <AuthInit>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route
                        path="/profile"
                        element={
                            <RequireAuth>
                                <AppShell>
                                    <Profile />
                                </AppShell>
                            </RequireAuth>
                        }
                    />
                    <Route
                        path="/"
                        element={
                            <RequireAuth>
                                <AppShell>
                                    <Home />
                                </AppShell>
                            </RequireAuth>
                        }
                    />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
                <Toaster />
            </AuthInit>
        </BrowserRouter>
    </React.StrictMode>,
);