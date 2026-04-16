import React, { memo } from 'react';

/**
 * M3 FAB — Material Design 3 Floating Action Button
 * 
 * M3 Spec:
 * - Surface: primary container (tonal), secondary, tertiary, or surface
 * - Corner radius: 16dp (large), 12dp (small), 28dp (extended)
 * - Sizes: small (40dp), regular (56dp), large (96dp)
 * - Icon: 24dp (regular/small), 36dp (large)
 * - Extended: icon + label, min 80dp width
 * - Elevation: level 3 (6dp), level 4 on hover
 * 
 * @param {string} icon - Material icon name
 * @param {string} label - Text label (for extended FAB)
 * @param {string} size - 'small' | 'regular' | 'large'
 * @param {string} variant - 'primary' | 'secondary' | 'tertiary' | 'surface'
 * @param {function} onClick - Click handler
 * @param {boolean} extended - Whether to show extended FAB with label
 * @param {string} className - Additional classes
 * @param {string} position - 'bottom-right' | 'bottom-center' | 'bottom-left' | 'none'
 */

// M3 size specs
const SIZE_MAP = {
    small: {
        container: 'w-10 h-10',
        icon: 'text-[20px]',
        rounded: 'rounded-sq-md', // 16dp → sq-md
    },
    regular: {
        container: 'w-14 h-14',
        icon: 'text-[24px]',
        rounded: 'rounded-sq-lg', // 16dp → sq-lg
    },
    large: {
        container: 'w-24 h-24',
        icon: 'text-[36px]',
        rounded: 'rounded-sq-2xl', // 28dp → sq-2xl
    },
};

// M3 color variants
const VARIANT_MAP = {
    primary: {
        bg: 'bg-primary/90 dark:bg-[#D0BCFF]/90 backdrop-blur-md',
        text: 'text-white dark:text-[#381E72]',
        hover: 'hover:bg-primary hover:brightness-110 dark:hover:bg-[#D0BCFF] dark:hover:brightness-90',
        shadow: 'shadow-[0_6px_10px_rgba(0,0,0,0.14),0_1px_18px_rgba(0,0,0,0.12),0_3px_5px_rgba(0,0,0,0.2)]',
        hoverShadow: 'hover:shadow-[0_8px_15px_rgba(0,0,0,0.16),0_3px_24px_rgba(0,0,0,0.14),0_5px_8px_rgba(0,0,0,0.22)]',
    },
    secondary: {
        bg: 'bg-[#E8DEF8]/90 dark:bg-[#4A4458]/90 backdrop-blur-md',
        text: 'text-[#1D192B] dark:text-[#E8DEF8]',
        hover: 'hover:brightness-95 dark:hover:brightness-110',
        shadow: 'shadow-[0_6px_10px_rgba(0,0,0,0.08),0_1px_18px_rgba(0,0,0,0.06)]',
        hoverShadow: 'hover:shadow-[0_8px_15px_rgba(0,0,0,0.12)]',
    },
    tertiary: {
        bg: 'bg-[#FFD8E4]/90 dark:bg-[#633B48]/90 backdrop-blur-md',
        text: 'text-[#31111D] dark:text-[#FFD8E4]',
        hover: 'hover:brightness-95 dark:hover:brightness-110',
        shadow: 'shadow-[0_6px_10px_rgba(0,0,0,0.08),0_1px_18px_rgba(0,0,0,0.06)]',
        hoverShadow: 'hover:shadow-[0_8px_15px_rgba(0,0,0,0.12)]',
    },
    surface: {
        bg: 'bg-white/10 dark:bg-[#1C1B1F]/10 backdrop-blur-2xl border-[0.5px] border-white/30 dark:border-white/10',
        text: 'text-primary dark:text-[#D0BCFF]',
        hover: 'hover:bg-white/20 dark:hover:bg-[#1C1B1F]/20 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]',
        shadow: 'shadow-xl',
        hoverShadow: 'hover:shadow-2xl',
    },
};

// Position presets
const POSITION_MAP = {
    'bottom-right': 'fixed bottom-24 right-6 z-50 md:bottom-8 md:right-8',
    'bottom-center': 'fixed bottom-24 left-1/2 -translate-x-1/2 z-50 md:bottom-8',
    'bottom-left': 'fixed bottom-24 left-6 z-50 md:bottom-8 md:left-8',
    'none': '',
};

const M3FAB = memo(({
    icon = 'add',
    label,
    size = 'regular',
    variant = 'primary',
    onClick,
    extended = false,
    className = '',
    position = 'none',
    ariaLabel,
}) => {
    const sizeSpec = SIZE_MAP[size] || SIZE_MAP.regular;
    const colorSpec = VARIANT_MAP[variant] || VARIANT_MAP.primary;
    const posClass = POSITION_MAP[position] || '';

    if (extended && label) {
        // Extended FAB — M3: 56dp height, 16dp radius, min 80dp width
        return (
            <button
                type="button"
                onClick={onClick}
                aria-label={ariaLabel || label}
                className={`
                    inline-flex items-center gap-3 h-14 px-4 min-w-[80px]
                    ${colorSpec.bg} ${colorSpec.text}
                    rounded-sq-lg
                    ${colorSpec.shadow} ${colorSpec.hoverShadow} ${colorSpec.hover}
                    transition-all duration-200 active:scale-[0.97]
                    font-bold text-sm tracking-wide
                    ${posClass}
                    ${className}
                `}
            >
                <span className={`material-symbols-outlined ${sizeSpec.icon}`}>{icon}</span>
                <span>{label}</span>
            </button>
        );
    }

    // Standard FAB
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={ariaLabel || icon}
            className={`
                inline-flex items-center justify-center
                ${sizeSpec.container}
                ${colorSpec.bg} ${colorSpec.text}
                ${sizeSpec.rounded}
                ${colorSpec.shadow} ${colorSpec.hoverShadow} ${colorSpec.hover}
                transition-all duration-200 active:scale-[0.95]
                ${posClass}
                ${className}
            `}
        >
            <span className={`material-symbols-outlined ${sizeSpec.icon}`}>{icon}</span>
        </button>
    );
});

M3FAB.displayName = 'M3FAB';

export default M3FAB;
