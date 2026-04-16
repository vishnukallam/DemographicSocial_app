import React, { memo, useEffect, useState, useCallback, useRef } from 'react';

/**
 * M3 Bottom Sheet — Material Design 3 Bottom Sheet
 * 
 * M3 Spec:
 * - Corner radius: 28dp top corners
 * - Drag handle: 32x4dp, on-surface-variant at 40% opacity
 * - Surface container low background
 * - Max height: 90vh
 * - Scrim: black at 32% when modal
 * - Drag to dismiss
 * 
 * @param {boolean} open - Whether sheet is visible
 * @param {function} onClose - Close handler
 * @param {React.ReactNode} children - Sheet content
 * @param {boolean} modal - Whether to show scrim behind
 * @param {string} className - Additional classes
 */

const M3BottomSheet = memo(({
    open = false,
    onClose,
    children,
    modal = true,
    className = '',
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const [dragY, setDragY] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const sheetRef = useRef(null);
    const startYRef = useRef(0);

    useEffect(() => {
        if (open) {
            setIsVisible(true);
            requestAnimationFrame(() => setIsAnimating(true));
        } else {
            setIsAnimating(false);
            const timer = setTimeout(() => setIsVisible(false), 300);
            return () => clearTimeout(timer);
        }
    }, [open]);

    // Lock body scroll
    useEffect(() => {
        if (open && modal) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [open, modal]);

    // Drag handling
    const handleDragStart = useCallback((e) => {
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        startYRef.current = clientY;
        setIsDragging(true);
    }, []);

    const handleDragMove = useCallback((e) => {
        if (!isDragging) return;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const diff = clientY - startYRef.current;
        if (diff > 0) {
            setDragY(diff);
        }
    }, [isDragging]);

    const handleDragEnd = useCallback(() => {
        setIsDragging(false);
        if (dragY > 100) {
            onClose?.();
        }
        setDragY(0);
    }, [dragY, onClose]);

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-[9998]">
            {/* Scrim */}
            {modal && (
                <div
                    className={`absolute inset-0 bg-black/32 transition-opacity duration-300 ${isAnimating ? 'opacity-100' : 'opacity-0'}`}
                    onClick={onClose}
                />
            )}

            {/* Sheet */}
            <div
                ref={sheetRef}
                className={`
                    absolute bottom-0 left-0 right-0
                    bg-white dark:bg-white/5 dark:backdrop-blur-xl
                    border-t border-gray-200 dark:border-white/10
                    max-h-[90vh]
                    overflow-hidden
                    transition-transform duration-300 ease-[cubic-bezier(0.2,0,0,1)]
                    ${isAnimating && !isDragging ? 'translate-y-0' : !isAnimating ? 'translate-y-full' : ''}
                    ${className}
                `}
                style={{
                    borderTopLeftRadius: '28px',
                    borderTopRightRadius: '28px',
                    transform: isDragging ? `translateY(${dragY}px)` : undefined,
                }}
                onTouchStart={handleDragStart}
                onTouchMove={handleDragMove}
                onTouchEnd={handleDragEnd}
                onMouseDown={handleDragStart}
                onMouseMove={handleDragMove}
                onMouseUp={handleDragEnd}
                onMouseLeave={() => { if (isDragging) handleDragEnd(); }}
            >
                {/* Drag handle — M3: 32x4dp */}
                <div className="flex justify-center py-4 cursor-grab active:cursor-grabbing">
                    <div className="w-8 h-1 rounded-full bg-[#49454F]/40 dark:bg-[#CAC4D0]/40" />
                </div>

                {/* Content */}
                <div className="overflow-y-auto max-h-[calc(90vh-48px)] px-6 pb-8 custom-scrollbar">
                    {children}
                </div>
            </div>
        </div>
    );
});

M3BottomSheet.displayName = 'M3BottomSheet';

export default M3BottomSheet;
