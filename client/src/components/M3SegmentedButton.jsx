import React, { memo } from 'react';

/**
 * M3 Segmented Button — Material Design 3 Segmented Button Group
 * 
 * M3 Spec:
 * - Height: 40dp
 * - Corner radius: 20dp (full round on ends, 0 on middle)
 * - Selected: secondary-container fill with on-secondary-container text
 * - Unselected: outlined with on-surface text
 * - Checkmark icon on selected segment
 * - Min 2, max 5 segments
 * 
 * @param {Array} segments - Array of { value, label, icon }
 * @param {string} value - Currently selected value
 * @param {function} onChange - Change handler with new value
 * @param {boolean} showIcon - Show checkmark on selected
 * @param {string} className - Additional classes
 * @param {string} size - 'default' | 'compact'
 */

const M3SegmentedButton = memo(({
    segments = [],
    value,
    onChange,
    showIcon = true,
    className = '',
    size = 'default',
}) => {
    const heightClass = size === 'compact' ? 'h-9' : 'h-10';

    return (
        <div
            className={`inline-flex squircle overflow-hidden shadow-sm bg-white border border-gray-200 dark:bg-white/5 dark:backdrop-blur-xl dark:border-white/10 ${className}`}
            role="group"
        >
            {segments.map((segment, index) => {
                const isSelected = segment.value === value;
                const isFirst = index === 0;
                // No individual border radius needed due to container overflow

                return (
                    <button
                        key={segment.value}
                        type="button"
                        onClick={() => onChange?.(segment.value)}
                        className={`
                            ${heightClass} px-4
                            inline-flex items-center justify-center gap-2
                            text-sm font-bold tracking-wide
                            border-r-[0.5px] border-white/20 last:border-r-0
                            transition-all duration-200 active:scale-[0.98]
                            ${isSelected
                                ? 'bg-primary/10 border-primary/20 dark:bg-primary/20 dark:border-transparent text-primary dark:text-[#D0BCFF] z-10 relative dark:backdrop-blur-xl shadow-[inset_0_0_10px_rgba(255,255,255,0.1)]'
                                : 'bg-gray-100 dark:bg-white/5 text-[#1a100f] dark:text-[#E6E1E5] hover:bg-gray-200 dark:hover:bg-white/10 dark:backdrop-blur-md'
                            }
                        `}
                        aria-pressed={isSelected}
                    >
                        {/* Checkmark for selected */}
                        {/* Checkmark removed as requested */}
                        {/* {isSelected && showIcon && (
                            <span className="material-symbols-outlined text-[16px] font-bold">check</span>
                        )} */}

                        {/* Icon */}
                        {segment.icon && !isSelected && (
                            <span className="material-symbols-outlined text-[18px]">{segment.icon}</span>
                        )}

                        {/* Label */}
                        <span>{segment.label}</span>
                    </button>
                );
            })}
        </div>
    );
});

M3SegmentedButton.displayName = 'M3SegmentedButton';

export default M3SegmentedButton;
