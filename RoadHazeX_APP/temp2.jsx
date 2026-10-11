import React, { useState, useRef, useEffect } from 'react';

/* ─── Animated background canvas ─── */
function RoadBg() {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let animId;
        let W = 0, H = 0;
        const particles = [];
        const ripples = [];
        let mouse = { x: -999, y: -999 };
        let offset = 0;

        const resize = () => {
            W = canvas.width = canvas.offsetWidth;
            H = canvas.height = canvas.offsetHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        // Mouse move → spawn ripple
        const onMouseMove = (e) => {
            const rect = canvas.getBoundingClientRect();
            mouse.x = e.clientX - rect.left;
            mouse.y = e.clientY - rect.top;
            if (Math.random() < 0.06) {
                ripples.push({ x: mouse.x, y: mouse.y, r: 0, alpha: 0.45 });
            }
        };
        canvas.addEventListener('mousemove', onMouseMove);

        // Spawn floating hazard particles
        for (let i = 0; i < 70; i++) {
            particles.push({
                x: Math.random() * 800,
                y: Math.random() * 600,
                r: Math.random() * 2.2 + 0.5,
                dx: (Math.random() - 0.5) * 0.35,
                dy: -(Math.random() * 0.55 + 0.15),
                alpha: Math.random() * 0.55 + 0.15,
                hue: Math.random() < 0.5 ? 0 : 30, // red or orange
            });
        }

        const draw = () => {
            ctx.clearRect(0, 0, W, H);

            /* ── Background gradient ── */
            const bg = ctx.createLinearGradient(0, 0, 0, H);
            bg.addColorStop(0, '#0d1b3e');
            bg.addColorStop(0.45, '#1e3c72');
            bg.addColorStop(1, '#0a0f2c');
            ctx.fillStyle = bg;
            ctx.fillRect(0, 0, W, H);

            /* ── Road (perspective trapezoid) ── */
            const roadW = W * 0.58;
            const vanishX = W / 2;
            const vanishY = H * 0.36;
            const leftBottom = W / 2 - roadW / 2;
            const rightBottom = W / 2 + roadW / 2;

            const roadGrad = ctx.createLinearGradient(vanishX, vanishY, vanishX, H);
            roadGrad.addColorStop(0, 'rgba(40,60,110,0)');
            roadGrad.addColorStop(0.3, 'rgba(20,38,80,0.5)');
            roadGrad.addColorStop(1, 'rgba(12,22,60,0.85)');

            ctx.beginPath();
            ctx.moveTo(vanishX, vanishY);
            ctx.lineTo(leftBottom, H);
            ctx.lineTo(rightBottom, H);
            ctx.closePath();
            ctx.fillStyle = roadGrad;
            ctx.fill();

            /* ── Edge lines ── */
            ctx.strokeStyle = 'rgba(255,255,255,0.10)';
            ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(vanishX - 4, vanishY); ctx.lineTo(leftBottom, H); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(vanishX + 4, vanishY); ctx.lineTo(rightBottom, H); ctx.stroke();

            /* ── Moving dashed centre line ── */
            const dashCount = 14;
            ctx.setLineDash([16, 16]);
            ctx.lineDashOffset = -offset;
            for (let i = 0; i < dashCount; i++) {
                const t = i / dashCount;
                const y = vanishY + (H - vanishY) * t;
                const endY = vanishY + (H - vanishY) * ((i + 1) / dashCount);
                const scale = 0.35 + t * 0.65;
                ctx.lineWidth = 2.5 * scale;
                ctx.strokeStyle = `rgba(255,200,80,${0.5 * scale + 0.15})`;
                ctx.beginPath(); ctx.moveTo(vanishX, y); ctx.lineTo(vanishX, endY); ctx.stroke();
            }
            ctx.setLineDash([]);

            /* ── Horizon glow ── */
            const glowGrad = ctx.createRadialGradient(vanishX, vanishY, 0, vanishX, vanishY, H * 0.5);
            glowGrad.addColorStop(0, 'rgba(255,107,107,0.14)');
            glowGrad.addColorStop(0.5, 'rgba(255,142,83,0.06)');
            glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = glowGrad;
            ctx.fillRect(0, 0, W, H);

            /* ── Mouse proximity glow ── */
            if (mouse.x > 0) {
                const mg = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 120);
                mg.addColorStop(0, 'rgba(255,107,107,0.10)');
                mg.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = mg;
                ctx.fillRect(0, 0, W, H);
            }

            /* ── Ripples ── */
            for (let i = ripples.length - 1; i >= 0; i--) {
                const rp = ripples[i];
                ctx.beginPath();
                ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(255,107,107,${rp.alpha})`;
                ctx.lineWidth = 1.2;
                ctx.stroke();
                rp.r += 2.5;
                rp.alpha -= 0.018;
                if (rp.alpha <= 0) ripples.splice(i, 1);
            }

            /* ── Floating particles ── */
            particles.forEach(p => {
                // resize-safe: reset to canvas dims lazily
                if (p.x > W) p.x = Math.random() * W;
                if (p.y > H) p.y = Math.random() * H;

                ctx.save();
                ctx.globalAlpha = p.alpha;
                const gr = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3);
                gr.addColorStop(0, p.hue === 0 ? 'rgba(255,107,107,0.95)' : 'rgba(255,142,83,0.95)');
                gr.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = gr;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();

                p.x += p.dx;
                p.y += p.dy;
                if (p.y < -8) { p.y = H + 8; p.x = Math.random() * W; }
                if (p.x < 0) p.x = W;
                if (p.x > W) p.x = 0;
            });

            offset = (offset + 1.6) % 32;
            animId = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            window.removeEventListener('resize', resize);
            canvas.removeEventListener('mousemove', onMouseMove);
            cancelAnimationFrame(animId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'absolute', inset: 0,
                width: '100%', height: '100%',
                pointerEvents: 'auto',
                zIndex: 0,
            }}
        />
    );
}

// --- CONFIGURATION ---
const LOCAL_API_URL = "http://127.0.0.1:5000/predict"; 
const HF_SPACE_URL = "https://vijaydevaraj-vlm-clip-model.hf.space/predict"; 
// ---------------------

const ReportScreen = ({ isActive, navigateTo, currentUserLocation, onSubmit }) => {
    const [cameraActive, setCameraActive] = useState(false);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [hazardType, setHazardType] = useState('');
    const [mockMode, setMockMode] = useState(false);
    const [validationError, setValidationError] = useState('');
    const [forceSubmitAllowed, setForceSubmitAllowed] = useState(false);
    const [cameraHovered, setCameraHovered] = useState(false);
    const [submitHovered, setSubmitHovered] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);

    // Stop camera when screen deactivated
    useEffect(() => {
        if (!isActive) stopCamera();
    }, [isActive]);

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setCameraActive(false);
    };

    const openCamera = async () => {
        if (photoPreview) setPhotoPreview(null);

        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment' }
                });
                streamRef.current = stream;
                setMockMode(false);
                setCameraActive(true);
            } catch (err) {
                console.warn('Camera access failed, enabling mock mode.', err);
                setMockMode(true);
                setCameraActive(true);
            }
        } else {
            setMockMode(true);
            setCameraActive(true);
        }
    };

    useEffect(() => {
        if (cameraActive && !mockMode && streamRef.current && videoRef.current) {
            videoRef.current.srcObject = streamRef.current;
            videoRef.current.play().catch(err =>
                console.warn('video.play() failed:', err)
            );
        }
    }, [cameraActive, mockMode]);

    const capturePhoto = (e) => {
        e.stopPropagation();
        e.preventDefault();

        if (!canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        if (mockMode) {
            canvas.width = 640;
            canvas.height = 480;
            ctx.fillStyle = '#444';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#aaa';
            ctx.font = '28px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Mock Hazard Photo', canvas.width / 2, canvas.height / 2);
        } else {
            if (!videoRef.current || !streamRef.current) return;
            const video = videoRef.current;
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 480;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        }

        const locationText = currentUserLocation
            ? `Lat: ${currentUserLocation.lat.toFixed(6)}, Lng: ${currentUserLocation.lng.toFixed(6)}`
            : 'Loc: Waiting for GPS...';
        const timeText = new Date().toLocaleString();

        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, canvas.height - 60, canvas.width, 60);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('RoadHazeX Hazard Report', 20, canvas.height - 35);
        ctx.font = '14px sans-serif';
        ctx.fillText(`${timeText} | ${locationText}`, 20, canvas.height - 15);

        const base64Image = canvas.toDataURL('image/png');
        setPhotoPreview(base64Image);
        setValidationError('');
        setForceSubmitAllowed(false);
        stopCamera();
    };

    const handleSubmit = async () => {
        if (!currentUserLocation) {
            setValidationError('GPS is required to submit a report. Please enable your location services.');
            return;
        }
        if (!photoPreview && !hazardType) {
            setValidationError('Please capture a photo and select a hazard type before submitting.');
            return;
        }
        if (!photoPreview) {
            setValidationError('Please capture a photo of the hazard first.');
            return;
        }
        if (!hazardType) {
            setValidationError('Please select a hazard type before submitting.');
            return;
        }
        
        if (forceSubmitAllowed) {
            const pd = window._pendingHazardData || {};
            onSubmit(
                pd.type || hazardType, 
                pd.img || photoPreview, 
                pd.conf || 0.0, 
                pd.status || 'Mismatch', 
                pd.addr || 'Manual Report'
            );
            return;
        }
        
        setValidationError('');
        setIsProcessing(true);
        
        try {
            const res = await fetch(photoPreview);
            const blob = await res.blob();
            const formData = new FormData();
            formData.append('image', blob, 'capture.png');
            formData.append('hazard', hazardType); 

            const headers = {};
            const hfToken = import.meta.env.VITE_HF_TOKEN;
            // Only add token if it starts with 'hf_' AND is not the default placeholder
            if (hfToken && hfToken.startsWith('hf_') && hfToken !== 'hf_your_token_here') {
                headers['Authorization'] = `Bearer ${hfToken}`;
            }

            const isHttps = window.location.protocol === 'https:';
            const isLocalInsecure = LOCAL_API_URL.startsWith('http://') && !LOCAL_API_URL.includes('https://');

            let apiRes;
            
            // Try Cloud first if on HTTPS to avoid Mixed Content blocks
            if (isHttps && isLocalInsecure) {
                console.info("HTTPS detected, routing through cloud AI...");
                try {
                    apiRes = await fetch(HF_SPACE_URL, {
                        method: 'POST',
                        headers: headers,
                        body: formData
                    });
                } catch (e) {
                    console.error("Cloud AI Error:", e);
                    throw new Error("Unable to reach Cloud AI. Please check internet or Space status.");
                }
            } else {
                // Try local first, then fallback
                try {
                    apiRes = await fetch(LOCAL_API_URL, {
                        method: 'POST',
                        headers: headers,
                        body: formData
                    });
                } catch (err) {
                    console.warn("Local AI unreachable, trying cloud fallback...", err);
                    apiRes = await fetch(HF_SPACE_URL, {
                        method: 'POST',
                        headers: headers,
                        body: formData
                    });
                }
            }
            
            if (!apiRes.ok) {
                throw new Error(`AI Gateway error: ${apiRes.status} ${apiRes.statusText}`);
            }
            const data = await apiRes.json();

            // --- New Enhancement: Reverse Geocoding for readable address ---
            let readableAddress = "Unknown Location";
            try {
                const OLA_MAPS_API_KEY = "ZTQwHjxak23hMQ4ewtLTUzwMX9l6lJta0bL2uYv6";
                // Get coordinates from photo metadata or current location
                const lat = currentUserLocation?.lat || 12.9716;
                const lng = currentUserLocation?.lng || 77.5946;
                
                const geoRes = await fetch(`https://api.olamaps.io/places/v1/reverse-geocode?latlng=${lat},${lng}&api_key=${OLA_MAPS_API_KEY}`);
                const geoData = await geoRes.json();
                if (geoData.results?.[0]) {
                    readableAddress = geoData.results[0].formatted_address;
                }
            } catch (err) {
                console.warn("Reverse Geocoding failed:", err);
            }
            // -------------------------------------------------------------

            // Handle V2 Response with Validation Logic (Step 8)
            if (data.prediction) {
                const aiStatus = data.status === true ? 'Verified' : 'Mismatch';
                
                if (data.status === true) {
                    // Success Match
                    onSubmit(hazardType, photoPreview, data.confidence, aiStatus, readableAddress);
                } else {
                    // Mismatch Detected (Step 8 Logic)
                    const msg = `AI processing: You selected "${hazardType}" and AI predicted "${data.prediction}", are you sure?`;
                    setValidationError(msg);
                    setForceSubmitAllowed(true);
                    
                    // If user clicks "Sure" afterwards, we'll call onSubmit with 'Mismatch'
                    // We need to persist these values for the force-submit click
                    window._pendingHazardData = { 
                        type: hazardType, 
                        img: photoPreview, 
                        conf: data.confidence, 
                        status: aiStatus, 
                        addr: readableAddress 
                    };
                }
            } else if (data.error) {
                setValidationError("AI Error: " + data.error);
                setForceSubmitAllowed(true);
                window._pendingHazardData = { 
                    type: hazardType, 
                    img: photoPreview, 
                    conf: 0, 
                    status: 'Pending', 
                    addr: readableAddress 
                };
            }
        } catch (err) {
            console.error("AI Error:", err);
            
            let descriptiveError = "AI processing unreachable. You can still 'Submit' to manually report this hazard.";
            if (window.location.protocol === 'https:' && LOCAL_API_URL.startsWith('http://')) {
                descriptiveError = "Security Block: The hosted site (HTTPS) cannot reach your Local API (HTTP). Please use a secure tunnel (Ngrok/Localtunnel HTTPS) or the Hugging Face fallback.";
            }

            setValidationError(descriptiveError);
            setForceSubmitAllowed(true);
            
            // Fallback for unreachable AI
            window._pendingHazardData = { 
                type: hazardType, 
                img: photoPreview, 
                conf: 0, 
                status: 'Unreachable', 
                addr: 'GPS Location Source' 
            };
        } finally {
            setIsProcessing(false);
        }
    };

    const isReady = photoPreview && hazardType && !isProcessing && currentUserLocation;

    if (!isActive) return null;

    return (
        <>
            {/* ── Full-screen camera overlay ── */}
            {cameraActive && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 9999,
                    background: '#000',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                }}>
                    {/* Close button */}
                    <button
                        onClick={stopCamera}
                        aria-label="Close camera"
                        style={{
                            position: 'absolute', top: '1rem', left: '1rem',
                            zIndex: 10001,
                            background: 'rgba(0,0,0,0.6)', border: 'none',
                            borderRadius: '50%', width: '2.75rem', height: '2.75rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', backdropFilter: 'blur(6px)',
                        }}
                    >
                        <span className="material-icons-round" style={{ color: '#fff', fontSize: '1.4rem' }}>close</span>
                    </button>

                    {!mockMode
                        ? (
                            <video
                                ref={videoRef}
                                id="camera-feed"
                                autoPlay
                                playsInline
                                muted
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        ) : (
                            <div style={{
                                width: '100%', height: '100%',
                                display: 'flex', flexDirection: 'column',
                                alignItems: 'center', justifyContent: 'center',
                                background: '#1a1a1a', color: '#888', gap: '0.75rem',
                            }}>
                                <span className="material-icons-round" style={{ fontSize: '3.5rem', color: '#555' }}>videocam_off</span>
                                <span style={{ fontSize: '1rem' }}>Camera unavailable — tap shutter for mock photo</span>
                            </div>
                        )
                    }

                    {/* Shutter button */}
                    <button
                        id="fullscreen-shutter-btn"
                        onClick={capturePhoto}
                        aria-label="Capture photo"
                        style={{
                            position: 'absolute', bottom: '2.5rem',
                            left: '50%', transform: 'translateX(-50%)',
                            width: '5rem', height: '5rem', borderRadius: '50%',
                            background: 'rgba(255,255,255,0.92)',
                            border: '4px solid #fff',
                            boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            zIndex: 10001,
                            transition: 'transform 0.1s, box-shadow 0.1s',
                        }}
                        onMouseDown={e => {
                            e.currentTarget.style.transform = 'translateX(-50%) scale(0.88)';
                        }}
                        onMouseUp={e => {
                            e.currentTarget.style.transform = 'translateX(-50%) scale(1)';
                        }}
                        onTouchStart={e => {
                            e.currentTarget.style.transform = 'translateX(-50%) scale(0.88)';
                        }}
                        onTouchEnd={e => {
                            e.currentTarget.style.transform = 'translateX(-50%) scale(1)';
                        }}
                    >
                        <div style={{
                            width: '3.5rem', height: '3.5rem', borderRadius: '50%',
                            border: '2.5px solid #333', background: 'transparent',
                        }} />
                    </button>

                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                </div>
            )}

            {/* ── Report form ── */}
            <section className="absolute inset-0 flex flex-col z-10 animate-fade-in overflow-y-auto" style={{ fontFamily: "'Outfit', sans-serif", background: 'transparent', paddingBottom: '6rem' }}>

                {/* Animated background canvas */}
                <RoadBg />

                {/* Top accent bar */}
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
                    background: 'linear-gradient(90deg,#FF6B6B,#FF8E53,#FF6B6B)',
                    backgroundSize: '200% 100%',
                    animation: 'gradientShift 4s ease infinite',
                    zIndex: 2,
                }} />

                {/* Header */}
                <div className="flex items-center gap-4 p-6 relative z-10">
                    <button
                        className="p-2 rounded-full transition-all duration-200"
                        style={{
                            background: 'rgba(255,255,255,0.08)',
                            border: '1px solid rgba(255,255,255,0.12)',
                            backdropFilter: 'blur(8px)',
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.background = 'rgba(255,107,107,0.18)';
                            e.currentTarget.style.borderColor = 'rgba(255,107,107,0.4)';
                            e.currentTarget.style.transform = 'scale(1.08)';
                            e.currentTarget.style.boxShadow = '0 4px 16px rgba(255,107,107,0.2)';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                        onClick={() => navigateTo('home')}
                    >
                        <span className="material-icons-round text-white">arrow_back</span>
                    </button>

                    {/* Icon + Title */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                            width: '2.4rem', height: '2.4rem', borderRadius: '0.75rem',
                            background: 'linear-gradient(135deg,#FF6B6B,#FF8E53)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 4px 16px rgba(255,107,107,0.35)',
                        }}>
                            <span className="material-icons-round text-white" style={{ fontSize: '1.2rem' }}>warning</span>
                        </div>
                        <h2 className="text-2xl font-bold text-white">Report Hazard</h2>
                    </div>
                </div>

                {/* Card */}
                <div style={{
                    margin: '0 1rem 2rem',
                    padding: '1.75rem',
                    borderRadius: '1.5rem',
                    background: 'rgba(255,255,255,0.07)',
                    backdropFilter: 'blur(24px)',
                    border: '1px solid rgba(255,255,255,0.13)',
                    boxShadow: '0 24px 64px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
                    maxWidth: '36rem',
                    alignSelf: 'center',
                    width: '100%',
                    position: 'relative',
                    overflow: 'hidden',
                    flexShrink: 0,
                    zIndex: 2,
                }}>

                    {/* Inner shimmer line */}
                    <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
                        background: 'linear-gradient(90deg, transparent, rgba(255,107,107,0.5), rgba(255,142,83,0.5), transparent)',
                    }} />

                    {/* ── Camera tap area ── */}
                    <div
                        onClick={openCamera}
                        onMouseEnter={() => setCameraHovered(true)}
                        onMouseLeave={() => setCameraHovered(false)}
                        style={{
                            border: `2px dashed ${cameraHovered ? 'rgba(255,107,107,0.55)' : 'rgba(255,255,255,0.2)'}`,
                            borderRadius: '1rem',
                            height: '16rem',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '1.5rem',
                            cursor: 'pointer',
                            position: 'relative',
                            overflow: 'hidden',
                            background: cameraHovered
                                ? 'rgba(255,107,107,0.08)'
                                : 'rgba(0,0,0,0.18)',
                            transition: 'all 0.3s ease',
                            transform: cameraHovered ? 'scale(1.005)' : 'scale(1)',
                            boxShadow: cameraHovered
                                ? '0 0 0 1px rgba(255,107,107,0.2), inset 0 0 30px rgba(255,107,107,0.06)'
                                : 'none',
                        }}
                    >
                        {!photoPreview && (
                            <div style={{
                                display: 'flex', flexDirection: 'column',
                                alignItems: 'center', gap: '0.5rem',
                                transition: 'transform 0.3s ease',
                                transform: cameraHovered ? 'translateY(-4px)' : 'translateY(0)',
                            }}>
                                {/* Camera icon with glow ring */}
                                <div style={{
                                    width: '4rem', height: '4rem', borderRadius: '50%',
                                    background: cameraHovered
                                        ? 'linear-gradient(135deg,#FF6B6B,#FF8E53)'
                                        : 'rgba(255,255,255,0.1)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    marginBottom: '0.5rem',
                                    boxShadow: cameraHovered ? '0 8px 24px rgba(255,107,107,0.4)' : 'none',
                                    transition: 'all 0.3s ease',
                                }}>
                                    <span className="material-icons-round" style={{
                                        fontSize: '1.8rem',
                                        color: cameraHovered ? '#fff' : 'rgba(255,255,255,0.7)',
                                        transition: 'color 0.3s',
                                    }}>photo_camera</span>
                                </div>
                                <p style={{
                                    fontSize: '0.875rem',
                                    fontWeight: 600,
                                    color: cameraHovered ? 'rgba(255,107,107,0.9)' : 'rgba(255,255,255,0.6)',
                                    transition: 'color 0.3s',
                                    letterSpacing: '0.02em',
                                }}>Tap to Open Camera</p>
                                <p style={{
                                    fontSize: '0.72rem',
                                    color: 'rgba(255,255,255,0.3)',
                                    marginTop: '0.1rem',
                                }}>Capture the road hazard</p>
                            </div>
                        )}

                        {photoPreview && (
                            <>
                                <img
                                    src={photoPreview}
                                    alt="Captured hazard"
                                    style={{
                                        width: '100%', height: '100%',
                                        objectFit: 'cover', borderRadius: '0.875rem', display: 'block',
                                        transition: 'opacity 0.3s',
                                        opacity: cameraHovered ? 0.85 : 1,
                                    }}
                                />
                                {/* Retake overlay */}
                                <div style={{
                                    position: 'absolute', inset: 0,
                                    background: 'rgba(0,0,0,0.45)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    opacity: cameraHovered ? 1 : 0,
                                    transition: 'opacity 0.3s',
                                    borderRadius: '0.875rem',
                                }}>
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                                        background: 'rgba(255,107,107,0.2)',
                                        border: '1px solid rgba(255,107,107,0.5)',
                                        borderRadius: '2rem',
                                        padding: '0.5rem 1.25rem',
                                        backdropFilter: 'blur(8px)',
                                    }}>
                                        <span className="material-icons-round" style={{ color: '#fff', fontSize: '1.1rem' }}>refresh</span>
                                        <span style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 600 }}>Retake Photo</span>
                                    </div>
                                </div>
                                {/* Success badge */}
                                <div style={{
                                    position: 'absolute', bottom: 10, right: 10,
                                    background: 'rgba(0,0,0,0.55)', borderRadius: '0.75rem',
                                    padding: '4px 12px',
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    backdropFilter: 'blur(6px)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    opacity: cameraHovered ? 0 : 1,
                                    transition: 'opacity 0.3s',
                                }}>
                                    <span className="material-icons-round" style={{ color: '#4ade80', fontSize: '0.9rem' }}>check_circle</span>
                                    <span style={{ color: '#fff', fontSize: '0.72rem', fontWeight: 500 }}>Photo Captured</span>
                                </div>
                            </>
                        )}
                    </div>

                    {/* ── Hazard Type selector ── */}
                    <div style={{ marginBottom: '1.25rem', textAlign: 'left' }}>
                        <label style={{
                            display: 'flex', alignItems: 'center', gap: '0.4rem',
                            marginBottom: '0.5rem',
                            color: 'rgba(255,255,255,0.6)',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.06em',
                        }}>
                            <span className="material-icons-round" style={{ fontSize: '0.95rem', color: '#FF6B6B' }}>report_problem</span>
                            Hazard Type
                        </label>
                        <div style={{ position: 'relative' }}>
                            <select
                                style={{
                                    width: '100%',
                                    padding: '0.9rem 1rem',
                                    paddingRight: '2.5rem',
                                    borderRadius: '0.75rem',
                                    background: 'rgba(255,255,255,0.06)',
                                    border: `1px solid ${hazardType ? 'rgba(255,107,107,0.45)' : 'rgba(255,255,255,0.12)'}`,
                                    color: hazardType ? '#fff' : 'rgba(255,255,255,0.45)',
                                    fontSize: '0.95rem',
                                    outline: 'none',
                                    cursor: 'pointer',
                                    appearance: 'none',
                                    WebkitAppearance: 'none',
                                    transition: 'border-color 0.3s, box-shadow 0.3s',
                                    boxShadow: hazardType ? '0 0 0 3px rgba(255,107,107,0.12)' : 'none',
                                }}
                                value={hazardType}
                                onChange={(e) => {
                                    setHazardType(e.target.value);
                                    setValidationError('');
                                    setForceSubmitAllowed(false);
                                }}
                                onFocus={e => {
                                    e.currentTarget.style.borderColor = 'rgba(255,107,107,0.6)';
                                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255,107,107,0.14)';
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.09)';
                                }}
                                onBlur={e => {
                                    e.currentTarget.style.borderColor = hazardType ? 'rgba(255,107,107,0.45)' : 'rgba(255,255,255,0.12)';
                                    e.currentTarget.style.boxShadow = hazardType ? '0 0 0 3px rgba(255,107,107,0.12)' : 'none';
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                                }}
                            >
                                <option value="" disabled style={{ background: '#1e2d4a', color: '#888' }}>Select Hazard Type</option>
                                <option value="" disabled style={{ background: '#1e2d4a', color: '#888' }}>--- ROAD HAZARDS CATEGORY 🚦 ---</option>
                                <optgroup label="1️⃣ Road Infrastructure Hazards" style={{ background: '#1e2d4a' }}>
                                    <option value="Potholes" style={{ background: '#1e2d4a' }}>Potholes</option>
                                    <option value="Road cracks" style={{ background: '#1e2d4a' }}>Road cracks</option>
                                    <option value="Uneven roads" style={{ background: '#1e2d4a' }}>Uneven roads</option>
                                    <option value="Damaged manholes" style={{ background: '#1e2d4a' }}>Damaged manholes</option>
                                </optgroup>
                                <optgroup label="2️⃣ Traffic System Hazards" style={{ background: '#1e2d4a' }}>
                                    <option value="Non-functioning traffic signals" style={{ background: '#1e2d4a' }}>Non-functioning traffic signals</option>
                                    <option value="Broken or bent traffic signs" style={{ background: '#1e2d4a' }}>Broken or bent traffic signs</option>
                                    <option value="Non-working street lights" style={{ background: '#1e2d4a' }}>Non-working street lights</option>
                                    <option value="Missing signboards" style={{ background: '#1e2d4a' }}>Missing signboards</option>
                                    <option value="Improperly placed barricades" style={{ background: '#1e2d4a' }}>Improperly placed barricades</option>
                                </optgroup>
                                <optgroup label="3️⃣ Environmental Hazards" style={{ background: '#1e2d4a' }}>
                                    <option value="Fallen trees" style={{ background: '#1e2d4a' }}>Fallen trees</option>
                                    <option value="Debris on road" style={{ background: '#1e2d4a' }}>Debris on road</option>
                                </optgroup>
                                <optgroup label="4️⃣ Emergency Hazards" style={{ background: '#1e2d4a' }}>
                                    <option value="Road accidents" style={{ background: '#1e2d4a' }}>Road accidents</option>
                                    <option value="Vehicle breakdown" style={{ background: '#1e2d4a' }}>Vehicle breakdown</option>
                                </optgroup>
                                <optgroup label="5️⃣ Climatic Hazards" style={{ background: '#1e2d4a' }}>
                                    <option value="Waterlogging / flooded roads" style={{ background: '#1e2d4a' }}>Waterlogging / flooded roads</option>
                                    <option value="Low visibility zones" style={{ background: '#1e2d4a' }}>Low visibility zones (due to Fog, Mist, etc.)</option>
                                </optgroup>
                            </select>
                            {/* Custom chevron */}
                            <span className="material-icons-round" style={{
                                position: 'absolute', right: '0.75rem', top: '50%',
                                transform: 'translateY(-50%)',
                                color: hazardType ? '#FF6B6B' : 'rgba(255,255,255,0.35)',
                                fontSize: '1.2rem',
                                pointerEvents: 'none',
                                transition: 'color 0.3s',
                            }}>expand_more</span>
                        </div>
                    </div>

                    {/* ── Location ── */}
                    <div style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
                        <label style={{
                            display: 'flex', alignItems: 'center', gap: '0.4rem',
                            marginBottom: '0.5rem',
                            color: 'rgba(255,255,255,0.6)',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.06em',
                        }}>
                            <span className="material-icons-round" style={{ fontSize: '0.95rem', color: '#FF6B6B' }}>location_on</span>
                            Location
                        </label>
                        <div style={{
                            width: '100%',
                            padding: '0.9rem 1rem',
                            borderRadius: '0.75rem',
                            background: currentUserLocation ? 'rgba(74,222,128,0.06)' : 'rgba(251,191,36,0.06)',
                            border: `1px solid ${currentUserLocation ? 'rgba(74,222,128,0.2)' : 'rgba(251,191,36,0.35)'}`,
                            display: 'flex', alignItems: 'center', gap: '0.6rem',
                            boxSizing: 'border-box',
                            transition: 'all 0.3s ease',
                        }}>
                            <div style={{
                                width: '1.8rem', height: '1.8rem', borderRadius: '50%',
                                background: currentUserLocation ? 'rgba(74,222,128,0.15)' : 'rgba(251,191,36,0.15)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0,
                            }}>
                                <span className="material-icons-round" style={{ 
                                    color: currentUserLocation ? '#4ade80' : '#fbbf24', 
                                    fontSize: '1rem' 
                                }}>
                                    {currentUserLocation ? 'my_location' : 'location_off'}
                                </span>
                            </div>
                            <span style={{ 
                                color: currentUserLocation ? '#fff' : '#fbbf24', 
                                fontSize: '0.9rem', 
                                fontWeight: 500 
                            }}>
                                {currentUserLocation
                                    ? `LIVE: ${currentUserLocation.lat.toFixed(6)}, ${currentUserLocation.lng.toFixed(6)}`
                                    : 'GPS Signal Required'}
                            </span>
                            {/* Pulsing dot indicator */}
                            <div style={{
                                marginLeft: 'auto',
                                width: '0.6rem', height: '0.6rem', borderRadius: '50%',
                                background: currentUserLocation ? '#4ade80' : 'rgba(251,191,36,0.3)',
                                animation: currentUserLocation ? 'pulse-dot 2s ease-in-out infinite' : 'none',
                                flexShrink: 0,
                                boxShadow: currentUserLocation ? '0 0 10px #4ade80' : 'none',
                            }} />
                        </div>
                    </div>

                    {/* ── Validation error ── */}
                    {validationError && (
                        <div style={{
                            marginBottom: '1rem',
                            display: 'flex', alignItems: 'flex-start', gap: '0.8rem',
                            background: 'rgba(239,68,68,0.18)',
                            border: '1px solid rgba(239,68,68,0.5)',
                            borderRadius: '0.875rem',
                            padding: '1rem',
                            backdropFilter: 'blur(12px)',
                            boxShadow: '0 8px 32px rgba(239,68,68,0.15)',
                            animation: 'fadeIn 0.3s ease-out',
                        }}>
                            <span className="material-icons-round" style={{ color: '#f87171', fontSize: '1.4rem', marginTop: '2px' }}>warning_amber</span>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                <span style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 600 }}>Action Required</span>
                                <span style={{ color: '#fca5a5', fontSize: '0.85rem', lineHeight: '1.4' }}>{validationError}</span>
                            </div>
                        </div>
                    )}

                    {/* ── Submit button ── */}
                    <button
                        id="submit-report-btn"
                        onClick={handleSubmit}
                        onMouseEnter={() => setSubmitHovered(true)}
                        onMouseLeave={() => setSubmitHovered(false)}
                        style={{
                            width: '100%',
                            padding: '1rem',
                            borderRadius: '0.875rem',
                            fontWeight: 700,
                            fontSize: '1rem',
                            border: 'none',
                            cursor: isReady ? 'pointer' : 'not-allowed',
                            transition: 'all 0.25s ease',
                            position: 'relative',
                            overflow: 'hidden',
                            letterSpacing: '0.02em',
                            ...(isReady ? {
                                background: forceSubmitAllowed
                                    ? (submitHovered ? 'linear-gradient(135deg,#b91c1c,#dc2626)' : 'linear-gradient(135deg,#dc2626,#b91c1c)')
                                    : (submitHovered ? 'linear-gradient(135deg,#FF8E53,#FF6B6B)' : 'linear-gradient(135deg,#FF6B6B,#FF8E53)'),
                                color: '#fff',
                                boxShadow: submitHovered
                                    ? (forceSubmitAllowed ? '0 12px 36px rgba(220,38,38,0.55), 0 4px 12px rgba(0,0,0,0.2)' : '0 12px 36px rgba(255,107,107,0.55), 0 4px 12px rgba(0,0,0,0.2)')
                                    : (forceSubmitAllowed ? '0 6px 24px rgba(220,38,38,0.35)' : '0 6px 24px rgba(255,107,107,0.35)'),
                                transform: submitHovered ? 'translateY(-2px) scale(1.012)' : 'translateY(0) scale(1)',
                            } : {
                                background: 'rgba(255,255,255,0.07)',
                                color: 'rgba(255,255,255,0.3)',
                                boxShadow: 'none',
                                transform: 'none',
                            }),
                        }}
                    >
                        {/* Shimmer layer on hover */}
                        {isReady && submitHovered && (
                            <div style={{
                                position: 'absolute', inset: 0,
                                background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.18) 55%, transparent 70%)',
                                animation: 'shimmer-sweep 0.6s ease forwards',
                                pointerEvents: 'none',
                            }} />
                        )}

                        <span style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                            {isProcessing ? (
                                <>
                                    <span className="material-icons-round" style={{ fontSize: '1.2rem', animation: 'spin 1s linear infinite' }}>autorenew</span>
                                    AI Processing...
                                </>
                            ) : forceSubmitAllowed ? (
                                <>
                                    <span className="material-icons-round" style={{ fontSize: '1.1rem' }}>gpp_bad</span>
                                    Override AI & Force Submit
                                </>
                            ) : (
                                <>
                                    <span className="material-icons-round" style={{ fontSize: '1.1rem' }}>
                                        {isReady ? 'send' : 'lock'}
                                    </span>
                                    Submit Report
                                </>
                            )}
                        </span>
                    </button>

                    {/* Progress pills */}
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        gap: '0.5rem', marginTop: '1.25rem',
                    }}>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '0.35rem',
                            padding: '0.35rem 0.75rem',
                            borderRadius: '2rem',
                            background: photoPreview ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.05)',
                            border: `1px solid ${photoPreview ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.08)'}`,
                            transition: 'all 0.3s ease',
                        }}>
                            <span className="material-icons-round" style={{
                                fontSize: '0.85rem',
                                color: photoPreview ? '#4ade80' : 'rgba(255,255,255,0.3)',
                                transition: 'color 0.3s',
                            }}>{photoPreview ? 'check_circle' : 'photo_camera'}</span>
                            <span style={{
                                fontSize: '0.72rem', fontWeight: 600,
                                color: photoPreview ? '#4ade80' : 'rgba(255,255,255,0.3)',
                                transition: 'color 0.3s',
                            }}>Photo</span>
                        </div>

                        <div style={{
                            width: '1.5rem', height: '1px',
                            background: isReady ? 'rgba(74,222,128,0.4)' : 'rgba(255,255,255,0.1)',
                            transition: 'background 0.3s',
                        }} />

                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '0.35rem',
                            padding: '0.35rem 0.75rem',
                            borderRadius: '2rem',
                            background: hazardType ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.05)',
                            border: `1px solid ${hazardType ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.08)'}`,
                            transition: 'all 0.3s ease',
                        }}>
                            <span className="material-icons-round" style={{
                                fontSize: '0.85rem',
                                color: hazardType ? '#4ade80' : 'rgba(255,255,255,0.3)',
                                transition: 'color 0.3s',
                            }}>{hazardType ? 'check_circle' : 'report_problem'}</span>
                            <span style={{
                                fontSize: '0.72rem', fontWeight: 600,
                                color: hazardType ? '#4ade80' : 'rgba(255,255,255,0.3)',
                                transition: 'color 0.3s',
                            }}>Hazard Type</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Keyframe injections */}
            <style>{`
                @keyframes pulse-dot {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(0.75); }
                }
                @keyframes shimmer-sweep {
                    0%   { transform: translateX(-100%); }
                    100% { transform: translateX(200%); }
                }
                @keyframes spin {
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </>
    );
};

export default ReportScreen;
