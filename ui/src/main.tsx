import { AuthInit } from '@/auth/AuthInit';
import RequireAuth from '@/auth/RequireAuth';
import AppShell from '@/components/layout/AppShell';
import { Toaster } from '@/components/ui/toaster';
import '@/index.css';
import Dashboard from '@/pages/Dashboard';
import Login from '@/pages/Login';
import Profile from '@/pages/Profile';
import Recording from '@/pages/Recording';
import Register from '@/pages/Register';
import Sessions from '@/pages/Sessions';
import TaskDetail from '@/pages/TaskDetail';
import Tasks from '@/pages/Tasks';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

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
                                    <Dashboard />
                                </AppShell>
                            </RequireAuth>
                        }
                    />
                    <Route
                        path="/tasks"
                        element={
                            <RequireAuth>
                                <AppShell>
                                    <Tasks />
                                </AppShell>
                            </RequireAuth>
                        }
                    />
                    <Route
                        path="/tasks/:taskId"
                        element={
                            <RequireAuth>
                                <AppShell>
                                    <TaskDetail />
                                </AppShell>
                            </RequireAuth>
                        }
                    />
                    <Route
                        path="/sessions"
                        element={
                            <RequireAuth>
                                <AppShell>
                                    <Sessions />
                                </AppShell>
                            </RequireAuth>
                        }
                    />
                    <Route
                        path="/recording"
                        element={
                            <RequireAuth>
                                <AppShell>
                                    <Recording />
                                </AppShell>
                            </RequireAuth>
                        }
                    />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
                <Toaster />
            </AuthInit>
        </BrowserRouter>
    </React.StrictMode>
);
