import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { collection, onSnapshot, query, orderBy, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import AdminDashboard from './AdminDashboard';

function App() {
  const [hazards, setHazards] = useState([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [isCheckingRole, setIsCheckingRole] = useState(true);
  const [user, setUser] = useState(null);
  const [isAuthLoaded, setIsAuthLoaded] = useState(false);

  const AUTHORIZED_EMAIL = 'roadhazex@gmail.com';

  // --- Auth & Role Sync ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      setUser(authUser);
      setIsAuthLoaded(true);

      if (authUser) {
        setIsCheckingRole(true);
        const userEmail = authUser.email;
        const userDocRef = doc(db, "users", authUser.uid);
        
        console.log(`🔍 Checking Admin Access for: ${userEmail}`);

        try {
          const userSnap = await getDoc(userDocRef);
          
          // Allowed roles for Phase 3
          const ALLOWED_ROLES = ['superadmin', 'admin', 'gcc_admin', 'state_highways_admin', 'nhai_admin', 'rural_admin'];
          
          if (userSnap.exists()) {
            const cloudRole = userSnap.data().role;
            // Force superadmin role for official email
            if (userEmail.toLowerCase() === AUTHORIZED_EMAIL.toLowerCase() && cloudRole !== 'superadmin') {
              await setDoc(userDocRef, { role: 'superadmin' }, { merge: true });
              setUserRole('superadmin');
            } else {
              setUserRole(cloudRole);
            }
          } else {
            // Auto-assign superadmin role for official account
            const initialRole = userEmail.toLowerCase() === AUTHORIZED_EMAIL.toLowerCase() ? 'superadmin' : 'user';
            await setDoc(userDocRef, {
              email: userEmail,
              role: initialRole,
              displayName: authUser.displayName || 'Unknown Official',
              createdAt: serverTimestamp()
            });
            setUserRole(initialRole);
          }
        } catch (err) {
          console.error("Role sync error:", err);
        } finally {
          setIsCheckingRole(false);
        }
      } else {
        setUserRole(null);
        setIsCheckingRole(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // --- Real-time Hazard Listener ---
  useEffect(() => {
    const ALLOWED_ROLES = ['superadmin', 'admin', 'gcc_admin', 'state_highways_admin', 'nhai_admin', 'rural_admin'];
    
    if (user && ALLOWED_ROLES.includes(userRole)) {
        const q = query(collection(db, "hazards"), orderBy("timestamp", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const hazardList = [];
          snapshot.forEach((doc) => {
            hazardList.push({ id: doc.id, ...doc.data() });
          });
          setHazards(hazardList);
          setIsDataLoaded(true);
        }, (error) => {
          console.error("Firebase fetch error:", error);
        });
        return () => unsubscribe();
    }
  }, [user, userRole]);

  const handleLogin = async () => {
      const provider = new GoogleAuthProvider();
      try {
          await signInWithPopup(auth, provider);
      } catch (err) {
          console.error("Login Error:", err);
          alert("Login failed: " + err.message);
      }
  };

  const handleSignOut = () => signOut(auth);

  if (!isAuthLoaded) {
    return (
        <div className="w-full h-screen bg-[#020617] flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
    );
  }

  // --- Main Render Logic ---
  if (!user) {
    /* Sign In View */
    return (
        <div className="w-full h-screen bg-[#050B18] overflow-hidden flex flex-col items-center justify-center p-6 relative">
             <div className="absolute inset-0 opacity-10 pointer-events-none mix-blend-screen" style={{ backgroundImage: 'radial-gradient(#2F80FF 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
             <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[#2F80FF]/15 rounded-full blur-[160px]"></div>
             <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#00D4FF]/15 rounded-full blur-[140px]"></div>

             <div className="relative z-10 w-full max-w-[1240px] flex flex-col md:flex-row items-center gap-20">
                  <div className="flex-1 text-center md:text-left space-y-6">
                      <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-[#2F80FF]/10 border border-[#2F80FF]/20 mb-2">
                          <span className="material-icons-round text-[#2F80FF] text-sm">security</span>
                          <span className="text-[11px] font-black text-[#2F80FF] uppercase tracking-[0.2em]">Secure Municipal Access</span>
                      </div>
                      <h1 className="text-5xl md:text-7xl font-black text-white leading-[1.1] tracking-tighter">
                         ROADHAZEX<br/>
                         <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2F80FF] to-[#00D4FF]">AUTHORITY CONSOLE</span>
                      </h1>
                      <h2 className="text-xl md:text-2xl font-bold text-white mb-2">AI + GIS Road Hazard Monitoring System</h2>
                      <p className="text-lg text-[#8EA0B8] font-medium max-w-md leading-relaxed mb-8">
                         Monitor reported road hazards, verify incidents, assign responsible teams, and track resolution progress through a centralized authority dashboard.
                      </p>
                      
                      <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                          <span className="px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-bold text-blue-300 flex items-center gap-2"><span className="material-icons-round text-[14px]">fact_check</span> Hazard Review</span>
                          <span className="px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-xs font-bold text-orange-300 flex items-center gap-2"><span className="material-icons-round text-[14px]">assignment_ind</span> Officer Assignment</span>
                          <span className="px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs font-bold text-cyan-300 flex items-center gap-2"><span className="material-icons-round text-[14px]">public</span> GIS Monitoring</span>
                          <span className="px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-xs font-bold text-green-300 flex items-center gap-2"><span className="material-icons-round text-[14px]">timer</span> SLA Tracking</span>
                      </div>
                 </div>

                 <div className="w-full max-w-md bg-slate-950/60 backdrop-blur-3xl p-10 rounded-[40px] border border-white/10 shadow-3xl text-center space-y-8 group relative overflow-hidden">
                      <div className="w-20 h-20 rounded-full bg-[#050B18] border border-[#2F80FF]/30 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(47,128,255,0.2)] group-hover:shadow-[0_0_50px_rgba(47,128,255,0.4)] group-hover:border-[#2F80FF]/50 transition-all">
                          <span className="material-icons-round text-[#2F80FF] text-4xl group-hover:scale-110 transition-transform">admin_panel_settings</span>
                      </div>
                      <div>
                          <h2 className="text-2xl font-black text-white mb-2">Official Access</h2>
                          <p className="text-[#8EA0B8] text-xs font-bold uppercase tracking-widest">Administrative Verification Required</p>
                      </div>
                      <div className="space-y-4">
                          <button 
                            onClick={handleLogin}
                            className="w-full flex items-center justify-center gap-4 bg-white/5 hover:bg-white/10 px-6 py-4 rounded-2xl border border-white/10 hover:border-white/30 transition-all active:scale-95 shadow-2xl"
                          >
                             <svg className="w-6 h-6 shrink-0" viewBox="0 0 48 48">
                                <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
                                <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
                                <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
                                <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571 c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
                             </svg>
                             <span className="text-white font-black text-[13px] tracking-wide text-left leading-tight">Continue with Official Google Account</span>
                          </button>
                          <p className="text-[11px] text-[#8EA0B8] leading-tight px-4">
                             Only authorized RoadHazeX administrative accounts can access this console.
                          </p>
                      </div>
                      <div className="pt-4 border-t border-white/5 flex items-center justify-center gap-2 text-[#8EA0B8]">
                          <span className="material-icons-round text-[14px] text-green-400">lock</span>
                          <span className="text-[10px] font-bold uppercase tracking-widest">Secure Admin Login</span>
                      </div>
                 </div>
             </div>
             
             <div className="absolute bottom-6 w-full text-center">
                 <p className="text-[10px] font-bold text-[#8EA0B8] uppercase tracking-widest">
                     &copy; {new Date().getFullYear()} RoadHazeX | Safer Roads. Smarter Cities.
                 </p>
             </div>
        </div>
    );
  }

  if (isCheckingRole) {
    return (
        <div className="w-full h-screen bg-[#020617] flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
    );
  }

  const ALLOWED_ROLES = ['superadmin', 'admin', 'gcc_admin', 'state_highways_admin', 'nhai_admin', 'rural_admin'];
  const isAuthorized = ALLOWED_ROLES.includes(userRole) && user.email?.toLowerCase() === AUTHORIZED_EMAIL.toLowerCase();

  return (
    <div className="w-full h-screen bg-[#020617] overflow-hidden">
        {isAuthorized ? (
          <div className="w-full h-full flex flex-col relative animate-fade-in min-h-0">
               <div className="fixed top-6 right-8 z-[100] group flex items-center gap-3 bg-slate-900/40 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/5 shadow-3xl">
                   <div className="flex flex-col items-end mr-3">
                       <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Official Account</span>
                       <span className="text-xs font-bold text-white mt-1">{user.displayName}</span>
                   </div>
                   {user.photoURL && <img src={user.photoURL} alt="avatar" className="w-10 h-10 rounded-xl border border-blue-500/30 shadow-lg" />}
                   <button 
                        onClick={handleSignOut}
                        className="w-10 h-10 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 flex items-center justify-center transition-all border border-orange-500/20"
                        title="Disconnect Console"
                   >
                        <span className="material-icons-round text-xl">power_settings_new</span>
                   </button>
               </div>
               <AdminDashboard hazards={hazards} userRole={userRole} />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center p-6 bg-command-center relative overflow-hidden">
               <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-3xl p-10 rounded-[40px] border border-red-500/20 shadow-2xl relative z-10 text-center space-y-6">
                    <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border border-red-500/20">
                        <span className="material-icons-round text-red-500 text-4xl">gpp_maybe</span>
                    </div>
                    <h2 className="text-3xl font-black text-white leading-tight uppercase tracking-tighter">Access <br/> Denied</h2>
                    <p className="text-slate-400 text-sm font-medium leading-relaxed">
                        The account <strong>{user.email}</strong> is not recognized as an Official Admin. 
                        Please disconnect and identify with official credentials.
                    </p>
                    <button 
                        onClick={handleSignOut}
                        className="w-full py-4 rounded-3xl bg-red-500 text-white font-black uppercase tracking-widest text-sm shadow-xl shadow-red-900/40 transform active:scale-95 transition-all"
                    >
                        Disconnect User
                    </button>
               </div>
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-600/10 rounded-full blur-[120px] -z-10"></div>
          </div>
        )}
    </div>
  );
}

export default App;
