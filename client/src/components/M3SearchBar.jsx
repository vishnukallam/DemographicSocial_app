import React, { useState, useRef, useEffect, memo, useCallback } from 'react';

/**
 * M3 Search Bar — Material Design 3 Search Component
 * 
 * M3 Spec:
 * - Height: 56dp
 * - Corner radius: 28dp (fully rounded)
 * - Surface container highest background
 * - Leading icon: search (24dp)
 * - Trailing icon: avatar or action (optional)
 * - Suggestions: surface container, 8dp corners, elevation 2
 * 
 * @param {string} value - Search input value
 * @param {function} onChange - Input change handler
 * @param {function} onFocus - Focus handler
 * @param {function} onClear - Clear handler
 * @param {string} placeholder - Placeholder text
 * @param {Array} suggestions - Array of suggestion objects
 * @param {function} onSuggestionSelect - Handler when suggestion is selected
 * @param {function} renderSuggestion - Custom suggestion renderer
 * @param {React.ReactNode} trailingElement - Trailing element (avatar, icon)
 * @param {boolean} showSuggestions - Whether to show suggestions dropdown
 * @param {string} className - Additional classes
 */

const M3SearchBar = memo(({
    value = '',
    onChange,
    onFocus,
    onClear,
    placeholder = 'Search',
    suggestions = [],
    onSuggestionSelect,
    renderSuggestion,
    trailingElement,
    showSuggestions = false,
    className = '',
    autoFocus = false,
}) => {
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef(null);
    const containerRef = useRef(null);

    // Close suggestions on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsFocused(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleFocus = useCallback(() => {
        setIsFocused(true);
        onFocus?.();
    }, [onFocus]);

    const handleClear = useCallback(() => {
        onClear?.();
        inputRef.current?.focus();
    }, [onClear]);

    const hasSuggestions = showSuggestions && suggestions.length > 0 && isFocused;

    return (
        <div ref={containerRef} className={`relative w-full ${className}`}>
            {/* Search Bar Container — M3: 56dp height, squircle */}
            <div
                className={`
                    flex items-center h-14 px-4 gap-3
                    bg-white/10 dark:bg-[#1C1B1F]/10
                    backdrop-blur-2xl
                    rounded-sq-xl
                    shadow-xl
                    border-[0.5px] border-white/30 dark:border-white/10
                    transition-all duration-300
                    ${isFocused
                        ? 'border-white/60 shadow-[0_0_20px_rgba(255,255,255,0.15)]'
                        : 'hover:border-white/50 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]'
                    }
                `}
                style={hasSuggestions ? { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderBottom: 'none' } : {}}
            >
                {/* Leading search icon — M3: 24dp */}
                <span className={`material-symbols-outlined text-2xl transition-colors duration-200 ${isFocused ? 'text-primary dark:text-[#D0BCFF]' : 'text-[#49454F] dark:text-[#CAC4D0]'}`}>
                    search
                </span>

                {/* Input */}
                <input
                    ref={inputRef}
                    type="text"
                    value={value}
                    onChange={onChange}
                    onFocus={handleFocus}
                    placeholder={placeholder}
                    autoFocus={autoFocus}
                    className={`
                        flex-1 bg-transparent border-none outline-none ring-0
                        text-base font-medium
                        text-[#1a100f] dark:text-[#E6E1E5]
                        placeholder-[#49454F] dark:placeholder-[#CAC4D0]
                        caret-primary dark:caret-[#D0BCFF]
                        focus:ring-0 focus:outline-none focus:border-none
                    `}
                />

                {/* Clear button — shows when value exists */}
                {value && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="w-8 h-8 flex items-center justify-center rounded-sq-sm
                            text-[#49454F] dark:text-[#CAC4D0]
                            hover:bg-[#1a100f]/8 dark:hover:bg-[#E6E1E5]/8
                            active:bg-[#1a100f]/12 dark:active:bg-[#E6E1E5]/12
                            transition-colors"
                    >
                        <span className="material-symbols-outlined text-xl">close</span>
                    </button>
                )}

                {/* Trailing element (avatar, etc.) */}
                {trailingElement && (
                    <div className="flex items-center">
                        {trailingElement}
                    </div>
                )}
            </div>

            {/* Suggestions dropdown — M3: surface container, elevation 2 */}
            {hasSuggestions && (
                <div
                    className="
                        absolute left-0 right-0 top-full z-50
                        bg-white/10 dark:bg-[#1C1B1F]/10
                        backdrop-blur-2xl
                        shadow-2xl
                        border-[0.5px] border-t-0 border-white/30 dark:border-white/10
                        overflow-hidden
                        animate-in fade-in slide-in-from-top-1
                        max-h-[320px] overflow-y-auto
                    "
                    style={{ borderBottomLeftRadius: '28px', borderBottomRightRadius: '28px' }}
                >
                    {/* Subtle divider */}
                    <div className="mx-4 border-t border-gray-100 dark:border-[#49454F]/50" />

                    {suggestions.map((item, index) => (
                        renderSuggestion ? (
                            renderSuggestion(item, index, () => {
                                onSuggestionSelect?.(item);
                                setIsFocused(false);
                            })
                        ) : (
                            <button
                                key={item.id || index}
                                onClick={() => {
                                    onSuggestionSelect?.(item);
                                    setIsFocused(false);
                                }}
                                className="
                                    w-full text-left px-4 py-3
                                    flex items-center gap-3
                                    hover:bg-primary/8 dark:hover:bg-[#D0BCFF]/8
                                    active:bg-primary/12 dark:active:bg-[#D0BCFF]/12
                                    transition-colors
                                "
                            >
                                <span className="material-symbols-outlined text-xl text-[#49454F] dark:text-[#CAC4D0]">
                                    location_on
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-[#1a100f] dark:text-[#E6E1E5] truncate">
                                        {item.primary || item.display_name?.split(',')[0]}
                                    </p>
                                    {(item.secondary || item.display_name) && (
                                        <p className="text-xs text-[#49454F] dark:text-[#CAC4D0] truncate">
                                            {item.secondary || item.display_name}
                                        </p>
                                    )}
                                </div>
                            </button>
                        )
                    ))}
                </div>
            )}
        </div>
    );
});

M3SearchBar.displayName = 'M3SearchBar';

export default M3SearchBar;
