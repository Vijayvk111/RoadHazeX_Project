import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, updateDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { useLanguage } from '../contexts/LanguageContext';

const DashboardScreen = ({ isActive, navigateTo, currentUser, toggleSidebar }) => {
    const { t } = useLanguage();
    
    // Safe translation wrapper to prevent crashes if t is ever undefined or shadowed
    const safeT = (key, fallback = key, params = {}) => {
        try {
            if (typeof t === 'function') {
                return t(key, fallback, params);
            }
            return fallback;
        } catch (error) {
            console.warn("Translation failed:", key, error);
            return fallback;
        }
    };
    const [userHazards, setUserHazards] = useState([]);

    useEffect(() => {
        if (!isActive || !currentUser || !currentUser.uid) return;

        const q = query(
            collection(db, 'hazards'),
            where('userId', '==', currentUser.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setUserHazards(data);
        });

        return () => unsubscribe();
    }, [isActive, currentUser]);

    if (!isActive) return null;

    const activeStatuses = ['Pending', 'Reported', 'Needs Review', 'Needs Location Review', 'Verified', 'Assigned', 'In Progress'];
    const pendingHazards = userHazards.filter(h => {
        if (h.resolved || h.status === 'Closed' || h.status === 'Resolved' || h.status === 'Invalid / Rejected' || h.status === 'Duplicate') return false;
        return !h.status || activeStatuses.includes(h.status) || h.aiReviewStatus === 'mismatch' || h.validationFlags?.aiMismatch;
    });
    const resolvedHazards = userHazards.filter(h => h.resolved || h.status === 'Closed' || h.status === 'Resolved');
    const handleFleetUpload = (e) => { e.preventDefault(); alert("Fleet tracking not available yet."); };

    const getHazardName = (hazardType) => {
        if (!hazardType) return 'Unknown Hazard';
        const normalizedType = hazardType.trim();
        const translated = safeT(`hazards.${normalizedType}`);
        return translated !== `hazards.${normalizedType}` ? translated : normalizedType;
    };

    // AI Stats Calculation
    const typeDistribution = userHazards.reduce((acc, h) => {
        const name = getHazardName(h.type);
        acc[name] = (acc[name] || 0) + 1;
        return acc;
    }, {});

    const sortedTypes = Object.entries(typeDistribution)
        .sort(([, a], [, b]) => b - a);

    const adminResponses = userHazards.filter(h => h.adminPublicResponse).length;
    const stats = {
        total: userHazards.length,
        pending: pendingHazards.length,
        resolved: resolvedHazards.length,
        adminRes: adminResponses
    };

    const getReportCreatedTime = (report) => {
        const timeField = report.createdAt || report.submittedAt || report.reportedAt || report.timestamp || report.updatedAt;
        if (!timeField) return 0;
        if (timeField.toDate) return timeField.toDate().getTime();
        if (typeof timeField === 'object' && timeField.seconds) return timeField.seconds * 1000;
        if (typeof timeField === 'string') return new Date(timeField).getTime();
        if (typeof timeField === 'number') return timeField;
        return 0;
    };

    const sortedUserHazards = [...userHazards].sort((a, b) => getReportCreatedTime(b) - getReportCreatedTime(a));

    const getAssignmentDisplay = (hazard) => {
        if (hazard.status === 'Pending' || hazard.status === 'Reported' || !hazard.assignedOfficerRole) {
            return 'Pending Administrative Review';
        }
        
        if (hazard.assignedOfficerRole && hazard.assignedDepartment && hazard.assignedDepartment !== 'Unknown') {
            return `${hazard.assignedOfficerRole}, ${hazard.assignedDepartment}`;
        }
        
        return 'Concerned Road Authority';
    };

    return (
        <section className="absolute inset-0 z-10 animate-fade-in flex flex-col bg-[#020617] overflow-y-auto overflow-x-hidden pb-20 no-scrollbar">
            {/* Header */}
            <div className="flex items-center justify-between p-6 shrink-0 bg-transparent flex-wrap gap-4">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={toggleSidebar}
                        className="p-2 rounded-full bg-white/5 hover:bg-white/15 transition-all active:scale-90 group flex items-center justify-center"
                    >
                        <span className="material-icons-round text-slate-400 group-hover:text-white transition-colors">menu</span>
                    </button>
                    <h2 className="text-2xl font-bold text-white">{safeT('dashboardTitle', 'Hazard Dashboard')}</h2>
                </div>
                
                <div className="hidden md:flex items-center gap-4">
                     <div className="flex flex-col items-end">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">{safeT('common.status', 'Status')}</span>
                          <span className="text-xs font-bold text-green-400 flex items-center gap-1.5 mt-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                              {safeT('dashboard.realTimeMonitoringActive', 'Real-time Monitoring Active')}
                          </span>
                     </div>
                     <div className="w-px h-8 bg-white/10 mx-2"></div>
                     <button onClick={toggleSidebar} className="w-10 h-10 rounded-full border-2 border-white/10 overflow-hidden shadow-lg transition-transform hover:scale-105 active:scale-95">
                         {currentUser?.photoURL ? (
                             <img src={currentUser.photoURL} alt="Profile" className="w-full h-full object-cover" />
                         ) : (
                             <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-cyan-500">
                                 <span className="material-icons-round text-white text-[20px]">person</span>
                             </div>
                         )}
                     </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-6 mb-6 shrink-0">
                <div className="glass-panel p-4 rounded-2xl flex flex-col items-center border-l-4 border-l-blue-500">
                    <span className="text-3xl font-bold text-white">{stats.total}</span>
                    <span className="text-[10px] text-gray-300 uppercase tracking-wider font-bold mt-1">{safeT('dashboard.totalReports', 'Total Reports')}</span>
                </div>
                <div className="glass-panel p-4 rounded-2xl flex flex-col items-center border-l-4 border-l-orange-500">
                    <span className="text-3xl font-bold text-white">{stats.pending}</span>
                    <span className="text-[10px] text-gray-300 uppercase tracking-wider font-bold mt-1">{safeT('dashboard.pendingReports', 'Pending Reports')}</span>
                </div>
                <div className="glass-panel p-4 rounded-2xl flex flex-col items-center border-l-4 border-l-green-500">
                    <span className="text-3xl font-bold text-white">{stats.resolved}</span>
                    <span className="text-[10px] text-gray-300 uppercase tracking-wider font-bold mt-1">{safeT('dashboard.resolvedReports', 'Resolved Reports')}</span>
                </div>
                <div className="glass-panel p-4 rounded-2xl flex flex-col items-center border-l-4 border-l-purple-500">
                    <span className="text-3xl font-bold text-white">{stats.adminRes}</span>
                    <span className="text-[10px] text-gray-300 uppercase tracking-wider font-bold mt-1">{safeT('dashboard.adminResponses', 'Admin Responses')}</span>
                </div>
            </div>

            {/* AI Insights & Distribution Panel */}
            <div className="px-6 mb-6 shrink-0">
                <div className="glass-panel p-5 rounded-3xl bg-gradient-to-br from-white/5 to-white/2">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                           <span className="material-icons-round text-blue-400 text-sm">analytics</span>
                           {safeT('dashboard.myHazardSummary', 'My Hazard Summary')}
                        </h3>
                    </div>
                    
                    <div className="space-y-4">
                        {sortedTypes.map(([type, count], i) => {
                            const percent = (count / (userHazards.length || 1) * 100).toFixed(0);
                            return (
                                <div key={i} className="group">
                                    <div className="flex justify-between items-end mb-1.5">
                                        <span className="text-sm font-medium text-gray-200 truncate pr-4">{type}</span>
                                        <span className="text-xs font-bold text-gray-400">{percent}%</span>
                                    </div>
                                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-1000 ease-out"
                                            style={{ width: `${percent}%`, transitionDelay: `${i * 150}ms` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>


            {/* Hazard Telemetry (User's specific reports) */}
            <div className="px-6 pb-6 space-y-4 shrink-0">
                <h3 className="text-lg font-semibold text-gray-200 sticky top-0 bg-[#020617] py-2 z-10 flex items-center gap-2">
                    <span className="material-icons-round text-blue-400">history_edu</span>
                    {safeT('dashboard.recentHazardReports', 'Recent Hazard Reports')}
                </h3>

                {userHazards.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                        <span className="material-icons-round text-4xl mb-2">check_circle</span>
                        <p>{safeT('noReports', 'No hazards reported yet.')}</p>
                    </div>
                ) : (
                    sortedUserHazards.map((hazard, index) => {
                        const j = hazard.jurisdiction || hazard.locationDetails || {};
                        let auth = j.Authority || j.authority || hazard.authority || (typeof hazard.jurisdiction === 'string' ? hazard.jurisdiction : null) || j.jurisdictionType || hazard.jurisdictionType;
                        let details = j.Details || j.ward || hazard.ward || j.zone || hazard.zone || j.zoneName || hazard.zoneName || j.wardNo || hazard.wardNo || j.zoneNo || hazard.zoneNo;
                        if (!auth || auth === 'Unknown Jurisdiction') auth = 'Needs Jurisdiction Review';
                        
                        return (
                        <div key={hazard.id || index} className="glass-panel p-4 rounded-2xl flex items-center gap-4 hover:bg-white/10 transition-colors animate-slide-up" style={{ animationDelay: `${index * 0.1}s` }}>
                            <div className="w-16 h-16 rounded-xl bg-gray-800 overflow-hidden shrink-0 border border-white/10">
                                {hazard.image ? (
                                    <img src={hazard.image} alt={hazard.type} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <span className="material-icons-round text-gray-500">image_not_supported</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex flex-col mb-1">
                                    <div className="flex items-center gap-2">
                                        <h4 className={`font-bold truncate ${hazard.resolved ? 'text-gray-400 line-through' : 'text-white'}`}>{getHazardName(hazard.type)}</h4>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 mt-1">
                                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase border w-fit ${hazard.status === 'Pending' || hazard.status === 'Reported' || !hazard.status ? 'bg-orange-500/20 text-orange-300 border-orange-500/30' : hazard.resolved ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : hazard.status === 'Invalid / Rejected' ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-blue-500/20 text-blue-300 border-blue-500/30'}`}>
                                            {safeT('status.' + (hazard.status || 'Pending'), hazard.status || 'Pending')}
                                        </span>
                                        {(hazard.aiReviewStatus === 'mismatch' || hazard.validationFlags?.aiMismatch) && (
                                            <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase border w-fit bg-red-500/20 text-red-300 border-red-500/30">
                                                {safeT('dashboard.aiMismatch', 'AI Mismatch / Needs Review')}
                                            </span>
                                        )}
                                        {hazard.jurisdiction?.Type && (
                                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase border w-fit ${
                                                hazard.jurisdiction.Type === 'State Highway' ? 'bg-orange-500/20 text-orange-300 border-orange-500/30' :
                                                hazard.jurisdiction.Type === 'National Highway' ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' :
                                                'bg-blue-500/20 text-blue-300 border-blue-500/30'
                                            }`}>
                                                {hazard.jurisdiction.Type}
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-xs text-gray-400 mt-1.5 truncate">
                                        {auth}
                                        {details ? ` • ${details}` : ''}
                                    </div>
                                    <div className="mt-4 mb-2 bg-slate-900/50 p-4 rounded-xl border border-white/5">
                                        <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 flex items-center gap-1.5">
                                            <span className="material-icons-round text-[12px]">route</span>
                                            {safeT('dashboard.reportTrackingTimeline', 'Report Tracking Timeline')}
                                        </h5>
                                        <div className="flex flex-col gap-0 relative">
                                            {/* Vertical line connecting steps */}
                                            <div className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-slate-700"></div>
                                            
                                            {(() => {
                                                const steps = [];
                                                
                                                // Step 1: Submission
                                                const createdAt = hazard.timestamp || hazard.createdAt;
                                                const createdTime = createdAt?.toDate ? createdAt.toDate().toLocaleString() : (createdAt ? new Date(typeof createdAt === 'object' ? createdAt.seconds*1000 : createdAt).toLocaleString() : 'Just now');
                                                steps.push({ label: safeT('dashboard.reportSubmitted', 'Report Submitted'), time: createdTime, icon: 'add_circle', color: 'text-blue-400', bg: 'bg-slate-800 border-blue-500' });
                                                
                                                // Step 2+: Status History
                                                if (hazard.statusHistory && hazard.statusHistory.length > 0) {
                                                    const sortedHistory = [...hazard.statusHistory].sort((a, b) => {
                                                        const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
                                                        const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
                                                        return timeA - timeB;
                                                    });
                                                    
                                                    // Deduplicate consecutive identical statuses
                                                    const uniqueHistory = [];
                                                    sortedHistory.forEach(history => {
                                                        if (uniqueHistory.length === 0 || uniqueHistory[uniqueHistory.length - 1].status !== history.status) {
                                                            uniqueHistory.push(history);
                                                        }
                                                    });

                                                    uniqueHistory.forEach(history => {
                                                        const time = history.updatedAt ? new Date(history.updatedAt).toLocaleString() : '';
                                                        let icon = 'history';
                                                        let color = 'text-slate-400';
                                                        let bg = 'bg-slate-800 border-slate-600';
                                                        
                                                        if (history.status === 'Verified') { icon = 'verified'; color = 'text-blue-400'; bg = 'bg-slate-800 border-blue-500'; }
                                                        else if (history.status === 'Assigned') { icon = 'assignment_ind'; color = 'text-orange-400'; bg = 'bg-slate-800 border-orange-500'; }
                                                        else if (history.status === 'In Progress') { icon = 'engineering'; color = 'text-yellow-400'; bg = 'bg-slate-800 border-yellow-500'; }
                                                        else if (history.status === 'Resolved' || history.status === 'Closed') { icon = 'check_circle'; color = 'text-green-400'; bg = 'bg-slate-800 border-green-500'; }
                                                        else if (history.status === 'Invalid / Rejected' || history.status === 'Duplicate') { icon = 'cancel'; color = 'text-red-400'; bg = 'bg-slate-800 border-red-500'; }
                                                        
                                                        steps.push({ label: `${safeT('common.status', 'Status')}: ${safeT('status.' + history.status, history.status)}`, time, icon, color, bg });
                                                    });
                                                } else {
                                                    // Fallbacks if history array is missing but timestamps exist
                                                    if (hazard.assignedOfficerRole) {
                                                        const timeStr = hazard.assignedAt?.toDate ? hazard.assignedAt.toDate().toLocaleString() : '';
                                                        steps.push({ label: safeT('dashboard.assignedToAuthority', 'Assigned to Authority'), time: timeStr, icon: 'assignment_ind', color: 'text-orange-400', bg: 'bg-slate-800 border-orange-500' });
                                                    }
                                                    if (hazard.resolved) {
                                                        const timeStr = hazard.resolvedAt?.toDate ? hazard.resolvedAt.toDate().toLocaleString() : '';
                                                        steps.push({ label: safeT('dashboard.resolved', 'Resolved'), time: timeStr, icon: 'check_circle', color: 'text-green-400', bg: 'bg-slate-800 border-green-500' });
                                                    } else if (hazard.status === 'Invalid / Rejected' || hazard.status === 'Duplicate') {
                                                        steps.push({ label: safeT('status.' + hazard.status, hazard.status), time: '', icon: 'cancel', color: 'text-red-400', bg: 'bg-slate-800 border-red-500' });
                                                    } else if (hazard.status && hazard.status !== 'Pending' && hazard.status !== 'Reported') {
                                                        steps.push({ label: `${safeT('common.status', 'Status')}: ${safeT('status.' + hazard.status, hazard.status)}`, time: '', icon: 'update', color: 'text-yellow-400', bg: 'bg-slate-800 border-yellow-500' });
                                                    }
                                                }

                                                return steps.map((s, idx) => (
                                                    <div key={idx} className="flex gap-3 relative z-10 mb-4 last:mb-0">
                                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0 bg-slate-900 ${s.bg}`}>
                                                            <span className={`material-icons-round text-[10px] ${s.color}`}>{s.icon}</span>
                                                        </div>
                                                        <div>
                                                            <div className={`text-xs font-bold ${idx === steps.length - 1 ? 'text-white' : 'text-slate-300'}`}>{s.label}</div>
                                                            {s.time && <div className="text-[10px] text-slate-500 mt-0.5">{s.time}</div>}
                                                        </div>
                                                    </div>
                                                ));
                                            })()}
                                        </div>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-300 flex items-center gap-1 mt-2 truncate">
                                    <span className="material-icons-round text-[12px]">location_on</span>
                                    {hazard.landmark || hazard.address || `${hazard.lat?.toFixed(4)}, ${hazard.lng?.toFixed(4)}`}
                                </p>

                                {/* Public-safe Assignment Info */}
                                <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-gray-400 bg-white/5 p-2 rounded-lg border border-white/5">
                                    <div className="flex items-center gap-1.5">
                                        <span className="material-icons-round text-[14px] text-blue-400">badge</span>
                                        <span><strong className="text-gray-300">Assigned To:</strong> {getAssignmentDisplay(hazard)}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="material-icons-round text-[14px] text-emerald-400">schedule</span>
                                        <span><strong className="text-gray-300">Expected Review Window:</strong> 7 Days</span>
                                    </div>
                                </div>

                                {/* Admin Public Response Display */}
                                <div className="mt-4 p-3 rounded-xl bg-blue-900/20 border border-blue-500/20">
                                    <h5 className="text-[10px] font-black uppercase text-blue-400 tracking-widest mb-1 flex items-center gap-1.5">
                                        <span className="material-icons-round text-[12px]">admin_panel_settings</span>
                                        Admin Response
                                    </h5>
                                    <p className="text-xs text-gray-300 leading-relaxed italic">
                                        {hazard.adminPublicResponse ? hazard.adminPublicResponse : "No admin response yet."}
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-col items-end gap-2 pr-2">
                                <button 
                                    className="p-2 rounded-full bg-white/5 hover:bg-white/20 text-gray-300 hover:text-white transition-colors flex items-center justify-center w-8 h-8" 
                                    title={safeT('viewOnMap', 'View on Map')}
                                    onClick={() => navigateTo('map')}
                                >
                                    <span className="material-icons-round text-sm">chevron_right</span>
                                </button>
                            </div>
                        </div>
                    );})
                )}
            </div>

            {/* Bottom Accent Line */}
            <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-cyan-400 to-transparent opacity-50 shrink-0"></div>
        </section>
    );
};

export default DashboardScreen;
