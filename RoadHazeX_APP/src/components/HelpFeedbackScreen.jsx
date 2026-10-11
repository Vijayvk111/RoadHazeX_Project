import React, { useState } from 'react';
import { Menu, Chat } from '@carbon/icons-react';
import { useLanguage } from '../contexts/LanguageContext';
import { db, storage } from '../firebase';
import { collection, addDoc, updateDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import imageCompression from 'browser-image-compression';

const HelpFeedbackScreen = ({ isActive, toggleSidebar, currentUser, currentUserLocation }) => {
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState('support'); // support, bug, field_test
    const [isOfficialTester, setIsOfficialTester] = useState(false);

    // Check Tester Role
    React.useEffect(() => {
        const checkTesterStatus = async () => {
            if (!currentUser) {
                setIsOfficialTester(false);
                return;
            }
            if (currentUser.email?.toLowerCase() === 'roadhazex@gmail.com') {
                setIsOfficialTester(true);
                return;
            }
            try {
                const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    if (data.role === 'pilot_tester' || data.isFieldTester === true) {
                        setIsOfficialTester(true);
                        return;
                    }
                }
            } catch (err) {
                console.error("Error checking tester status", err);
            }
            setIsOfficialTester(false);
        };
        checkTesterStatus();
    }, [currentUser]);

    // Bug Report State
    const [bugForm, setBugForm] = useState({ screenName: 'Map', issueType: 'Map issue', description: '' });
    const [isSubmittingBug, setIsSubmittingBug] = useState(false);
    const [screenshotFile, setScreenshotFile] = useState(null);
    const [screenshotPreview, setScreenshotPreview] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);

    if (!isActive) return null;

    const handleWhatsAppSupport = () => {
        alert("WhatsApp Support integration coming soon!");
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) {
            setScreenshotFile(null);
            setScreenshotPreview(null);
            return;
        }

        // Validate type
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            alert('Invalid file type. Please upload a JPEG, PNG, or WebP image.');
            return;
        }

        // Validate size (max 5MB, we will compress it down)
        if (file.size > 5 * 1024 * 1024) {
            alert('File is too large. Please select an image under 5MB.');
            return;
        }

        try {
            const options = {
                maxSizeMB: 2,
                maxWidthOrHeight: 1280,
                useWebWorker: true,
                initialQuality: 0.75
            };
            const compressedFile = await imageCompression(file, options);
            setScreenshotFile(compressedFile);
            setScreenshotPreview(URL.createObjectURL(compressedFile));
        } catch (error) {
            console.error('Error compressing image:', error);
            alert('Failed to process image. Please try again.');
        }
    };

    const handleBugSubmit = async (e) => {
        e.preventDefault();
        if (!currentUser) return alert("Must be logged in");
        setIsSubmittingBug(true);
        setUploadProgress(0);

        try {
            // Step 2: Create bugReports document first
            const docRef = await addDoc(collection(db, 'bugReports'), {
                userId: currentUser.uid,
                ...bugForm,
                timestamp: serverTimestamp(),
                latitude: currentUserLocation?.lat || null,
                longitude: currentUserLocation?.lng || null,
                appVersion: '1.0.0 (Phase 8.1)',
                userAgent: navigator.userAgent,
                status: 'Open'
            });

            // Step 4: Upload screenshot if available
            if (screenshotFile) {
                const extension = screenshotFile.name?.split('.').pop() || 'jpg';
                const fileName = `${Date.now()}.${extension}`;
                const storagePath = `bug_reports/${currentUser.uid}/${docRef.id}/${fileName}`;
                const storageRef = ref(storage, storagePath);

                const uploadTask = uploadBytesResumable(storageRef, screenshotFile);

                await new Promise((resolve, reject) => {
                    uploadTask.on(
                        'state_changed',
                        (snapshot) => {
                            const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                            setUploadProgress(progress);
                        },
                        (error) => reject(error),
                        async () => {
                            try {
                                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                                
                                // Step 6: Update document with metadata
                                await updateDoc(doc(db, 'bugReports', docRef.id), {
                                    screenshot: {
                                        storagePath,
                                        downloadURL,
                                        fileName,
                                        contentType: screenshotFile.type || 'image/jpeg',
                                        sizeBytes: screenshotFile.size,
                                        uploadedAt: serverTimestamp()
                                    }
                                });
                                resolve();
                            } catch (err) {
                                reject(err);
                            }
                        }
                    );
                });
            }

            alert("Bug report submitted successfully. Thank you!");
            setBugForm({ screenName: 'Map', issueType: 'Map issue', description: '' });
            setScreenshotFile(null);
            setScreenshotPreview(null);
            setUploadProgress(0);
        } catch (error) {
            console.error(error);
            alert("Failed to submit bug report.");
        } finally {
            setIsSubmittingBug(false);
        }
    };

    return (
        <div className="absolute inset-0 z-10 bg-[#020617] overflow-y-auto no-scrollbar animate-in fade-in duration-500 flex flex-col items-center py-20">
            {/* Top Bar for Mobile Menu */}
            <div className="absolute top-4 left-4 z-[50]">
                <button
                    onClick={toggleSidebar}
                    className="p-3 rounded-full bg-neutral-900/80 backdrop-blur-md border border-neutral-800 text-white shadow-xl hover:bg-neutral-800 transition-all hover:scale-110"
                >
                    <Menu size={24} />
                </button>
            </div>

            {/* Content Container */}
            <div className="max-w-xl w-full px-6">
                
                {/* Tabs */}
                <div className="flex bg-slate-900 p-1 rounded-xl mb-8">
                    <button onClick={() => setActiveTab('support')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'support' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>Support</button>
                    <button onClick={() => setActiveTab('bug')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'bug' ? 'bg-red-600 text-white' : 'text-slate-400'}`}>Report Bug</button>
                    {isOfficialTester && (
                        <button onClick={() => setActiveTab('field_test')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'field_test' ? 'bg-purple-600 text-white' : 'text-slate-400'}`}>Field Test</button>
                    )}
                </div>

                {activeTab === 'support' && (
                    <div className="text-center">
                        <div className="text-center mb-12">
                            <div className="w-20 h-20 bg-blue-500/10 rounded-3xl mx-auto flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(59,130,246,0.2)]">
                                <Chat size={40} className="text-blue-400" />
                            </div>
                            <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-neutral-200 to-neutral-400 tracking-tight uppercase shadow-sm">
                                {t('support.title')}
                            </h1>
                            <div className="w-24 h-1.5 bg-gradient-to-r from-blue-500 to-cyan-400 mx-auto mt-4 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
                        </div>

                        <p 
                            className="text-neutral-400 text-lg md:text-xl text-center max-w-2xl mx-auto mb-12 leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: t('support.desc') }}
                        />
                        
                        <a 
                            href="mailto:vijaykumard111vk@gmail.com?subject=RoadHazeX%20Support%20Request"
                            className="group relative inline-flex items-center justify-center gap-3 bg-gradient-to-r from-blue-500 to-cyan-600 text-white font-bold text-lg px-8 py-4 rounded-2xl w-full sm:w-auto shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_40px_rgba(59,130,246,0.5)] hover:-translate-y-1 transition-all duration-300 overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
                            <span className="relative z-10">{t('support.btn')}</span>
                            <Chat size={20} className="relative z-10" />
                        </a>
                    </div>
                )}

                {activeTab === 'bug' && (
                    <div className="bg-slate-900/60 p-6 rounded-3xl border border-white/5">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center text-red-400"><span className="material-icons-round">bug_report</span></div>
                            <h2 className="text-2xl font-black text-white">Report a Bug</h2>
                        </div>
                        <form onSubmit={handleBugSubmit} className="space-y-4 text-left">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1">Issue Type</label>
                                <select 
                                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-red-500 transition-colors"
                                    value={bugForm.issueType}
                                    onChange={e => setBugForm({...bugForm, issueType: e.target.value})}
                                >
                                    {['Map issue', 'Navigation issue', 'Voice alert issue', 'Report submission issue', 'Dashboard issue', 'Login issue', 'Other'].map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1">Screen Name</label>
                                <input 
                                    type="text"
                                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-red-500 transition-colors"
                                    value={bugForm.screenName}
                                    onChange={e => setBugForm({...bugForm, screenName: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1">Description</label>
                                <textarea 
                                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-red-500 transition-colors min-h-[120px]"
                                    placeholder="Describe the issue in detail..."
                                    value={bugForm.description}
                                    required
                                    onChange={e => setBugForm({...bugForm, description: e.target.value})}
                                />
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1">Optional Screenshot</label>
                                
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl mb-3 flex items-start gap-3">
                                    <span className="material-icons-round text-red-400 text-sm mt-0.5">privacy_tip</span>
                                    <p className="text-[10px] text-red-300/80 leading-relaxed">
                                        <strong>Privacy Warning:</strong> Please avoid uploading screenshots that contain passwords, personal messages, or sensitive information.
                                    </p>
                                </div>

                                {!screenshotPreview ? (
                                    <div className="relative w-full h-24 border-2 border-dashed border-white/10 hover:border-red-500/50 rounded-xl flex items-center justify-center bg-slate-950 transition-colors group cursor-pointer overflow-hidden">
                                        <input 
                                            type="file" 
                                            accept="image/jpeg, image/png, image/webp"
                                            onChange={handleFileChange}
                                            disabled={isSubmittingBug}
                                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                                        />
                                        <div className="flex flex-col items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity pointer-events-none">
                                            <span className="material-icons-round text-2xl text-slate-400">add_photo_alternate</span>
                                            <span className="text-xs font-bold text-slate-400">Tap to attach image</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="relative w-full h-40 border border-white/10 rounded-xl bg-slate-950 overflow-hidden">
                                        <img src={screenshotPreview} alt="Preview" className="w-full h-full object-contain" />
                                        
                                        {!isSubmittingBug && (
                                            <button 
                                                type="button"
                                                onClick={() => { setScreenshotPreview(null); setScreenshotFile(null); }}
                                                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center shadow-xl hover:scale-110 transition-transform z-20"
                                            >
                                                <span className="material-icons-round text-sm">close</span>
                                            </button>
                                        )}
                                        
                                        {isSubmittingBug && uploadProgress > 0 && (
                                            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-20">
                                                <div className="w-10 h-10 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin"></div>
                                                <div className="text-xs font-bold text-white tracking-widest">{uploadProgress}%</div>
                                                <div className="w-3/4 h-1 bg-slate-800 rounded-full overflow-hidden">
                                                    <div className="h-full bg-red-500 rounded-full transition-all duration-300" style={{width: `${uploadProgress}%`}}></div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <button 
                                type="submit" 
                                disabled={isSubmittingBug}
                                className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(220,38,38,0.3)] disabled:opacity-50"
                            >
                                {isSubmittingBug ? 'Submitting...' : 'Submit Bug Report'}
                            </button>
                            <p className="text-[10px] text-slate-500 text-center mt-2">GPS Location and Device Info will be securely attached.</p>
                        </form>
                    </div>
                )}

                {isOfficialTester && activeTab === 'field_test' && (
                    <div className="bg-slate-900/60 p-6 rounded-3xl border border-white/5 text-center">
                        <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-400 mx-auto mb-4"><span className="material-icons-round text-2xl">speed</span></div>
                        <h2 className="text-2xl font-black text-white mb-2">Pilot Field Testing</h2>
                        <p className="text-sm text-slate-400 mb-6">Start a Field Test Session to log metrics for pilot reporting. You can also trigger Demo Mode here.</p>
                        
                        <div className="space-y-3">
                            <button onClick={() => window.dispatchEvent(new Event('start-field-test'))} className="w-full py-3 border border-purple-500/30 bg-purple-500/10 text-purple-400 font-bold rounded-xl hover:bg-purple-500/20 transition-all">
                                Start Live Test Session
                            </button>
                            <button onClick={() => window.dispatchEvent(new Event('trigger-demo-mode'))} className="w-full py-3 border border-blue-500/30 bg-blue-500/10 text-blue-400 font-bold rounded-xl hover:bg-blue-500/20 transition-all">
                                Start Simulated Demo
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HelpFeedbackScreen;
