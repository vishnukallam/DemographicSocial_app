import React, { useState, useContext, useEffect } from 'react';
import { Box, useMediaQuery, useTheme } from '@mui/material';
import { ColorModeContext } from '../App';
import { MapPin } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Avatar from './Avatar';
import M3NavBar from './M3NavBar';
import M3IconButton from './M3IconButton';
import M3Switch from './M3Switch';
import M3SegmentedButton from './M3SegmentedButton';
import M3Snackbar from './M3Snackbar';
import { useNavigate, useLocation } from 'react-router-dom';
import { requestNotificationPermission, sendNotification } from '../utils/notifications';
import UserGuide from './UserGuide';

const Layout = ({ children }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const isNarrow = useMediaQuery('(max-width: 860px)'); // covers mobile + zoomed desktop
    const { toggleColorMode, mode } = useContext(ColorModeContext);
    const { socket } = useAuth();

    const [notifAlert, setNotifAlert] = useState(null);
    const [menuOpen, setMenuOpen] = useState(false);

    // 1. Request Notification Permission and handle Alert
    useEffect(() => {
        const checkPerms = () => {
            if ("Notification" in window) {
                if (Notification.permission === 'default') {
                    setNotifAlert({
                        message: "Enable notifications to stay updated on messages and friend requests.",
                        icon: "notifications",
                        actionLabel: "Enable",
                        onAction: async () => {
                            await requestNotificationPermission();
                            if (Notification.permission === 'granted') {
                                setNotifAlert({ message: "Notifications enabled!", icon: "notifications_active" });
                            }
                        }
                    });
                } else if (Notification.permission === 'denied') {
                    // Optional: We can silently ignore if blocked, but just giving a hint
                    console.log("Notifications are blocked by the user.");
                }
            }
        };

        const checkLocation = () => {
            if ("geolocation" in navigator) {
                navigator.geolocation.getCurrentPosition(
                    () => { console.log("Location access granted"); },
                    (error) => {
                        console.warn("Location error:", error);
                        setNotifAlert({
                            message: "Location access is required for mapping features. Please enable it.",
                            icon: "location_off"
                        });
                    }
                );
            }
        };

        checkPerms();
        checkLocation();
    }, []);

    // 2. Global Socket Listeners for Notifications
    useEffect(() => {
        if (!socket) return;

        const handleMessageNotif = (data) => {
            const inChat = location.pathname === `/chat/${data.roomId}`;
            if (!inChat) {
                const result = sendNotification(`New Message from ${data.senderName}`, {
                    body: data.message,
                    tag: 'message'
                });
                if (result?.type === 'app') {
                    setNotifAlert({ message: `${data.senderName}: ${data.message}`, icon: 'message' });
                }
            }
        };

        const handleFriendReqNotif = (data) => {
            const result = sendNotification(`Friend Request`, {
                body: data.message || `${data.fromName} sent you a friend request.`,
                tag: 'friend_request'
            });
            if (result?.type === 'app') {
                setNotifAlert({ message: data.message || `New friend request from ${data.fromName}`, icon: 'person_add' });
            }
        };

        const handleFriendReqAccepted = (data) => {
            const result = sendNotification(`Friend Request Accepted`, {
                body: data.message || `${data.fromName} accepted your request!`,
                tag: 'friend_request_accepted'
            });
            if (result?.type === 'app') {
                setNotifAlert({ message: data.message || `${data.fromName} accepted your friend request!`, icon: 'person_add' });
            }
        };

        const handleFriendReqRejected = (data) => {
            const result = sendNotification(`Friend Request Update`, {
                body: data.message || `${data.fromName} declined your friend request.`,
                tag: 'friend_request_rejected'
            });
            if (result?.type === 'app') {
                setNotifAlert({ message: data.message || `${data.fromName} declined your friend request.`, icon: 'person_remove' });
            }
        };

        socket.on('message_notification', handleMessageNotif);
        socket.on('friend_request_notification', handleFriendReqNotif);
        socket.on('friend_request_accepted', handleFriendReqAccepted);
        socket.on('friend_request_rejected', handleFriendReqRejected);

        return () => {
            socket.off('message_notification', handleMessageNotif);
            socket.off('friend_request_notification', handleFriendReqNotif);
            socket.off('friend_request_accepted', handleFriendReqAccepted);
            socket.off('friend_request_rejected', handleFriendReqRejected);
        };
    }, [socket, location.pathname]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItems = [
        { label: 'Home', icon: 'home', activeIcon: 'home', path: '/home' },
        { label: 'Map', icon: 'map', activeIcon: 'map', path: '/map' },
        { label: 'Social', icon: 'explore', activeIcon: 'explore', path: '/social' },
        { label: 'Friends', icon: 'group', activeIcon: 'group', path: '/friends' },
    ];

    const isMap = location.pathname.startsWith('/map');

    return (
        <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            minHeight: '100vh',
            bgcolor: 'background.default',
            color: 'text.primary',
            position: 'relative'
        }}>

            {/* Fixed background — stays static while content scrolls. Not applied on map page. */}
            {!isMap && (
                <div className="fixed inset-0 z-0 pointer-events-none">
                    <div
                        className="w-full h-full bg-cover bg-center filter blur-xl scale-110 opacity-40 dark:opacity-20 transition-opacity duration-700"
                        style={{ backgroundImage: 'var(--bg-map-url)' }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background-light/40 to-background-light/90 dark:via-background-dark/60 dark:to-background-dark/70 transition-colors duration-700" />
                </div>
            )}
            {/* On map page keep the old absolute background */}
            {isMap && (
                <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                    <div
                        className="w-full h-full bg-cover bg-center filter blur-xl scale-110 opacity-40 dark:opacity-20 transition-opacity duration-700"
                        style={{ backgroundImage: 'var(--bg-map-url)' }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background-light/40 to-background-light/90 dark:via-background-dark/60 dark:to-background-dark/70 transition-colors duration-700" />
                </div>
            )}

            <Box sx={{
                flexGrow: 1,
                position: 'relative',
                zIndex: 1
            }}>
                {/* Mobile / Narrow Top Bar */}
                {isNarrow && user && (
                    <>
                        <div className="flex items-center justify-between px-4 h-16 bg-white dark:bg-[#141218]/10 dark:backdrop-blur-2xl border-b border-white/30 dark:border-white/10 sticky top-0 z-50">
                            <div className="flex items-center gap-2" onClick={() => { navigate('/'); setMenuOpen(false); }}>
                                <img src="/logo.svg" alt="App Logo" className="w-8 h-8 rounded-2xl shadow-sm drop-shadow-sm" />
                                <span className="font-display font-bold text-lg tracking-tight text-[#1a100f] dark:text-[#E6E1E5]">KON-NECT</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <M3Switch
                                    checked={mode === 'dark'}
                                    onChange={toggleColorMode}
                                    iconOn="dark_mode"
                                    iconOff="light_mode"
                                />
                                {/* Hamburger Button */}
                                <button
                                    id="hamburger-menu-btn"
                                    aria-label="Toggle navigation menu"
                                    aria-expanded={menuOpen}
                                    onClick={() => setMenuOpen(prev => !prev)}
                                    className="w-10 h-10 flex flex-col items-center justify-center gap-[5px] rounded-sq-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                                >
                                    <span className={`block w-5 h-0.5 bg-[#1a100f] dark:bg-[#E6E1E5] rounded-full transition-all duration-300 ${menuOpen ? 'rotate-45 translate-y-[7px]' : ''}`} />
                                    <span className={`block w-5 h-0.5 bg-[#1a100f] dark:bg-[#E6E1E5] rounded-full transition-all duration-300 ${menuOpen ? 'opacity-0' : ''}`} />
                                    <span className={`block w-5 h-0.5 bg-[#1a100f] dark:bg-[#E6E1E5] rounded-full transition-all duration-300 ${menuOpen ? '-rotate-45 -translate-y-[7px]' : ''}`} />
                                </button>
                            </div>
                        </div>

                        {/* Slide-down Hamburger Menu */}
                        <div
                            className={`sticky top-16 z-40 overflow-hidden transition-all duration-300 ease-in-out ${menuOpen ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'
                                }`}
                        >
                            <div className="bg-white dark:bg-[#141218]/95 dark:backdrop-blur-2xl border-b border-white/20 dark:border-white/10 shadow-xl px-4 py-3 flex flex-col gap-1">
                                {navItems.map(item => {
                                    const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                                    return (
                                        <button
                                            key={item.path}
                                            onClick={() => { navigate(item.path); setMenuOpen(false); }}
                                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-sq-xl font-bold text-sm transition-all duration-200 ${isActive
                                                ? 'bg-primary/10 dark:bg-[#D0BCFF]/10 text-primary dark:text-[#D0BCFF]'
                                                : 'text-[#1a100f] dark:text-[#E6E1E5] hover:bg-gray-100 dark:hover:bg-white/8'
                                                }`}
                                        >
                                            <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: isActive ? "'FILL' 1, 'wght' 600" : "'FILL' 0, 'wght' 400" }}>
                                                {isActive ? item.activeIcon : item.icon}
                                            </span>
                                            {item.label}
                                        </button>
                                    );
                                })}
                                <div className="border-t border-gray-100 dark:border-white/10 mt-1 pt-2 flex items-center justify-between">
                                    <button
                                        onClick={() => { navigate('/profile'); setMenuOpen(false); }}
                                        className="flex items-center gap-2 px-4 py-2 rounded-sq-xl hover:bg-gray-100 dark:hover:bg-white/8 transition-colors"
                                    >
                                        <Avatar user={user} sx={{ width: 28, height: 28, border: '2px solid white' }} />
                                        <span className="text-sm font-bold text-[#1a100f] dark:text-[#E6E1E5]">{user.displayName?.split(' ')[0]}</span>
                                    </button>
                                    <M3IconButton icon="logout" variant="standard" onClick={() => { handleLogout(); setMenuOpen(false); }} ariaLabel="Log out" size="default" />
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* Desktop / Wide Navbar — sticky so it stays on top when scrolling */}
                {!isNarrow && user && (
                    <div className={`w-full px-4 ${isMap ? 'relative' : 'sticky top-0 z-50'}`}>
                        <div className={`w-full max-w-[1400px] mx-auto ${isMap ? 'mt-0 mb-2' : 'mt-6 mb-6'} h-16 bg-white dark:bg-[#141218]/10 dark:backdrop-blur-2xl rounded-sq-2xl shadow-xl flex items-center px-6 justify-between border-[0.5px] border-white/30 dark:border-white/10 shrink-0 transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,255,255,0.1)]`}>
                            {/* Brand */}
                            <div
                                className="flex items-center gap-3 cursor-pointer select-none"
                                onClick={() => navigate('/')}
                                onContextMenu={(e) => {
                                    if (location.pathname.startsWith('/map')) {
                                        e.preventDefault();
                                        window.dispatchEvent(new Event('show_cluster_centers'));
                                    }
                                }}
                                onMouseDown={() => {
                                    if (location.pathname.startsWith('/map')) {
                                        window.logoPressTimer = setTimeout(() => {
                                            window.dispatchEvent(new Event('show_cluster_centers'));
                                        }, 3000);
                                    }
                                }}
                                onMouseUp={() => clearTimeout(window.logoPressTimer)}
                                onMouseLeave={() => clearTimeout(window.logoPressTimer)}
                                onTouchStart={() => {
                                    if (location.pathname.startsWith('/map')) {
                                        window.logoPressTimer = setTimeout(() => {
                                            window.dispatchEvent(new Event('show_cluster_centers'));
                                        }, 3000);
                                    }
                                }}
                                onTouchEnd={() => clearTimeout(window.logoPressTimer)}
                            >
                                <img src="/logo.svg" alt="App Logo" className="w-10 h-10 rounded-2xl shadow-sm hover:scale-105 transition-transform drop-shadow-md" />
                                <span className="font-display font-bold text-xl tracking-tight text-[#1a100f] dark:text-[#E6E1E5] whitespace-nowrap">KON-NECT</span>
                            </div>

                            <M3SegmentedButton
                                className="hidden md:inline-flex"
                                segments={[
                                    { value: '/', label: 'Home', icon: 'home' },
                                    { value: '/map', label: 'Map', icon: 'map' },
                                    { value: '/social', label: 'Social', icon: 'explore' },
                                    { value: '/friends', label: 'Friends', icon: 'group' },
                                ]}
                                value={location.pathname === '/' ? '/' : location.pathname}
                                onChange={(val) => navigate(val)}
                            />

                            {/* Right Profile & Actions */}
                            <div className="flex items-center gap-3">
                                {/* Theme Toggle — M3 Switch (Sun/Moon) */}
                                <M3Switch
                                    checked={mode === 'dark'}
                                    onChange={toggleColorMode}
                                    iconOn="dark_mode"
                                    iconOff="light_mode"
                                />

                                <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => navigate('/profile')}>
                                    <div className="text-right hidden lg:block">
                                        <p className="text-sm font-bold text-[#1a100f] dark:text-[#E6E1E5] leading-none">{user.displayName?.split(' ')[0]}</p>
                                    </div>
                                    <Avatar user={user} sx={{ width: 40, height: 40, border: '2px solid white', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} />
                                </div>
                                {/* Logout — M3 Icon Button */}
                                <M3IconButton
                                    icon="logout"
                                    variant="standard"
                                    onClick={handleLogout}
                                    ariaLabel="Log out"
                                    size="default"
                                />
                            </div>
                        </div></div>
                )}

                {/* Page Content */}
                <Box sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    flexGrow: 1,
                    height: location.pathname.startsWith('/map') ? '100%' : 'auto',
                    minHeight: location.pathname.startsWith('/map') ? '0px' : 'calc(100% - 140px)'
                }}>
                    {children}
                </Box>
            </Box>

            {/* Bottom Nav is replaced by the hamburger menu for narrow viewports */}
            {/* Only show on the 860px-900px window gap (rare edge case) */}
            {isMobile && !isNarrow && user && (
                <M3NavBar items={navItems} />
            )}

            {/* Global Notifications Snackbars */}
            <M3Snackbar
                show={!!notifAlert}
                message={notifAlert?.message}
                icon={notifAlert?.icon}
                actionLabel={notifAlert?.actionLabel}
                onAction={notifAlert?.onAction}
                onDismiss={() => setNotifAlert(null)}
                duration={5000}
            />

            {/* First-Time User Guide */}
            {user && <UserGuide />}
        </Box>
    );
};

export default Layout;
