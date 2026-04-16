import React, { memo } from 'react';

/**
 * M3 Chip — Material Design 3 Chip Component
 * 
 * Four types per M3 spec:
 * - assist: Suggest actions, leading icon
 * - filter: Toggle selection, checkmark when selected
 * - input: User input display, trailing dismiss
 * - suggestion: Quick replies, compact
 * 
 * M3 Spec: height 32dp, corner radius 8dp (sq-xs), label 14sp medium
 * 
 * @param {string} label - Chip text
 * @param {string} type - 'assist' | 'filter' | 'input' | 'suggestion'
 * @param {boolean} selected - Whether chip is selected (filter type)
 * @param {function} onClick - Click handler
 * @param {function} onDismiss - Dismiss handler (input type)
 * @param {React.ReactNode} leadingIcon - Leading icon element
 * @param {boolean} elevated - Whether to show elevation
 * @param {boolean} highlighted - Force highlight state (for shared interests)
 * @param {string} className - Additional classes
 */

const M3Chip = memo(({
    label,
    type = 'suggestion',
    selected = false,
    onClick,
    onDismiss,
    leadingIcon,
    elevated = false,
    highlighted = false,
    className = '',
    disabled = false,
}) => {
    // M3 state layer + color logic
    const isActive = selected || highlighted;

    const baseClasses = `
        inline-flex items-center gap-1.5 h-8 px-3 text-sm font-medium
        transition-all duration-200 cursor-pointer select-none
        border outline-none
        active:scale-[0.97]
        disabled:opacity-38 disabled:cursor-not-allowed
        backdrop-blur-sm
    `;

    // Type-specific styling per M3 spec (Glass variants)
    const typeClasses = {
        assist: isActive
            ? 'bg-primary/15 dark:bg-[#D0BCFF]/20 border-primary/20 dark:border-[#D0BCFF]/30 text-primary dark:text-[#D0BCFF]'
            : 'bg-white/10 dark:bg-white/5 border-white/20 dark:border-white/10 text-[#1a100f] dark:text-[#CAC4D0] hover:bg-white/20 dark:hover:bg-white/10',

        filter: isActive
            ? 'bg-primary/15 dark:bg-[#D0BCFF]/20 border-primary dark:border-[#D0BCFF] text-primary dark:text-[#D0BCFF]'
            : 'bg-white/10 dark:bg-white/5 border-white/20 dark:border-white/10 text-[#1a100f] dark:text-[#CAC4D0] hover:bg-white/20 dark:hover:bg-white/10',

        input: isActive
            ? 'bg-primary/15 dark:bg-[#D0BCFF]/20 border-primary/30 dark:border-[#D0BCFF]/30 text-primary dark:text-[#D0BCFF]'
            : 'bg-white/10 dark:bg-white/5 border-white/20 dark:border-white/10 text-[#1a100f] dark:text-[#CAC4D0] hover:bg-white/20 dark:hover:bg-white/10',

        suggestion: isActive
            ? 'bg-primary/15 dark:bg-[#D0BCFF]/20 border-primary/20 dark:border-[#D0BCFF]/30 text-primary dark:text-[#D0BCFF]'
            : 'bg-white/10 dark:bg-white/5 border-white/20 dark:border-white/10 text-[#1a100f] dark:text-[#CAC4D0] hover:bg-white/20 dark:hover:bg-white/10',
    };

    const highlightClasses = highlighted
        ? 'bg-green-100/80 dark:bg-green-900/40 border-green-300/50 dark:border-green-700/50 text-green-800 dark:text-green-300 font-bold'
        : '';

    const elevationClass = elevated && !isActive
        ? 'shadow-md hover:shadow-lg'
        : isActive ? 'shadow-sm' : '';

    const roundedClass = 'rounded-sq-xs'; // M3 spec: 8dp corner radius

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`
                ${baseClasses}
                ${highlightClasses || typeClasses[type] || typeClasses.suggestion}
                ${elevationClass}
                ${roundedClass}
                ${className}
            `.trim()}
        >
            {/* Filter checkmark */}
            {type === 'filter' && isActive && (
                <span className="material-symbols-outlined text-[16px] -ml-0.5 font-bold">check</span>
            )}

            {/* Leading icon */}
            {leadingIcon && (
                <span className="text-[18px] -ml-0.5 flex items-center">
                    {leadingIcon}
                </span>
            )}

            {/* Label — M3: Label large (14sp medium) */}
            <span className="truncate leading-none">{label}</span>

            {/* Input trailing dismiss */}
            {type === 'input' && onDismiss && (
                <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => { e.stopPropagation(); onDismiss(); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onDismiss(); } }}
                    className="material-symbols-outlined text-[16px] -mr-0.5 hover:text-[#1a100f] dark:hover:text-white cursor-pointer"
                >
                    close
                </span>
            )}
        </button>
    );
});

M3Chip.displayName = 'M3Chip';

/**
 * M3ChipSet — Container for a group of chips
 * Handles layout and scrolling per M3 spec
 */
export const M3ChipSet = memo(({ children, className = '', scrollable = false }) => (
    <div
        className={`flex flex-wrap gap-2 ${scrollable ? 'overflow-x-auto scrollbar-none flex-nowrap' : ''} ${className}`}
        role="listbox"
    >
        {children}
    </div>
));

M3ChipSet.displayName = 'M3ChipSet';

export default M3Chip;
