import { AuthInit } from '@/auth/AuthInit';
import RequireAdmin from '@/auth/RequireAdmin';
import RequireAuth from '@/auth/RequireAuth';
import AppShell from '@/components/layout/AppShell';
import { Toaster } from '@/components/ui/toaster';
import Login from '@/pages/Login';
import '@/styles.css';
import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Live = lazy(() => import('@/pages/Live'));
const Tasks = lazy(() => import('@/pages/Tasks'));
const Users = lazy(() => import('@/pages/Users'));
const Profile = lazy(() => import('@/pages/Profile'));

function PageFallback() {
    return (
        <div className="flex min-h-[60vh] items-center justify-center">
            <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
    );
}

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
                    <Route
                        path="/profile"
                        element={
                            <RequireAuth>
                                <AppShell>
                                    <Suspense fallback={<PageFallback />}>
                                        <Profile />
                                    </Suspense>
                                </AppShell>
                            </RequireAuth>
                        }
                    />
                    <Route
                        path="/dashboard"
                        element={
                            <RequireAdmin>
                                <AppShell>
                                    <Suspense fallback={<PageFallback />}>
                                        <Dashboard />
                                    </Suspense>
                                </AppShell>
                            </RequireAdmin>
                        }
                    />
                    <Route
                        path="/live"
                        element={
                            <RequireAdmin>
                                <AppShell>
                                    <Suspense fallback={<PageFallback />}>
                                        <Live />
                                    </Suspense>
                                </AppShell>
                            </RequireAdmin>
                        }
                    />
                    <Route
                        path="/tasks"
                        element={
                            <RequireAdmin>
                                <AppShell>
                                    <Suspense fallback={<PageFallback />}>
                                        <Tasks />
                                    </Suspense>
                                </AppShell>
                            </RequireAdmin>
                        }
                    />
                    <Route
                        path="/users"
                        element={
                            <RequireAdmin>
                                <AppShell>
                                    <Suspense fallback={<PageFallback />}>
                                        <Users />
                                    </Suspense>
                                </AppShell>
                            </RequireAdmin>
                        }
                    />
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
                <Toaster />
            </AuthInit>
        </BrowserRouter>
    </React.StrictMode>
);
