"use client";

import React, { useState } from "react";
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import {
  Dashboard,
  Task,
  Map,
  Security,
  Report,
  Analytics,
  Settings as SettingsIcon,
  User as UserIcon,
  ChevronDown as ChevronDownIcon,
  AddLarge,
  View,
  Logout
} from "@carbon/icons-react";
import { useLanguage } from "../contexts/LanguageContext";

const softSpringEasing = "cubic-bezier(0.25, 1.1, 0.4, 1)";

function BrandBadge() {
  return (
    <div className="relative shrink-0 w-full animate-in fade-in slide-in-from-left-4 duration-500">
      <div className="flex items-center p-1 w-full">
        <div className="h-10 w-10 flex items-center justify-center">
          <img src="/logo.png" alt="RoadHazeX Logo" className="w-full h-full object-contain" />
        </div>
        <div className="px-2 py-1">
          <div className="font-bold text-[16px] text-neutral-50 tracking-tight">
            RoadHazeX
          </div>
        </div>
      </div>
    </div>
  );
}

function AvatarCircle() {
  const user = auth.currentUser;
  return (
    <div className="relative rounded-full shrink-0 size-8 bg-neutral-900 border border-neutral-800 shadow-lg">
      <div className="flex items-center justify-center size-8 overflow-hidden rounded-full font-bold">
        {user?.photoURL ? (
            <img src={user.photoURL} alt="P" className="size-full object-cover" />
        ) : (
            <UserIcon size={16} className="text-neutral-50" />
        )}
      </div>
    </div>
  );
}

function IconNavButton({
  children,
  isActive = false,
  onClick,
  label,
}) {
  return (
    <button
      type="button"
      title={label}
      className={`flex items-center justify-center rounded-xl size-10 min-w-10 transition-all duration-300
        ${isActive ? "bg-neutral-800 text-white shadow-xl scale-110" : "hover:bg-neutral-800/50 text-neutral-500 hover:text-neutral-200"}`}
      style={{ transitionTimingFunction: softSpringEasing }}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function MenuItem({
  item,
  isExpanded,
  onToggle,
  onItemClick,
  isCollapsed,
  currentScreen
}) {
  const handleClick = () => {
    if (item.hasDropdown && onToggle) onToggle();
    else onItemClick?.();
  };

  return (
    <div className={`relative shrink-0 transition-all duration-500 ${isCollapsed ? "w-full flex justify-center" : "w-full"}`}>
      <div
        className={`rounded-xl cursor-pointer transition-all duration-300 flex items-center relative ${
          (item.isActive || item.id === currentScreen) ? "bg-white/10 text-white shadow-[0_0_20px_rgba(255,255,255,0.05)]" : "hover:bg-neutral-800/50 text-neutral-400 hover:text-white"
        } ${isCollapsed ? "w-10 min-w-10 h-10 justify-center" : "w-full h-11 px-3 py-2"}`}
        onClick={handleClick}
      >
        <div className="flex items-center justify-center shrink-0">{item.icon}</div>
        <div className={`flex-1 relative transition-all duration-500 overflow-hidden ${isCollapsed ? "opacity-0 w-0" : "opacity-100 ml-3"}`}>
          <div className="text-[14px] font-medium leading-[20px] truncate">
            {item.label}
          </div>
        </div>
        {(item.isActive || item.id === currentScreen) && !isCollapsed && (
            <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_10px_#FF6B6B]" />
        )}
        {item.hasDropdown && (
          <div className={`flex items-center justify-center shrink-0 transition-opacity duration-500 ${isCollapsed ? "opacity-0 w-0" : "opacity-100 ml-2"}`}>
            <ChevronDownIcon size={16} className={`transition-transform duration-500 ${isExpanded ? "rotate-180" : "rotate-0"}`} />
          </div>
        )}
      </div>
    </div>
  );
}

const Sidebar = ({ isOpen, toggleSidebar, navigateTo, currentScreen }) => {
  const { language, setLanguage, t } = useLanguage();
  const [activeRail, setActiveRail] = useState("app");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const user = auth.currentUser;

  React.useEffect(() => {
    if (['hero', 'home', 'about', 'report', 'map'].includes(currentScreen)) {
        setActiveRail('app');
    } else if (['dashboard'].includes(currentScreen)) {
        setActiveRail('analytics');
    } else if (['admin'].includes(currentScreen)) {
        setActiveRail('system');
    } else if (['support'].includes(currentScreen)) {
        setActiveRail('support');
    }
  }, [currentScreen]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      toggleSidebar();
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  const contentMap = {
    app: {
      title: t('sidebar.navigation'),
      sections: [
        {
          title: t('sidebar.mainViews'),
          items: [
            { icon: <View size={16} />, label: t('sidebar.overview'), id: 'hero' },
            { icon: <Dashboard size={16} />, label: t('sidebar.home'), id: 'home' },
            { icon: <Task size={16} />, label: t('sidebar.about'), id: 'about' },
            { icon: <Report size={16} />, label: t('sidebar.reportHazard'), id: 'report' },
            { icon: <Map size={16} />, label: t('sidebar.smartMap'), id: 'map' },
          ],
        },
      ],
    },
    analytics: {
      title: t('sidebar.dashboard'),
      sections: [
        {
          title: t('sidebar.dashboard'),
          items: [
            { icon: <Analytics size={16} />, label: t('sidebar.dashboard'), id: 'dashboard' },
          ],
        },
      ],
    },
    system: {
      title: t('sidebar.system'),
      sections: [
        {
          title: t('sidebar.system'),
          items: [
            { icon: <Security size={16} />, label: t('sidebar.adminPanel'), id: 'admin' },
          ],
        },
      ],
    },
    support: {
      title: t('sidebar.support'),
      sections: [
        {
          title: t('sidebar.support'),
          items: [
            { icon: <View size={16} />, label: t('sidebar.helpFeedback'), id: 'support' },
          ],
        },
      ],
    },
  };

  // Filter Admin section if user is not admin
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  if (!isAdmin && contentMap.system) {
    contentMap.system.sections = []; // Hide items from non-admins
  }

  const activeContent = contentMap[activeRail] || contentMap.app;

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-md animate-in fade-in duration-300"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar Layout */}
      <div
        className="fixed top-0 left-0 h-full z-[70] flex transition-all duration-500 ease-[cubic-bezier(0.25, 1.1, 0.4, 1)]"
        style={{
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
        }}
      >
        {/* Nav Rail (Left) */}
        <aside className="bg-[#0A0A0A] flex flex-col gap-3 items-center p-3 w-16 border-r border-neutral-800/50">
          <div className="mb-4 size-10 flex items-center justify-center p-1 bg-neutral-900 rounded-xl shadow-inner">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
          </div>

          <IconNavButton isActive={activeRail === "app"} onClick={() => setActiveRail("app")} label={t('sidebar.navigation')}>
            <Dashboard size={20} />
          </IconNavButton>
          <IconNavButton isActive={activeRail === "analytics"} onClick={() => setActiveRail("analytics")} label={t('sidebar.dashboard')}>
            <Analytics size={20} />
          </IconNavButton>
          {isAdmin && (
            <IconNavButton isActive={activeRail === "system"} onClick={() => setActiveRail("system")} label={t('sidebar.system')}>
              <SettingsIcon size={20} />
            </IconNavButton>
          )}
          <IconNavButton isActive={activeRail === "support"} onClick={() => setActiveRail("support")} label={t('sidebar.support')}>
            <UserIcon size={20} />
          </IconNavButton>

          <div className="flex-1" />

          {/* Language Switcher */}
          <div className="flex flex-col gap-2 mb-2">
            {['en', 'hi', 'ta'].map((lang) => (
               <button
                 key={lang}
                 onClick={() => setLanguage(lang)}
                 className={`w-10 h-10 rounded-xl text-[10px] font-black uppercase transition-all duration-300 flex items-center justify-center border
                    ${language === lang 
                        ? 'bg-blue-600 border-blue-500 text-white shadow-lg' 
                        : 'bg-neutral-900 border-neutral-800 text-neutral-500 hover:text-neutral-200'}`}
               >
                 {lang}
               </button>
            ))}
          </div>

          <IconNavButton onClick={handleSignOut} label={t('logout')}>
            <Logout size={20} className="text-orange-500" />
          </IconNavButton>
          
          <div className="size-8 mt-2">
            <AvatarCircle />
          </div>
        </aside>

        {/* Detail Sidebar (Right) */}
        <aside
          className={`bg-[#050505] flex flex-col gap-4 items-start p-4 transition-all duration-500 ${
            isCollapsed ? "w-16" : "w-64"
          } border-r border-neutral-800/30 shadow-2xl`}
        >
          {!isCollapsed && <BrandBadge />}

          <div className="w-full flex items-center justify-between mt-2">
            {!isCollapsed && <span className="text-sm font-bold text-neutral-400 px-1 uppercase tracking-widest text-[10px]">{activeContent.title}</span>}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 rounded-lg hover:bg-neutral-800/50 text-neutral-500 transition-all active:scale-90"
            >
              <ChevronDownIcon size={16} className={isCollapsed ? "-rotate-90" : "rotate-90"} />
            </button>
          </div>

          <div className="flex flex-col w-full gap-6 overflow-y-auto no-scrollbar">
            {activeContent.sections.map((section, idx) => (
              <div key={idx} className="flex flex-col w-full">
                {!isCollapsed && (
                  <div className="px-3 mb-2">
                    <span className="text-[10px] font-black text-neutral-600 uppercase tracking-widest">{section.title}</span>
                  </div>
                )}
                <div className="space-y-1">
                  {section.items.map((item, i) => (
                    <MenuItem
                      key={i}
                      item={item}
                      isCollapsed={isCollapsed}
                      currentScreen={currentScreen}
                      onItemClick={() => {
                        if (item.id === 'admin') {
                          window.open('https://roadhazex-admin.web.app', '_blank');
                        } else {
                          navigateTo(item.id);
                          // toggleSidebar(); // Optional: close sidebar on click?
                        }
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {!isCollapsed && (
            <div className="mt-auto w-full pt-4 border-t border-neutral-800/50">
              <div className="flex items-center gap-3 px-2">
                <AvatarCircle />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-white truncate">{user?.displayName || t('activeUser')}</div>
                  <div className="text-[10px] text-neutral-500 truncate">{user?.email || t('node')}</div>
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>
    </>
  );
};

export default Sidebar;
