import React, { memo, useEffect, useState, useCallback, useRef } from 'react';

/**
 * M3 Snackbar — Material Design 3 Snackbar/Toast
 * 
 * M3 Spec:
 * - Height: min 48dp
 * - Corner radius: 4dp (per spec, we use sq-xs for squircle consistency)
 * - Inverse surface background
 * - Supporting text: 14sp
 * - Action: text button, inverse primary
 * - Max 2 lines, single-line preferred
 * - Duration: 4s (short), 10s (long)
 * - Position: bottom center, 16dp above nav bar
 * 
 * @param {string} message - Snackbar text
 * @param {string} icon - Optional leading icon
 * @param {string} actionLabel - Action button text
 * @param {function} onAction - Action button handler
 * @param {function} onDismiss - Dismiss handler
 * @param {number} duration - Auto-dismiss in ms (0 = persistent)
 * @param {string} variant - 'default' | 'success' | 'error' | 'info'
 * @param {boolean} show - Whether snackbar is visible
 */

const VARIANT_MAP = {
    default: {
        bg: 'bg-white/10 dark:bg-[#1C1B1F]/10 backdrop-blur-2xl border-[0.5px] border-white/30 dark:border-white/10 shadow-2xl',
        text: 'text-[#1a100f] dark:text-[#E6E1E5]',
        action: 'text-primary dark:text-[#D0BCFF]',
        icon: 'text-gray-500 dark:text-[#E6E1E5]/70'
    },
    success: {
        bg: 'bg-white/10 dark:bg-[#1C1B1F]/10 backdrop-blur-2xl border-[0.5px] border-green-500/50 dark:border-green-400/50 shadow-2xl',
        text: 'text-green-800 dark:text-green-300',
        action: 'text-green-700 dark:text-green-200',
        icon: 'text-green-600 dark:text-green-400'
    },
    error: {
        bg: 'bg-white/10 dark:bg-[#1C1B1F]/10 backdrop-blur-2xl border-[0.5px] border-red-500/50 dark:border-red-400/50 shadow-2xl',
        text: 'text-red-600 dark:text-red-300',
        action: 'text-red-500 dark:text-red-200',
        icon: 'text-red-500 dark:text-red-400'
    },
    info: {
        bg: 'bg-white/10 dark:bg-[#1C1B1F]/10 backdrop-blur-2xl border-[0.5px] border-primary/30 dark:border-[#D0BCFF]/30 shadow-2xl',
        text: 'text-[#1a100f] dark:text-[#E6E1E5]',
        action: 'text-primary dark:text-[#D0BCFF]',
        icon: 'text-primary dark:text-[#D0BCFF]'
    },
    routeError: {
        bg: 'bg-white/10 dark:bg-[#1C1B1F]/10 backdrop-blur-2xl border-[0.5px] border-red-500/50 dark:border-[#D0BCFF]/50 shadow-2xl',
        text: 'text-red-600 dark:text-[#D0BCFF]',
        action: 'text-red-600 dark:text-[#D0BCFF]',
        icon: 'text-red-600 dark:text-[#D0BCFF]'
    }
};

const M3Snackbar = memo(({
    message,
    icon,
    actionLabel,
    onAction,
    onDismiss,
    duration = 4000,
    variant = 'default',
    show = false,
}) => {
    const [visible, setVisible] = useState(false);
    const [exiting, setExiting] = useState(false);
    const timeoutRef = useRef(null);

    const dismiss = useCallback(() => {
        setExiting(true);
        setTimeout(() => {
            setVisible(false);
            setExiting(false);
            onDismiss?.();
        }, 200);
    }, [onDismiss]);

    useEffect(() => {
        if (show) {
            setVisible(true);
            setExiting(false);

            if (duration > 0) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = setTimeout(dismiss, duration);
            }
        } else {
            if (visible) dismiss();
        }

        return () => clearTimeout(timeoutRef.current);
    }, [show, duration, dismiss]);

    if (!visible) return null;

    const colors = VARIANT_MAP[variant] || VARIANT_MAP.default;

    return (
        <div
            className={`
                fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-[9998]
                ${exiting ? 'animate-out fade-out slide-out-to-bottom-2 duration-200' : 'animate-in fade-in slide-in-from-bottom-4 duration-300'}
            `}
            role="status"
            aria-live="polite"
        >
            <div
                className={`
                    flex items-center gap-3
                    min-h-[48px] min-w-[288px] max-w-[560px]
                    px-4 py-3
                    rounded-sq-xs
                    shadow-[0_6px_10px_rgba(0,0,0,0.14),0_1px_18px_rgba(0,0,0,0.12)]
                    ${colors.bg}
                `}
            >
                {/* Leading icon */}
                {icon && (
                    <span className={`material-symbols-outlined text-lg shrink-0 ${colors.icon}`}>
                        {icon}
                    </span>
                )}

                {/* Message — M3: 14sp */}
                <span className={`flex-1 text-sm font-medium ${colors.text}`}>
                    {message}
                </span>

                {/* Action button */}
                {actionLabel && (
                    <button
                        type="button"
                        onClick={() => {
                            onAction?.();
                            dismiss();
                        }}
                        className={`
                            shrink-0 px-2 py-1 text-sm font-bold
                            rounded-sq-xs
                            hover:opacity-80 active:opacity-60
                            transition-opacity
                            ${colors.action}
                        `}
                    >
                        {actionLabel}
                    </button>
                )}

                {/* Dismiss (close) button */}
                {!actionLabel && (
                    <button
                        type="button"
                        onClick={dismiss}
                        className={`shrink-0 p-1 rounded-sq-xs hover:opacity-80 transition-opacity ${colors.text}`}
                    >
                        <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                )}
            </div>
        </div>
    );
});

M3Snackbar.displayName = 'M3Snackbar';

export default M3Snackbar;
