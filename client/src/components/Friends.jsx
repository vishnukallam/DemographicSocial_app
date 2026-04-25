import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { Avatar } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import M3LoadingIndicator from './M3LoadingIndicator';
import M3Dialog from './M3Dialog';
import { useNavigate } from 'react-router-dom';

const Friends = () => {
    const [pendingRequests, setPendingRequests] = useState([]);
    const [friends, setFriends] = useState([]);
    const [unreadCounts, setUnreadCounts] = useState({});
    const [actionLoading, setActionLoading] = useState(null);
    const [initialLoading, setInitialLoading] = useState(true);
    const [dialogConfig, setDialogConfig] = useState({ open: false, headline: '', message: '', action: null, icon: '' });
    const { user, socket } = useAuth();
    const navigate = useNavigate();

    const fetchAll = useCallback(async () => {
        try {
            const [pendingRes, friendsRes, unreadRes] = await Promise.all([
                api.get('/api/friend-requests/pending'),
                api.get('/api/friends'),
                api.get('/api/messages/unread/count') // New API we just added
            ]);
            setPendingRequests(pendingRes.data);
            setFriends(friendsRes.data);
            setUnreadCounts(unreadRes.data || {});
        } catch (err) {
            console.error("Failed to fetch friends data:", err);
        } finally {
            setInitialLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAll();
        // Set up polling for new messages count or rely on socket below
        const interval = setInterval(fetchAll, 10000); // Polling every 10s as a resilient fallback
        return () => clearInterval(interval);
    }, [fetchAll]);

    // Listen for live online/offline status updates and block/delete removals
    useEffect(() => {
        if (!socket) return;
        const handleStatusChange = (data) => {
            setFriends(prev => prev.map(f =>
                f._id === data.userId ? { ...f, isOnline: data.isActive } : f
            ));
        };
        const handleUserRemoved = (data) => {
            setFriends(prev => prev.filter(f => f._id !== data.userId));
            setPendingRequests(prev => prev.filter(req => (req.from?._id || req.from) !== data.userId && (req.to?._id || req.to) !== data.userId));
        };

        socket.on('user_status_change', handleStatusChange);
        socket.on('user_removed', handleUserRemoved);
        return () => {
            socket.off('user_status_change', handleStatusChange);
            socket.off('user_removed', handleUserRemoved);
        };
    }, [socket]);

    const handleAcceptRequest = async (requestId) => {
        setActionLoading(requestId);
        try {
            await api.post('/api/friend-request/accept', { requestId });
            await fetchAll();
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
        setDialogConfig({
            open: true,
            icon: 'person_remove',
            headline: 'Remove Friend',
            message: 'Are you sure you want to unfriend? You will lose access to their location features and chat.',
            action: async () => {
                setDialogConfig({ ...dialogConfig, open: false });
                setActionLoading(friendId);
                try {
                    await api.delete(`/api/friends/${friendId}`);
                    await fetchAll();
                } catch (err) {
                    console.error('Failed to remove friend', err);
                }
                setActionLoading(null);
            }
        });
    };

    const handleBlockUser = async (userId) => {
        setDialogConfig({
            open: true,
            icon: 'block',
            headline: 'Block User',
            message: 'Are you sure you want to block this user? They will not be able to interact with you.',
            action: async () => {
                setDialogConfig({ ...dialogConfig, open: false });
                setActionLoading(userId);
                try {
                    await api.post('/api/users/block', { targetId: userId });
                    await fetchAll();
                } catch (err) {
                    console.error('Failed to block user', err);
                }
                setActionLoading(null);
            }
        });
    };

    const handleChatClick = (friend) => {
        // Room ID deterministic generation
        const roomId = [user._id, friend._id].sort().join('_');
        navigate(`/chat/${roomId}`, { state: { friend } });
    };

    if (initialLoading) {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center gap-4 py-32 animate-fade-in">
                <M3LoadingIndicator size={56} />
                <p className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Loading friends...</p>
            </div>
        );
    }

    return (
        <div className="h-full w-full p-4 md:p-8 animate-fade-in relative z-10 pb-24 max-w-3xl mx-auto">

            {/* 1. Header Area */}
            <div className="flex flex-col mb-8 pt-4">
                <h2 className="text-3xl font-black text-[#1a100f] dark:text-white tracking-tight">Messages</h2>
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">Connect with your friends</p>
            </div>

            {/* Friend Requests (Horizontal scrolling like Instagram Stories) */}
            {pendingRequests.length > 0 && (
                <div className="mb-10">
                    <div className="flex items-center justify-between mb-4 px-1">
                        <h3 className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest text-[#1a100f]">Friend Requests</h3>
                        <span className="text-[10px] font-black text-white bg-primary px-2.5 py-0.5 rounded-full">{pendingRequests.length}</span>
                    </div>
                    <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x">
                        {pendingRequests.map(req => (
                            <div key={req._id} className="snap-start min-w-[220px] max-w-[240px] flex gap-3 p-3.5 rounded-[24px] bg-white dark:bg-white/5 border border-black/5 dark:border-white/10 shadow-sm shrink-0 items-center ring-1 ring-black/5 hover:ring-primary/30 transition-shadow">
                                <Avatar src={req.from?.profilePhoto} sx={{ width: 44, height: 44, borderRadius: '14px' }} variant="rounded" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-black text-[#1a100f] dark:text-white truncate pb-0.5">{req.from?.displayName || req.fromName}</p>
                                    <div className="flex gap-1.5 mt-1">
                                        <button onClick={() => handleAcceptRequest(req._id)} disabled={actionLoading === req._id} className="flex-1 py-1.5 bg-primary hover:bg-primary/90 text-white text-[11px] font-black rounded-xl transition-transform active:scale-95 disabled:opacity-50 tracking-wide uppercase">Accept</button>
                                        <button onClick={() => handleRejectRequest(req._id)} disabled={actionLoading === req._id} className="flex-1 py-1.5 bg-gray-100/80 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/20 text-gray-600 dark:text-gray-300 text-[11px] font-black rounded-xl transition-transform active:scale-95 disabled:opacity-50 tracking-wide uppercase">Decline</button>
                                        <button onClick={() => handleBlockUser(req.from?._id || req.from)} disabled={actionLoading === (req.from?._id || req.from)} className="px-2 py-1.5 bg-red-100/80 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 text-[11px] font-black rounded-xl transition-transform active:scale-95 flex items-center justify-center disabled:opacity-50" title="Block User">
                                            <span className="material-symbols-outlined text-[14px]">block</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* My Connections (Instagram Messages List Style) */}
            <div id="friends-list" className="space-y-1">
                {friends.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center p-12 bg-white/40 dark:bg-white/5 backdrop-blur-xl rounded-[32px] border border-black/5 dark:border-white/10 shadow-sm ring-1 ring-black/5">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-4 shadow-inner">
                            <span className="material-symbols-outlined text-3xl">maps_ugc</span>
                        </div>
                        <p className="text-xl font-black text-[#1a100f] dark:text-white tracking-tight">No active chats</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium max-w-[260px] mt-2 leading-relaxed">Find people on the map and send connection requests to start chatting.</p>
                        <div className="flex gap-3 mt-8">
                            <button onClick={() => navigate('/map')} className="px-6 py-3.5 bg-primary text-white rounded-full font-black text-sm uppercase tracking-wide shadow-lg hover:shadow-xl hover:scale-105 transition-all shadow-primary/30">Explore Map</button>
                            <button onClick={() => navigate('/social')} className="px-6 py-3.5 bg-white dark:bg-white/10 text-primary dark:text-[#D0BCFF] border border-primary/20 dark:border-white/10 rounded-full font-black text-sm uppercase tracking-wide shadow-lg hover:shadow-xl hover:scale-105 transition-all outline-none">Explore Social Community</button>
                        </div>
                    </div>
                ) : (
                    friends.map(friend => {
                        const unread = unreadCounts[friend._id] || 0;
                        return (
                            <div
                                key={friend._id}
                                onClick={() => handleChatClick(friend)}
                                className="group flex items-center gap-4 p-3 hover:bg-white dark:hover:bg-white/5 rounded-[24px] hover:shadow-md border border-transparent hover:border-black/5 dark:hover:border-white/5 transition-all cursor-pointer relative"
                            >
                                <div className="relative shrink-0">
                                    <Avatar src={friend.profilePhoto} sx={{ width: 64, height: 64, borderRadius: '22px' }} variant="rounded" />
                                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-[3px] border-[#f8f6f6] group-hover:border-white dark:group-hover:border-[#1e1c22] dark:border-[#141218] transition-colors ${friend.isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
                                </div>

                                <div className="flex-1 min-w-0 pr-4">
                                    <div className="flex justify-between items-baseline mb-0.5">
                                        <p className={`text-base truncate ${unread > 0 ? 'font-black text-[#1a100f] dark:text-white' : 'font-extrabold text-[#1a100f] dark:text-[#E6E1E5]'}`}>
                                            {friend.displayName}
                                        </p>
                                    </div>
                                    <div className="flex justify-between items-center transition-all">
                                        <p className={`text-sm truncate pr-20 ${unread > 0 ? 'font-bold text-[#1a100f] dark:text-white' : 'font-medium text-gray-500 dark:text-gray-400'}`}>
                                            {unread > 0 ? `${unread} new message${unread > 1 ? 's' : ''}` : friend.isOnline ? 'Active now' : 'Offline'}
                                        </p>
                                        {unread > 0 && (
                                            <div className="w-2.5 h-2.5 bg-primary rounded-full shrink-0 shadow-[0_0_8px_var(--color-primary)] absolute right-6"></div>
                                        )}
                                    </div>
                                </div>

                                {/* Right-side Action Buttons */}
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity translate-x-4 group-hover:translate-x-0 duration-300">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleChatClick(friend); }}
                                        className="w-12 h-12 bg-primary text-white rounded-[16px] flex items-center justify-center shadow-md hover:scale-105 hover:shadow-lg transition-all"
                                        title="Chat"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">chat</span>
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleRemoveFriend(friend._id); }}
                                        disabled={actionLoading === friend._id}
                                        className="w-12 h-12 bg-gray-100 dark:bg-white/10 text-gray-500 hover:bg-red-100 hover:text-red-500 dark:hover:bg-red-900/40 dark:hover:text-red-400 rounded-[16px] flex items-center justify-center transition-all hover:scale-105 disabled:opacity-50"
                                        title="Unfriend"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">person_remove</span>
                                    </button>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            <M3Dialog
                open={dialogConfig.open}
                onClose={() => setDialogConfig({ ...dialogConfig, open: false })}
                icon={dialogConfig.icon}
                headline={dialogConfig.headline}
                actions={[
                    { label: 'Cancel', onClick: () => setDialogConfig({ ...dialogConfig, open: false }) },
                    { label: 'Confirm', variant: 'filled', onClick: dialogConfig.action }
                ]}
            >
                <p>{dialogConfig.message}</p>
            </M3Dialog>
        </div>
    );
};

export default Friends;
