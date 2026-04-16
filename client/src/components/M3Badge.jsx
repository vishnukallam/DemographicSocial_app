import React, { memo } from 'react';

/**
 * M3 Badge — Material Design 3 Badge Component
 * 
 * M3 Spec:
 * - Small (dot): 6dp diameter
 * - Large (with count): 16dp height, min 16dp width
 * - Corner radius: full round
 * - Color: error color (red)
 * - Max count display: 999+ (configurable)
 * - Position: top-right of anchor element
 * 
 * @param {React.ReactNode} children - Anchor element
 * @param {number} count - Badge count (0 = hidden, -1 = dot only)
 * @param {number} max - Max count before showing "max+"
 * @param {boolean} showZero - Whether to show badge when count is 0
 * @param {string} variant - 'standard' | 'dot'
 * @param {string} color - 'error' | 'primary'
 * @param {string} className - Additional classes
 */

const M3Badge = memo(({
    children,
    count = 0,
    max = 999,
    showZero = false,
    variant = 'standard',
    color = 'error',
    className = '',
}) => {
    const isDot = variant === 'dot';
    const shouldShow = isDot ? count !== 0 : (count > 0 || showZero);
    const displayCount = count > max ? `${max}+` : count;

    const colorClasses = {
        error: 'bg-red-500 text-white',
        primary: 'bg-primary dark:bg-[#D0BCFF] text-white dark:text-[#381E72]',
    };

    return (
        <div className={`relative inline-flex ${className}`}>
            {children}

            {shouldShow && (
                <span
                    className={`
                        absolute
                        ${isDot
                            ? 'top-0 right-0 w-1.5 h-1.5 -translate-y-0.5 translate-x-0.5'
                            : '-top-1 -right-1 min-w-[18px] h-[18px] px-1 translate-x-1/3 -translate-y-1/3'
                        }
                        rounded-sq-md
                        flex items-center justify-center
                        ${colorClasses[color] || colorClasses.error}
                        ${!isDot ? 'text-[10px] font-bold leading-none' : ''}
                        ring-2 ring-white dark:ring-[#1C1B1F]
                        transition-transform duration-200
                        ${shouldShow ? 'scale-100' : 'scale-0'}
                    `}
                    aria-label={isDot ? 'New notification' : `${displayCount} notifications`}
                >
                    {!isDot && displayCount}
                </span>
            )}
        </div>
    );
});

M3Badge.displayName = 'M3Badge';

export default M3Badge;
