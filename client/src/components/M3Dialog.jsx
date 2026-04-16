import React, { memo, useEffect, useCallback, useRef } from 'react';

/**
 * M3 Dialog — Material Design 3 Dialog/Modal
 * 
 * M3 Spec:
 * - Min width: 280dp, max width: 560dp
 * - Corner radius: 28dp (sq-2xl)
 * - Surface container highest background
 * - Headline: 24sp, supporting text: 14sp
 * - Actions: right-aligned text buttons
 * - Scrim: black at 32% opacity
 * 
 * @param {boolean} open - Whether dialog is visible
 * @param {function} onClose - Close handler
 * @param {string} icon - Optional leading Material icon name
 * @param {string} headline - Dialog title
 * @param {React.ReactNode} children - Dialog body content
 * @param {Array} actions - Action buttons: [{ label, onClick, variant }]
 * @param {boolean} dismissible - Whether clicking scrim closes dialog
 * @param {string} className - Additional classes
 */

const M3Dialog = memo(({
    open = false,
    onClose,
    icon,
    headline,
    children,
    actions = [],
    dismissible = true,
    className = '',
}) => {
    const dialogRef = useRef(null);

    // Escape key handler
    useEffect(() => {
        if (!open) return;
        const handleEsc = (e) => {
            if (e.key === 'Escape' && dismissible) onClose?.();
        };
        document.addEventListener('keydown', handleEsc);
        return () => document.removeEventListener('keydown', handleEsc);
    }, [open, dismissible, onClose]);

    // Lock body scroll when open
    useEffect(() => {
        if (open) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [open]);

    // Focus trap
    useEffect(() => {
        if (open && dialogRef.current) {
            dialogRef.current.focus();
        }
    }, [open]);

    const handleScrimClick = useCallback(() => {
        if (dismissible) onClose?.();
    }, [dismissible, onClose]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Scrim — M3: black at 32% opacity */}
            <div
                className="absolute inset-0 bg-black/32 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={handleScrimClick}
            />

            {/* Dialog container */}
            <div
                ref={dialogRef}
                tabIndex={-1}
                role="dialog"
                aria-modal="true"
                aria-labelledby={headline ? 'm3-dialog-headline' : undefined}
                className={`
                    relative z-10
                    w-full min-w-[280px] max-w-[560px]
                    bg-white dark:bg-white/5 dark:backdrop-blur-xl
                    border border-gray-200 dark:border-white/10
                    rounded-sq-2xl
                    shadow-[0_8px_32px_rgba(0,0,0,0.24)]
                    p-6
                    animate-in fade-in zoom-in-95 duration-200
                    outline-none
                    ${className}
                `}
            >
                {/* Icon (optional) */}
                {icon && (
                    <div className="flex justify-center mb-4">
                        <span className="material-symbols-outlined text-[24px] text-primary dark:text-[#D0BCFF]">
                            {icon}
                        </span>
                    </div>
                )}

                {/* Headline — M3: 24sp */}
                {headline && (
                    <h2
                        id="m3-dialog-headline"
                        className={`text-2xl font-bold text-[#1a100f] dark:text-[#E6E1E5] ${icon ? 'text-center' : ''} mb-4`}
                    >
                        {headline}
                    </h2>
                )}

                {/* Supporting text / body */}
                <div className="text-sm text-[#49454F] dark:text-[#CAC4D0] leading-relaxed mb-6">
                    {children}
                </div>

                {/* Actions — M3: right-aligned text buttons */}
                {actions.length > 0 && (
                    <div className="flex justify-end gap-2">
                        {actions.map((action, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={action.onClick}
                                className={`
                                    px-4 py-2.5 rounded-sq-lg text-sm font-bold
                                    transition-all duration-200 active:scale-[0.97]
                                    ${action.variant === 'filled'
                                        ? 'bg-primary dark:bg-[#D0BCFF] text-white dark:text-[#381E72] hover:brightness-110 shadow-sm'
                                        : action.variant === 'tonal'
                                            ? 'bg-primary/12 dark:bg-[#D0BCFF]/16 text-primary dark:text-[#D0BCFF] hover:bg-primary/16'
                                            : 'text-primary dark:text-[#D0BCFF] hover:bg-primary/8 dark:hover:bg-[#D0BCFF]/8'
                                    }
                                `}
                            >
                                {action.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
});

M3Dialog.displayName = 'M3Dialog';

export default M3Dialog;
