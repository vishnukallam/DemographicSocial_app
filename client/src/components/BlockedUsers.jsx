import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '@mui/material';
import api from '../utils/api';
import M3Snackbar from './M3Snackbar';

const BlockedUsers = () => {
    const navigate = useNavigate();
    const [blockedUsers, setBlockedUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [snackbarMsg, setSnackbarMsg] = useState('');

    useEffect(() => {
        fetchBlockedUsers();
    }, []);

    const fetchBlockedUsers = async () => {
        try {
            const res = await api.get('/api/users/blocked');
            setBlockedUsers(res.data);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching blocked users:', err);
            setLoading(false);
        }
    };

    const handleUnblock = async (targetId) => {
        try {
            await api.post('/api/users/unblock', { targetId });
            setSnackbarMsg('User unblocked safely.');
            setBlockedUsers(blockedUsers.filter(u => u._id !== targetId));
        } catch (err) {
            setSnackbarMsg('Failed to unblock user.');
        }
    };

    return (
        <div className="h-full w-full p-4 md:p-8 animate-fade-in relative z-10 pb-24 max-w-3xl mx-auto">
            <main className="w-full flex-1 flex flex-col pt-12 md:pt-4">
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => navigate('/profile')}
                        className="w-10 h-10 rounded-2xl bg-white/50 dark:bg-black/30 backdrop-blur-xl border border-white/50 dark:border-white/10 flex items-center justify-center text-[#1a100f] dark:text-[#E6E1E5] hover:scale-105 transition-transform"
                    >
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <h1 className="text-3xl font-display font-black text-[#1a100f] dark:text-white tracking-tight">Blocked Users</h1>
                </div>

                <div className="bg-white dark:bg-white/5 dark:backdrop-blur-2xl rounded-[28px] p-8 shadow-xl border-[0.5px] border-white/30 dark:border-white/10 flex-1">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : blockedUsers.length === 0 ? (
                        <div className="text-center py-20 flex flex-col items-center">
                            <span className="material-symbols-outlined text-6xl text-[#1a100f]/20 dark:text-white/20 mb-4 opacity-50">person_off</span>
                            <h3 className="text-xl font-bold text-[#1a100f] dark:text-[#E6E1E5] mb-2">No Blocked Users</h3>
                            <p className="text-[#5e413d] dark:text-[#CAC4D0] font-medium max-w-sm mx-auto">
                                When you block someone, they won't be able to see your location, send friend requests, or interact with you.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {blockedUsers.map(u => (
                                <div key={u._id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-[#F6F3E6]/50 dark:bg-black/20 border border-white/50 dark:border-white/5 hover:bg-white/50 dark:hover:bg-white/5 transition-colors gap-4">
                                    <div className="flex items-center gap-4">
                                        <Avatar
                                            src={u.profilePhoto || `https://api.dicebear.com/7.x/notionists/svg?seed=${u.displayName}`}
                                            alt={u.displayName}
                                            sx={{ width: 48, height: 48, border: '2px solid rgba(190, 54, 39, 0.2)' }}
                                        />
                                        <div>
                                            <h4 className="font-bold text-[#1a100f] dark:text-[#E6E1E5]">{u.displayName}</h4>
                                            <p className="text-sm font-medium text-[#5e413d] dark:text-[#CAC4D0] opacity-80">
                                                {u.bio || 'Blocked account'}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleUnblock(u._id)}
                                        className="py-2 px-5 rounded-xl border border-primary/20 bg-primary/10 text-primary font-bold hover:bg-primary/20 transition-all active:scale-95"
                                    >
                                        Unblock
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {snackbarMsg && (
                <M3Snackbar
                    message={snackbarMsg}
                    onClose={() => setSnackbarMsg('')}
                />
            )}
        </div>
    );
};

export default BlockedUsers;
