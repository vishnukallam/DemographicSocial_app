import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useContext } from 'react';
import { ColorModeContext } from '../App';
import { Copy, Check } from 'lucide-react';
import M3TextField from './M3TextField';
import M3Dialog from './M3Dialog';
import M3IconButton from './M3IconButton';

const Login = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { login, loading, error: authError, forgotPassword } = useAuth();

    // Extract error from URL if present
    const queryParams = new URLSearchParams(location.search);
    const urlError = queryParams.get('error');

    // Use authError if it exists (prioritize recent actions), otherwise URL error
    const displayError = authError ? (authError.error || authError) : urlError;

    const [formData, setFormData] = useState({ email: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);

    // Forgot Password State
    const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [tempPassword, setTempPassword] = useState(null);
    const [forgotError, setForgotError] = useState('');
    const [copied, setCopied] = useState(false);

    const { toggleColorMode, mode } = useContext(ColorModeContext);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await login(formData);
            navigate('/', { replace: true });
        } catch (err) {
            console.error("Login failed:", err);
        }
    };

    const handleForgotPassword = async () => {
        if (!forgotEmail) {
            setForgotError("Please enter your email.");
            return;
        }
        try {
            const result = await forgotPassword(forgotEmail);
            setTempPassword(result.tempPassword);
            setForgotError('');
        } catch (err) {
            setForgotError(err.error || "Failed to generate password.");
        }
    };

    const closeForgotModal = () => {
        setIsForgotModalOpen(false);
        setTempPassword(null);
        setForgotEmail('');
        setForgotError('');
    };

    return (
        <div className="relative min-h-screen w-full flex items-center justify-center bg-background-light dark:bg-background-dark font-display antialiased py-10">
            {/* Background Layer (From Reference) */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <div
                    className="w-full h-full bg-cover bg-center filter blur-xl scale-110 opacity-40 dark:opacity-30 transition-opacity duration-700"
                    style={{ backgroundImage: 'var(--bg-map-url)' }}
                ></div>
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background-light/40 to-background-light/95 dark:via-background-dark/60 dark:to-background-dark/95"></div>
            </div>

            {/* Theme Toggle — M3 Icon Button */}
            <div className="absolute top-6 right-6 z-50">
                <M3IconButton
                    icon={mode === 'dark' ? 'light_mode' : 'dark_mode'}
                    variant="tonal"
                    onClick={toggleColorMode}
                    ariaLabel="Toggle theme"
                />
            </div>

            <div className="relative z-10 w-full max-w-[440px] mx-4 bg-white/40 dark:bg-white/5 backdrop-blur-xl dark:backdrop-blur-2xl shadow-2xl p-8 md:p-10 flex flex-col animate-fade-in-up border-[0.5px] border-white/50 dark:border-white/10 mb-8" style={{ borderRadius: '28px' }}>

                <div className="flex flex-col items-center gap-3 mb-6">
                    <div className="w-16 h-16 flex items-center justify-center mb-2">
                        <img src="/logo.svg" alt="App Logo" className="w-full h-full object-contain drop-shadow-md" />
                    </div>
                    <h1 className="text-2xl font-bold text-primary tracking-tight">KON-NECT</h1>
                </div>

                <div className="text-center mb-8">
                    <h2 className="text-[#1a100f] dark:text-[#E6E1E5] text-[28px] font-bold leading-tight tracking-tight">Welcome Back</h2>
                    <p className="text-[#5e413d] dark:text-[#CAC4D0] text-base font-normal mt-2 leading-relaxed">
                        Connect to your world and explore the map.
                    </p>
                </div>

                {displayError && (
                    <div className={`mb-4 p-3 rounded-lg text-sm text-center font-medium flex items-start gap-2 ${displayError.includes('already') || displayError.includes('login')
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700/40'
                        : 'bg-error/10 text-error'
                        }`}>
                        {(displayError.includes('already') || displayError.includes('login')) && (
                            <span className="material-symbols-outlined text-[18px] text-blue-500 shrink-0 mt-0.5">info</span>
                        )}
                        <span>{displayError}</span>
                    </div>
                )}

                <form className="w-full flex flex-col gap-5" onSubmit={handleSubmit}>
                    <M3TextField
                        label="Email Address"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        leadingIcon="mail"
                        autoComplete="email"
                        placeholder="user@example.com"
                        variant="filled"
                    />

                    <div className="flex flex-col gap-1">
                        <M3TextField
                            label="Password"
                            name="password"
                            type={showPassword ? 'text' : 'password'}
                            value={formData.password}
                            onChange={handleChange}
                            required
                            leadingIcon="lock"
                            trailingIcon={showPassword ? 'visibility' : 'visibility_off'}
                            onTrailingIconClick={() => setShowPassword(!showPassword)}
                            autoComplete="current-password"
                            placeholder="••••••••"
                            variant="filled"
                        />
                        <div className="flex justify-end mt-1">
                            <button
                                type="button"
                                onClick={() => setIsForgotModalOpen(true)}
                                className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors focus:outline-none"
                            >
                                Forgot Password?
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary hover:bg-[#a32e21] active:scale-[0.98] text-white font-bold h-12 shadow-lg shadow-primary/30 flex items-center justify-center gap-2 transition-all duration-200 mt-2 rounded-full disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        <span>{loading ? 'Logging In...' : 'Log In'}</span>
                    </button>
                </form>

                <div className="w-full flex items-center gap-4 my-6">
                    <div className="h-[1px] bg-gray-200 dark:bg-gray-700 flex-1"></div>
                    <span className="text-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wider">Or login with</span>
                    <div className="h-[1px] bg-gray-200 dark:bg-gray-700 flex-1"></div>
                </div>

                <div className="flex justify-center gap-5 w-full">
                    {/* Only Google as requested */}
                    <button
                        type="button"
                        onClick={() => window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/google?action=login`}
                        className="w-12 h-12 rounded-full border border-gray-100 dark:border-[#3a2523] bg-white dark:bg-[#3a2523] flex items-center justify-center hover:bg-gray-50 dark:hover:bg-[#4a2e2b] hover:shadow-md transition-all duration-200 group"
                    >
                        <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"></path>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
                        </svg>
                    </button>
                </div>

                <p className="mt-8 text-center text-[#5e413d] dark:text-[#d0c0be] text-sm font-medium">
                    New to KON-NECT? <Link to="/register" className="font-bold text-primary hover:text-[#a32e21] hover:underline transition-all ml-1">Sign Up</Link>
                </p>
            </div>

            {/* Forgot Password Dialog — M3 */}
            <M3Dialog
                open={isForgotModalOpen}
                onClose={closeForgotModal}
                icon="lock_reset"
                headline="Forgot Password"
                actions={
                    !tempPassword
                        ? [
                            { label: 'Cancel', onClick: closeForgotModal },
                            { label: 'Generate Password', variant: 'filled', onClick: handleForgotPassword },
                        ]
                        : [
                            { label: 'Close & Login', variant: 'filled', onClick: closeForgotModal },
                        ]
                }
            >
                {!tempPassword ? (
                    <>
                        <p className="mb-4">Enter your email to receive a temporary password.</p>
                        <M3TextField
                            label="Email Address"
                            type="email"
                            value={forgotEmail}
                            onChange={(e) => setForgotEmail(e.target.value)}
                            leadingIcon="mail"
                            variant="outlined"
                            error={forgotError || undefined}
                        />
                    </>
                ) : (
                    <>
                        <p className="text-green-600 dark:text-green-400 font-bold mb-3">
                            Temporary password generated successfully!
                        </p>
                        <div className="bg-gray-100 dark:bg-[#2D2835] p-4 rounded-sq-lg text-center font-mono text-lg font-bold mb-4 select-all flex items-center justify-between border border-gray-200 dark:border-gray-700">
                            <span className="text-gray-800 dark:text-white">{tempPassword}</span>
                            <M3IconButton
                                icon={copied ? 'check' : 'content_copy'}
                                variant={copied ? 'tonal' : 'standard'}
                                selected={copied}
                                onClick={() => {
                                    navigator.clipboard.writeText(tempPassword);
                                    setCopied(true);
                                    setTimeout(() => setCopied(false), 2000);
                                }}
                                ariaLabel="Copy password"
                            />
                        </div>
                        <p className="text-xs text-[#49454F] dark:text-[#CAC4D0] leading-relaxed">
                            Please copy this password and login. You can change it later in your profile.
                        </p>
                    </>
                )}
            </M3Dialog>
        </div>
    );
};

export default Login;
