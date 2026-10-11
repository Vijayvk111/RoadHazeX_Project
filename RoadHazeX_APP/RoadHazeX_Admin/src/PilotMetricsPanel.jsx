import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';

const PilotMetricsPanel = ({ hazards = [] }) => {
    const [metrics, setMetrics] = useState({
        totalSessions: 0,
        totalBugs: 0,
        avgGPS: 0,
        avgNavScore: 0,
        avgMarkerScore: 0,
        avgAlertScore: 0,
        avgVoiceScore: 0,
        feedbacks: [],
        bugReports: []
    });

    const [lightboxImage, setLightboxImage] = useState(null);

    useEffect(() => {
        const fetchPilotData = async () => {
            try {
                // Fetch feedbacks (contains session metrics too)
                const fbSnap = await getDocs(collection(db, 'feedback'));
                const fbs = fbSnap.docs.map(d => d.data());
                
                // Fetch bugs
                const bugSnap = await getDocs(collection(db, 'bugReports'));
                const bugs = bugSnap.docs.map(d => ({id: d.id, ...d.data()}));
                
                if (fbs.length > 0) {
                    const avgNav = fbs.reduce((acc, curr) => acc + (curr.navScore || 0), 0) / fbs.length;
                    const avgMarker = fbs.reduce((acc, curr) => acc + (curr.markerScore || 0), 0) / fbs.length;
                    const avgAlert = fbs.reduce((acc, curr) => acc + (curr.alertScore || 0), 0) / fbs.length;
                    const avgVoice = fbs.reduce((acc, curr) => acc + (curr.voiceScore || 0), 0) / fbs.length;
                    
                    setMetrics({
                        totalSessions: fbs.length,
                        totalBugs: bugSnap.size,
                        avgGPS: 0, // Add real calc if logged
                        avgNavScore: avgNav.toFixed(1),
                        avgMarkerScore: avgMarker.toFixed(1),
                        avgAlertScore: avgAlert.toFixed(1),
                        avgVoiceScore: avgVoice.toFixed(1),
                        feedbacks: fbs,
                        bugReports: bugs
                    });
                } else {
                    setMetrics(prev => ({...prev, totalBugs: bugSnap.size, bugReports: bugs}));
                }
            } catch (e) {
                console.error("Error fetching pilot metrics:", e);
            }
        };
        fetchPilotData();
    }, []);

    const testReports = hazards.filter(h => h.isFieldTest || h.isDemo);
    const realReports = hazards.filter(h => !h.isFieldTest && !h.isDemo);

    return (
        <div className="w-full h-full bg-[#020617] overflow-y-auto p-4 md:p-8 animate-in fade-in duration-500">
            <div className="max-w-7xl mx-auto space-y-8">
                
                {/* Header */}
                <div className="bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-3xl p-6 md:p-10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/20 rounded-full blur-[100px] pointer-events-none" />
                    <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight uppercase relative z-10">
                        Pilot <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">Metrics</span>
                    </h1>
                    <p className="text-slate-400 mt-2 max-w-2xl text-sm md:text-base relative z-10">
                        Real-world field testing data, feedback scores, and performance evaluation metrics from approved pilot drivers.
                    </p>
                </div>

                {/* Score Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6">
                        <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">Total Sessions</span>
                        <div className="text-4xl font-black text-white mt-2">{metrics.totalSessions}</div>
                    </div>
                    <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6">
                        <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">Bug Reports</span>
                        <div className="text-4xl font-black text-red-400 mt-2">{metrics.totalBugs}</div>
                    </div>
                    <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6">
                        <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">Pilot Hazards</span>
                        <div className="text-4xl font-black text-blue-400 mt-2">{testReports.length}</div>
                    </div>
                    <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6">
                        <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">Real Hazards</span>
                        <div className="text-4xl font-black text-emerald-400 mt-2">{realReports.length}</div>
                    </div>
                </div>

                {/* Feedback Scores */}
                <h2 className="text-xl font-bold text-white mt-12 mb-4 px-2">Tester Feedback Averages (out of 5)</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Routing / Nav', val: metrics.avgNavScore, color: 'text-emerald-400' },
                        { label: 'GPS Marker', val: metrics.avgMarkerScore, color: 'text-blue-400' },
                        { label: 'Alert Timing', val: metrics.avgAlertScore, color: 'text-amber-400' },
                        { label: 'Voice Alerts', val: metrics.avgVoiceScore, color: 'text-purple-400' }
                    ].map(s => (
                        <div key={s.label} className="bg-slate-900/50 border border-white/5 rounded-2xl p-6 flex flex-col items-center">
                            <span className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-3">{s.label}</span>
                            <div className={`text-5xl font-black ${s.color}`}>{s.val}</div>
                        </div>
                    ))}
                </div>

                {/* Recent Feedback Logs */}
                <h2 className="text-xl font-bold text-white mt-12 mb-4 px-2">Recent Feedback Logs</h2>
                <div className="space-y-4">
                    {metrics.feedbacks.length === 0 && <p className="text-slate-500 italic px-2">No feedback submitted yet.</p>}
                    {metrics.feedbacks.map((fb, idx) => (
                        <div key={idx} className="bg-slate-900 border border-white/5 rounded-2xl p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <span className="text-xs font-mono text-purple-400 bg-purple-400/10 px-2 py-1 rounded-md">{fb.testSessionId}</span>
                                    <span className="text-xs text-slate-500 ml-3">{fb.timestamp?.toDate ? fb.timestamp.toDate().toLocaleString() : 'Recent'}</span>
                                </div>
                            </div>
                            {fb.suggestions && (
                                <p className="text-white/80 text-sm border-l-2 border-white/20 pl-4 py-1 italic mb-4">
                                    "{fb.suggestions}"
                                </p>
                            )}
                            <div className="flex gap-4 text-xs font-mono text-slate-400">
                                <span>Nav: {fb.navScore}/5</span>
                                <span>Marker: {fb.markerScore}/5</span>
                                <span>Alert: {fb.alertScore}/5</span>
                                <span>Voice: {fb.voiceScore}/5</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Recent Bug Reports */}
                <h2 className="text-xl font-bold text-white mt-12 mb-4 px-2">Recent Bug Reports</h2>
                <div className="space-y-4">
                    {metrics.bugReports.length === 0 && <p className="text-slate-500 italic px-2">No bug reports submitted yet.</p>}
                    {metrics.bugReports.map((bug) => (
                        <div key={bug.id} className="bg-slate-900 border border-white/5 rounded-2xl p-6 flex flex-col md:flex-row gap-6">
                            <div className="flex-1">
                                <div className="flex flex-wrap items-center gap-3 mb-3">
                                    <span className="text-xs font-black text-red-400 bg-red-400/10 px-2 py-1 rounded-md uppercase tracking-widest">{bug.issueType}</span>
                                    <span className="text-xs text-slate-500 font-mono">{bug.timestamp?.toDate ? bug.timestamp.toDate().toLocaleString() : 'Recent'}</span>
                                    <span className="text-[10px] font-bold text-slate-400 border border-slate-700 px-2 py-0.5 rounded uppercase">Screen: {bug.screenName}</span>
                                </div>
                                <p className="text-white/90 text-sm leading-relaxed mb-4 whitespace-pre-wrap">{bug.description}</p>
                                <div className="flex flex-wrap items-center gap-4 text-[10px] font-mono text-slate-500">
                                    <span>User: {bug.userId?.substring(0,8)}...</span>
                                    <span>App: {bug.appVersion}</span>
                                </div>
                            </div>
                            
                            {/* Screenshot Section */}
                            <div className="w-full md:w-48 shrink-0 flex flex-col justify-center items-center p-4 bg-slate-950/50 rounded-xl border border-white/5">
                                {bug.screenshot?.downloadURL ? (
                                    <div 
                                        className="relative w-full aspect-[9/16] bg-slate-900 rounded-lg overflow-hidden border border-white/10 cursor-pointer group shadow-xl"
                                        onClick={() => setLightboxImage(bug.screenshot.downloadURL)}
                                    >
                                        <img src={bug.screenshot.downloadURL} alt="Bug Screenshot" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span className="material-icons-round text-white text-3xl">zoom_in</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center text-slate-600 gap-2 h-full py-6">
                                        <span className="material-icons-round text-3xl">image_not_supported</span>
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-center">No Screenshot<br/>Attached</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

            </div>

            {/* Lightbox Modal */}
            {lightboxImage && (
                <div 
                    className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 md:p-10 cursor-zoom-out"
                    onClick={() => setLightboxImage(null)}
                >
                    <div className="relative max-w-5xl max-h-full">
                        <button 
                            className="absolute -top-12 right-0 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-red-500 transition-colors"
                            onClick={(e) => { e.stopPropagation(); setLightboxImage(null); }}
                        >
                            <span className="material-icons-round text-xl">close</span>
                        </button>
                        <img src={lightboxImage} alt="Enlarged Bug Screenshot" className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl border border-white/10" />
                    </div>
                </div>
            )}
        </div>
    );
};

export default PilotMetricsPanel;
