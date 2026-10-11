import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { useLanguage } from '../contexts/LanguageContext';

const NotificationScreen = ({ isActive, toggleSidebar, currentUser, navigateTo }) => {
    const [notifications, setNotifications] = useState([]);
    const { t } = useLanguage();

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

    useEffect(() => {
        if (!isActive || !currentUser) return;

        const q = query(
            collection(db, 'users', currentUser.uid, 'notifications'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const notifs = [];
            snapshot.forEach((doc) => {
                notifs.push({ id: doc.id, ...doc.data() });
            });
            setNotifications(notifs);
        });

        return () => unsubscribe();
    }, [isActive, currentUser]);

    const markAsRead = async (id) => {
        if (!currentUser) return;
        try {
            await updateDoc(doc(db, 'users', currentUser.uid, 'notifications', id), {
                isRead: true
            });
        } catch (err) {
            console.error("Failed to mark as read", err);
        }
    };

    const markAllAsRead = async () => {
        if (!currentUser || notifications.length === 0) return;
        try {
            const batch = writeBatch(db);
            notifications.forEach(n => {
                if (!n.isRead) {
                    batch.update(doc(db, 'users', currentUser.uid, 'notifications', n.id), { isRead: true });
                }
            });
            await batch.commit();
        } catch (err) {
            console.error("Failed to mark all as read", err);
        }
    };

    if (!isActive) return null;

    return (
        <section className="absolute inset-0 bg-[#020617] text-white flex flex-col animate-fade-in z-40">
            {/* Header */}
            <header className="px-6 py-5 bg-[#020617] border-b border-white/5 flex items-center justify-between sticky top-0 z-50 shadow-xl">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={toggleSidebar} 
                        className="w-10 h-10 rounded-full bg-white/5 text-white flex items-center justify-center hover:bg-white/10 transition-colors"
                        aria-label="Menu"
                    >
                        <span className="material-icons-round">menu</span>
                    </button>
                    <h1 className="text-xl font-bold tracking-wide">{safeT('dashboard.notifications', 'Notifications')}</h1>
                </div>
                {notifications.some(n => !n.isRead) && (
                    <button 
                        onClick={markAllAsRead}
                        className="text-xs font-semibold text-blue-400 bg-blue-500/10 px-3 py-1.5 rounded-full hover:bg-blue-500/20 transition-colors"
                    >
                        {safeT('dashboard.markAllRead', 'Mark all read')}
                    </button>
                )}
            </header>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center px-6">
                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4">
                            <span className="material-icons-round text-4xl text-slate-500">notifications_off</span>
                        </div>
                        <h2 className="text-lg font-bold text-slate-300">{safeT('dashboard.noNotifications', 'No Notifications')}</h2>
                        <p className="text-sm text-slate-500 mt-2 max-w-xs">{safeT('dashboard.caughtUp', "You're all caught up! We'll let you know when there are updates on your reports or nearby hazards.")}</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {notifications.map((n) => {
                            const isStatus = n.type === 'status_update';
                            const isAlert = n.type === 'nearby_alert';
                            const isResponse = n.type === 'admin_response';
                            
                            let icon = 'notifications';
                            let iconColor = 'text-blue-400';
                            let iconBg = 'bg-blue-500/10';

                            if (isStatus) {
                                icon = 'track_changes';
                                iconColor = 'text-orange-400';
                                iconBg = 'bg-orange-500/10';
                            } else if (isAlert) {
                                icon = 'warning';
                                iconColor = 'text-red-400';
                                iconBg = 'bg-red-500/10';
                            } else if (isResponse) {
                                icon = 'forum';
                                iconColor = 'text-emerald-400';
                                iconBg = 'bg-emerald-500/10';
                            }

                            const timeString = n.createdAt?.toDate ? n.createdAt.toDate().toLocaleString() : 'Just now';

                            let translatedTitle = safeT('notifications.' + (n.type || 'default'), n.title);
                            let translatedMessage = n.message;
                            
                            // Advanced parsing to translate hardcoded Firestore messages
                            if (n.type === 'status_update') {
                                // Try to extract status from title (e.g. "Status Updated: Resolved")
                                const statusMatch = n.title?.match(/Status Updated:\s*(.*)/i);
                                const parsedStatus = statusMatch ? statusMatch[1].trim() : null;
                                
                                // Or handle "Report Assigned" case
                                if (n.title === 'Report Assigned') {
                                    translatedTitle = safeT('dashboard.reportSubmitted', 'Report Assigned');
                                    translatedMessage = safeT('notifications.statusUpdateMsgFallback', n.message);
                                } else if (parsedStatus) {
                                    const localizedStatus = safeT('status.' + parsedStatus, parsedStatus);
                                    const msgTemplate = safeT('notifications.statusUpdateMsg');
                                    translatedMessage = msgTemplate && msgTemplate !== 'notifications.statusUpdateMsg' ? msgTemplate.replace('{status}', localizedStatus) : n.message;
                                } else {
                                    translatedMessage = safeT('notifications.statusUpdateMsgFallback', n.message);
                                }
                            } else if (n.type === 'admin_response') {
                                translatedMessage = safeT('notifications.adminResponseMsg', n.message);
                            }

                            return (
                                <div 
                                    key={n.id}
                                    onClick={() => !n.isRead && markAsRead(n.id)}
                                    className={`relative p-5 rounded-2xl border transition-all ${
                                        n.isRead 
                                        ? 'bg-slate-900/50 border-white/5 opacity-80' 
                                        : 'bg-slate-800 border-white/10 shadow-lg cursor-pointer hover:bg-slate-700'
                                    }`}
                                >
                                    {!n.isRead && (
                                        <span className="absolute top-5 right-5 w-2 h-2 bg-blue-500 rounded-full"></span>
                                    )}
                                    
                                    <div className="flex gap-4">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${iconBg} ${iconColor}`}>
                                            <span className="material-icons-round">{icon}</span>
                                        </div>
                                        <div>
                                            <h3 className={`text-sm font-bold ${n.isRead ? 'text-slate-300' : 'text-white'}`}>{translatedTitle}</h3>
                                            <p className="text-xs text-slate-400 mt-1 leading-relaxed">{translatedMessage}</p>
                                            <span className="text-[10px] text-slate-500 mt-3 block uppercase tracking-widest">{timeString}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </section>
    );
};

export default NotificationScreen;
