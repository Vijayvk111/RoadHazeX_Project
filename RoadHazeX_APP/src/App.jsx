import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import HomeScreen from './components/HomeScreen';
import ReportScreen from './components/ReportScreen';
import MapScreen from './components/MapScreen';
import DashboardScreen from './components/DashboardScreen';
import LoginScreen from './components/LoginScreen';
import SuccessOverlay from './components/SuccessOverlay';
import AboutScreen from './components/AboutScreen';
import HelpFeedbackScreen from './components/HelpFeedbackScreen';
import NotificationScreen from './components/NotificationScreen';

import { db, storage, auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth'; 
import { collection, addDoc, onSnapshot, serverTimestamp, query, orderBy, getDocs, writeBatch, doc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import * as turf from '@turf/turf';
import { encodeGeohash } from './utils/geohash';

import HeroSection from './components/HeroSection';

function App() {
    const [currentScreen, setCurrentScreen] = useState('hero');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [successData, setSuccessData] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    
    const [user, setUser] = useState(null);
    const [isAuthLoaded, setIsAuthLoaded] = useState(false);
    const [currentUserLocation, setCurrentUserLocation] = useState(null);
    const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

    useEffect(() => {
        if (!user) {
            setUnreadNotificationsCount(0);
            return;
        }
        
        const q = query(
            collection(db, 'users', user.uid, 'notifications'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            let unread = 0;
            snapshot.forEach(doc => {
                if (!doc.data().isRead) unread++;
            });
            setUnreadNotificationsCount(unread);
        });

        return () => unsubscribe();
    }, [user]);

    // Track User Location
    useEffect(() => {
        if (!navigator.geolocation) return;
        
        const watchId = navigator.geolocation.watchPosition(
            (pos) => {
                setCurrentUserLocation({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    accuracy: pos.coords.accuracy,
                    speed: pos.coords.speed,
                    heading: pos.coords.heading,
                    timestamp: pos.timestamp
                });
            },
            (err) => {
                console.warn("GPS Error:", err);
                if (err.code === 1) { // PERMISSION_DENIED
                    alert("GPS Access Denied: RoadHazeX requires your location to navigate and report hazards. Please enable location permissions in your browser/device settings.");
                }
            },
            { enableHighAccuracy: true }
        );
        
        return () => navigator.geolocation.clearWatch(watchId);
    }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (authUser) => {
            setUser(authUser);
            setIsAuthLoaded(true);
        });
        return () => unsubscribe();
    }, []);

    // Offline / Online Network Detection
    useEffect(() => {
        const handleOffline = () => alert("You are offline. Some features may not work.");
        const handleOnline = () => alert("You are back online.");
        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);
        return () => {
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
        };
    }, []);

    // Expose Admin-Only Geohash Migration Script on window
    useEffect(() => {
        window.runGeohashMigration = async () => {
            console.log("Starting Geohash Migration...");
            try {
                const q = query(collection(db, 'hazards'));
                const snap = await getDocs(q);
                let count = 0;
                const batch = writeBatch(db);
                
                snap.forEach(docSnap => {
                    const data = docSnap.data();
                    if (!data.geohash && data.lat && data.lng) {
                        const hash = encodeGeohash(Number(data.lat), Number(data.lng));
                        batch.update(docSnap.ref, { geohash: hash });
                        count++;
                    }
                });
                
                if (count > 0) {
                    await batch.commit();
                }
                console.log(`Geohash Migration Completed! Migrated ${count} hazards.`);
                alert(`Successfully migrated ${count} hazards!`);
            } catch (err) {
                console.error("Migration failed:", err);
                alert("Migration failed: " + err.message);
            }
        };
    }, []);

    // Auto-redirect logged-in users from Hero
    useEffect(() => {
        if (user && currentScreen === 'hero') {
            navigateTo('home');
        }
    }, [user, currentScreen]);

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    const navigateTo = (screen) => {
        setCurrentScreen(screen);
        setIsSidebarOpen(false);
    };

    const submitReport = async (hazardData) => {
        if (!user) {
            setCurrentScreen('login');
            return;
        }

        // Show instant success message and redirect to map immediately
        setSuccessData(hazardData);
        setCurrentScreen('map');
        setIsUploading(true);

        try {
            let imageUrl = '';
            if (hazardData.image) {
                const storagePath = `hazards/${Date.now()}.png`;
                const storageRef = ref(storage, storagePath);
                await uploadString(storageRef, hazardData.image, 'data_url');
                imageUrl = await getDownloadURL(storageRef);
            }

            const docData = {
                type: hazardData.type,
                lat: hazardData.lat,
                lng: hazardData.lng,
                geohash: encodeGeohash(Number(hazardData.lat), Number(hazardData.lng)),
                address: hazardData.address || "Unknown Location", // Used as Landmark
                landmark: hazardData.address || "Unknown Location",
                priority: hazardData.priority || "Medium",
                image: imageUrl,
                confidence: hazardData.confidence || 0.85,
                timestamp: serverTimestamp(),
                userId: user.uid,
                reporterName: user.displayName || 'Anonymous',
                reportCount: 1,
                status: hazardData.status || 'Pending',
                verification_status: hazardData.status === 'Verified' ? 'Verified' : 'Pending',
                resolved: false,
                isCritical: hazardData.priority === 'High',
                jurisdiction: hazardData.jurisdiction || { Authority: 'Unknown Jurisdiction' },
                locationValidation: hazardData.locationValidation || { validationStatus: "unknown" },
                aiPrediction: {
                    hazardType: hazardData.aiPredictionType || hazardData.type,
                    confidence: hazardData.confidence || 0.85,
                    modelVersion: "v3-finetuned",
                    predictedAt: serverTimestamp()
                },
                isDemo: window.isDemoMode === true,
                isFieldTest: window.isFieldTest === true
            };
            
            if (hazardData.aiReviewStatus) {
                docData.aiReviewStatus = hazardData.aiReviewStatus;
                if (hazardData.aiReviewStatus === 'mismatch') {
                    docData.validationFlags = { aiMismatch: true };
                }
            }
            const batch = writeBatch(db);
            
            const hazardRef = doc(collection(db, 'hazards'));
            batch.set(hazardRef, docData);
            
            const publicData = {
                type: hazardData.type,
                lat: hazardData.lat,
                lng: hazardData.lng,
                geohash: docData.geohash,
                address: hazardData.address || "Unknown Location",
                landmark: hazardData.address || "Unknown Location",
                priority: hazardData.priority || "Medium",
                timestamp: serverTimestamp(),
                reportCount: 1,
                status: hazardData.status || 'Pending',
                resolved: false,
                isCritical: hazardData.priority === 'High',
                jurisdiction: hazardData.jurisdiction || { Authority: 'Unknown Jurisdiction' },
                isDemo: window.isDemoMode === true,
                isFieldTest: window.isFieldTest === true
            };
            
            // Save safe fields to public collection using the SAME document ID
            const publicHazardRef = doc(db, 'publicHazards', hazardRef.id);
            batch.set(publicHazardRef, publicData);
            
            await batch.commit();
            
        } catch (error) {
            console.error("Firebase submit error:", error);
            alert("Error reporting hazard: " + error.message);
        } finally {
            setIsUploading(false);
        }
    };

    if (!isAuthLoaded) {
        return (
            <div className="fixed inset-0 bg-[#0d1b3e] flex items-center justify-center">
                 <div className="w-12 h-12 border-4 border-white/10 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    const renderContent = () => {
        if (currentScreen === 'hero') {
            return (
                <HeroSection 
                    onGetStarted={() => {
                        if (user) navigateTo('home');
                        else navigateTo('login');
                    }} 
                    onMenuClick={toggleSidebar}
                    isSidebarOpen={isSidebarOpen}
                />
            );
        }

        if (!user || currentScreen === 'login') {
            return <LoginScreen onBack={() => navigateTo('hero')} />;
        }

        // Protect Admin Route (State-based & URL-based if applicable)
        if (currentScreen === 'admin') {
            const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
            if (!isAdmin) {
                return (
                    <div className="flex flex-col items-center justify-center h-screen bg-[#020617] text-white">
                        <h1 className="text-4xl font-bold text-red-500 mb-4">Access Denied</h1>
                        <p className="text-neutral-400 mb-6">You do not have permission to view the Admin Panel.</p>
                        <button onClick={() => navigateTo('home')} className="px-6 py-2 bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors">
                            Return Home
                        </button>
                    </div>
                );
            }
        }

        return (
            <>
                <Sidebar 
                    isOpen={isSidebarOpen} 
                    toggleSidebar={toggleSidebar} 
                    navigateTo={navigateTo} 
                    currentScreen={currentScreen}
                />

                <main className="relative w-full h-full transition-transform duration-300">
                    <HomeScreen
                        isActive={currentScreen === 'home'}
                        navigateTo={navigateTo}
                        toggleSidebar={toggleSidebar}
                    />
                    <ReportScreen
                        isActive={currentScreen === 'report'}
                        navigateTo={navigateTo}
                        toggleSidebar={toggleSidebar}
                        currentUserLocation={currentUserLocation}
                        onSubmit={(type, img, conf, status, addr, jurisdiction, priority, locationValidation, aiPredictionStr, aiReviewStatus) => {
                            submitReport({
                                type,
                                image: img,
                                lat: currentUserLocation?.lat,
                                lng: currentUserLocation?.lng,
                                confidence: conf,
                                status,
                                address: addr, // Serves as landmark
                                jurisdiction: jurisdiction,
                                priority: priority,
                                locationValidation: locationValidation,
                                aiPredictionType: aiPredictionStr,
                                aiReviewStatus: aiReviewStatus
                            });
                        }}
                    />
                    <MapScreen
                        isActive={currentScreen === 'map'}
                        toggleSidebar={toggleSidebar}
                        navigateTo={navigateTo}
                        currentUserLocation={currentUserLocation}
                    />
                    <DashboardScreen
                        isActive={currentScreen === 'dashboard'}
                        navigateTo={navigateTo}
                        currentUser={user}
                        toggleSidebar={toggleSidebar}
                    />
                    <AboutScreen
                        isActive={currentScreen === 'about'}
                        toggleSidebar={toggleSidebar}
                    />
                    <HelpFeedbackScreen
                        isActive={currentScreen === 'support'}
                        toggleSidebar={toggleSidebar}
                        currentUser={user}
                        currentUserLocation={currentUserLocation}
                    />
                    <NotificationScreen
                        isActive={currentScreen === 'notifications'}
                        toggleSidebar={toggleSidebar}
                        currentUser={user}
                        navigateTo={navigateTo}
                    />
                </main>

                {/* Global Notification Bell */}
                {user && currentScreen !== 'hero' && currentScreen !== 'login' && currentScreen !== 'admin' && (
                    <div className="absolute top-4 right-4 z-50">
                        <button
                            onClick={() => navigateTo('notifications')}
                            className="w-12 h-12 rounded-full bg-white/60 text-gray-800 backdrop-blur-md flex items-center justify-center shadow-sm hover:bg-white/80 transition-all relative"
                            aria-label="Notifications"
                        >
                            <span className="material-icons-round text-2xl">notifications</span>
                            {unreadNotificationsCount > 0 && (
                                <span className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
                            )}
                        </button>
                    </div>
                )}

                <SuccessOverlay 
                    visible={!!successData} 
                    hazardData={successData} 
                    onDone={() => setSuccessData(null)} 
                />
            </>
        );
    };

    return (
        <div className={`relative w-full ${currentScreen === 'hero' ? 'min-h-screen' : 'h-screen overflow-hidden'} bg-[#020617] shadow-2xl`}>
            {renderContent()}
        </div>
    );
}

export default App;
