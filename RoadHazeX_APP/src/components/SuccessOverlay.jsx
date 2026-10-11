import React, { useEffect, useState } from 'react';

// Specific colors from the user's image
const COLORS = [
    '#FF4D6D', // Pink/Red
    '#FFB703', // Yellow
    '#219EBC', // Blue
    '#8E44AD', // Purple
    '#48CAE4', // Light Blue
];

const SuccessOverlay = ({ visible, hazardData, onDone }) => {
    const [animationStarted, setAnimationStarted] = useState(false);

    useEffect(() => {
        if (visible) {
            setAnimationStarted(true);
            const timer = setTimeout(() => {
                setAnimationStarted(false);
                onDone && onDone();
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [visible, onDone]);

    if (!visible) return null;

    // Generate burst particles
    const particles = Array.from({ length: 15 }, (_, i) => {
        const angle = (i / 15) * 360 + (Math.random() * 20 - 10);
        const distance = 80 + Math.random() * 100;
        const color = COLORS[i % COLORS.length];
        const isSquiggle = i % 3 === 0;
        const duration = 0.6 + Math.random() * 0.4;
        const delay = Math.random() * 0.2;

        return { id: i, angle, distance, color, isSquiggle, duration, delay };
    });

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 99999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(8px)',
                animation: 'fade-in 0.3s ease-out forwards',
            }}
        >
            <style>{`
                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes pop-check {
                    0% { transform: scale(0); opacity: 0; }
                    70% { transform: scale(1.1); }
                    100% { transform: scale(1); opacity: 1; }
                }
                @keyframes draw-check {
                    from { stroke-dashoffset: 100; }
                    to { stroke-dashoffset: 0; }
                }
                @keyframes burst-particle {
                    0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
                    20% { opacity: 1; }
                    100% { 
                        transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(1) rotate(var(--rot)); 
                        opacity: 0; 
                    }
                }
            `}</style>

            <div style={{ position: 'relative', width: '200px', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

                {/* Particles */}
                {particles.map((p) => {
                    const tx = Math.cos((p.angle * Math.PI) / 180) * p.distance;
                    const ty = Math.sin((p.angle * Math.PI) / 180) * p.distance;
                    const rot = p.angle + 90;

                    return (
                        <div
                            key={p.id}
                            style={{
                                position: 'absolute',
                                left: '50%',
                                top: '50%',
                                '--tx': `${tx}px`,
                                '--ty': `${ty}px`,
                                '--rot': `${rot}deg`,
                                animation: `burst-particle ${p.duration}s ${p.delay}s ease-out forwards`,
                            }}
                        >
                            {p.isSquiggle ? (
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                    <path
                                        d="M2,10 C5,5 15,15 18,10"
                                        stroke={p.color}
                                        strokeWidth="3"
                                        strokeLinecap="round"
                                    />
                                </svg>
                            ) : (
                                <div
                                    style={{
                                        width: '10px',
                                        height: '10px',
                                        borderRadius: '50%',
                                        background: p.color,
                                    }}
                                />
                            )}
                        </div>
                    );
                })}

                {/* Green Circle */}
                <div
                    style={{
                        width: '120px',
                        height: '120px',
                        borderRadius: '50%',
                        backgroundColor: '#43D98C',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 10px 30px rgba(67, 217, 140, 0.3)',
                        animation: 'pop-check 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
                        zIndex: 2,
                    }}
                >
                    <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
                        <path
                            d="M15 30L25 40L45 20"
                            stroke="white"
                            strokeWidth="6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeDasharray="100"
                            strokeDashoffset="100"
                            style={{
                                animation: 'draw-check 0.4s 0.3s ease-out forwards',
                            }}
                        />
                    </svg>
                </div>
            </div>

            {/* Subtle Label with Hazard details */}
            <div
                style={{
                    position: 'absolute',
                    bottom: '15%',
                    textAlign: 'center',
                    color: '#333',
                    fontFamily: "'Outfit', sans-serif",
                    animation: 'fade-in 0.5s 0.6s ease-out both',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.75rem',
                }}
            >
                {hazardData?.image && (
                    <div style={{
                        width: '64px', height: '64px', borderRadius: '50%',
                        background: `url(${hazardData.image}) center/cover`,
                        border: '3px solid white',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                    }} />
                )}
                <div>
                    <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800' }}>
                        {hazardData?.type ? `${hazardData.type} Reported!` : 'Report Submitted!'}
                    </h2>
                    <p style={{ margin: '5px 0 0', opacity: 0.7, fontWeight: 500 }}>Hazard successfully added to the live map.</p>
                </div>
            </div>
        </div>
    );
};

export default SuccessOverlay;
