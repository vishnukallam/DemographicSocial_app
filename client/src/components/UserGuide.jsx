import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MessageCircle, Check, SkipForward } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const guideSteps = [
    { path: '/setup', message: 'You can upload a profile photo or paste an image URL. Fill in your bio so others can learn about you.' },
    { path: '/setup', message: 'If you signed in with a social provider, set a local password here so you can also log in with your email and password.' },
    { path: '/setup', message: 'Select your interests from the list or add a custom one. These are used to match you with nearby people who share the same passions.' },
    { path: '/home', message: 'This is your Home page. It shows a live summary of what is happening near you right now.' },
    { path: '/home', message: 'This card shows how many of your friends are within 20km of your current location.' },
    { path: '/home', message: 'This card shows how many people nearby share the same interests as you.' },
    { path: '/home', message: 'These cards show the most active interest categories among people near you. Use the arrows to scroll through them.' },
    { path: '/map', message: 'On the Map page, you can see other users as pins on the map. Click on any pin to view their profile details.' },
    { path: '/map', message: 'When you click a user pin, their details appear here — including their name, interests, match count, bio, and options to send a friend request or get directions to their location.' },
    { path: '/map', message: 'Use the search bar to find any place on the map by name.' },
    { path: '/map', message: 'Toggle Global View to switch between seeing users near you and seeing all users on the map.' },
    { path: '/map', message: 'When you click Directions on a user panel, a live route is drawn on the map with the distance and an End Trip button.' },
    { path: '/social', message: 'Use this slider to control how many nearby users are loaded in your Social feed. Adjust it from 10 to 50.' },
    { path: '/social', message: 'This section shows people near you (within 20km) who share your interests. The number of shared interests is shown on each card.' },
    { path: '/social', message: 'Click Add Friend on any profile card to send them a friend request.' },
    { path: '/friends', message: 'The Friends page shows your confirmed friends. Click on any friend to open a chat and message them. Their online/offline status is shown below their name.' },
    { path: '/profile', message: 'This is your Profile page. It shows your name, email, bio, and your selected interests.' },
    { path: '/profile', message: 'Click Edit Bio & Interests to update what others see about you.' },
    { path: '/profile', message: 'Here you can change your password, manage blocked users, or delete your account from the Danger Zone section.' }
];

const UserGuide = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    
    const [isVisible, setIsVisible] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    
    useEffect(() => {
        const completed = localStorage.getItem('konnect_guide_completed');
        if (!completed) {
            const timer = setTimeout(() => {
                setIsVisible(true);
                // If the user already has a complete profile, jump straight to the Home tour
                if (location.pathname === '/home' && user?.interests?.length > 0) {
                    const firstHomeIdx = guideSteps.findIndex(s => s.path === '/home');
                    setCurrentStep(firstHomeIdx);
                } else if (location.pathname !== guideSteps[0].path) {
                    // For truly new users, route them to the first setup step
                    navigate(guideSteps[0].path);
                }
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [location.pathname, navigate, user]);
    
    if (!isVisible) return null;
    
    const step = guideSteps[currentStep];
    
    const handleNext = () => {
        if (currentStep < guideSteps.length - 1) {
            const nextIdx = currentStep + 1;
            const nextStep = guideSteps[nextIdx];
            const currentStepPath = guideSteps[currentStep].path;

            // Prevent navigating away from setup if profile isn't saved yet
            if (currentStepPath === '/setup' && nextStep.path !== '/setup') {
                if (!user?.interests || user.interests.length === 0) {
                    alert("Please complete and save your profile setup to continue the tour!");
                    return;
                }
            }

            setCurrentStep(nextIdx);

            // Always navigate when the NEXT step's page differs from the CURRENT step's page.
            // We compare step paths (not live location) so the transition fires reliably.
            if (currentStepPath !== nextStep.path) {
                navigate(nextStep.path);
            }
        } else {
            handleComplete();
        }
    };
    
    const handleComplete = () => {
        localStorage.setItem('konnect_guide_completed', 'true');
        setIsVisible(false);
    };
    
    return (
        <div className="fixed bottom-6 left-6 z-[9999] w-[320px] sm:w-[380px] max-w-[90vw] animate-in fade-in slide-in-from-bottom-8 duration-500">
            {/* The Speech Bubble Shape */}
            <div className="relative p-5 sm:p-6 rounded-3xl rounded-bl-none bg-white/80 dark:bg-[#141218]/90 backdrop-blur-2xl border border-white/50 dark:border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.2)] flex flex-col gap-4 group">
                
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-[#be3627]/10 dark:bg-[#D0BCFF]/10 flex items-center justify-center shrink-0 shadow-inner">
                        <MessageCircle className="text-[#be3627] dark:text-[#D0BCFF]" size={24} />
                    </div>
                    <div className="pt-1 flex-1">
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="text-[11px] font-black text-[#be3627] dark:text-[#D0BCFF] uppercase tracking-[0.2em]">
                                Welcome Tour
                            </h4>
                            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-full">
                                {currentStep + 1} / {guideSteps.length}
                            </span>
                        </div>
                        <p className="text-[15px] font-medium text-[#1a100f] dark:text-[#E6E1E5] leading-relaxed">
                            {step.message}
                        </p>
                    </div>
                </div>
                
                <div className="flex items-center justify-end gap-3 mt-2 border-t border-black/5 dark:border-white/5 pt-4">
                    <button 
                        onClick={handleComplete}
                        className="px-4 py-2 rounded-full text-xs font-bold text-[#5e413d] dark:text-[#CAC4D0] hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center gap-1.5"
                    >
                        <SkipForward size={14} />
                        Skip
                    </button>
                    <button 
                        onClick={handleNext}
                        className="px-6 py-2 rounded-full text-sm font-extrabold bg-[#be3627] dark:bg-[#D0BCFF] text-white dark:text-[#1D1B20] hover:scale-105 active:scale-95 transition-all shadow-lg hover:shadow-xl shadow-[#be3627]/25 dark:shadow-[#D0BCFF]/15 flex items-center gap-1.5"
                    >
                        <Check size={16} />
                        {currentStep < guideSteps.length - 1 ? 'Ok' : 'Done'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UserGuide;
