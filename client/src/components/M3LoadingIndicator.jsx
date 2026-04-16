import React, { useEffect, useRef, useMemo, memo } from 'react';

/**
 * M3 Loading Indicator
 * 
 * Faithful implementation of Google's Material Design 3 loading indicator.
 * Morphs between 7 organic shapes (starburst → scalloped → pentagon → circle → flower → blob → egg)
 * with continuous rotation and subtle scale breathing.
 * 
 * @param {number} size - Indicator size in px (default 48, per M3 spec)
 * @param {string} className - Additional CSS classes
 * @param {number} speed - Animation speed multiplier (default 1)
 * @param {string} label - Accessibility label
 * @param {string} variant - 'primary' | 'onSurface' | 'white' (color variant)
 */

const NUM_POINTS = 24;
const ANGLE_STEP = (2 * Math.PI) / NUM_POINTS;

// 7 keyframe shapes from M3 design kit (each maps point index → radius from center)
const SHAPE_FNS = [
    // 1. Starburst — sharp 12-pointed star
    (i, a) => i % 2 === 0 ? 48 : 30,
    // 2. Scalloped — softer 12-bump circle
    (i, a) => i % 2 === 0 ? 47 : 38,
    // 3. Soft pentagon — 5-fold symmetry, subtle
    (i, a) => 44 + 3.5 * Math.cos(5 * a),
    // 4. Near-circle — smooth
    (i, _a) => 46,
    // 5. Star flower — 6 rounded petals, pronounced
    (i, a) => 40 + 8 * Math.cos(6 * a),
    // 6. 4-lobe organic blob — offset for asymmetry
    (i, a) => 41 + 8 * Math.cos(4 * a + 0.4),
    // 7. Egg / tilted oval — elongated in one direction
    (i, a) => 43 + 6 * Math.cos(a),
];

// Pre-compute polygon points for a shape function
const computeShape = (fn) => {
    const points = [];
    for (let i = 0; i < NUM_POINTS; i++) {
        const a = i * ANGLE_STEP;
        const r = fn(i, a);
        points.push([50 + r * Math.cos(a), 50 + r * Math.sin(a)]);
    }
    return points;
};

// Cubic ease-in-out for smooth shape transitions
const easeInOutCubic = (t) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

// Color class map
const VARIANT_CLASSES = {
    primary: 'bg-primary dark:bg-[#D0BCFF]',
    onSurface: 'bg-[#1a100f] dark:bg-[#E6E1E5]',
    white: 'bg-white',
};

const M3LoadingIndicator = memo(({
    size = 48,
    className = '',
    speed = 1,
    label = 'Loading',
    variant = 'primary',
}) => {
    const shapeRef = useRef(null);
    const animRef = useRef();

    // Pre-compute all 7 shape point-arrays once
    const shapes = useMemo(() => SHAPE_FNS.map(computeShape), []);

    useEffect(() => {
        const el = shapeRef.current;
        if (!el) return;

        const morphCycle = 2800 / speed;   // ms for full 7-shape cycle
        const rotPerMs = 0.09 * speed;     // degrees per ms (~360° per 4s)
        let t0 = null;

        const tick = (ts) => {
            if (!t0) t0 = ts;
            const dt = ts - t0;

            // Shape morph progress
            const p = (dt % morphCycle) / morphCycle;
            const raw = p * shapes.length;
            const fi = Math.floor(raw) % shapes.length;
            const ti = (fi + 1) % shapes.length;
            const frac = easeInOutCubic(raw - Math.floor(raw));

            // Interpolate polygon points
            const from = shapes[fi];
            const to = shapes[ti];
            const poly = from
                .map(([fx, fy], j) => {
                    const [tx, ty] = to[j];
                    const x = fx + (tx - fx) * frac;
                    const y = fy + (ty - fy) * frac;
                    return `${x.toFixed(1)}% ${y.toFixed(1)}%`;
                })
                .join(', ');

            // Continuous rotation + subtle scale breathing
            const rot = (dt * rotPerMs) % 360;
            const scale = 1 + 0.025 * Math.sin(dt * 0.002);

            el.style.clipPath = `polygon(${poly})`;
            el.style.transform = `rotate(${rot.toFixed(1)}deg) scale(${scale.toFixed(3)})`;

            animRef.current = requestAnimationFrame(tick);
        };

        animRef.current = requestAnimationFrame(tick);

        return () => {
            if (animRef.current) cancelAnimationFrame(animRef.current);
        };
    }, [shapes, speed]);

    const colorClass = VARIANT_CLASSES[variant] || VARIANT_CLASSES.primary;

    return (
        <div
            className={`inline-flex items-center justify-center ${className}`}
            style={{ width: size, height: size }}
            role="progressbar"
            aria-label={label}
        >
            <div
                ref={shapeRef}
                className={`w-full h-full ${colorClass}`}
                style={{ willChange: 'clip-path, transform' }}
            />
        </div>
    );
});

M3LoadingIndicator.displayName = 'M3LoadingIndicator';

export default M3LoadingIndicator;
