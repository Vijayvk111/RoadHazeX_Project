import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { detectJurisdiction } from '../utils/jurisdictionEngine';

/* ΓöÇΓöÇΓöÇ Animated background canvas ΓöÇΓöÇΓöÇ */
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

        // Mouse move ΓåÆ spawn ripple
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

            /* ΓöÇΓöÇ Background gradient ΓöÇΓöÇ */
            const bg = ctx.createLinearGradient(0, 0, 0, H);
            bg.addColorStop(0, '#050505');
            bg.addColorStop(0.45, '#1a1a1a');
            bg.addColorStop(1, '#000000');
            ctx.fillStyle = bg;
            ctx.fillRect(0, 0, W, H);

            /* ΓöÇΓöÇ Road (perspective trapezoid) ΓöÇΓöÇ */
            const roadW = W * 0.58;
            const vanishX = W / 2;
            const vanishY = H * 0.36;
            const leftBottom = W / 2 - roadW / 2;
            const rightBottom = W / 2 + roadW / 2;

            const roadGrad = ctx.createLinearGradient(vanishX, vanishY, vanishX, H);
            roadGrad.addColorStop(0, 'rgba(40,40,40,0)');
            roadGrad.addColorStop(0.3, 'rgba(30,30,30,0.5)');
            roadGrad.addColorStop(1, 'rgba(15,15,15,0.85)');

            ctx.beginPath();
            ctx.moveTo(vanishX, vanishY);
            ctx.lineTo(leftBottom, H);
            ctx.lineTo(rightBottom, H);
            ctx.closePath();
            ctx.fillStyle = roadGrad;
            ctx.fill();

            /* ΓöÇΓöÇ Edge lines ΓöÇΓöÇ */
            ctx.strokeStyle = 'rgba(255,255,255,0.10)';
            ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(vanishX - 4, vanishY); ctx.lineTo(leftBottom, H); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(vanishX + 4, vanishY); ctx.lineTo(rightBottom, H); ctx.stroke();

            /* ΓöÇΓöÇ Moving dashed centre line ΓöÇΓöÇ */
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

            /* ΓöÇΓöÇ Horizon glow ΓöÇΓöÇ */
            const glowGrad = ctx.createRadialGradient(vanishX, vanishY, 0, vanishX, vanishY, H * 0.5);
            glowGrad.addColorStop(0, 'rgba(255,107,107,0.14)');
            glowGrad.addColorStop(0.5, 'rgba(255,142,83,0.06)');
            glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = glowGrad;
            ctx.fillRect(0, 0, W, H);

            /* ΓöÇΓöÇ Mouse proximity glow ΓöÇΓöÇ */
            if (mouse.x > 0) {
                const mg = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 120);
                mg.addColorStop(0, 'rgba(255,107,107,0.10)');
                mg.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = mg;
                ctx.fillRect(0, 0, W, H);
            }

            /* ΓöÇΓöÇ Ripples ΓöÇΓöÇ */
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

            /* ΓöÇΓöÇ Floating particles ΓöÇΓöÇ */
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
// ---------------------

const ReportScreen = ({ isActive, navigateTo, toggleSidebar, currentUserLocation, onSubmit }) => {
    const { t } = useLanguage();
    const [cameraActive, setCameraActive] = useState(false);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [hazardType, setHazardType] = useState('');
    const [expandedCategory, setExpandedCategory] = useState(null);
    const [mockMode, setMockMode] = useState(false);
    const [validationError, setValidationError] = useState('');
    const [forceSubmitAllowed, setForceSubmitAllowed] = useState(false);
    const [cameraHovered, setCameraHovered] = useState(false);
    const [submitHovered, setSubmitHovered] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    
    // --- New: Submission Preview State ---
    const [previewData, setPreviewData] = useState(null);
    const [mismatchData, setMismatchData] = useState(null);
    const [editableLandmark, setEditableLandmark] = useState('');

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
                if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                    alert("Camera Access Denied: RoadHazeX needs your camera to capture hazard photos. Please allow camera access in your browser settings.");
                }
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

        // Phase 7: Pilot Region Control (Chennai bounding box)
        // South-West: 12.75, 80.05 | North-East: 13.35, 80.35
        const DEV_VALIDATION_BYPASS = mockMode || window.location.hostname === 'localhost';
        if (!DEV_VALIDATION_BYPASS) {
            const { lat, lng } = currentUserLocation;
            if (lat < 12.75 || lat > 13.35 || lng < 80.05 || lng > 80.35) {
                setValidationError("This area is outside the current pilot testing region (Chennai). Reports here cannot be processed.");
                return;
            }
        }

        if (forceSubmitAllowed) {
            setValidationError('');
            // The previewData is already set in window._pendingHazardData or we can just reconstruct it
            const pd = window._pendingHazardData || {};
            setPreviewData({
                type: hazardType,
                aiPrediction: null,
                predictionStatus: 'failed',
                error: 'AI API unreachable',
                predictedAt: new Date().toISOString(),
                img: photoPreview,
                conf: 'Unavailable',
                status: 'Pending',
                addr: pd.addr || 'Unknown',
                jurisdiction: pd.jurisdiction || { Authority: 'Unknown Jurisdiction' },
                locationValidation: pd.locationValidation || {
                    validationStatus: 'needs_location_review',
                    distanceToNearestRoadMeters: 68.5,
                    gpsAccuracyMeters: currentUserLocation?.accuracy || 35
                },
                priority: 'Medium',
                requiresManualReview: true
            });
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
            if (currentUserLocation) {
                formData.append('lat', currentUserLocation.lat);
                formData.append('lng', currentUserLocation.lng);
            }

            const headers = {};
            const hfToken = import.meta.env.VITE_HF_TOKEN;
            // Only add token if it starts with 'hf_' AND is not the default placeholder
            if (hfToken && hfToken.startsWith('hf_') && hfToken !== 'hf_your_token_here') {
                headers['Authorization'] = `Bearer ${hfToken}`;
            }

            const AI_API_URL = import.meta.env.VITE_AI_API_URL || "https://vijaydevaraj-vlm-clip-model.hf.space";
            
            let apiRes;
            try {
                apiRes = await fetch(`${AI_API_URL}/predict`, {
                    method: 'POST',
                    headers: headers,
                    body: formData
                });
            } catch (err) {
                console.error("AI API Fetch Error:", err);
                throw new Error("Unable to reach AI API. Please check internet or Space status.");
            }
            
            if (!apiRes.ok) {
                throw new Error(`AI Gateway error: ${apiRes.status} ${apiRes.statusText}`);
            }
            const data = await apiRes.json();
            
            if (data.predictionStatus !== 'success' && !data.prediction) {
                throw new Error("AI prediction failed");
            }

            // --- New Enhancement: Reverse Geocoding for readable address ---
            let readableAddress = "Unknown Location";
            const lat = currentUserLocation?.lat || 12.9716;
            const lng = currentUserLocation?.lng || 77.5946;

            try {
                const OLA_MAPS_API_KEY = "ZTQwHjxak23hMQ4ewtLTUzwMX9l6lJta0bL2uYv6";
                // Get coordinates from photo metadata or current location
                
                const geoRes = await fetch(`https://api.olamaps.io/places/v1/reverse-geocode?latlng=${lat},${lng}&api_key=${OLA_MAPS_API_KEY}`);
                const geoData = await geoRes.json();
                
                let foundPoi = false;
                if (geoData.results && geoData.results.length > 0) {
                    // Try to find a Point of Interest (POI) like a bus stop, hospital, school, etc.
                    for (const result of geoData.results) {
                        const types = result.types || [];
                        const isPoi = types.some(t => ['point_of_interest', 'bus_station', 'transit_station', 'hospital', 'school', 'university', 'place_of_worship', 'establishment', 'landmark'].includes(t));
                        if (isPoi && result.name) {
                            readableAddress = result.name;
                            foundPoi = true;
                            break;
                        }
                    }
                    
                    // Fallback to formatted address if no explicit POI is found
                    if (!foundPoi) {
                        readableAddress = geoData.results[0].formatted_address;
                    }
                }
            } catch (err) {
                console.warn("Reverse Geocoding failed:", err);
            }
            // -------------------------------------------------------------

            // Handle V3 and V2 Response with Validation Logic (Step 8)
            if (data.prediction || data.hazardType) {
                const aiStatus = (data.status === true || data.predictionStatus === 'success') ? 'Verified' : 'Mismatch';
                
                // --- New: Local Jurisdiction Calculation since HF Space does not provide it ---
                let jurisdiction = data.jurisdiction;
                if (!jurisdiction) {
                    try {
                        const jData = await detectJurisdiction(lat, lng);
                        jurisdiction = {
                            Authority: jData.authority,
                            Type: jData.jurisdiction_type,
                            ZoneNo: jData.zone,
                            WardNo: jData.ward,
                            roadDistance: 68.5 // Fallback simulated road distance
                        };
                    } catch (jErr) {
                        console.warn("Local jurisdiction calculation failed:", jErr);
                        jurisdiction = { Authority: 'Unknown Jurisdiction' };
                    }
                }
                
                // --- Phase 1: Location & Road Proximity Validation ---
                let distanceToNearestRoadMeters = jurisdiction.roadDistance !== undefined ? jurisdiction.roadDistance : 68.5; // fallback
                let gpsAccuracyMeters = currentUserLocation?.accuracy || 35; // fallback
                let nearestRoadName = jurisdiction.nearestRoadName || readableAddress || "Unknown Road";
                let validationStatus = "valid";
                let roadProximityVerified = true;
                let validationMessage = "";
                
                // Bypass for development if mockMode is active or localhost
                const DEV_VALIDATION_BYPASS = mockMode || window.location.hostname === 'localhost';

                if (!DEV_VALIDATION_BYPASS) {
                    if (gpsAccuracyMeters > 50) {
                        validationStatus = "poor_gps_accuracy";
                        roadProximityVerified = false;
                        validationMessage = "GPS accuracy is very poor. Move outdoors.";
                    } else if (distanceToNearestRoadMeters > 75) {
                        validationStatus = "invalid_not_near_road";
                        roadProximityVerified = false;
                        validationMessage = "Location is far from any mapped road.";
                    } else if (distanceToNearestRoadMeters > 25 && distanceToNearestRoadMeters <= 75) {
                        if (gpsAccuracyMeters <= 15 && aiStatus === 'Verified') {
                            validationStatus = "needs_location_review";
                            roadProximityVerified = false;
                            validationMessage = "Good GPS and AI verified, but mapped road is outside strict threshold";
                        } else {
                            validationStatus = "invalid_not_near_road";
                            roadProximityVerified = false;
                            validationMessage = "Distance to mapped road exceeds threshold and criteria for manual review not met.";
                        }
                    } else if (distanceToNearestRoadMeters <= 25) {
                        validationStatus = "valid";
                        roadProximityVerified = true;
                    }
                }
                
                const locationValidation = {
                    jurisdictionDetected: !!jurisdiction.Authority && jurisdiction.Authority !== 'Unknown Jurisdiction',
                    roadProximityVerified: roadProximityVerified,
                    distanceToNearestRoadMeters: distanceToNearestRoadMeters,
                    nearestRoadName: nearestRoadName,
                    gpsAccuracyMeters: gpsAccuracyMeters,
                    validationStatus: validationStatus,
                    reason: validationMessage
                };
                // -----------------------------------------------------
                
                // Set Priority based on exact hazard type
                let priority = "Medium";
                if (["Road Accident", "Waterlogging"].includes(hazardType)) {
                    priority = "High";
                }
                
                // Format confidence (if it's e.g. 0.3975 -> 39.75)
                let formattedConf = data.confidence;
                if (formattedConf && formattedConf < 1) {
                    formattedConf = (formattedConf * 100).toFixed(2);
                } else if (formattedConf) {
                    formattedConf = parseFloat(formattedConf).toFixed(2);
                }
                
                // Format AI Prediction from backend directly
                let formattedAiPrediction = data.hazardType || data.prediction || 'Unknown';

                const payload = {
                    type: hazardType,
                    aiPrediction: formattedAiPrediction,
                    img: photoPreview,
                    conf: formattedConf,
                    status: formattedAiPrediction === hazardType ? 'Verified' : 'Pending',
                    aiReviewStatus: formattedAiPrediction === hazardType ? 'verified' : 'mismatch',
                    addr: readableAddress,
                    jurisdiction: jurisdiction,
                    locationValidation: locationValidation,
                    priority: priority,
                    debug_info: data.debug_info
                };

                setEditableLandmark(readableAddress);

                // AI Validation Workflow
                if (formattedAiPrediction.toLowerCase().trim() !== hazardType.toLowerCase().trim()) {
                    setMismatchData(payload);
                } else {
                    setPreviewData(payload);
                }
            } else if (data.error) {
                setValidationError("AI Error: " + data.error);
                setPreviewData({
                    type: hazardType,
                    aiPrediction: 'Error',
                    img: photoPreview,
                    conf: 0,
                    status: 'Pending',
                    addr: readableAddress,
                    jurisdiction: { Authority: 'Unknown Jurisdiction' },
                    priority: 'Medium'
                });
                setEditableLandmark(readableAddress);
            }
        } catch (err) {
            console.error("AI Error:", err);
            
            let descriptiveError = "AI prediction is currently unavailable. Please retry or continue with manual review.";
            setValidationError(descriptiveError);
            setForceSubmitAllowed(true);
            
            // Fallback for unreachable AI
            let fallbackJurisdiction = { Authority: 'Unknown Jurisdiction' };
            try {
                const lat = currentUserLocation?.lat || 12.9716;
                const lng = currentUserLocation?.lng || 77.5946;
                const jData = await detectJurisdiction(lat, lng);
                fallbackJurisdiction = {
                    Authority: jData.authority,
                    Type: jData.jurisdiction_type,
                    ZoneNo: jData.zone,
                    WardNo: jData.ward,
                    roadDistance: 68.5
                };
            } catch (err) {
                console.warn("Fallback jurisdiction failed");
            }
            
            const fallbackData = {
                type: hazardType,
                aiPrediction: null,
                predictionStatus: 'failed',
                error: 'AI API unreachable',
                predictedAt: new Date().toISOString(),
                img: photoPreview,
                conf: 'Unavailable',
                status: 'Pending',
                addr: readableAddress || 'Unknown',
                jurisdiction: fallbackJurisdiction,
                locationValidation: {
                    validationStatus: 'needs_location_review',
                    distanceToNearestRoadMeters: 68.5,
                    gpsAccuracyMeters: currentUserLocation?.accuracy || 35
                },
                priority: 'Medium',
                requiresManualReview: true
            };
            window._pendingHazardData = fallbackData;
            setEditableLandmark(readableAddress || 'Unknown Location');
            // Do NOT call setPreviewData here, so the user sees the error and has to click "Continue with Manual Review"
        } finally {
            setIsProcessing(false);
        }
    };

    const isReady = photoPreview && hazardType && !isProcessing && currentUserLocation;

    if (!isActive) return null;

    return (
        <>
            {/* ΓöÇΓöÇ Full-screen camera overlay ΓöÇΓöÇ */}
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
                                <span style={{ fontSize: '1rem' }}>Camera unavailable ΓÇö tap shutter for mock photo</span>
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

            {/* ΓöÇΓöÇ Report form ΓöÇΓöÇ */}
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
                        onClick={toggleSidebar}
                    >
                        <span className="material-icons-round text-white">menu</span>
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
                        <h2 className="text-2xl font-bold text-white">{t('reportTitle')}</h2>
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

                    {/* ΓöÇΓöÇ Camera tap area ΓöÇΓöÇ */}
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

                    {/* ΓöÇΓöÇ Hazard Type selector ΓöÇΓöÇ */}
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                            {[
                                {
                                    categoryKey: "infrastructure",
                                    icon: "add_road",
                                    items: ["Pothole", "Unrepaired/Damaged Manhole", "Broken Road Surface"]
                                },
                                {
                                    categoryKey: "traffic",
                                    icon: "traffic",
                                    items: ["Traffic Signal Issue", "Traffic Sign Damage", "Streetlight Not Working", "Missing Signboard", "Improper Barricade"]
                                },
                                {
                                    categoryKey: "environmental",
                                    icon: "nature",
                                    items: ["Tree Obstruction", "Debris on Road"]
                                },
                                {
                                    categoryKey: "emergency",
                                    icon: "warning",
                                    items: ["Road Accident", "Vehicle Breakdown"]
                                },
                                {
                                    categoryKey: "climatic",
                                    icon: "water_drop",
                                    items: ["Waterlogging", "Low Visibility"]
                                }
                            ].map((cat, idx) => {
                                const isExpanded = expandedCategory === cat.categoryKey;
                                const isSelectedInCat = cat.items.includes(hazardType);
                                
                                return (
                                    <div key={idx} style={{
                                        background: isExpanded || isSelectedInCat ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)',
                                        border: `1px solid ${isSelectedInCat ? 'rgba(255,107,107,0.5)' : 'rgba(255,255,255,0.08)'}`,
                                        borderRadius: '0.75rem',
                                        overflow: 'hidden',
                                        transition: 'all 0.3s ease',
                                    }}>
                                        <button 
                                            onClick={(e) => {
                                                e.preventDefault();
                                                setExpandedCategory(isExpanded ? null : cat.categoryKey);
                                            }}
                                            style={{
                                                width: '100%', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
                                                outline: 'none'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <span className="material-icons-round" style={{ color: isSelectedInCat ? '#FF6B6B' : 'rgba(255,255,255,0.5)', fontSize: '1.2rem' }}>
                                                    {cat.icon}
                                                </span>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ color: isSelectedInCat ? '#fff' : 'rgba(255,255,255,0.8)', fontWeight: 600, fontSize: '0.95rem' }}>
                                                        {t(cat.categoryKey)}
                                                    </span>
                                                    {isSelectedInCat && !isExpanded && (
                                                        <span style={{ color: '#FF6B6B', fontSize: '0.8rem', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                            <span className="material-icons-round" style={{ fontSize: '0.8rem' }}>check_circle</span>
                                                            {t('hazards.' + hazardType)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <span className="material-icons-round" style={{ color: 'rgba(255,255,255,0.4)', transition: 'transform 0.3s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                                                expand_more
                                            </span>
                                        </button>
                                        
                                        {isExpanded && (
                                            <div style={{ padding: '0 1rem 1rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                                {cat.items.map((item, i) => (
                                                    <button
                                                        key={i}
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            setHazardType(item);
                                                            setExpandedCategory(null);
                                                            setValidationError('');
                                                            setForceSubmitAllowed(false);
                                                        }}
                                                        style={{
                                                            width: '100%', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
                                                            background: hazardType === item ? 'rgba(255,107,107,0.15)' : 'rgba(0,0,0,0.2)',
                                                            border: `1px solid ${hazardType === item ? 'rgba(255,107,107,0.4)' : 'transparent'}`,
                                                            borderRadius: '0.5rem', color: hazardType === item ? '#fff' : 'rgba(255,255,255,0.6)',
                                                            cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s ease', outline: 'none'
                                                        }}
                                                    >
                                                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: hazardType === item ? '#FF6B6B' : 'rgba(255,255,255,0.2)' }} />
                                                        {t('hazards.' + item)}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* ΓöÇΓöÇ Location ΓöÇΓöÇ */}
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

                    {/* ΓöÇΓöÇ Validation error ΓöÇΓöÇ */}
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

                    {/* ΓöÇΓöÇ Submit button ΓöÇΓöÇ */}
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
                                    Continue with Manual Review
                                </>
                            ) : (
                                <>
                                    <span className="material-icons-round" style={{ fontSize: '1.1rem' }}>
                                        {isReady ? 'send' : 'lock'}
                                    </span>
                                    {t('submit')}
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

            {/* --- NEW: Submission Preview Overlay --- */}
            {previewData && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 60,
                    background: 'rgba(5,5,5,0.85)', backdropFilter: 'blur(12px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '1rem'
                }}>
                    <div style={{
                        background: '#111', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '1.25rem', width: '100%', maxWidth: '28rem',
                        maxHeight: '90vh', overflowY: 'auto',
                        padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                        animation: 'fadeInUp 0.4s ease-out forwards'
                    }}>
                        <div style={{ textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
                            <span className="material-icons-round" style={{ fontSize: '2.5rem', color: '#4ade80', marginBottom: '0.5rem' }}>verified_user</span>
                            <h3 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff', margin: 0 }}>{t('preview.title')}</h3>
                            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>{t('preview.desc')}</p>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
                            {/* Image Preview inside the modal */}
                            {previewData.img && (
                                <div style={{ 
                                    width: '100%', height: '120px', borderRadius: '0.75rem', overflow: 'hidden', 
                                    marginBottom: '0.5rem', border: '1px solid rgba(255,255,255,0.1)' 
                                }}>
                                    <img src={previewData.img} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                                <span style={{ color: 'rgba(255,255,255,0.5)' }}>User Selected:</span>
                                <span style={{ color: '#fff', fontWeight: 600 }}>{t('hazards.' + previewData.type) !== 'hazards.' + previewData.type ? t('hazards.' + previewData.type) : previewData.type}</span>
                            </div>
                            
                            {previewData.predictionStatus !== 'failed' && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>AI Predicted:</span>
                                    <span style={{ color: '#fff', fontWeight: 600 }}>{t('hazards.' + previewData.aiPrediction) !== 'hazards.' + previewData.aiPrediction ? t('hazards.' + previewData.aiPrediction) : previewData.aiPrediction}</span>
                                </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                                <span style={{ color: 'rgba(255,255,255,0.5)' }}>AI Status:</span>
                                <span style={{ 
                                    color: previewData.predictionStatus === 'failed' ? '#f87171' : (previewData.status === 'Verified' ? '#4ade80' : '#fbbf24'), 
                                    fontWeight: 600 
                                }}>
                                    {previewData.predictionStatus === 'failed' ? 'Unavailable' : previewData.status}
                                </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                                <span style={{ color: 'rgba(255,255,255,0.5)' }}>{t('preview.gpsCoordinates')}:</span>
                                <span style={{ color: '#fff', fontWeight: 600, fontSize: '0.85rem' }}>
                                    {currentUserLocation ? `${currentUserLocation.lat.toFixed(5)}, ${currentUserLocation.lng.toFixed(5)}` : 'Unknown'}
                                </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                                <span style={{ color: 'rgba(255,255,255,0.5)' }}>{t('preview.authority')}:</span>
                                <span style={{ color: '#fff', fontWeight: 600, textAlign: 'right', maxWidth: '60%' }}>{previewData.jurisdiction?.Authority}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                                <span style={{ color: 'rgba(255,255,255,0.5)' }}>{t('preview.jurisdictionType')}:</span>
                                <span style={{ color: '#fff', fontWeight: 600 }}>{previewData.jurisdiction?.Type || 'Unknown'}</span>
                            </div>

                            {previewData.jurisdiction?.Type === 'Urban' && (
                                <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                                        <span style={{ color: 'rgba(255,255,255,0.5)' }}>{t('preview.zone')}:</span>
                                        <span style={{ color: '#fff', fontWeight: 600, textAlign: 'right' }}>
                                            {previewData.jurisdiction?.ZoneNo ? `Zone ${previewData.jurisdiction.ZoneNo}` : ''} {previewData.jurisdiction?.ZoneName || ''}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                                        <span style={{ color: 'rgba(255,255,255,0.5)' }}>{t('preview.ward')}:</span>
                                        <span style={{ color: '#fff', fontWeight: 600, textAlign: 'right' }}>
                                            {previewData.jurisdiction?.WardNo || 'Unknown'}
                                        </span>
                                    </div>
                                </>
                            )}

                            {previewData.jurisdiction?.Type === 'Rural' && (
                                <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                                        <span style={{ color: 'rgba(255,255,255,0.5)' }}>{t('preview.districtBlock')}:</span>
                                        <span style={{ color: '#fff', fontWeight: 600, textAlign: 'right' }}>
                                            {previewData.jurisdiction?.District || 'Unknown'} / {previewData.jurisdiction?.Block || 'Unknown'}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                                        <span style={{ color: 'rgba(255,255,255,0.5)' }}>{t('preview.panchayatVillage')}:</span>
                                        <span style={{ color: '#fff', fontWeight: 600, textAlign: 'right' }}>
                                            {previewData.jurisdiction?.Panchayat || 'Unknown'} {previewData.jurisdiction?.Village ? `(${previewData.jurisdiction.Village})` : ''}
                                        </span>
                                    </div>
                                </>
                            )}

                            {(previewData.jurisdiction?.Type === 'State Highway' || previewData.jurisdiction?.Type === 'National Highway') && (
                                <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                                        <span style={{ color: 'rgba(255,255,255,0.5)' }}>{t('preview.roadNumber')}:</span>
                                        <span style={{ color: '#fff', fontWeight: 600, textAlign: 'right' }}>
                                            {previewData.jurisdiction?.RoadNumber || 'Unknown'}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                                        <span style={{ color: 'rgba(255,255,255,0.5)' }}>{t('preview.roadName')}:</span>
                                        <span style={{ color: '#fff', fontWeight: 600, textAlign: 'right', maxWidth: '60%' }}>
                                            {previewData.jurisdiction?.RoadName || 'Unknown'}
                                        </span>
                                    </div>
                                </>
                            )}

                            {(!previewData.jurisdiction?.Type || previewData.jurisdiction?.Type === 'Unknown') && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>{t('preview.details')}:</span>
                                    <span style={{ color: '#fff', fontWeight: 600, textAlign: 'right', maxWidth: '60%' }}>{t('preview.detecting')}</span>
                                </div>
                            )}

                            {previewData.locationValidation && (
                                <div style={{ 
                                    display: 'flex', flexDirection: 'column', gap: '0.4rem', 
                                    padding: '0.75rem', marginTop: '0.5rem', 
                                    background: 'rgba(255,255,255,0.03)', borderRadius: '0.5rem',
                                    border: `1px solid ${
                                        previewData.locationValidation.validationStatus === 'valid' ? 'rgba(74,222,128,0.2)' : 
                                        previewData.locationValidation.validationStatus === 'needs_location_review' ? 'rgba(251,191,36,0.3)' : 
                                        'rgba(248,113,113,0.3)'
                                    }`
                                }}>
                                    <span style={{ color: '#fff', fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.2rem' }}>
                                        Road Validation Details
                                    </span>
                                    

                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: 'rgba(255,255,255,0.5)' }}>Distance to Road:</span>
                                        <span style={{ color: '#fff', fontWeight: 600 }}>{Math.round(previewData.locationValidation.distanceToNearestRoadMeters)} meters</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: 'rgba(255,255,255,0.5)' }}>GPS Accuracy:</span>
                                        <span style={{ color: '#fff', fontWeight: 600 }}>{Math.round(previewData.locationValidation.gpsAccuracyMeters)} meters</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.2rem' }}>
                                        <span style={{ color: 'rgba(255,255,255,0.5)' }}>Road Validation:</span>
                                        <span style={{ 
                                            padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase',
                                            background: previewData.locationValidation.validationStatus === 'valid' ? 'rgba(74,222,128,0.15)' : 
                                                        (previewData.locationValidation.validationStatus === 'needs_location_review' || previewData.locationValidation.validationStatus === 'poor_gps_accuracy') ? 'rgba(251,191,36,0.15)' : 
                                                        'rgba(248,113,113,0.15)',
                                            color: previewData.locationValidation.validationStatus === 'valid' ? '#4ade80' : 
                                                   (previewData.locationValidation.validationStatus === 'needs_location_review' || previewData.locationValidation.validationStatus === 'poor_gps_accuracy') ? '#fbbf24' : 
                                                   '#f87171'
                                        }}>
                                            {previewData.locationValidation.validationStatus === 'valid' ? 'Verified' : 
                                             previewData.locationValidation.validationStatus === 'poor_gps_accuracy' ? 'Poor GPS' : 
                                             previewData.locationValidation.validationStatus === 'needs_location_review' ? 'Needs Review' : 'Invalid'}
                                        </span>
                                    </div>
                                    {previewData.locationValidation.validationStatus === 'poor_gps_accuracy' && (
                                        <div style={{ color: '#fbbf24', fontSize: '0.8rem', marginTop: '0.5rem', textAlign: 'center', background: 'rgba(251,191,36,0.1)', padding: '0.4rem', borderRadius: '0.4rem' }}>
                                            GPS accuracy is low. Please move outdoors for better validation.
                                        </div>
                                    )}
                                    {previewData.locationValidation.validationStatus === 'needs_location_review' && (
                                        <div style={{ color: '#fbbf24', fontSize: '0.8rem', marginTop: '0.5rem', textAlign: 'center', background: 'rgba(251,191,36,0.1)', padding: '0.6rem', borderRadius: '0.4rem', lineHeight: '1.3' }}>
                                            Road proximity could not be fully verified because the mapped road dataset may not include this local street. Since GPS accuracy and AI verification are good, this report will be submitted for manual location review.
                                        </div>
                                    )}
                                </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem', marginTop: '0.5rem' }}>
                                <span style={{ color: 'rgba(255,255,255,0.5)' }}>{t('preview.aiConfidence')}:</span>
                                <span style={{ color: previewData.conf === 'Unavailable' ? '#f87171' : '#4ade80', fontWeight: 600 }}>
                                    {previewData.conf === 'Unavailable' ? 'Unavailable' : `${previewData.conf}%`}
                                </span>
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.5rem' }}>
                                <span style={{ color: 'rgba(255,255,255,0.5)' }}>{t('preview.nearbyLandmark')}:</span>
                                <input 
                                    type="text" 
                                    value={editableLandmark}
                                    onChange={(e) => setEditableLandmark(e.target.value)}
                                    maxLength={80}
                                    style={{
                                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                        color: '#fff', padding: '0.75rem', borderRadius: '0.5rem', width: '100%',
                                        outline: 'none', fontFamily: 'inherit'
                                    }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', flexDirection: previewData.predictionStatus === 'failed' ? 'column' : 'row' }}>
                            {previewData.predictionStatus === 'failed' ? (
                                <>
                                    <button 
                                        onClick={() => {
                                            setPreviewData(null);
                                            handleSubmit();
                                        }}
                                        style={{ width: '100%', padding: '0.85rem', borderRadius: '0.75rem', fontWeight: 600, background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)', cursor: 'pointer' }}
                                    >
                                        Retry AI Prediction
                                    </button>
                                    <button 
                                        onClick={() => { setPreviewData(null); }}
                                        style={{ width: '100%', padding: '0.85rem', borderRadius: '0.75rem', fontWeight: 600, background: 'rgba(255,255,255,0.08)', color: '#fff', border: 'none', cursor: 'pointer' }}
                                    >
                                        Retake Image
                                    </button>
                                    <button 
                                        onClick={() => {
                                            onSubmit(previewData.type, previewData.img, previewData.conf, previewData.status, editableLandmark, previewData.jurisdiction, previewData.priority, previewData.locationValidation, previewData.aiPrediction, previewData.aiReviewStatus);
                                            setPreviewData(null);
                                        }}
                                        style={{ width: '100%', padding: '0.85rem', borderRadius: '0.75rem', fontWeight: 600, background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)', cursor: 'pointer' }}
                                    >
                                        Submit Report (Manual Review)
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button 
                                        onClick={() => { setPreviewData(null); }}
                                        style={{ flex: 1, padding: '0.85rem', borderRadius: '0.75rem', fontWeight: 600, background: 'rgba(255,255,255,0.08)', color: '#fff', border: 'none', cursor: 'pointer' }}
                                    >
                                        Retake Image
                                    </button>
                                    <button 
                                        onClick={() => {
                                            onSubmit(previewData.type, previewData.img, previewData.conf, previewData.status, editableLandmark, previewData.jurisdiction, previewData.priority, previewData.locationValidation, previewData.aiPrediction, previewData.aiReviewStatus);
                                            setPreviewData(null);
                                        }}
                                        style={{ flex: 2, padding: '0.85rem', borderRadius: '0.75rem', fontWeight: 600, background: 'linear-gradient(135deg, #4ade80, #22c55e)', color: '#000', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                                    >
                                        <span className="material-icons-round" style={{ fontSize: '1.2rem' }}>send</span>
                                        {t('preview.submitReport')}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* --- NEW: Mismatch Confirmation Dialog --- */}
            {mismatchData && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 65,
                    background: 'rgba(5,5,5,0.85)', backdropFilter: 'blur(12px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '1rem'
                }}>
                    <div style={{
                        background: '#111', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '1.25rem', width: '100%', maxWidth: '28rem',
                        padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                        animation: 'fadeInUp 0.3s ease-out forwards'
                    }}>
                        <div style={{ textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
                            <span className="material-icons-round" style={{ fontSize: '2.5rem', color: '#f59e0b', marginBottom: '0.5rem' }}>warning_amber</span>
                            <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#fff', margin: 0 }}>{t('mismatch.title')}</h3>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.95rem' }}>
                            <p style={{ color: 'rgba(255,255,255,0.9)', margin: 0, fontWeight: 500, lineHeight: 1.4 }}>
                                AI detected <span style={{color: '#f59e0b'}}>{mismatchData.aiPrediction}</span>, but you selected <span style={{color: '#4ade80'}}>{hazardType}</span>.
                            </p>
                            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>{t('mismatch.aiPredicted')}:</span>
                                    <span style={{ color: '#f59e0b', fontWeight: 600 }}>
                                        {t('hazards.' + mismatchData.aiPrediction) !== 'hazards.' + mismatchData.aiPrediction 
                                            ? t('hazards.' + mismatchData.aiPrediction) 
                                            : mismatchData.aiPrediction}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>{t('mismatch.youSelected')}:</span>
                                    <span style={{ color: '#fff', fontWeight: 600 }}>
                                        {t('hazards.' + hazardType) !== 'hazards.' + hazardType 
                                            ? t('hazards.' + hazardType) 
                                            : hazardType}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.5rem' }}>
                            <button 
                                onClick={() => {
                                    setHazardType(mismatchData.aiPrediction);
                                    const updatedPayload = { ...mismatchData, type: mismatchData.aiPrediction };
                                    setPreviewData(updatedPayload);
                                    setMismatchData(null);
                                }}
                                style={{
                                    width: '100%', padding: '0.85rem', borderRadius: '0.75rem', fontWeight: 600,
                                    background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)',
                                    cursor: 'pointer'
                                }}
                            >
                                Use AI Prediction
                            </button>
                            <button 
                                onClick={() => {
                                    setPreviewData(mismatchData);
                                    setMismatchData(null);
                                }}
                                style={{
                                    width: '100%', padding: '0.85rem', borderRadius: '0.75rem', fontWeight: 600,
                                    background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                Keep My Selection
                            </button>
                            <button 
                                onClick={() => {
                                    setMismatchData(null);
                                    setPhotoPreview(null);
                                    setCameraActive(true);
                                }}
                                style={{
                                    width: '100%', padding: '0.85rem', borderRadius: '0.75rem', fontWeight: 600,
                                    background: 'transparent', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)',
                                    cursor: 'pointer'
                                }}
                            >
                                Retake Image
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Keyframe injections */}
            <style>{`
                @keyframes pulse-dot {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(0.75); }
                }
                @keyframes fadeInUp {
                    0% { opacity: 0; transform: translateY(20px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
                @keyframes shimmer-sweep {
                    0% { transform: translateX(-150%) skewX(-15deg); }
                    100% { transform: translateX(150%) skewX(-15deg); }
                }
                @keyframes gradientShift {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                .animate-fade-in {
                    animation: fadeInUp 0.5s ease-out forwards;
                }
                @keyframes spin {
                    100% { transform: rotate(360deg); }
                }
            `}</style>
            
            {/* --- NEW: Developer Debug Panel --- */}
            {process.env.NODE_ENV === 'development' && (
                <div style={{
                    position: 'fixed', bottom: '1rem', left: '1rem', zIndex: 100,
                    background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
                    border: '1px solid #FF6B6B', borderRadius: '0.5rem',
                    padding: '0.75rem', fontSize: '0.7rem', color: '#0f0',
                    fontFamily: 'monospace', maxWidth: '300px', pointerEvents: 'none'
                }}>
                    <div style={{ color: '#FF6B6B', fontWeight: 'bold', marginBottom: '4px', borderBottom: '1px solid #FF6B6B' }}>DEBUG PANEL</div>
                    <div>GPS: {currentUserLocation ? `${currentUserLocation.lat.toFixed(5)}, ${currentUserLocation.lng.toFixed(5)}` : 'None'}</div>
                    <div>Selected Hazard: {hazardType || 'None'}</div>
                    {previewData && (
                        <>
                            <div>AI Confidence: {previewData.conf === 'Unavailable' ? 'Unavailable' : `${previewData.conf}%`}</div>
                            <div>Prediction: {previewData.aiPrediction}</div>
                            <div style={{ marginTop: '4px', borderTop: '1px dotted #0f0', paddingTop: '4px' }}>--- GIS DEBUG ---</div>
                            <div>Datasets Loaded: {previewData.debug_info?.datasetsLoaded ? 'Yes' : 'No'}</div>
                            {previewData.debug_info?.datasetsLoaded && (
                                <>
                                    <div>Ward Features: {previewData.debug_info?.wardCount}</div>
                                    <div>SH Features: {previewData.debug_info?.shCount}</div>
                                    <div>NH Features: {previewData.debug_info?.nhCount}</div>
                                    <div>Rural Features: {previewData.debug_info?.ruralCount}</div>
                                </>
                            )}
                            <div>Coordinate: [{currentUserLocation?.lng.toFixed(5)}, {currentUserLocation?.lat.toFixed(5)}]</div>
                            <div>Matched Layer: {previewData.debug_info?.matchedLayer || 'None'}</div>
                            <div>Road Distance: {previewData.debug_info?.roadDistance ? `${previewData.debug_info.roadDistance.toFixed(1)}m` : 'N/A'}</div>
                            <div>Authority: {previewData.jurisdiction?.Authority}</div>
                            <div>Reason/Notes: {previewData.debug_info?.reason || 'None'}</div>
                        </>
                    )}
                </div>
            )}
        </>
    );
};

export default ReportScreen;
