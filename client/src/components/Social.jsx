import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { Box, Card, CardContent, Typography, Avatar, Chip, Button } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { MessageSquare } from 'lucide-react';
import M3LoadingIndicator from './M3LoadingIndicator';
import M3Chip, { M3ChipSet } from './M3Chip';
import M3SegmentedButton from './M3SegmentedButton';
import M3Dialog from './M3Dialog';
import M3ShapeSlider from './M3ShapeSlider';

const Social = () => {
    const [users, setUsers] = useState([]);
    const [matchedUsers, setMatchedUsers] = useState([]);
    const [pendingRequests, setPendingRequests] = useState([]);
    const [friends, setFriends] = useState([]);
    const [actionLoading, setActionLoading] = useState(null);
    const [initialLoading, setInitialLoading] = useState(true);
    const [fetchLimit, setFetchLimit] = useState(10);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [dialogConfig, setDialogConfig] = useState({ open: false, title: '', message: '', onConfirm: null, icon: '' });
    const { user, userLocation, updateInterests, socket } = useAuth();

    // Fetch Global Users (Discover), Friend Requests, Friends
    const fetchAll = useCallback(async () => {
        try {
            // If location available, use discover endpoint (nearest 50), else fallback to global
            const userEndpoint = userLocation ? '/api/users/discover' : '/api/users/global';
            const params = userLocation ? { params: { lat: userLocation.lat, lng: userLocation.lng } } : {};

            const [usersRes, pendingRes, friendsRes] = await Promise.all([
                api.get(userEndpoint, params),
                api.get('/api/friend-requests/pending'),
                api.get('/api/friends')
            ]);
            setUsers(usersRes.data);
            setPendingRequests(pendingRes.data);
            setFriends(friendsRes.data);
        } catch (err) {
            console.error("Failed to fetch data", err);
        } finally {
            setInitialLoading(false);
        }
    }, [userLocation?.lat, userLocation?.lng]);

    // Fetch Matched Users (Nearby + Shared Interests) - uses stable userLocation
    const fetchMatches = useCallback(async () => {
        if (!userLocation) return;
        try {
            const res = await api.get('/api/users/nearby', { params: { lat: userLocation.lat, lng: userLocation.lng } });
            setMatchedUsers(res.data);
        } catch (err) {
            console.error("Failed to fetch matched users", err);
        }
    }, [userLocation?.lat, userLocation?.lng]);

    useEffect(() => {
        fetchAll();
        fetchMatches();

        // Background poll to surface new nearby users automatically
        const interval = setInterval(() => {
            fetchAll();
            fetchMatches();
        }, 10000);
        return () => clearInterval(interval);
    }, [fetchAll, fetchMatches]);

    // Handle Limit Change with loading effect
    useEffect(() => {
        if (initialLoading) return;

        setIsRefreshing(true);
        // Artificial delay to simulate "pulling" and prevent aggressive sliding
        const timer = setTimeout(() => {
            setIsRefreshing(false);
        }, 800);

        return () => clearTimeout(timer);
    }, [fetchLimit, initialLoading]);

    // Listen for live online/offline status updates and block/delete removals globally
    useEffect(() => {
        if (!socket) return;
        const handleStatusChange = (data) => {
            setUsers(prev => prev.map(u => u._id === data.userId ? { ...u, isOnline: data.isActive } : u));
            setMatchedUsers(prev => prev.map(u => u._id === data.userId ? { ...u, isOnline: data.isActive } : u));
            setFriends(prev => prev.map(f => f._id === data.userId ? { ...f, isOnline: data.isActive } : f));
        };
        const handleUserRemoved = (data) => {
            setUsers(prev => prev.filter(u => u._id !== data.userId));
            setMatchedUsers(prev => prev.filter(u => u._id !== data.userId));
            setFriends(prev => prev.filter(f => f._id !== data.userId));
        };

        socket.on('user_status_change', handleStatusChange);
        socket.on('user_removed', handleUserRemoved);
        return () => {
            socket.off('user_status_change', handleStatusChange);
            socket.off('user_removed', handleUserRemoved);
        };
    }, [socket]);

    const checkInterestMatch = (u) => {
        return (u.sharedInterests?.length || 0) > 0;
    };

    const handleConnectClick = (targetUser) => {
        window.dispatchEvent(new CustomEvent('map_connect_user', { detail: targetUser }));
    };

    const handleSendRequest = async (toUserId) => {
        setActionLoading(toUserId);
        try {
            await api.post('/api/friend-request/send', { toUserId });
            await fetchAll();
            await fetchMatches();
        } catch (err) {
            console.error('Failed to send friend request', err);
        }
        setActionLoading(null);
    };

    const handleCancelRequest = async (toUserId) => {
        setActionLoading(toUserId);
        try {
            await api.post('/api/friend-request/cancel', { toUserId });
            await fetchAll();
            await fetchMatches();
        } catch (err) {
            console.error('Failed to cancel request', err);
        }
        setActionLoading(null);
    };

    const handleAcceptRequest = async (requestId) => {
        setActionLoading(requestId);
        try {
            await api.post('/api/friend-request/accept', { requestId });
            await fetchAll();
            await fetchMatches();
        } catch (err) {
            console.error('Failed to accept request', err);
        }
        setActionLoading(null);
    };

    const handleRejectRequest = async (requestId) => {
        setActionLoading(requestId);
        try {
            await api.post('/api/friend-request/reject', { requestId });
            await fetchAll();
        } catch (err) {
            console.error('Failed to reject request', err);
        }
        setActionLoading(null);
    };

    const handleRemoveFriend = async (friendId) => {
        setActionLoading(friendId);
        try {
            await api.delete(`/api/friends/${friendId}`);
            await fetchAll();
            await fetchMatches();
        } catch (err) {
            console.error('Failed to remove friend', err);
        }
        setActionLoading(null);
    };

    // User Item Renderer (Reusable) — squircle design
    const renderUserCard = (u) => {
        const isMatch = checkInterestMatch(u);
        const isFriend = friends.some(f => f._id === u._id);

        // Sort interests: Shared first
        const sortedInterests = [...(u.interests || [])].sort((a, b) => {
            const aName = typeof a === 'string' ? a : a.name;
            const bName = typeof b === 'string' ? b : b.name;
            const aShared = u.sharedInterests?.some(si => si.toLowerCase() === aName.toLowerCase());
            const bShared = u.sharedInterests?.some(si => si.toLowerCase() === bName.toLowerCase());
            return (bShared ? 1 : 0) - (aShared ? 1 : 0);
        });

        return (
            <div key={u._id} className="bg-white dark:bg-white/5 dark:backdrop-blur-2xl rounded-sq-2xl overflow-hidden shadow-xl border-[0.5px] border-white/30 dark:border-white/10 group hover:shadow-[0_0_30px_rgba(255,255,255,0.15)] hover:border-white/60 transition-all duration-500 flex flex-col h-full ring-1 ring-black/5 hover:-translate-y-1">
                <div className="p-6 flex flex-col items-center text-center flex-1">
                    <div className="relative mb-4 shrink-0">
                        <Avatar
                            src={u.profilePhoto}
                            sx={{ width: 96, height: 96, borderRadius: '24px', fontSize: '2rem' }}
                            variant="rounded"
                        />
                        {isMatch && !isFriend && (
                            <div className="absolute -top-2 -right-2 bg-green-500 text-white p-1.5 rounded-sq-lg shadow-lg border-2 border-white dark:border-[#1f1b24]" title="Matched Interests">
                                <span className="material-symbols-outlined text-sm font-bold block">star</span>
                            </div>
                        )}
                        {isFriend && (
                            <div className={`absolute bottom-0 right-0 w-5 h-5 rounded-md border-2 border-white dark:border-[#1f1b24] ${u.isOnline ? 'bg-green-500' : 'bg-gray-400'}`} title={u.isOnline ? "Online" : "Offline"}></div>
                        )}
                    </div>

                    <h3 className="text-xl font-black text-[#1a100f] dark:text-white mb-1 line-clamp-1">{u.displayName}</h3>
                    <p className="text-sm font-medium text-[#915b55] dark:text-[#CAC4D0] line-clamp-2 min-h-[2.5em] mb-3">
                        {u.bio || "No bio yet"}
                    </p>

                    {/* MATCHED INTERESTS BADGE / TEXT */}
                    {isMatch ? (
                        <div className="bg-green-100/80 dark:bg-green-900/40 px-3 py-1.5 rounded-full mb-4 border border-green-200 dark:border-green-800 shrink-0 backdrop-blur-sm">
                            <p className="text-xs font-black text-green-800 dark:text-green-300 uppercase tracking-widest flex items-center justify-center gap-1">
                                <span className="material-symbols-outlined text-sm font-bold">stars</span>
                                {u.sharedInterests?.length || 0} SHARED INTERESTS
                            </p>
                        </div>
                    ) : (
                        <div className="h-8 mb-4 shrink-0"></div>
                    )}

                    <div className="mb-4 max-h-[100px] overflow-y-auto overflow-x-hidden rounded-xl border border-white/40 dark:border-white/5 bg-black/5 dark:bg-black/20 p-2 pr-1 custom-scrollbar shrink-0">
                        <M3ChipSet className="justify-start flex-wrap items-start">
                            {sortedInterests.map((int, i) => {
                                const intStr = typeof int === 'string' ? int : int.name;
                                const isShared = u.sharedInterests?.some(si => si.toLowerCase() === intStr.toLowerCase());
                                const canAdd = !isShared && (isFriend || u.friendRequestSent || u.friendRequestReceived);

                                if (canAdd) {
                                    return (
                                        <button
                                            key={`add_${i}`}
                                            onClick={async () => {
                                                try {
                                                    const currentArr = user.interests || [];
                                                    if (!currentArr.includes(intStr)) {
                                                        await updateInterests([...currentArr, intStr]);
                                                        await fetchAll();
                                                        await fetchMatches();
                                                    }
                                                } catch (e) {
                                                    console.error(e);
                                                }
                                            }}
                                            className="group h-7 px-2 border border-primary/30 inline-flex items-center gap-1 hover:bg-primary/10 transition-colors mx-0.5 mb-1"
                                            style={{ borderRadius: '8px' }}
                                            title={`Add ${intStr} to your profile`}
                                        >
                                            <span className="material-symbols-outlined text-[14px] text-primary group-hover:block hidden">add</span>
                                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{intStr}</span>
                                        </button>
                                    );
                                }

                                return (
                                    <M3Chip
                                        key={i}
                                        label={isShared ? `★ ${intStr}` : intStr}
                                        type={isShared ? "suggestion" : "assist"}
                                        highlighted={isShared}
                                        className={`scale-90 mb-1 ${isShared ? 'font-bold ring-2 ring-green-500/20' : ''}`}
                                    />
                                );
                            })}
                        </M3ChipSet>
                    </div>

                    <div className="w-full mt-auto pt-2">
                        {isFriend ? (
                            <button
                                onClick={() => {
                                    setDialogConfig({
                                        open: true,
                                        icon: 'person_remove',
                                        title: 'Remove Friend',
                                        message: `Are you sure you want to unfriend ${u.displayName}?`,
                                        onConfirm: async () => {
                                            setDialogConfig({ ...dialogConfig, open: false });
                                            handleRemoveFriend(u._id);
                                        }
                                    });
                                }}
                                disabled={actionLoading === u._id}
                                className="w-full bg-primary/20 hover:bg-red-50 dark:bg-[#D0BCFF]/20 dark:hover:bg-red-900/40 text-primary dark:text-[#D0BCFF] hover:text-red-500 dark:hover:text-red-400 font-bold h-10 rounded-sq-lg flex items-center justify-center gap-2 text-sm backdrop-blur-md transition-colors group disabled:opacity-50"
                            >
                                <span className="material-symbols-outlined text-lg group-hover:hidden">group</span>
                                <span className="material-symbols-outlined text-lg hidden group-hover:block">person_remove</span>
                                <span className="group-hover:hidden">Friends</span>
                                <span className="hidden group-hover:block">Unfriend</span>
                            </button>
                        ) : u.friendRequestSent ? (
                            <button
                                onClick={() => handleCancelRequest(u._id)}
                                disabled={actionLoading === u._id}
                                className="w-full bg-gray-100/50 hover:bg-red-50 dark:bg-white/10 dark:hover:bg-red-900/40 text-gray-500 hover:text-red-500 dark:hover:text-red-400 font-bold h-10 rounded-sq-lg flex items-center justify-center gap-2 text-sm backdrop-blur-md transition-colors group disabled:opacity-50"
                            >
                                <span className="material-symbols-outlined text-lg group-hover:hidden">schedule_send</span>
                                <span className="material-symbols-outlined text-lg hidden group-hover:block">cancel</span>
                                <span className="group-hover:hidden">Request Sent</span>
                                <span className="hidden group-hover:block">Cancel Request</span>
                            </button>
                        ) : u.friendRequestReceived ? (
                            <button
                                onClick={() => handleAcceptRequest(u._id)}
                                disabled={actionLoading === u._id}
                                className="w-full bg-green-500 hover:bg-green-600 text-white font-bold h-10 rounded-sq-lg shadow-lg flex items-center justify-center gap-2 text-sm disabled:opacity-50 transition-all active:scale-95 shimmer"
                            >
                                <span className="material-symbols-outlined text-lg">person_add</span>
                                Accept
                            </button>
                        ) : (
                            <button
                                onClick={() => handleSendRequest(u._id)}
                                disabled={actionLoading === u._id}
                                className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-10 rounded-sq-lg shadow-lg shadow-primary/20 transition-all active:scale-95 flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                            >
                                <span className="material-symbols-outlined text-lg">{isMatch ? 'person_add' : 'share_location'}</span>
                                {isMatch ? 'Add Friend' : 'Connect'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    // Refined Limit Logic: Both sections now pull up to fetchLimit independently
    const displayMatched = matchedUsers.slice(0, fetchLimit);

    // Discover Logic: 
    // 1. Identify spillover matched users (those not in the top N shown in Matched section)
    const spilloverMatched = matchedUsers.slice(fetchLimit);

    // 2. Identify all non-matched users
    const matchedIds = new Set(matchedUsers.map(u => u._id));
    const otherUsers = users.filter(u => u._id !== user?._id && !matchedIds.has(u._id));

    // 3. Combine and take top N for Discover section
    const discoverUsers = [...spilloverMatched, ...otherUsers].slice(0, fetchLimit);

    if (initialLoading) {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center gap-4 py-32 animate-fade-in">
                <M3LoadingIndicator size={56} />
                <p className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Loading people...</p>
            </div>
        );
    }

    return (
        <div className="h-full w-full p-4 space-y-8 animate-fade-in relative z-10 pb-24">
            {/* refreshing Overlay */}
            {isRefreshing && (
                <div className="fixed inset-0 z-[100] backdrop-blur-md bg-white/10 dark:bg-black/10 flex flex-col items-center justify-center gap-4 transition-all duration-300">
                    <M3LoadingIndicator size={64} />
                    <p className="text-[#1a100f] dark:text-white font-black uppercase tracking-[0.2em] animate-pulse">
                        Refreshing People...
                    </p>
                </div>
            )}

            <div className="max-w-[1600px] mx-auto space-y-6">
                {/* Limit Selector */}
                <div id="social-slider" className="flex flex-col md:flex-row justify-between items-center bg-white/80 dark:bg-white/5 dark:backdrop-blur-xl rounded-sq-xl p-6 shadow-sm border border-black/5 dark:border-white/5 mb-6 mx-2 transition-all gap-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 dark:bg-white/10 rounded-sq-lg flex items-center justify-center text-primary dark:text-[#D0BCFF]">
                            <span className="material-symbols-outlined text-2xl font-bold">person_search</span>
                        </div>
                        <div>
                            <p className="font-black text-sm text-[#1a100f] dark:text-white uppercase tracking-wider">
                                People Limit
                            </p>
                            <p className="text-[10px] font-bold text-[#915b55] dark:text-[#CAC4D0] uppercase tracking-widest mt-0.5">
                                Select how many users to pull near you
                            </p>
                        </div>
                    </div>

                    <div className="w-full max-w-xs flex-shrink-0">
                        <M3ShapeSlider
                            value={fetchLimit}
                            onChange={(val) => setFetchLimit(val)}
                            stops={[10, 20, 30, 40, 50]}
                        />
                    </div>
                </div>

                {/* 1. Matched Interests Section */}
                <div id="social-feed" className="pt-2">
                    <div className="bg-white dark:bg-white/5 dark:backdrop-blur-xl rounded-sq-xl p-4 shadow-sm border border-black/5 dark:border-white/5 mb-6 mx-2">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-green-500 rounded-sq-lg flex items-center justify-center text-white shadow-lg shadow-green-500/30">
                                <span className="material-symbols-outlined text-xl font-bold">favorite</span>
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-[#1a100f] dark:text-white tracking-tight leading-none">Matched Interests</h2>
                                <p className="text-xs font-bold text-green-500 uppercase tracking-widest mt-1">People with shared interests nearby (20km)</p>
                            </div>
                        </div>
                    </div>
                    {displayMatched.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {displayMatched.map(u => renderUserCard(u))}
                        </div>
                    ) : (
                        <div className="text-center p-12 bg-white dark:bg-white/5 dark:backdrop-blur-2xl rounded-sq-2xl border-[0.5px] border-white/30 dark:border-white/10 shadow-xl flex flex-col items-center justify-center min-h-[300px]">
                            <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-600 mb-4">search_off</span>
                            <p className="text-[#1a100f] dark:text-[#E6E1E5] font-black text-xl mb-2">No Matching Users Nearby</p>
                            <p className="text-[#5e413d] dark:text-[#CAC4D0] font-medium max-w-sm">
                                There seems to be no matching users near you. Discover other users below and try adding their interests to fit into their network.
                            </p>
                        </div>
                    )}
                </div>

                {/* 2. Discover People Section */}
                <div id="social-add-friend" className="pt-4">
                    <div className="bg-white dark:bg-white/5 dark:backdrop-blur-xl rounded-sq-xl p-4 shadow-sm border border-black/5 dark:border-white/5 mb-6 mx-2">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-primary rounded-sq-lg flex items-center justify-center text-white shadow-lg shadow-primary/30">
                                <span className="material-symbols-outlined text-xl font-bold">explore</span>
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-[#1a100f] dark:text-white tracking-tight leading-none">Discover People</h2>
                                <p className="text-xs font-bold text-primary uppercase tracking-widest mt-1">Recommended for you · Sorted by match</p>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {discoverUsers.map(u => renderUserCard(u))}
                    </div>
                </div>
            </div>

            {/* Confirmation Dialog */}
            <M3Dialog
                open={dialogConfig.open}
                onClose={() => setDialogConfig({ ...dialogConfig, open: false })}
                icon={dialogConfig.icon}
                headline={dialogConfig.title}
                actions={[
                    { label: 'Cancel', onClick: () => setDialogConfig({ ...dialogConfig, open: false }) },
                    { label: 'Confirm', variant: 'filled', onClick: dialogConfig.onConfirm }
                ]}
            >
                <p className="font-medium text-gray-700 dark:text-gray-300">{dialogConfig.message}</p>
            </M3Dialog>
        </div>
    );
};

export default Social;
