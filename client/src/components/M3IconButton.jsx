import React, { memo } from 'react';

/**
 * M3 Icon Button — Material Design 3 Icon Button
 * 
 * M3 Spec:
 * - Size: 48x48dp touch target, 40x40dp visual
 * - Icon: 24dp
 * - Four variants: standard, filled, tonal, outlined
 * - State layer: 8% on hover, 12% on focus, 12% on press
 * - Toggle mode: selected/unselected states
 * 
 * @param {string} icon - Material icon name
 * @param {string} variant - 'standard' | 'filled' | 'tonal' | 'outlined'
 * @param {function} onClick - Click handler
 * @param {boolean} selected - Toggle state
 * @param {boolean} disabled - Whether button is disabled
 * @param {string} ariaLabel - Accessibility label
 * @param {string} size - 'small' | 'default' | 'large'
 * @param {string} className - Additional classes
 */

const SIZE_MAP = {
    small: { container: 'w-8 h-8', icon: 'text-[18px]' },
    default: { container: 'w-10 h-10', icon: 'text-[24px]' },
    large: { container: 'w-12 h-12', icon: 'text-[28px]' },
};

const M3IconButton = memo(({
    icon,
    variant = 'standard',
    onClick,
    selected = false,
    disabled = false,
    ariaLabel,
    size = 'default',
    className = '',
    type = 'button',
}) => {
    const sizeSpec = SIZE_MAP[size] || SIZE_MAP.default;

    const variantClasses = {
        standard: selected
            ? 'text-primary dark:text-[#D0BCFF] hover:bg-primary/8 dark:hover:bg-[#D0BCFF]/8'
            : 'text-[#49454F] dark:text-[#CAC4D0] hover:bg-[#1a100f]/8 dark:hover:bg-[#E6E1E5]/8',

        filled: selected
            ? 'bg-primary dark:bg-[#D0BCFF] text-white dark:text-[#381E72] hover:brightness-110 shadow-sm'
            : 'bg-[#E7E0EC] dark:bg-[#49454F] text-primary dark:text-[#D0BCFF] hover:brightness-95 dark:hover:brightness-110',

        tonal: selected
            ? 'bg-primary/12 dark:bg-[#D0BCFF]/16 text-primary dark:text-[#D0BCFF] hover:bg-primary/16'
            : 'bg-[#E7E0EC]/50 dark:bg-[#49454F]/30 text-[#49454F] dark:text-[#CAC4D0] hover:bg-[#E7E0EC] dark:hover:bg-[#49454F]/50',

        outlined: selected
            ? 'border border-primary dark:border-[#D0BCFF] bg-primary/8 dark:bg-[#D0BCFF]/8 text-primary dark:text-[#D0BCFF]'
            : 'border border-[#79747E] dark:border-[#938F99] text-[#49454F] dark:text-[#CAC4D0] hover:bg-[#1a100f]/8 dark:hover:bg-[#E6E1E5]/8',
    };

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            aria-label={ariaLabel || icon}
            className={`
                ${sizeSpec.container}
                rounded-sq-lg
                inline-flex items-center justify-center
                transition-all duration-200
                active:scale-[0.92]
                disabled:opacity-38 disabled:cursor-not-allowed
                ${variantClasses[variant] || variantClasses.standard}
                ${className}
            `}
        >
            <span
                className={`material-symbols-outlined ${sizeSpec.icon}`}
                style={{
                    fontVariationSettings: selected
                        ? "'FILL' 1, 'wght' 500"
                        : "'FILL' 0, 'wght' 400"
                }}
            >
                {icon}
            </span>
        </button>
    );
});

M3IconButton.displayName = 'M3IconButton';

export default M3IconButton;
