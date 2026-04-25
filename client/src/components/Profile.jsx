import React, { useContext, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import M3Dialog from './M3Dialog';
import M3TextField from './M3TextField';
import M3Badge from './M3Badge';

const Profile = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [isPassModalOpen, setIsPassModalOpen] = useState(false);
    const [passData, setPassData] = useState({ currentPassword: '', newPassword: '' });
    const [passError, setPassError] = useState('');
    const [passSuccess, setPassSuccess] = useState('');

    // Delete Account State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteError, setDeleteError] = useState('');

    const handleChangePassword = async () => {
        if (!passData.currentPassword || !passData.newPassword) {
            setPassError('All fields are required');
            return;
        }
        try {
            await api.post('/api/user/change-password', passData);
            setPassSuccess('Password updated successfully!');
            setPassError('');
            setPassData({ currentPassword: '', newPassword: '' });
            setTimeout(() => {
                setIsPassModalOpen(false);
                setPassSuccess('');
            }, 2000);
        } catch (err) {
            setPassError(err.response?.data?.error || 'Failed to update password');
            setPassSuccess('');
        }
    };

    const handleDeleteAccount = async () => {
        try {
            await api.delete('/api/user/delete'); // Assuming endpoint exists
            localStorage.removeItem('konnect_guide_completed');
            logout();
            navigate('/');
        } catch (err) {
            console.error(err);
            setDeleteError('Failed to delete account. Please try again.');
        }
    };

    if (!user) return null;

    return (
        <div className="bg-transparent text-[#1a100f] dark:text-[#E6E1E5] font-display transition-colors duration-300 min-h-full flex flex-col">
            <main className="flex-grow p-4 md:p-8 lg:p-12">
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
                    {/* Left Column: User Card */}
                    <section className="lg:col-span-5 flex flex-col gap-6">
                        <div id="profile-info" className="bg-white dark:bg-white/5 dark:backdrop-blur-2xl rounded-[28px] p-8 shadow-xl border border-white/20 dark:border-white/5 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-primary/10 to-primary/5 dark:from-primary/20 dark:to-transparent"></div>
                            <div className="relative flex flex-col items-center text-center">
                                {/* Avatar */}
                                <div className="w-32 h-32 rounded-full bg-primary/10 dark:bg-primary/20 text-primary flex items-center justify-center text-4xl font-display font-bold mb-4 shadow-sm border-4 border-white dark:border-[#141218] overflow-hidden">
                                    {user.profilePhoto ? (
                                        <img src={user.profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="material-symbols-outlined text-5xl">person</span>
                                    )}
                                </div>
                                <h1 className="text-2xl font-display font-bold text-[#1a100f] dark:text-[#E6E1E5] mb-1">{user.displayName}</h1>
                                <p className="text-[#5e413d] dark:text-[#CAC4D0] text-sm mb-6">@{user.email.split('@')[0]}</p>

                                {/* Bio */}
                                <div className="w-full text-left">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-[#915b55] dark:text-[#938F99] mb-2">Bio</label>
                                    <div className="bg-[#f2e9e9] dark:bg-[#231f29] rounded-sq-xl p-4 border border-[#be3627]/10 dark:border-white/5 text-[#1a100f] dark:text-[#E6E1E5]">
                                        <p className="text-base leading-relaxed">{user.bio || "No bio yet."}</p>
                                    </div>
                                </div>

                                {/* Interests */}
                                <div className="w-full text-left mt-6">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-[#915b55] dark:text-[#938F99] mb-3">Interests</label>
                                    <div className="flex flex-wrap gap-2">
                                        {user.interests && user.interests.map((int, i) => (
                                            <span key={i} className="px-4 py-1.5 rounded-full bg-primary/10 dark:bg-primary/20 text-primary text-sm font-semibold border border-primary/10">
                                                {typeof int === 'string' ? int : int.name}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    id="profile-edit"
                                    onClick={() => navigate('/setup')}
                                    className="mt-8 w-full py-3.5 px-4 rounded-full border-2 border-primary/20 text-primary hover:bg-primary hover:text-white transition-all duration-300 font-bold flex items-center justify-center gap-2 group"
                                >
                                    <span className="material-symbols-outlined group-hover:scale-110 transition-transform text-lg">edit</span>
                                    Edit Bio & Interests
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* Right Column: Account Security & Requests */}
                    <section className="lg:col-span-7 flex flex-col gap-6">
                        {/* Account Security */}
                        <div id="profile-settings" className="bg-white dark:bg-white/5 dark:backdrop-blur-2xl rounded-[28px] p-8 shadow-xl border-[0.5px] border-white/30 dark:border-white/10 h-fit hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all">
                            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#be3627]/10 dark:border-white/5">
                                <span className="material-symbols-outlined text-primary text-2xl">security</span>
                                <h2 className="text-xl font-display font-bold text-[#1a100f] dark:text-[#E6E1E5]">Account Security</h2>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-[#1a100f] dark:text-[#E6E1E5] mb-3">Password</label>
                                    <button
                                        onClick={() => setIsPassModalOpen(true)}
                                        className="w-full py-4 px-4 rounded-sq-xl border-2 border-primary/20 text-primary font-bold hover:bg-primary/5 transition-colors flex items-center justify-center gap-2 group"
                                    >
                                        <span className="material-symbols-outlined group-hover:scale-110 transition-transform">lock_reset</span>
                                        Change Password
                                    </button>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-[#1a100f] dark:text-[#E6E1E5] mb-3">Blocked Users</label>
                                    <button
                                        onClick={() => navigate('/blocked-users')}
                                        className="w-full py-4 px-4 rounded-sq-xl border-2 border-[#1a100f]/20 dark:border-white/20 text-[#1a100f] dark:text-[#E6E1E5] font-bold hover:bg-[#1a100f]/5 dark:hover:bg-white/5 transition-colors flex items-center justify-center gap-2 group"
                                    >
                                        <span className="material-symbols-outlined group-hover:scale-110 transition-transform">block</span>
                                        Manage Blocked list
                                    </button>
                                </div>

                                <div className="border-t border-[#be3627]/10 dark:border-white/5 pt-6">
                                    <label className="block text-sm font-bold text-red-600 dark:text-red-400 mb-3">Danger Zone</label>
                                    <button
                                        onClick={() => setIsDeleteModalOpen(true)}
                                        className="w-full py-4 px-4 rounded-sq-xl border-2 border-red-500/20 text-red-600 dark:text-red-400 font-bold hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center justify-center gap-2 group"
                                    >
                                        <span className="material-symbols-outlined group-hover:scale-110 transition-transform">delete</span>
                                        Delete Account
                                    </button>
                                </div>
                            </div>
                        </div>

                    </section>
                </div>
            </main>
            <footer className="mt-auto py-8 text-center text-xs text-[#5e413d] dark:text-[#CAC4D0] font-medium">
                <p>© 2026 KON-NECT. All rights reserved.</p>
            </footer>

            {/* Change Password Dialog — M3 */}
            <M3Dialog
                open={isPassModalOpen}
                onClose={() => setIsPassModalOpen(false)}
                icon="lock_reset"
                headline="Change Password"
                actions={
                    passSuccess ? [
                        { label: 'Done', variant: 'filled', onClick: () => setIsPassModalOpen(false) }
                    ] : [
                        { label: 'Cancel', onClick: () => setIsPassModalOpen(false) },
                        { label: 'Update', variant: 'filled', onClick: handleChangePassword },
                    ]
                }
            >
                {passSuccess ? (
                    <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 p-3 rounded-sq-lg text-center font-bold">
                        {passSuccess}
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        <M3TextField
                            label="Current Password"
                            type="password"
                            value={passData.currentPassword}
                            onChange={(e) => setPassData({ ...passData, currentPassword: e.target.value })}
                            leadingIcon="lock"
                            variant="outlined"
                        />
                        <M3TextField
                            label="New Password"
                            type="password"
                            value={passData.newPassword}
                            onChange={(e) => setPassData({ ...passData, newPassword: e.target.value })}
                            leadingIcon="lock"
                            variant="outlined"
                            error={passError || undefined}
                        />
                    </div>
                )}
            </M3Dialog>

            {/* Delete Account Dialog — M3 */}
            <M3Dialog
                open={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                icon="warning"
                headline="Delete Account"
                actions={[
                    { label: 'Cancel', onClick: () => setIsDeleteModalOpen(false) },
                    { label: 'Delete', variant: 'filled', onClick: handleDeleteAccount },
                ]}
            >
                <p>Are you sure you want to delete your account? This action cannot be undone.</p>
                {deleteError && (
                    <p className="mt-2 text-error text-xs font-medium">{deleteError}</p>
                )}
            </M3Dialog>
        </div>
    );
};

export default Profile;
