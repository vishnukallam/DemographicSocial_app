import React, { memo, useState, useRef, useId } from 'react';

/**
 * M3 Text Field — Material Design 3 Input Component
 * 
 * M3 Spec (Outlined):
 * - Height: 56dp
 * - Corner radius: 4dp top (per spec), we use sq-xs for consistency
 * - Label: 12sp when focused/filled (floats), 16sp when empty
 * - Supporting text: 12sp below field
 * - Leading/trailing icons: 24dp, on-surface-variant
 * - Error state: error container + supporting text
 * 
 * M3 Spec (Filled):
 * - Height: 56dp
 * - Container: surface-container-highest
 * - Active indicator: 1dp bottom border (2dp when focused)
 * - Corner radius: 4dp top only
 * 
 * @param {string} label - Float label text
 * @param {string} value - Input value
 * @param {function} onChange - Change handler
 * @param {string} type - Input type
 * @param {string} variant - 'outlined' | 'filled'
 * @param {string} leadingIcon - Material icon name
 * @param {string} trailingIcon - Material icon name or element
 * @param {function} onTrailingIconClick - Trailing icon click handler
 * @param {string} supportingText - Helper text below field
 * @param {string} error - Error message (shows error state)
 * @param {boolean} disabled - Whether field is disabled
 * @param {boolean} required - Whether field is required
 * @param {string} placeholder - Placeholder text
 * @param {string} autoComplete - Autocomplete attribute
 * @param {string} className - Additional classes
 * @param {string} name - Input name attribute
 */

const M3TextField = memo(({
    label,
    value = '',
    onChange,
    type = 'text',
    variant = 'filled',
    leadingIcon,
    trailingIcon,
    onTrailingIconClick,
    supportingText,
    error,
    disabled = false,
    required = false,
    placeholder = '',
    autoComplete,
    className = '',
    name,
}) => {
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef(null);
    const id = useId();

    const hasValue = value && value.length > 0;
    const isFloating = isFocused || hasValue;
    const hasError = !!error;

    // Color logic
    const labelColor = hasError
        ? 'text-error'
        : isFocused
            ? 'text-primary dark:text-[#D0BCFF]'
            : 'text-[#49454F] dark:text-[#CAC4D0]';

    const borderColor = hasError
        ? 'border-error ring-error/20'
        : isFocused
            ? 'border-primary dark:border-[#D0BCFF] ring-2 ring-primary/10 dark:ring-[#D0BCFF]/10'
            : 'border-[#79747E] dark:border-[#938F99] hover:border-[#1a100f] dark:hover:border-[#E6E1E5]';

    if (variant === 'filled') {
        return (
            <div className={`flex flex-col gap-1 ${className}`}>
                <div
                    className={`
                        relative h-14 group
                        bg-gray-50 dark:bg-white/5
                        dark:backdrop-blur-md
                        rounded-t-sq-xs
                        cursor-text
                        ${disabled ? 'opacity-38 cursor-not-allowed' : ''}
                    `}
                    onClick={() => inputRef.current?.focus()}
                >
                    {/* Leading icon */}
                    {leadingIcon && (
                        <span className={`material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-xl ${labelColor}`}>
                            {leadingIcon}
                        </span>
                    )}

                    {/* Floating label */}
                    <label
                        htmlFor={id}
                        className={`
                            absolute transition-all duration-200 pointer-events-none
                            ${leadingIcon ? 'left-11' : 'left-4'}
                            ${isFloating
                                ? 'top-2 text-xs font-medium'
                                : 'top-1/2 -translate-y-1/2 text-base font-normal'
                            }
                            ${labelColor}
                        `}
                    >
                        {label}{required && ' *'}
                    </label>

                    {/* Input */}
                    <input
                        ref={inputRef}
                        id={id}
                        type={type}
                        name={name}
                        value={value}
                        onChange={onChange}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        disabled={disabled}
                        required={required}
                        placeholder={isFloating ? placeholder : ''}
                        autoComplete={autoComplete}
                        className={`
                            w-full h-full bg-transparent border-none outline-none
                            ${leadingIcon ? 'pl-11' : 'pl-4'}
                            ${trailingIcon ? 'pr-11' : 'pr-4'}
                            pt-5 pb-1
                            text-base font-medium
                            text-[#1a100f] dark:text-[#E6E1E5]
                            placeholder-[#49454F]/50 dark:placeholder-[#CAC4D0]/50
                            caret-primary dark:caret-[#D0BCFF]
                        `}
                    />

                    {/* Trailing icon */}
                    {trailingIcon && (
                        <button
                            type="button"
                            tabIndex={-1}
                            onClick={onTrailingIconClick}
                            className={`absolute right-3 top-1/2 -translate-y-1/2 text-[#49454F] dark:text-[#CAC4D0] hover:text-[#1a100f] dark:hover:text-[#E6E1E5] transition-colors`}
                        >
                            <span className="material-symbols-outlined text-xl">{trailingIcon}</span>
                        </button>
                    )}

                    {/* Active indicator (bottom line) */}
                    <div
                        className={`
                            absolute bottom-0 left-0 right-0
                            transition-all duration-200
                            ${hasError
                                ? 'h-[2px] bg-error'
                                : isFocused
                                    ? 'h-[2px] bg-primary dark:bg-[#D0BCFF]'
                                    : 'h-[1px] bg-[#49454F] dark:bg-[#938F99]'
                            }
                        `}
                    />
                </div>

                {/* Supporting text / Error */}
                {(supportingText || hasError) && (
                    <p className={`text-xs font-medium ml-4 ${hasError ? 'text-error' : 'text-[#49454F] dark:text-[#CAC4D0]'}`}>
                        {hasError ? error : supportingText}
                    </p>
                )}
            </div>
        );
    }

    // Outlined variant
    return (
        <div className={`flex flex-col gap-1 ${className}`}>
            <div
                className={`
                    relative h-14 group
                    cursor-text
                    ${disabled ? 'opacity-38 cursor-not-allowed' : ''}
                `}
                onClick={() => inputRef.current?.focus()}
            >
                {/* Leading icon */}
                {leadingIcon && (
                    <span className={`material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-xl z-10 ${labelColor}`}>
                        {leadingIcon}
                    </span>
                )}

                {/* Outlined border container */}
                <div
                    className={`
                        absolute inset-0 rounded-sq-xs border
                        transition-all duration-200
                        ${borderColor}
                    `}
                />

                {/* Floating label with notch */}
                <label
                    htmlFor={id}
                    className={`
                        absolute transition-all duration-200 pointer-events-none z-10
                        ${leadingIcon ? 'left-11' : 'left-4'}
                        ${isFloating
                            ? '-top-2.5 text-xs font-medium px-1 bg-white/40 dark:bg-[#141218]/40 backdrop-blur-md rounded-md'
                            : 'top-1/2 -translate-y-1/2 text-base font-normal'
                        }
                        ${labelColor}
                    `}
                >
                    {label}{required && ' *'}
                </label>

                {/* Input */}
                <input
                    ref={inputRef}
                    id={id}
                    type={type}
                    name={name}
                    value={value}
                    onChange={onChange}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    disabled={disabled}
                    required={required}
                    placeholder={isFloating ? placeholder : ''}
                    autoComplete={autoComplete}
                    className={`
                        w-full h-full bg-transparent border-none outline-none
                        ${leadingIcon ? 'pl-11' : 'pl-4'}
                        ${trailingIcon ? 'pr-11' : 'pr-4'}
                        text-base font-medium
                        text-[#1a100f] dark:text-[#E6E1E5]
                        placeholder-[#49454F]/50 dark:placeholder-[#CAC4D0]/50
                        caret-primary dark:caret-[#D0BCFF]
                        rounded-sq-xs
                    `}
                />

                {/* Trailing icon */}
                {trailingIcon && (
                    <button
                        type="button"
                        tabIndex={-1}
                        onClick={onTrailingIconClick}
                        className={`absolute right-3 top-1/2 -translate-y-1/2 z-10 text-[#49454F] dark:text-[#CAC4D0] hover:text-[#1a100f] dark:hover:text-[#E6E1E5] transition-colors`}
                    >
                        <span className="material-symbols-outlined text-xl">{trailingIcon}</span>
                    </button>
                )}
            </div>

            {/* Supporting text / Error */}
            {(supportingText || hasError) && (
                <p className={`text-xs font-medium ml-4 ${hasError ? 'text-error' : 'text-[#49454F] dark:text-[#CAC4D0]'}`}>
                    {hasError ? error : supportingText}
                </p>
            )}
        </div>
    );
});

M3TextField.displayName = 'M3TextField';

export default M3TextField;
