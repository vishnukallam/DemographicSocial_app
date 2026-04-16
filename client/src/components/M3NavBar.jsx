import React, { memo, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import M3Badge from './M3Badge';

/**
 * M3 Navigation Bar — Material Design 3 Bottom Navigation
 * 
 * M3 Spec:
 * - Height: 80dp
 * - Active indicator: 64x32dp pill (Squircle), secondary-container color
 * - Icon: 24dp
 * - Label: 12sp medium
 */

const M3NavBar = memo(({ items = [], className = '' }) => {
    const navigate = useNavigate();
    const location = useLocation();

    // Determine active item
    const activeIndex = useMemo(() => {
        return items.findIndex(item => {
            if (item.path === '/') return location.pathname === '/';
            return location.pathname.startsWith(item.path);
        });
    }, [items, location.pathname]);

    return (
        <nav
            className={`
                fixed bottom-0 left-0 right-0 z-[1000]
                pointer-events-none
                flex justify-center
                pb-4 md:pb-6
                ${className}
            `}
            role="navigation"
            aria-label="Main navigation"
        >
            {/* Nav Container — Floating Squircle */}
            <div className={`
                pointer-events-auto
                squircle-full
                bg-white border border-gray-200 shadow-xl
                dark:bg-white/5 dark:backdrop-blur-2xl dark:border-white/10 dark:shadow-none
                h-20
                px-2 md:px-6
                flex items-center justify-between md:justify-center md:gap-8
                w-full max-w-[90%] md:max-w-2xl
                relative z-50
            `}>
                {items.map((item, index) => {
                    const isActive = index === activeIndex;

                    return (
                        <button
                            key={item.path}
                            type="button"
                            onClick={() => navigate(item.path)}
                            className={`
                                squircle-btn
                                flex flex-col items-center justify-center
                                w-full md:w-20 h-full
                                gap-1
                                transition-all duration-300
                                group
                                outline-none
                                relative
                            `}
                            aria-label={item.label}
                            aria-current={isActive ? 'page' : undefined}
                        >
                            {/* Active Indicator — Squircle shape */}
                            <div className={`
                                absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                                w-16 h-10
                                squircle
                                transition-all duration-300
                                ${isActive
                                    ? 'bg-primary/10 dark:bg-primary/20 opacity-100'
                                    : 'opacity-0 scale-50'
                                }
                            `} />

                            {/* Icon container */}
                            <div className="relative z-10 flex items-center justify-center">
                                <M3Badge count={item.badge || 0} variant={item.badge > 0 ? 'standard' : 'dot'}>
                                    <span
                                        className={`
                                            material-symbols-outlined text-[24px]
                                            transition-all duration-300
                                            ${isActive
                                                ? 'text-primary dark:text-[#D0BCFF] fill-1'
                                                : 'text-gray-500 dark:text-[#CAC4D0] group-hover:text-primary dark:group-hover:text-[#D0BCFF]'
                                            }
                                        `}
                                        style={{
                                            fontVariationSettings: isActive ? "'FILL' 1, 'wght' 600" : "'FILL' 0, 'wght' 400"
                                        }}
                                    >
                                        {isActive ? (item.activeIcon || item.icon) : item.icon}
                                    </span>
                                </M3Badge>
                            </div>

                            {/* Label */}
                            <span
                                className={`
                                    text-[11px] font-bold tracking-wide z-10
                                    transition-colors duration-200
                                    ${isActive
                                        ? 'text-primary dark:text-[#D0BCFF]'
                                        : 'text-gray-500 dark:text-[#CAC4D0] group-hover:text-primary dark:group-hover:text-[#D0BCFF]'
                                    }
                                `}
                            >
                                {item.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
});

M3NavBar.displayName = 'M3NavBar';

export default M3NavBar;
