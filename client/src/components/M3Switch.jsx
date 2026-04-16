import React, { memo, useId } from 'react';

/**
 * M3 Switch — Material Design 3 Toggle Switch
 * 
 * M3 Spec:
 * - Track: 52x32dp, 16dp corner radius (full round)
 * - Thumb: 24dp when off (inset), 28dp when on (expanded)
 * - Icon: optional check/X inside thumb
 * - States: enabled, disabled, focused, pressed
 * 
 * @param {boolean} checked - Whether switch is on
 * @param {function} onChange - Change handler
 * @param {boolean} disabled - Whether switch is disabled
 * @param {boolean} showIcons - Show check/X icons in thumb
 * @param {string} label - Accessible label text
 * @param {string} className - Additional classes
 */

const M3Switch = memo(({
    checked = false,
    onChange,
    disabled = false,
    showIcons = false,
    iconOn,
    iconOff,
    label,
    className = '',
}) => {
    const id = useId();

    return (
        <label
            htmlFor={id}
            className={`inline-flex items-center gap-3 cursor-pointer select-none ${disabled ? 'opacity-38 cursor-not-allowed' : ''} ${className}`}
        >
            {/* Track + Thumb */}
            <div className="relative">
                <input
                    id={id}
                    type="checkbox"
                    checked={checked}
                    onChange={onChange}
                    disabled={disabled}
                    className="sr-only peer"
                    role="switch"
                    aria-checked={checked}
                    aria-label={label}
                />

                {/* Track — M3: 52x32dp */}
                <div
                    className={`
                        w-[52px] h-[32px] rounded-sq-lg
                        transition-colors duration-200 ease-[cubic-bezier(0.2,0,0,1)]
                        border-2
                        ${checked
                            ? 'bg-primary dark:bg-[#D0BCFF] border-primary dark:border-[#D0BCFF]'
                            : 'bg-[#E7E0EC] dark:bg-[#49454F] border-[#79747E] dark:border-[#938F99]'
                        }
                        ${!disabled && !checked ? 'hover:border-[#49454F] dark:hover:border-[#CAC4D0]' : ''}
                    `}
                />

                {/* Thumb — M3: 24dp off, 28dp on */}
                <div
                    className={`
                        absolute top-1/2 -translate-y-1/2
                        rounded-sq-md

                        flex items-center justify-center
                        transition-all duration-200 ease-[cubic-bezier(0.2,0,0,1)]
                        ${checked
                            ? 'w-7 h-7 left-[23px] bg-white dark:bg-[#381E72] shadow-md'
                            : 'w-5 h-5 left-[6px] bg-[#79747E] dark:bg-[#938F99]'
                        }
                        ${!disabled && !checked ? 'group-hover:bg-[#49454F]' : ''}
                    `}
                >
                    {/* Icon inside thumb */}
                    {(showIcons || iconOn) && checked && (
                        <span className="material-symbols-outlined text-[14px] text-primary dark:text-[#D0BCFF] font-bold">
                            {iconOn || 'check'}
                        </span>
                    )}
                    {(showIcons || iconOff) && !checked && (
                        <span className="material-symbols-outlined text-[14px] text-white dark:text-[#1C1B1F] font-bold">
                            {iconOff || 'close'}
                        </span>
                    )}
                </div>
            </div>

            {/* Label */}
            {label && (
                <span className="text-sm font-bold text-[#1a100f] dark:text-[#E6E1E5]">
                    {label}
                </span>
            )}
        </label>
    );
});

M3Switch.displayName = 'M3Switch';

export default M3Switch;
