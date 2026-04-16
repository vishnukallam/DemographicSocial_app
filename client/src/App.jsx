import React, { useEffect, useState, useMemo, createContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext'; // Import AuthProvider
import Layout from './components/Layout';
import Login from './components/Login';
import Register from './components/Register';
import Profile from './components/Profile';
import BlockedUsers from './components/BlockedUsers';
import Settings from './components/Profile'; // Replaced if needed
import ProfileSetup from './components/ProfileSetup';
import Chat from './components/Chat';
import Social from './components/Social';
import MapStandalone from './components/MapStandalone'; // We will create this wrapper or use Map directly
import Friends from './components/Friends';
import Landing from './components/Landing';
import Home from './components/Home';
import ErrorBoundary from './components/ErrorBoundary';
import M3LoadingIndicator from './components/M3LoadingIndicator';

import { ThemeProvider, CssBaseline } from '@mui/material';
import { getTheme } from './theme';

// Theme Context
export const ColorModeContext = createContext({
    toggleColorMode: () => { },
    mode: 'dark',
});



const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, loading, user } = useAuth(); // Use Context

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-[#f8f6f6] dark:bg-[#141218] relative overflow-hidden">
                {/* Background image layer — same as Layout */}
                <div className="absolute inset-0 z-0 pointer-events-none">
                    <div
                        className="w-full h-full bg-cover bg-center filter blur-xl scale-110 opacity-40 dark:opacity-20"
                        style={{ backgroundImage: 'var(--bg-map-url)' }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#f8f6f6]/40 to-[#f8f6f6]/90 dark:via-[#141218]/60 dark:to-[#141218]/70" />
                </div>
                {/* Spinner */}
                <div className="relative z-10 flex flex-col items-center gap-4 animate-fade-in">
                    <M3LoadingIndicator size={56} />
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/welcome" replace />;
    }

    // Enforce Setup if interests are empty (and not currently on setup page)
    const location = useLocation();
    const isSetupPage = location.pathname === '/setup';
    if (isAuthenticated && user && (!user.interests || user.interests.length === 0) && !isSetupPage) {
        return <Navigate to="/setup" replace />;
    }

    return children;
};

const AppContent = () => {
    const { loading } = useAuth();

    // Theme State - Persistent
    const [mode, setMode] = useState(() => {
        return localStorage.getItem('themeMode') || 'light';
    });

    const colorMode = useMemo(() => ({
        toggleColorMode: () => {
            setMode((prevMode) => {
                const newMode = prevMode === 'light' ? 'dark' : 'light';
                localStorage.setItem('themeMode', newMode);
                return newMode;
            });
        },
        mode
    }), [mode]);

    const theme = useMemo(() => getTheme(mode, 'blue'), [mode]);

    useEffect(() => {
        if (mode === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [mode]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-[#f8f6f6] dark:bg-[#141218] relative overflow-hidden">
                {/* Background image layer — same as Layout */}
                <div className="absolute inset-0 z-0 pointer-events-none">
                    <div
                        className="w-full h-full bg-cover bg-center filter blur-xl scale-110 opacity-40 dark:opacity-20"
                        style={{ backgroundImage: 'var(--bg-map-url)' }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#f8f6f6]/40 to-[#f8f6f6]/90 dark:via-[#141218]/60 dark:to-[#141218]/70" />
                </div>
                {/* Spinner */}
                <div className="relative z-10 flex flex-col items-center gap-4 animate-fade-in">
                    <M3LoadingIndicator size={56} />
                </div>
            </div>
        );
    }

    return (
        <ErrorBoundary>
            <ColorModeContext.Provider value={colorMode}>
                <ThemeProvider theme={theme}>
                    <CssBaseline />
                    <BrowserRouter>
                        <Routes>
                            <Route path="/welcome" element={<Landing />} />
                            <Route path="/login" element={<Login />} />
                            <Route path="/register" element={<Register />} />
                            <Route
                                path="/*"
                                element={
                                    <ProtectedRoute>
                                        <Layout>
                                            <Routes>
                                                <Route path="/home" element={<Home />} />
                                                <Route path="/" element={<Navigate to="/home" replace />} />
                                                <Route path="/social" element={<Social />} />
                                                <Route path="/map" element={<MapStandalone />} />
                                                <Route path="/friends" element={<Friends />} />
                                                <Route path="/profile" element={<Profile />} />
                                                <Route path="/blocked-users" element={<BlockedUsers />} />
                                                <Route path="/setup" element={<ProfileSetup />} />
                                                <Route path="/chat/:roomId" element={<Chat />} />
                                                <Route path="*" element={<Navigate to="/" />} />
                                            </Routes>
                                        </Layout>
                                    </ProtectedRoute>
                                }
                            />
                        </Routes>
                    </BrowserRouter>
                </ThemeProvider>
            </ColorModeContext.Provider>
        </ErrorBoundary>
    );
};

const App = () => {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
};

export default App;
