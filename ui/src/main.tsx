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
                        path="/"
                        element={
                            <RequireAuth>
                                <AppShell />
                            </RequireAuth>
                        }
                    >
                        <Route
                            index
                            element={<Dashboard />}
                        />
                        <Route
                            path="profile"
                            element={<Profile />}
                        />
                        <Route
                            path="tasks"
                            element={<Tasks />}
                        />
                        <Route
                            path="tasks/:taskId"
                            element={<TaskDetail />}
                        />
                        <Route
                            path="sessions"
                            element={<Sessions />}
                        />
                        <Route
                            path="recording"
                            element={<Recording />}
                        />
                    </Route>
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
                <Toaster />
            </AuthInit>
        </BrowserRouter>
    </React.StrictMode>
);
