import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Radio, Heart, Shield, CheckCircle } from 'lucide-react';
import api from '../utils/api';
import M3LoadingIndicator from './M3LoadingIndicator';
import M3Card from './M3Card';

const Home = () => {
    const { user, userLocation } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState({ activeNearby: 0, matchedInterestsNearby: 0, topInterests: [] });
    const [loadingStats, setLoadingStats] = useState(true);
    const carouselRef = useRef(null);

    useEffect(() => {
        if (!user || !userLocation) return;
        const fetchStats = async () => {
            try {
                const res = await api.get('/api/stats/local', {
                    params: { lat: userLocation.lat, lng: userLocation.lng, radius: 20 }
                });
                setStats(res.data);
            } catch (err) {
                console.error('Failed to load stats', err);
            } finally {
                setLoadingStats(false);
            }
        };
        fetchStats();
    }, [userLocation?.lat, userLocation?.lng]);

    const scrollCarousel = (dir) => {
        if (carouselRef.current) {
            carouselRef.current.scrollBy({ left: dir * 220, behavior: 'smooth' });
        }
    };

    const StatCard = ({ label, count, description, icon: Icon }) => (
        <M3Card variant="elevated" className="flex flex-col items-center text-center justify-center h-full" padding="p-8">
            <span className="text-xs font-black tracking-widest text-[#915b55] dark:text-[#CAC4D0] uppercase mb-4 flex items-center gap-2">
                <Icon size={14} /> {label}
            </span>
            <div className="text-6xl font-black text-[#1a100f] dark:text-white mb-2 tracking-tighter">
                {loadingStats ? <M3LoadingIndicator size={40} className="mx-auto" /> : count}
            </div>
            <p className="text-sm font-bold text-[#5e413d] dark:text-[#938F99]">{description}</p>
        </M3Card>
    );

    const PulseCard = ({ category, count }) => (
        <div
            className="flex-shrink-0 w-52 h-32 bg-white dark:bg-white/5 dark:backdrop-blur-2xl border border-white/40 dark:border-white/10 rounded-sq-2xl p-5 flex flex-col justify-between cursor-pointer hover:shadow-xl hover:border-white/70 dark:hover:border-white/25 transition-all duration-200 active:scale-95 relative overflow-hidden group"
            onClick={() => navigate(`/map?filter=${category}`)}
        >
            <div className="absolute top-3 right-3 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
            <h4 className="text-[15px] font-black text-[#1a100f] dark:text-white leading-snug pr-4 group-hover:text-primary dark:group-hover:text-[#D0BCFF] transition-colors">
                {category}
            </h4>
            <div>
                <p className="text-xs text-primary dark:text-[#D0BCFF] font-black uppercase tracking-tight mb-2">
                    {count} Active Nearby
                </p>
                <div className="h-1 w-full bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-primary dark:bg-[#D0BCFF] rounded-full"
                        style={{ width: `${Math.min(100, (count / 15) * 100)}%` }}
                    />
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen w-full bg-transparent flex flex-col items-center py-10 px-4 gap-8 font-display transition-colors duration-300">
            <div className="w-full max-w-4xl space-y-8 flex-1">

                {/* Greeting */}
                <div className="mb-4 animate-fade-in">
                    <h1 className="text-3xl md:text-4xl font-black text-[#1a100f] dark:text-white tracking-tight">
                        Hey, <span className="text-primary">{user?.displayName?.split(' ')[0]}</span> 👋
                    </h1>
                    <p className="text-[#5e413d] dark:text-[#CAC4D0] font-bold mt-1">
                        Here's what's happening near you right now.
                    </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <StatCard
                        label="Friends Near You"
                        count={stats.activeNearby}
                        description="Friends within 20km of you"
                        icon={Radio}
                    />
                    <StatCard
                        label="Shared Interests"
                        count={stats.matchedInterestsNearby}
                        description="Your interests also liked by people nearby"
                        icon={Heart}
                    />
                </div>

                {/* Trending carousel */}
                {stats.topInterests && stats.topInterests.length > 0 && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                Trending Near You (20km)
                            </h3>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => scrollCarousel(-1)}
                                    className="w-8 h-8 rounded-full flex items-center justify-center bg-white dark:bg-white/10 border border-gray-100 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/20 transition-colors shadow-sm"
                                    aria-label="Scroll left"
                                >
                                    <span className="material-symbols-outlined text-[18px] text-[#5e413d] dark:text-[#CAC4D0]">chevron_left</span>
                                </button>
                                <button
                                    onClick={() => scrollCarousel(1)}
                                    className="w-8 h-8 rounded-full flex items-center justify-center bg-white dark:bg-white/10 border border-gray-100 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/20 transition-colors shadow-sm"
                                    aria-label="Scroll right"
                                >
                                    <span className="material-symbols-outlined text-[18px] text-[#5e413d] dark:text-[#CAC4D0]">chevron_right</span>
                                </button>
                            </div>
                        </div>
                        <div
                            ref={carouselRef}
                            className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory"
                            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                        >
                            {stats.topInterests.map((item, i) => (
                                <div key={i} className="snap-start flex-shrink-0">
                                    <PulseCard category={item.category} count={item.count} />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* About section */}
                <div className="squircle-full bg-white dark:bg-white/5 dark:backdrop-blur-2xl p-8 md:p-12 border border-white/20 dark:border-white/5 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32" />
                    <div className="w-full relative z-10">
                        <div className="mb-10 text-center md:text-left">
                            <h2 className="text-3xl font-black text-[#1a100f] dark:text-white mb-4 tracking-tight flex items-center justify-center md:justify-start gap-3">
                                <img src="/logo.svg" alt="App Logo" className="w-10 h-10 object-contain drop-shadow-md" />
                                How KON-NECT works
                            </h2>
                            <p className="text-[#5e413d] dark:text-[#CAC4D0] leading-relaxed font-medium text-lg">
                                KON-NECT shows you a live map of people within 20km who share your interests. Click any pin, send a friend request, and start a private chat once they accept. No endless feeds — just real connections around you.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-20">
                            <div>
                                <h3 className="font-black text-xl text-[#1a100f] dark:text-white mb-6 flex items-center gap-3">
                                    <div className="w-10 h-10 bg-primary/10 rounded-sq-lg flex items-center justify-center text-primary">
                                        <CheckCircle size={22} strokeWidth={2.5} />
                                    </div>
                                    Getting started
                                </h3>
                                <ul className="space-y-4">
                                    {[
                                        "Open the Map to see people near you.",
                                        "Tap any pin to view their profile and shared interests.",
                                        "Send a friend request — they'll get a notification.",
                                        "Once they accept, chat opens up instantly.",
                                    ].map((text, i) => (
                                        <li key={i} className="flex gap-4 items-start">
                                            <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2.5 shrink-0" />
                                            <span className="text-[#5e413d] dark:text-[#CAC4D0] font-bold text-sm tracking-tight">{text}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div>
                                <h3 className="font-black text-xl text-[#1a100f] dark:text-white mb-6 flex items-center gap-3">
                                    <div className="w-10 h-10 bg-primary/10 rounded-sq-lg flex items-center justify-center text-primary">
                                        <Shield size={22} strokeWidth={2.5} />
                                    </div>
                                    Your privacy
                                </h3>
                                <ul className="space-y-4">
                                    {[
                                        "Your exact location is never shown — only your general area.",
                                        "Online status is only visible to mutual friends.",
                                        "Blocking someone removes them from your map instantly.",
                                    ].map((text, i) => (
                                        <li key={i} className="flex gap-4 items-start">
                                            <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2.5 shrink-0" />
                                            <span className="text-[#5e413d] dark:text-[#CAC4D0] font-bold text-sm tracking-tight">{text}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <footer className="text-center py-4">
                    <p className="text-xs text-[#5e413d] dark:text-[#CAC4D0] font-black uppercase tracking-widest">© 2026 KON-NECT. All rights reserved.</p>
                </footer>
            </div>
        </div>
    );
};

export default Home;
