import React, { useEffect, useRef, useState, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import { db } from './firebase';
import { doc, updateDoc, setDoc, arrayUnion, serverTimestamp, collection, addDoc, writeBatch } from 'firebase/firestore';
import * as turf from '@turf/turf';

import Supercluster from 'supercluster';
import AnalyticsPanel from './AnalyticsPanel';
import PilotMetricsPanel from './PilotMetricsPanel';
import PromotionsPanel from './PromotionsPanel';

const STATUS_THEMES = {
    "Pending": { color: "#ef4444", bg: "bg-red-500/10", border: "border-red-500/20", text: "text-red-400", pill: "bg-red-500", glow: "shadow-[0_0_20px_rgba(239,68,68,0.4)]" },
    "Verified": { color: "#3b82f6", bg: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-400", pill: "bg-blue-500", glow: "shadow-[0_0_20px_rgba(59,130,246,0.4)]" },
    "Assigned": { color: "#f97316", bg: "bg-orange-500/10", border: "border-orange-500/20", text: "text-orange-400", pill: "bg-orange-500", glow: "shadow-[0_0_20px_rgba(249,115,22,0.4)]" },
    "In Progress": { color: "#eab308", bg: "bg-yellow-500/10", border: "border-yellow-500/20", text: "text-yellow-400", pill: "bg-yellow-500", glow: "shadow-[0_0_20px_rgba(234,179,8,0.4)]" },
    "Resolved": { color: "#10b981", bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400", pill: "bg-emerald-500", glow: "shadow-[0_0_20px_rgba(16,185,129,0.4)]" },
    "Closed": { color: "#10b981", bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400", pill: "bg-emerald-500", glow: "shadow-[0_0_20px_rgba(16,185,129,0.4)]" },
    "Invalid / Rejected": { color: "#6b7280", bg: "bg-gray-500/10", border: "border-gray-500/20", text: "text-gray-400", pill: "bg-gray-500", glow: "shadow-[0_0_20px_rgba(107,114,128,0.4)]" },
    "Duplicate": { color: "#6b7280", bg: "bg-gray-500/10", border: "border-gray-500/20", text: "text-gray-400", pill: "bg-gray-500", glow: "shadow-[0_0_20px_rgba(107,114,128,0.4)]" },
    "Escalated": { color: "#a855f7", bg: "bg-purple-500/10", border: "border-purple-500/20", text: "text-purple-400", pill: "bg-purple-500", glow: "shadow-[0_0_20px_rgba(168,85,247,0.4)]" }
};

const getTheme = (hazard) => {
    const status = hazard.status;
    if (status === 'Invalid / Rejected' || status === 'Duplicate') return STATUS_THEMES['Invalid / Rejected'];
    if (status === 'Resolved' || status === 'Closed' || hazard.resolved) return STATUS_THEMES['Resolved'];
    if (hazard.isEscalated || hazard.isOverdue) return STATUS_THEMES['Escalated'];
    return STATUS_THEMES[status] || STATUS_THEMES['Pending'];
};

const getHazardIcon = (type) => {
    if (!type) return 'warning';
    const t = String(type).toLowerCase();
    if (t.includes('pothole') || t.includes('road damage') || t.includes('cracked')) return 'broken_image';
    if (t.includes('manhole')) return 'radio_button_unchecked';
    if (t.includes('water') || t.includes('flood')) return 'water_drop';
    if (t.includes('tree') || t.includes('branch')) return 'park';
    if (t.includes('light') || t.includes('street')) return 'lightbulb';
    if (t.includes('signal') || t.includes('traffic')) return 'traffic';
    if (t.includes('sign')) return 'signpost';
    if (t.includes('accident') || t.includes('crash')) return 'warning';
    if (t.includes('vehicle') || t.includes('breakdown')) return 'car_crash';
    if (t.includes('debris') || t.includes('garbage')) return 'delete';
    if (t.includes('visibility') || t.includes('fog')) return 'foggy';
    return 'warning';
};

const AdminDashboard = ({ hazards, userRole }) => {
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const [selectedHazard, setSelectedHazard] = useState(null);
    const [filterStatus, setFilterStatus] = useState('All');
    const [filterDepartment, setFilterDepartment] = useState('All Reports');
    const [searchQuery, setSearchQuery] = useState('');

    const [adminPublicResponse, setAdminPublicResponse] = useState('');
    const [adminInternalNote, setAdminInternalNote] = useState('');
    const [showHistory, setShowHistory] = useState(false);
    const [isSavingNotes, setIsSavingNotes] = useState(false);
    const [activeView, setActiveView] = useState('map'); // 'map' or 'analytics'
    
    const [isLegendOpen, setIsLegendOpen] = useState(false);

    const [activeLayers, setActiveLayers] = useState({
        ward: false,
        sh: false,
        nh: false,
        rural: false
    });

    const toggleLayer = async (layerKey) => {
        if (!mapRef.current) return;
        const map = mapRef.current;
        const layerConfig = {
            ward: { url: '/data/chennai_wards.geojson', color: '#3b82f6', width: 2 },
            sh: { url: '/data/state_highways.geojson', color: '#f97316', width: 3 },
            nh: { url: '/data/national_highways.geojson', color: '#a855f7', width: 4 },
            rural: { url: '/data/rural_panchayats.json', color: '#10b981', width: 2 }
        };
        
        const config = layerConfig[layerKey];
        
        if (activeLayers[layerKey]) {
            if (map.getLayer(layerKey)) map.removeLayer(layerKey);
            if (map.getSource(layerKey)) map.removeSource(layerKey);
            setActiveLayers(prev => ({ ...prev, [layerKey]: false }));
        } else {
            try {
                const res = await fetch(config.url);
                const geojson = await res.json();
                if (!map.getSource(layerKey)) {
                    map.addSource(layerKey, { type: 'geojson', data: geojson });
                }
                if (!map.getLayer(layerKey)) {
                    map.addLayer({
                        id: layerKey,
                        type: 'line',
                        source: layerKey,
                        layout: { 'line-join': 'round', 'line-cap': 'round' },
                        paint: { 'line-color': config.color, 'line-width': config.width, 'line-opacity': 0.8 }
                    });
                }
                setActiveLayers(prev => ({ ...prev, [layerKey]: true }));
            } catch (err) {
                console.error(`Failed to load layer ${layerKey}`, err);
            }
        }
    };

    useEffect(() => {
        if (selectedHazard) {
            setAdminPublicResponse(selectedHazard.adminPublicResponse || '');
            setAdminInternalNote(selectedHazard.adminInternalNote || '');
            setShowHistory(false);
        }
    }, [selectedHazard]);

    // --- Dynamic Spatial Clustering Logic ---
    const processedHazards = useMemo(() => {
        const clusters = [];
        
        hazards.forEach(h => {
            const hLng = Number(h.lng);
            const hLat = Number(h.lat);
            if (isNaN(hLng) || isNaN(hLat)) return;

            // SLA Calculation
            let daysOpen = 0;
            let slaStatus = 'Within SLA';
            let isOverdue = false;
            
            const getSuggestedOfficerRole = (dept) => {
                if (dept === 'Urban / GCC') return 'Assistant Engineer';
                if (dept === 'State Highways') return 'Assistant Engineer / Field Officer';
                if (dept === 'National Highways') return 'Assistant Engineer / Field Engineer';
                if (dept === 'Rural / Panchayat') return 'Assistant Engineer / Block-level Road Officer';
                return 'Pending Classification';
            };

            const timestamp = h.assignedAt || h.createdAt || h.timestamp || h.reportedAt || h.created_at;
            let reportDate = null;
            if (timestamp) {
                if (timestamp.toDate) reportDate = timestamp.toDate();
                else if (typeof timestamp === 'string') reportDate = new Date(timestamp);
                else if (typeof timestamp === 'number') reportDate = new Date(timestamp);
            }
            if (!reportDate) reportDate = new Date();

            let escalationLevel = h.escalationLevel || 0;

            if (h.resolved || h.status === 'Resolved' || h.status === 'Closed') {
                const resolvedTimestamp = h.resolvedAt || h.updatedAt;
                let resolvedDate = new Date();
                if (resolvedTimestamp) {
                    if (resolvedTimestamp.toDate) resolvedDate = resolvedTimestamp.toDate();
                    else if (typeof resolvedTimestamp === 'string') resolvedDate = new Date(resolvedTimestamp);
                    else if (typeof resolvedTimestamp === 'number') resolvedDate = new Date(resolvedTimestamp);
                }
                daysOpen = Math.max(0, Math.floor((resolvedDate - reportDate) / (1000 * 60 * 60 * 24)));
                slaStatus = `Resolved in ${daysOpen} days`;
            } else {
                daysOpen = Math.max(0, Math.floor((Date.now() - reportDate) / (1000 * 60 * 60 * 24)));
                if (daysOpen >= 14) {
                    slaStatus = 'Severely Overdue';
                    isOverdue = true;
                    escalationLevel = 3;
                } else if (daysOpen >= 7) {
                    slaStatus = 'Overdue';
                    isOverdue = true;
                    escalationLevel = 2;
                } else if (daysOpen === 6) {
                    slaStatus = 'Due Soon';
                    if (h.status !== 'Pending') escalationLevel = Math.max(1, escalationLevel);
                } else {
                    if (h.status === 'Pending') escalationLevel = 0;
                    else escalationLevel = Math.max(1, escalationLevel);
                }
            }

            // Normalized Jurisdiction Data Extraction
            const normAuth = h.authority || h.jurisdiction?.Authority || h.authorityName || '';
            const normJur = h.jurisdiction?.Type || h.jurisdictionType || (typeof h.jurisdiction === 'string' ? h.jurisdiction : '') || '';
            // Enhanced Fallback for Ward and Zone (checking root, jurisdiction, locationDetails, gis)
            const normWard = h.wardNo || h.ward || h.wardName || h.jurisdiction?.WardNo || h.locationDetails?.wardNo || h.locationDetails?.ward || h.gis?.wardNo || h.gis?.ward || h.Ward_No || (h.jurisdiction?.Details && h.jurisdiction.Details.includes('Ward') ? h.jurisdiction.Details.match(/Ward \d+/)?.[0] : '') || '';
            const normZone = h.zoneNo || h.zone || h.zoneName || h.jurisdiction?.ZoneNo || h.locationDetails?.zoneNo || h.locationDetails?.zone || h.gis?.zoneNo || h.gis?.zone || h.Zone_No || (h.jurisdiction?.Details && h.jurisdiction.Details.includes('Zone') ? h.jurisdiction.Details.match(/Zone [A-Z]+/)?.[0] : '') || '';
            const normZoneName = h.zoneName || h.Zone_Name || '';
            const normPanchayat = h.panchayat || h.gram_panchayat_name || '';
            const normDistrict = h.district || h.districtName || '';
            const normHighwayType = h.highwayType || h.road_type || '';
            const normHighwayNumber = h.highwayNumber || h.road_id || h.ref || '';
            const normRoadName = h.roadName || '';

            if (process.env.NODE_ENV === 'development') {
                console.log("[Jurisdiction Sync Debug] Raw Report:", h);
                console.log("[Jurisdiction Sync Debug] Extracted Fields:", { normAuth, normJur, normWard, normZone });
            }

            // Department Classification
            let department = 'Unclassified / Needs Review';
            const authStr = String(normAuth).toLowerCase();
            const jurStr = String(normJur).toLowerCase();
            const hwType = String(normHighwayType).toLowerCase();

            if (authStr.includes('greater chennai corporation') || authStr.includes('gcc') || jurStr.includes('urban') || normWard || normZone) {
                department = 'Urban / GCC';
            } else if (authStr.includes('state highway') || authStr.includes('tamil nadu highways') || hwType.includes('state highway') || normHighwayType.includes('sh')) {
                department = 'State Highways';
            } else if (authStr.includes('nhai') || authStr.includes('national highway') || hwType.includes('national highway') || normHighwayType.includes('nh')) {
                department = 'National Highways';
            } else if (jurStr.includes('rural') || jurStr.includes('panchayat') || normPanchayat || (h.village && normDistrict)) {
                department = 'Rural / Panchayat';
            } else if (normAuth || normJur || normDistrict) {
                department = 'Urban / GCC'; // fallback
            }

            let merged = false;
            for (let c of clusters) {
                const normalizeType = (t) => t ? String(t).toLowerCase().replace(/[^a-z]/g, '') : '';
                
                // Merge if same normalized type, within 25 meters, same calendar date, same jurisdiction
                if (normalizeType(c.type) === normalizeType(h.type)) {
                    const cDate = c.reportDate ? new Date(c.reportDate).toDateString() : '';
                    const hDate = reportDate ? new Date(reportDate).toDateString() : '';
                    
                    if (cDate === hDate && (!c.normAuth || !normAuth || c.normAuth === normAuth)) {
                        const from = turf.point([c.lng, c.lat]);
                        const to = turf.point([hLng, hLat]);
                        const distance = turf.distance(from, to, { units: 'meters' });
                        
                        if (distance <= 25) {
                        c.ids = [...(c.ids || [c.id]), h.id];
                        if (h.userId) c.userIds = [...new Set([...(c.userIds || []), h.userId])];
                        c.priorityRate += (h.reportCount || 1);
                        c.reportCount = c.priorityRate;
                        c.isCritical = c.priorityRate >= 5;
                        if (!c.normAuth && normAuth) c.normAuth = normAuth;
                        if (!c.normJur && normJur) c.normJur = normJur;
                        if (!c.normWard && normWard) c.normWard = normWard;
                        if (!c.normZone && normZone) c.normZone = normZone;
                        if (!c.normDistrict && normDistrict) c.normDistrict = normDistrict;
                        if (!c.normHighwayType && normHighwayType) c.normHighwayType = normHighwayType;
                        if (!c.normHighwayNumber && normHighwayNumber) c.normHighwayNumber = normHighwayNumber;
                        if (!c.department || c.department === 'Unclassified / Needs Review') c.department = department;
                        merged = true;
                        break;
                        }
                    }
                }
            }
            
            if (!merged) {
                clusters.push({
                    ...h,
                    lng: hLng,
                    lat: hLat,
                    ids: [h.id],
                    userIds: h.userId ? [h.userId] : [],
                    priorityRate: h.reportCount || 1,
                    reportCount: h.reportCount || 1,
                    isCritical: (h.reportCount || 1) >= 5,
                    daysOpen: h.daysOpen !== undefined ? h.daysOpen : daysOpen,
                    slaStatus: h.slaStatus !== undefined ? h.slaStatus : slaStatus,
                    isOverdue: h.isOverdue !== undefined ? h.isOverdue : isOverdue,
                    department,
                    suggestedOfficerRole: getSuggestedOfficerRole(department),
                    escalationLevel,
                    reportDate,
                    isEscalated: escalationLevel >= 2,
                    normAuth, normJur, normWard, normZone, normZoneName, normPanchayat, normDistrict, normHighwayType, normHighwayNumber, normRoadName
                });
            }
        });
        
        return clusters.sort((a, b) => {
            // 0. Active/Escalated before Resolved/Closed/Invalid
            const isAInactive = a.status === 'Resolved' || a.status === 'Closed' || a.status === 'Invalid / Rejected' || a.status === 'Duplicate' || a.resolved;
            const isBInactive = b.status === 'Resolved' || b.status === 'Closed' || b.status === 'Invalid / Rejected' || b.status === 'Duplicate' || b.resolved;
            if (isAInactive !== isBInactive) return isAInactive ? 1 : -1;
            // 1. Highest reportCount / priorityRate
            if (b.priorityRate !== a.priorityRate) return b.priorityRate - a.priorityRate;
            // 2. Escalated reports
            if (b.isEscalated !== a.isEscalated) return b.isEscalated ? 1 : -1;
            // 3. Overdue reports
            if (b.isOverdue !== a.isOverdue) return b.isOverdue ? 1 : -1;
            // 4. Newer report date
            const dateA = a.reportDate ? new Date(a.reportDate).getTime() : 0;
            const dateB = b.reportDate ? new Date(b.reportDate).getTime() : 0;
            return dateB - dateA;
        });
    }, [hazards]);

    const filteredHazards = processedHazards.filter(h => {
        // Phase 8: Hide Demo/Test hazards from real operational views
        if (h.isDemo || h.isFieldTest) return false;

        // Department Tab Logic
        let matchesDepartment = false;
        if (filterDepartment === 'All Reports') matchesDepartment = true;
        else if (filterDepartment === 'Escalated') matchesDepartment = h.isEscalated;
        else if (filterDepartment === 'Overdue') matchesDepartment = h.isOverdue;
        else if (filterDepartment === 'Resolved') matchesDepartment = h.resolved || h.status === 'Resolved' || h.status === 'Closed';
        else matchesDepartment = h.department === filterDepartment;

        // Status Chip Logic
        const matchesStatus = filterStatus === 'All' || h.status === filterStatus;
        
        // Search
        const matchesSearch = h.type?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             (h.address && h.address.toLowerCase().includes(searchQuery.toLowerCase()));

        // Role Visibility
        let matchesRole = true;
        if (userRole === 'gcc_admin') matchesRole = h.department === 'Urban / GCC';
        else if (userRole === 'state_highways_admin') matchesRole = h.department === 'State Highways';
        else if (userRole === 'nhai_admin') matchesRole = h.department === 'National Highways';
        else if (userRole === 'rural_admin') matchesRole = h.department === 'Rural / Panchayat';

        return matchesDepartment && matchesStatus && matchesSearch && matchesRole;
    });

    // --- Map Initialization ---
    useEffect(() => {
        if (!mapContainerRef.current) return;

        const OLA_MAPS_API_KEY = "ZTQwHjxak23hMQ4ewtLTUzwMX9l6lJta0bL2uYv6";
        
        mapRef.current = new maplibregl.Map({
            container: mapContainerRef.current,
            style: `https://api.olamaps.io/tiles/vector/v1/styles/default-dark-standard/style.json?api_key=${OLA_MAPS_API_KEY}`,
            center: [77.5946, 12.9716],
            zoom: 12,
            transformRequest: (url) => {
                if (!url.includes('?')) url += `?api_key=${OLA_MAPS_API_KEY}`;
                else if (!url.includes('api_key')) url += `&api_key=${OLA_MAPS_API_KEY}`;
                return { url };
            }
        });

        return () => {
            if (mapRef.current) mapRef.current.remove();
        };
    }, []);

    const superclusterRef = useRef(null);
    const markersRef = useRef([]);

    useEffect(() => {
        if (!mapRef.current) return;
        superclusterRef.current = new Supercluster({
            radius: 50,
            maxZoom: 16
        });
        
        const geojsonPoints = filteredHazards.map(h => {
            const hLng = Number(h.lng);
            const hLat = Number(h.lat);
            if (isNaN(hLng) || isNaN(hLat)) return null;
            return {
                type: 'Feature',
                properties: { cluster: false, hazard: h },
                geometry: { type: 'Point', coordinates: [hLng, hLat] }
            };
        }).filter(Boolean);
        
        superclusterRef.current.load(geojsonPoints);
        updateClusters();
    }, [filteredHazards]);

    useEffect(() => {
        if (!mapRef.current) return;
        mapRef.current.on('move', updateClusters);
        mapRef.current.on('zoom', updateClusters);
        return () => {
            mapRef.current.off('move', updateClusters);
            mapRef.current.off('zoom', updateClusters);
        };
    }, []);

    const updateClusters = () => {
        if (!mapRef.current || !superclusterRef.current) return;
        const bounds = mapRef.current.getBounds();
        const bbox = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()];
        const zoom = Math.floor(mapRef.current.getZoom());

        const clusters = superclusterRef.current.getClusters(bbox, zoom);

        markersRef.current.forEach(m => m.remove());
        markersRef.current = [];

        clusters.forEach(cluster => {
            const [lng, lat] = cluster.geometry.coordinates;
            const el = document.createElement('div');
            
            if (cluster.properties.cluster) {
                const count = cluster.properties.point_count;
                el.className = `w-10 h-10 rounded-full bg-slate-800 border-2 border-slate-600 shadow-xl flex items-center justify-center cursor-pointer transition-transform hover:scale-110 hover:z-50`;
                el.innerHTML = `<span class="text-white text-xs font-black">${count}</span>`;
                
                el.onclick = (e) => {
                    e.stopPropagation();
                    const expansionZoom = superclusterRef.current.getClusterExpansionZoom(cluster.properties.cluster_id);
                    mapRef.current.flyTo({ center: [lng, lat], zoom: expansionZoom, duration: 1000 });
                };
            } else {
                const hazard = cluster.properties.hazard;
                const theme = getTheme(hazard);
                
                const score = hazard.priorityRate || hazard.reportCount || 1;
                let borderStyle = 'border-2';
                if (score >= 3 && score <= 5) borderStyle = 'border-4';
                
                el.className = `w-8 h-8 rounded-full flex items-center justify-center cursor-pointer ${borderStyle} shadow-lg transition-transform hover:scale-125 hover:z-50 ${theme.pill} ${theme.border}`;
                
                if (score >= 6) {
                    el.innerHTML = `<div class="absolute inset-0 rounded-full animate-ping ${theme.bg} opacity-75 pointer-events-none"></div>`;
                }
                
                const icon = document.createElement('span');
                icon.className = "material-icons-round text-white text-base z-10";
                icon.innerText = getHazardIcon(hazard.type || hazard.hazardType);
                el.appendChild(icon);

                el.onclick = (e) => {
                    e.stopPropagation();
                    
                    const popupContent = `
                        <div class="p-3 min-w-[200px]">
                            <div class="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">${hazard.type || hazard.hazardType || 'Unknown Hazard'}</div>
                            <div class="flex items-center gap-2 mb-2">
                                <span class="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${theme.bg} ${theme.text}">${hazard.status}</span>
                                ${(hazard.isEscalated || hazard.isOverdue) ? `<span class="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-400">Escalated</span>` : ''}
                            </div>
                            <div class="grid grid-cols-2 gap-2 text-[10px] text-slate-300 font-mono mb-3">
                                <div><span class="text-slate-500">Score:</span> ${score}</div>
                                <div><span class="text-slate-500">Reports:</span> ${hazard.reportCount || 1}</div>
                                <div class="col-span-2 truncate"><span class="text-slate-500">Dept:</span> ${hazard.department || hazard.normAuth || 'Unknown'}</div>
                            </div>
                            <button id="popup-view-btn-${hazard.id}" class="w-full py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors cursor-pointer">
                                View Details
                            </button>
                        </div>
                    `;

                    new maplibregl.Popup({ offset: 15, closeButton: false, className: 'custom-map-popup' })
                        .setLngLat([lng, lat])
                        .setHTML(popupContent)
                        .addTo(mapRef.current);
                        
                    setTimeout(() => {
                        const btn = document.getElementById(`popup-view-btn-${hazard.id}`);
                        if (btn) btn.onclick = () => setSelectedHazard(hazard);
                    }, 100);

                    mapRef.current.flyTo({ center: [lng, lat], zoom: 16, duration: 1000 });
                };
            }

            const marker = new maplibregl.Marker({ element: el })
                .setLngLat([lng, lat])
                .addTo(mapRef.current);
            
            markersRef.current.push(marker);
        });
    };

    // Phase 7: Audit Logging & Public Sync Helpers
    const logAudit = (batch, actionType, id, oldStatus, newStatus, reason = '') => {
        try {
            const auditRef = doc(collection(db, 'auditLogs'));
            batch.set(auditRef, {
                actionType,
                reportId: id,
                previousStatus: oldStatus,
                newStatus,
                updatedBy: 'admin@roadhazex.com',
                updatedByRole: userRole || 'admin',
                updatedAt: serverTimestamp(),
                reason
            });
        } catch(e) { console.error("Audit log failed", e); }
    };

    const syncPublicHazard = (batch, id, updates) => {
        try {
            // Use setDoc with merge: true to avoid errors on legacy hazards without a publicHazards doc
            batch.set(doc(db, 'publicHazards', id), updates, { merge: true });
        } catch(e) { console.error("Public hazard sync failed", e); }
    };

    const handleAssignOfficer = async () => {
        if (!selectedHazard) return;
        try {
            const ids = Array.isArray(selectedHazard.ids) ? selectedHazard.ids : [selectedHazard.id];
            
            const newStatus = 'Assigned';
            const statusEntry = {
                status: newStatus,
                updatedAt: new Date().toISOString(),
                updatedBy: 'admin@roadhazex.com',
                updatedByRole: userRole || 'admin'
            };

            const batch = writeBatch(db);
            ids.forEach(id => {
                const docRef = doc(db, 'hazards', id);
                batch.update(docRef, { 
                    status: newStatus,
                    assignedOfficerRole: selectedHazard.suggestedOfficerRole || 'Assistant Engineer',
                    assignedDepartment: selectedHazard.department || 'Unknown',
                    assignedAt: serverTimestamp(),
                    assignedBy: 'admin@roadhazex.com',
                    escalationLevel: 1,
                    updatedAt: serverTimestamp(),
                    updatedBy: 'admin@roadhazex.com',
                    statusHistory: arrayUnion(statusEntry)
                });
                syncPublicHazard(batch, id, { status: newStatus });
                logAudit(batch, 'confirm assignment', id, selectedHazard.status || 'Pending', newStatus);
            });

            const userIds = selectedHazard.userIds || [];
            userIds.forEach(uid => {
                const notifRef = doc(collection(db, 'users', uid, 'notifications'));
                batch.set(notifRef, {
                    title: 'Report Assigned',
                    message: `Your report for ${selectedHazard.type} has been officially assigned to ${selectedHazard.suggestedOfficerRole || 'Assistant Engineer'}.`,
                    type: 'status_update',
                    hazardId: selectedHazard.id,
                    isRead: false,
                    createdAt: serverTimestamp()
                });
            });

            await batch.commit();

            setSelectedHazard(prev => {
                if (!prev) return null;
                return { 
                    ...prev, 
                    status: newStatus, 
                    assignedOfficerRole: prev.suggestedOfficerRole || 'Assistant Engineer',
                    assignedDepartment: prev.department || 'Unknown',
                    escalationLevel: 1,
                    statusHistory: [...(prev.statusHistory || []), statusEntry]
                };
            });
        } catch (err) { 
            console.error(err);
            alert("Status update failed due to permission error: " + err.message);
        }
    };

    const handleEscalate = async (level) => {
        if (!selectedHazard) return;
        try {
            const ids = Array.isArray(selectedHazard.ids) ? selectedHazard.ids : [selectedHazard.id];
            const batch = writeBatch(db);
            ids.forEach(id => {
                const docRef = doc(db, 'hazards', id);
                batch.update(docRef, { 
                    escalationLevel: level,
                    updatedAt: serverTimestamp()
                });
                logAudit(batch, 'escalation', id, selectedHazard.status, selectedHazard.status, `Escalated to level ${level}`);
            });
            await batch.commit();

            setSelectedHazard(prev => {
                if (!prev) return null;
                return { ...prev, escalationLevel: level };
            });
        } catch (err) { 
            console.error(err);
            alert("Escalation failed due to permission error: " + err.message);
        }
    };

    const handleStatusUpdate = async (idOrIds, newStatus) => {
        try {
            if (newStatus === 'Assigned') {
                await handleAssignOfficer();
                return;
            }
            
            const ids = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
            
            const statusEntry = {
                status: newStatus,
                updatedAt: new Date().toISOString(),
                updatedBy: 'admin@roadhazex.com',
                updatedByRole: userRole || 'admin'
            };

            const batch = writeBatch(db);
            ids.forEach(id => {
                const docRef = doc(db, 'hazards', id);
                const updates = { 
                    status: newStatus, 
                    resolved: newStatus === 'Resolved' || newStatus === 'Closed',
                    updatedAt: serverTimestamp(),
                    updatedBy: 'admin@roadhazex.com',
                    statusHistory: arrayUnion(statusEntry)
                };
                if (newStatus === 'Resolved' || newStatus === 'Closed') {
                    updates.resolvedAt = serverTimestamp();
                    updates.isResolved = true;
                    updates.isOverdue = false;
                }
                batch.update(docRef, updates);
                
                const publicUpdates = { status: newStatus, resolved: updates.resolved };
                if (updates.resolvedAt) publicUpdates.resolvedAt = updates.resolvedAt;
                syncPublicHazard(batch, id, publicUpdates);
                
                let actionType = 'status change';
                if (newStatus === 'Resolved' || newStatus === 'Closed') actionType = 'resolution';
                if (newStatus === 'Invalid / Rejected') actionType = 'invalid marking';
                if (newStatus === 'Duplicate') actionType = 'duplicate marking';
                
                logAudit(batch, actionType, id, selectedHazard.status, newStatus);
            });

            const userIds = selectedHazard.userIds || [];
            userIds.forEach(uid => {
                const notifRef = doc(collection(db, 'users', uid, 'notifications'));
                batch.set(notifRef, {
                    title: `Status Updated: ${newStatus}`,
                    message: `Your report for ${selectedHazard.type} is now marked as ${newStatus}.`,
                    type: 'status_update',
                    hazardId: selectedHazard.id,
                    isRead: false,
                    createdAt: serverTimestamp()
                });
            });

            await batch.commit();
            setSelectedHazard(prev => {
                if (!prev) return null;
                const prevIds = Array.isArray(prev.ids) ? prev.ids : [prev.id];
                if (prevIds.some(pid => ids.includes(pid))) {
                     return { 
                         ...prev, 
                         status: newStatus, 
                         resolved: newStatus === 'Resolved' || newStatus === 'Closed',
                         isResolved: newStatus === 'Resolved' || newStatus === 'Closed',
                         isOverdue: (newStatus === 'Resolved' || newStatus === 'Closed') ? false : prev.isOverdue,
                         statusHistory: [...(prev.statusHistory || []), statusEntry]
                     };
                }
                return prev;
            });
        } catch (err) { 
            console.error(err);
            alert("Status update failed due to permission error: " + err.message);
        }
    };

    const handleSaveNotes = async () => {
        if (!selectedHazard) return;
        setIsSavingNotes(true);
        try {
            const ids = Array.isArray(selectedHazard.ids) ? selectedHazard.ids : [selectedHazard.id];
            
            const newHistoryEntries = [];
            if (adminPublicResponse !== (selectedHazard.adminPublicResponse || '')) {
                newHistoryEntries.push({
                    type: "public",
                    message: adminPublicResponse,
                    createdAt: new Date().toISOString(),
                    createdByRole: userRole || 'admin'
                });
            }
            if (adminInternalNote !== (selectedHazard.adminInternalNote || '')) {
                newHistoryEntries.push({
                    type: "internal",
                    message: adminInternalNote,
                    createdAt: new Date().toISOString(),
                    createdByRole: userRole || 'admin'
                });
            }

            const updates = {
                adminPublicResponse,
                adminInternalNote,
                adminResponseUpdatedAt: serverTimestamp(),
                adminResponseUpdatedBy: userRole || 'admin'
            };
            if (newHistoryEntries.length > 0) {
                updates.noteHistory = arrayUnion(...newHistoryEntries);
            }

            const batch = writeBatch(db);
            ids.forEach(id => {
                const docRef = doc(db, 'hazards', id);
                batch.update(docRef, updates);
                
                if (newHistoryEntries.some(e => e.type === 'public')) {
                    logAudit(batch, 'admin public response', id, selectedHazard.status, selectedHazard.status, adminPublicResponse);
                }
                if (newHistoryEntries.some(e => e.type === 'internal')) {
                    logAudit(batch, 'internal note update', id, selectedHazard.status, selectedHazard.status, 'Internal note updated');
                }
            });
            await batch.commit();
            if (adminPublicResponse !== (selectedHazard.adminPublicResponse || '')) {
                const userIds = selectedHazard.userIds || [];
                userIds.forEach(uid => {
                    addDoc(collection(db, 'users', uid, 'notifications'), {
                        title: `New Authority Response`,
                        message: `An official response has been added to your ${selectedHazard.type} report.`,
                        type: 'admin_response',
                        hazardId: selectedHazard.id,
                        isRead: false,
                        createdAt: serverTimestamp()
                    }).catch(err => console.error("Notification err:", err));
                });
            }

            await Promise.all(promises);

            setSelectedHazard(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    adminPublicResponse,
                    adminInternalNote,
                    noteHistory: [...(prev.noteHistory || []), ...newHistoryEntries]
                };
            });
        } catch (err) {
            console.error(err);
            alert("Failed to save notes due to permission error: " + err.message);
        } finally {
            setIsSavingNotes(false);
        }
    };

    const PUBLIC_TEMPLATES = [
        "Report verified and forwarded to the concerned team.",
        "Image is unclear. Please upload a clearer photo.",
        "This report appears to be a duplicate of an existing report.",
        "The issue has been marked for field inspection.",
        "The hazard has been resolved. Thank you for reporting.",
        "The report could not be verified due to insufficient evidence."
    ];

    return (
        <div className="flex-1 flex flex-col bg-[#020617] relative min-h-0">
            {/* Command Header */}
            <header className="h-20 shrink-0 bg-slate-950/80 backdrop-blur-3xl border-b border-white/5 flex items-center px-6 md:px-8 z-30 relative">
                <div className="flex items-center gap-4 md:gap-6 shrink-0">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FF7A3D] to-[#FF4F1F] flex items-center justify-center shadow-2xl p-2 shrink-0">
                        <img src="/logo.png" alt="RoadHazeX Logo" className="w-full h-full object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]" />
                    </div>
                    <div className="hidden md:block">
                        <h1 className="text-lg md:text-xl font-black text-white tracking-widest uppercase">RoadHazeX Authority Console</h1>
                        <div className="flex items-center gap-2 mt-0.5">
                             <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                             <p className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">AI + GIS Road Hazard Monitoring System</p>
                        </div>
                    </div>
                </div>

                {/* View Toggle (Map | Analytics) */}
                <div className="flex shrink-0 bg-slate-900/50 p-1 rounded-2xl border border-white/5 backdrop-blur-3xl shadow-2xl ml-auto mr-auto">
                    <button 
                        onClick={() => setActiveView('map')}
                        className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2
                        ${activeView === 'map' ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)]' : 'text-slate-500 hover:text-white'}`}
                    >
                        <span className="material-icons-round text-sm">map</span>
                        Map View
                    </button>
                    <button 
                        onClick={() => setActiveView('analytics')}
                        className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2
                        ${activeView === 'analytics' ? 'bg-purple-600 text-white shadow-[0_0_20px_rgba(147,51,234,0.3)]' : 'text-slate-500 hover:text-white'}`}
                    >
                        <span className="material-icons-round text-sm mr-2">analytics</span>
                        Analytics
                    </button>
                    <button 
                        onClick={() => setActiveView('promotions')}
                        className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2
                        ${activeView === 'promotions' ? 'bg-[#FF7A3D] text-white shadow-[0_0_20px_rgba(255,122,61,0.3)]' : 'text-slate-500 hover:text-white'}`}
                    >
                        <span className="material-icons-round text-sm mr-2">storefront</span>
                        Promotions
                    </button>
                    <button 
                        onClick={() => setActiveView('pilot')}
                        className={`flex items-center px-4 py-2 rounded-xl text-sm font-bold transition-all
                        ${activeView === 'pilot' ? 'bg-emerald-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 'text-slate-500 hover:text-white'}`}
                    >
                        <span className="material-icons-round text-sm mr-2">speed</span>
                        Pilot Metrics
                    </button>
                </div>

                {/* Empty spacer so the absolute-positioned App.jsx header doesn't overlap text */}
                <div className="w-[300px] shrink-0 hidden xl:block"></div>
            </header>

            {/* Main Content Area */}
            <div className="flex-1 relative flex min-h-0">
                
                {/* Analytics View */}
                {activeView === 'analytics' && (
                    <AnalyticsPanel hazards={filteredHazards} />
                )}

                {/* Pilot Metrics View */}
                {activeView === 'pilot' && (
                    <PilotMetricsPanel hazards={processedHazards} />
                )}

                {/* Promotions View */}
                {activeView === 'promotions' && (
                    <PromotionsPanel />
                )}

                {/* Map View */}
                <div className={`w-full h-full flex overflow-hidden relative min-h-0 ${(activeView !== 'map') ? 'hidden' : ''}`}>
                    {/* Left Panel: Analytics & List */}
                    <aside className="w-[480px] h-full shrink-0 border-r border-white/5 bg-slate-950/50 flex flex-col z-20 min-h-0">
                    {/* Search & Stats */}
                    <div className="p-6 shrink-0 space-y-5 bg-slate-900/40 border-b border-white/5">
                        <div className="relative group">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 material-icons-round text-slate-500 group-focus-within:text-[#FF7A3D] transition-colors">travel_explore</span>
                            <input 
                                type="text" 
                                placeholder="Search Hazard Reports..."
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#FF7A3D]/30 transition-all placeholder:text-slate-600 font-medium"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                             <div className="p-5 rounded-3xl bg-red-500/5 border border-red-500/10 hover:bg-red-500/10 transition-colors">
                                  <div className="text-3xl font-black text-red-500 tracking-tighter">{hazards.filter(h => !h.resolved && h.status !== 'Closed' && h.status !== 'Resolved' && h.status !== 'Invalid / Rejected' && h.status !== 'Duplicate').length}</div>
                                  <p className="text-[9px] font-black text-red-400 uppercase tracking-widest mt-1">Pending Reports</p>
                             </div>
                             <div className="p-5 rounded-3xl bg-emerald-500/5 border border-emerald-500/10 hover:bg-emerald-500/10 transition-colors">
                                  <div className="text-3xl font-black text-emerald-500 tracking-tighter">{hazards.filter(h => h.resolved || h.status === 'Resolved' || h.status === 'Closed').length}</div>
                                  <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mt-1">Resolved Reports</p>
                             </div>
                        </div>

                        {/* Level 1: Department Tabs */}
                        <div className="flex gap-2 overflow-x-auto pb-1 py-1 custom-scrollbar">
                            {['All Reports', 'Urban / GCC', 'State Highways', 'National Highways', 'Rural / Panchayat', 'Escalated', 'Overdue', 'Resolved'].map(dept => (
                                <button 
                                    key={dept}
                                    onClick={() => setFilterDepartment(dept)}
                                    className={`whitespace-nowrap px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border 
                                        ${filterDepartment === dept 
                                            ? 'bg-blue-600/20 text-blue-400 border-blue-500/50 shadow-xl' 
                                            : 'bg-white/5 text-slate-500 border-white/5 hover:bg-white/10 hover:text-slate-300'}`}
                                >
                                    {dept}
                                </button>
                            ))}
                        </div>

                        {/* Level 2: Status Chips */}
                        <div className="flex gap-2 flex-wrap pb-1 py-1">
                            {['All', 'Pending', 'Verified', 'Assigned', 'In Progress', 'Resolved', 'Closed', 'Invalid / Rejected'].map(stat => (
                                <button 
                                    key={stat}
                                    onClick={() => setFilterStatus(stat)}
                                    className={`whitespace-nowrap px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border 
                                        ${filterStatus === stat 
                                            ? 'bg-slate-700 text-white border-slate-500' 
                                            : 'bg-slate-900 text-slate-600 border-white/5 hover:bg-white/10 hover:text-slate-400'}`}
                                >
                                    {stat}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Infinite Hazard List */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4 pr-2 custom-scrollbar overscroll-contain">
                         {filteredHazards.map((hazard) => {
                             const theme = getTheme(hazard.status);
                             return (
                                <div 
                                    key={hazard.id}
                                    onClick={() => {
                                        setSelectedHazard(hazard);
                                        mapRef.current.flyTo({ center: [hazard.lng, hazard.lat], zoom: 17, padding: { left: 420, right: 460 }, duration: 1500 });
                                    }}
                                    className={`group p-5 rounded-[32px] border transition-all cursor-pointer relative overflow-hidden
                                        ${selectedHazard?.id === hazard.id 
                                            ? 'bg-slate-900 border-blue-500/50 shadow-2xl ring-1 ring-blue-500/20' 
                                            : 'bg-slate-950/20 border-white/5 hover:border-white/20'}`}
                                >
                                    {hazard.isCritical && hazard.status === 'Pending' && (
                                        <div className="absolute top-0 right-0 w-1.5 h-full bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)]"></div>
                                    )}

                                    <div className="flex justify-between items-start mb-3">
                                        <div className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest text-white ${theme.pill}`}>
                                            {hazard.status || 'Pending'}
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            {hazard.isOverdue && !hazard.resolved && (
                                                <span className="px-2 py-0.5 rounded text-[8px] font-black bg-red-500/20 text-red-400 uppercase border border-red-500/30">
                                                    {hazard.isEscalated ? 'Escalated' : 'Overdue'}
                                                </span>
                                            )}
                                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 border border-white/5">
                                                <span className="material-icons-round text-blue-400 text-xs">group</span>
                                                <span className="text-[10px] font-black text-slate-400">Score: {hazard.priorityRate}</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <h4 className="text-base font-black text-slate-100 mb-1.5 uppercase tracking-tight truncate">{hazard.type}</h4>
                                    
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="px-2 py-0.5 rounded text-[8px] font-black bg-slate-800 text-slate-300 uppercase border border-slate-700 truncate max-w-[150px]">
                                            {hazard.department}
                                        </span>
                                        <span className={`text-[9px] font-bold ${hazard.isOverdue && !hazard.resolved ? 'text-red-400' : (hazard.resolved ? 'text-emerald-400' : 'text-slate-400')}`}>
                                            {hazard.slaStatus} {hazard.daysOpen !== undefined && !hazard.resolved ? `(${hazard.daysOpen} days open)` : ''}
                                        </span>
                                    </div>

                                    <div className="text-[11px] text-slate-500 flex items-start gap-2 leading-relaxed">
                                        <span className="material-icons-round text-base text-slate-600 shrink-0">location_on</span>
                                        <span className="line-clamp-2">{hazard.address || "Location Coordinate System"}</span>
                                    </div>

                                    <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between">
                                         <div className="flex items-center gap-2">
                                              <div className="flex -space-x-2">
                                                   {[...Array(Math.min(3, hazard.reportCount || 1))].map((_, i) => (
                                                       <div key={i} className="w-6 h-6 rounded-full bg-slate-800 border-2 border-slate-950 flex items-center justify-center">
                                                           <span className="material-icons-round text-[10px] text-slate-500">person</span>
                                                       </div>
                                                   ))}
                                              </div>
                                              <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                                                   {hazard.reportCount || 1} Citizen Reports
                                              </span>
                                         </div>
                                         <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-1 group-hover:text-blue-300">
                                            View Details <span className="material-icons-round text-[10px]">open_in_new</span>
                                         </span>
                                    </div>
                                </div>
                             );
                        })}
                    </div>
                </aside>

                {/* Map Interface */}
                <main className="flex-1 relative bg-slate-950">
                    <div ref={mapContainerRef} className="absolute inset-0" />
                    
                    {/* Gradient Overlays for Cinematic Feel */}
                    <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-slate-950 to-transparent pointer-events-none"></div>
                    <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-slate-950 to-transparent pointer-events-none"></div>

                    {/* Map Layer Controls */}
                    <div className="absolute top-10 left-10 z-10 flex flex-col gap-2 pointer-events-none">
                        <div className="glass-panel p-4 rounded-3xl shadow-2xl flex flex-col gap-3 pointer-events-auto bg-slate-950/80 backdrop-blur-xl border border-white/10">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 border-b border-white/5 pb-2">GIS Layers</h3>
                            
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input type="checkbox" checked={activeLayers.ward} onChange={() => toggleLayer('ward')} className="sr-only" />
                                <div className={`w-8 h-4 rounded-full transition-colors relative ${activeLayers.ward ? 'bg-blue-500' : 'bg-slate-700'}`}>
                                    <div className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-transform ${activeLayers.ward ? 'translate-x-4.5' : 'translate-x-0.5'}`}></div>
                                </div>
                                <span className="text-xs text-slate-300 font-bold group-hover:text-white transition-colors">Ward Boundaries</span>
                            </label>
                            
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input type="checkbox" checked={activeLayers.sh} onChange={() => toggleLayer('sh')} className="sr-only" />
                                <div className={`w-8 h-4 rounded-full transition-colors relative ${activeLayers.sh ? 'bg-orange-500' : 'bg-slate-700'}`}>
                                    <div className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-transform ${activeLayers.sh ? 'translate-x-4.5' : 'translate-x-0.5'}`}></div>
                                </div>
                                <span className="text-xs text-slate-300 font-bold group-hover:text-white transition-colors">State Highways</span>
                            </label>

                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input type="checkbox" checked={activeLayers.nh} onChange={() => toggleLayer('nh')} className="sr-only" />
                                <div className={`w-8 h-4 rounded-full transition-colors relative ${activeLayers.nh ? 'bg-purple-500' : 'bg-slate-700'}`}>
                                    <div className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-transform ${activeLayers.nh ? 'translate-x-4.5' : 'translate-x-0.5'}`}></div>
                                </div>
                                <span className="text-xs text-slate-300 font-bold group-hover:text-white transition-colors">National Highways</span>
                            </label>

                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input type="checkbox" checked={activeLayers.rural} onChange={() => toggleLayer('rural')} className="sr-only" />
                                <div className={`w-8 h-4 rounded-full transition-colors relative ${activeLayers.rural ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                                    <div className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-transform ${activeLayers.rural ? 'translate-x-4.5' : 'translate-x-0.5'}`}></div>
                                </div>
                                <span className="text-xs text-slate-300 font-bold group-hover:text-white transition-colors">Rural / Panchayat</span>
                            </label>
                        </div>
                    </div>

                    {/* Collapsed Legend Preview */}
                    {!isLegendOpen && (
                        <div className="absolute bottom-10 left-10 z-10 flex gap-4 animate-fade-in">
                             <div className="glass-panel p-4 rounded-3xl shadow-2xl flex items-center gap-6 px-8 cursor-pointer hover:bg-slate-900/60 transition-colors border border-white/5" onClick={() => setIsLegendOpen(true)}>
                                 <span className="material-icons-round text-slate-400 text-sm">legend_toggle</span>
                                 {['Pending', 'Verified', 'In Progress', 'Resolved'].map(s => (
                                     <div key={s} className="flex items-center gap-3">
                                         <span className={`w-3 h-3 rounded-full ${getTheme({status: s}).pill} shadow-lg shadow-black/50`}></span>
                                         <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] hidden sm:block">{s}</span>
                                     </div>
                                 ))}
                             </div>
                        </div>
                    )}

                    {/* Collapsible Legend */}
                    {isLegendOpen && (
                        <div className="absolute bottom-10 left-10 z-10 flex flex-col gap-4 animate-slide-up origin-bottom-left">
                             <div className="glass-panel p-5 rounded-3xl shadow-2xl flex flex-col gap-4 px-6 bg-slate-950/95 backdrop-blur-3xl border border-white/10 relative w-[320px]">
                                 <button onClick={() => setIsLegendOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors">
                                     <span className="material-icons-round text-sm">close</span>
                                 </button>
                                 
                                 <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 pb-2 mb-1 flex items-center gap-2">
                                     <span className="material-icons-round text-[12px]">palette</span> Status Colors
                                 </div>
                                 <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                                     {['Pending', 'Verified', 'Assigned', 'In Progress', 'Resolved', 'Invalid / Rejected', 'Escalated'].map(s => (
                                         <div key={s} className="flex items-center gap-3">
                                             <span className={`w-3 h-3 rounded-full ${getTheme({status: s, isEscalated: s === 'Escalated'}).pill} shadow-lg shadow-black/50`}></span>
                                             <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.1em] truncate" title={s}>{s}</span>
                                         </div>
                                     ))}
                                 </div>
                                 
                                 <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 pb-2 mt-2 mb-1 flex items-center gap-2">
                                     <span className="material-icons-round text-[12px]">radar</span> Priority Styling
                                 </div>
                                 <div className="flex flex-col gap-3">
                                    <div className="flex items-center gap-3">
                                        <span className={`w-4 h-4 rounded-full border-2 border-slate-500 flex items-center justify-center`}><span className="text-[8px] font-bold">1</span></span>
                                        <span className="text-[9px] font-bold text-slate-400">Score 1-2: Normal Border</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`w-4 h-4 rounded-full border-4 border-slate-500 flex items-center justify-center`}><span className="text-[8px] font-bold">4</span></span>
                                        <span className="text-[9px] font-bold text-slate-400">Score 3-5: Thick Border</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="relative w-4 h-4 rounded-full bg-slate-500 flex items-center justify-center">
                                            <div className="absolute inset-0 rounded-full animate-ping bg-slate-500 opacity-75"></div>
                                        </div>
                                        <span className="text-[9px] font-bold text-slate-400">Score 6+: Glowing Pulse</span>
                                    </div>
                                 </div>
                             </div>
                        </div>
                    )}

                    {/* Detail Floating Node */}
                    {selectedHazard && (
                        <div className="absolute top-10 right-10 w-[440px] max-h-[calc(100%-5rem)] bg-slate-950/90 backdrop-blur-3xl rounded-[48px] shadow-[0_40px_120px_rgba(0,0,0,0.6)] border border-white/10 overflow-hidden flex flex-col z-30 animate-slide-in-right">
                             <div className="relative h-72 shrink-0 overflow-hidden">
                                 <img src={selectedHazard.image} className="w-full h-full object-cover brightness-[0.7]" alt="Evidence" />
                                 <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent"></div>
                                 
                                 <button 
                                    onClick={() => setSelectedHazard(null)}
                                    className="absolute top-8 right-8 w-12 h-12 rounded-full bg-black/60 backdrop-blur-3xl text-white flex items-center justify-center hover:bg-black/90 transition-all border border-white/10 shadow-2xl"
                                 >
                                     <span className="material-icons-round">close</span>
                                 </button>

                                 <div className="absolute bottom-10 left-10 right-10">
                                     <div className={`px-3 py-1 rounded w-fit text-[10px] font-black text-white uppercase mb-4 tracking-widest ${getTheme(selectedHazard).pill}`}>
                                         {selectedHazard.status || 'Pending'}
                                     </div>
                                     <h2 className="text-3xl font-black text-white leading-tight uppercase tracking-tighter pr-4">{selectedHazard.type}</h2>
                                 </div>
                             </div>

                             <div className="p-10 flex-1 overflow-y-auto min-h-0 space-y-10 custom-scrollbar pr-6 overscroll-contain">
                                 <div className="grid grid-cols-2 gap-6">
                                     <div className="bg-white/5 p-6 rounded-[36px] border border-white/5 text-center transition-transform hover:scale-[1.02]">
                                         <div className="text-5xl font-black text-white tracking-tighter leading-none">{selectedHazard.reportCount || 1}</div>
                                         <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-3">Citizen Reports</p>
                                     </div>
                                     <div className="bg-blue-500/10 p-6 rounded-[36px] border border-blue-500/20 text-center transition-transform hover:scale-[1.02]">
                                         <div className="text-5xl font-black text-blue-400 tracking-tighter leading-none">{selectedHazard.priorityRate}</div>
                                         <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mt-3">Priority Score</p>
                                     </div>
                                 </div>

                                 <div className="space-y-8">
                                      <div className="flex items-start gap-6">
                                          <div className="w-14 h-14 rounded-3xl bg-indigo-500/10 flex items-center justify-center shrink-0 border border-indigo-500/20 text-indigo-400 shadow-xl shadow-indigo-500/5">
                                              <span className="material-icons-round text-2xl">location_city</span>
                                          </div>
                                          <div>
                                              <p className="text-sm font-black text-slate-100 leading-snug tracking-tight mb-2 underline decoration-blue-500/50 underline-offset-4 decoration-2">{selectedHazard.address || "Jurisdiction Coordinates"}</p>
                                              <p className="text-[11px] font-mono font-black text-slate-600 tracking-widest uppercase flex items-center gap-2 mb-1.5">
                                                   <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
                                                    GPS: {selectedHazard.lat?.toFixed(5)}N / {selectedHazard.lng?.toFixed(5)}E
                                              </p>
                                              <div className="flex items-center gap-2">
                                                  <span className="px-2 py-0.5 rounded bg-white/5 text-[9px] font-bold text-slate-400 border border-white/5 uppercase">
                                                      Dept: {selectedHazard.department}
                                                  </span>
                                                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${selectedHazard.isOverdue && !selectedHazard.resolved ? 'bg-red-500/10 text-red-400 border-red-500/20' : (selectedHazard.resolved ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20')}`}>
                                                      SLA: {selectedHazard.slaStatus}
                                                  </span>
                                              </div>
                                          </div>
                                      </div>

                                     <div className="p-6 rounded-[36px] bg-slate-900/60 border border-white/5 flex items-center justify-between shadow-inner">
                                         <div className="flex items-center gap-3">
                                              <span className="material-icons-round text-blue-500 text-xl">verified</span>
                                              <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">AI Validation</span>
                                         </div>
                                         <div className={`px-4 py-2 rounded-2xl font-black text-[10px] tracking-widest uppercase
                                            ${selectedHazard.verification_status === 'Verified' 
                                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'}`}>
                                              {selectedHazard.verification_status || 'Pending'}
                                         </div>
                                     </div>
                                 </div>

                                 {/* Location & Anti-Spoofing Validation */}
                                 {selectedHazard.locationValidation && (
                                     <div className="pt-8 border-t border-white/5 space-y-4">
                                         <h5 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">Location Validation</h5>
                                         <div className="p-5 rounded-[24px] bg-slate-900/60 border border-white/5 shadow-inner space-y-4">
                                             <div className="flex items-center justify-between">
                                                 <div className="flex items-center gap-3">
                                                      <span className="material-icons-round text-blue-500 text-xl">satellite_alt</span>
                                                      <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Road Proximity</span>
                                                 </div>
                                                 <div className={`px-4 py-2 rounded-2xl font-black text-[10px] tracking-widest uppercase
                                                    ${selectedHazard.locationValidation.validationStatus === 'valid' 
                                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                                                        : selectedHazard.locationValidation.validationStatus === 'needs_location_review'
                                                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                                        : 'bg-red-500/10 text-red-400 border border-red-500/30'}`}>
                                                      {selectedHazard.locationValidation.validationStatus === 'valid' ? 'Road Verified' : 
                                                       selectedHazard.locationValidation.validationStatus === 'needs_location_review' ? 'Needs Review' : 'Invalid / Not Near Road'}
                                                 </div>
                                             </div>
                                             
                                             <div className="grid grid-cols-2 gap-4 text-xs pt-2 border-t border-white/5">
                                                 <div><span className="block text-[9px] text-slate-500 uppercase tracking-widest mb-1">Distance</span><span className="font-bold text-slate-300">{Math.round(selectedHazard.locationValidation.distanceToNearestRoadMeters || 0)} meters</span></div>
                                                 <div><span className="block text-[9px] text-slate-500 uppercase tracking-widest mb-1">GPS Accuracy</span><span className="font-bold text-slate-300">{Math.round(selectedHazard.locationValidation.gpsAccuracyMeters || 0)} meters</span></div>
                                             </div>
                                         </div>
                                     </div>
                                 )}

                                 {/* Jurisdiction Data */}
                                 <div className="pt-8 border-t border-white/5 space-y-4">
                                     <h5 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">Jurisdiction & Location</h5>
                                     <div className="p-5 rounded-[24px] bg-slate-900/60 border border-white/5 shadow-inner">
                                         {selectedHazard.department === 'Urban / GCC' ? (
                                             <div className="grid grid-cols-2 gap-4 text-xs">
                                                 <div><span className="block text-[9px] text-slate-500 uppercase tracking-widest mb-1">Authority</span><span className="font-bold text-slate-300">{selectedHazard.normAuth || 'Greater Chennai Corporation'}</span></div>
                                                 <div><span className="block text-[9px] text-slate-500 uppercase tracking-widest mb-1">Jurisdiction</span><span className="font-bold text-slate-300">Urban</span></div>
                                                 <div><span className="block text-[9px] text-slate-500 uppercase tracking-widest mb-1">Zone</span><span className="font-bold text-slate-300">{selectedHazard.normZone || 'Needs GIS Review'}</span></div>
                                                 <div><span className="block text-[9px] text-slate-500 uppercase tracking-widest mb-1">Ward</span><span className="font-bold text-slate-300">{selectedHazard.normWard || 'Needs GIS Review'}</span></div>
                                             </div>
                                         ) : selectedHazard.department === 'State Highways' || selectedHazard.department === 'National Highways' ? (
                                             <div className="grid grid-cols-2 gap-4 text-xs">
                                                 <div className="col-span-2"><span className="block text-[9px] text-slate-500 uppercase tracking-widest mb-1">Authority</span><span className="font-bold text-slate-300">{selectedHazard.normAuth || (selectedHazard.department === 'State Highways' ? 'Tamil Nadu State Highways' : 'NHAI')}</span></div>
                                                 <div><span className="block text-[9px] text-slate-500 uppercase tracking-widest mb-1">Road Type</span><span className="font-bold text-slate-300">{selectedHazard.normHighwayType || selectedHazard.department}</span></div>
                                                 <div><span className="block text-[9px] text-slate-500 uppercase tracking-widest mb-1">Road Number</span><span className="font-bold text-slate-300">{selectedHazard.normHighwayNumber || 'N/A'}</span></div>
                                             </div>
                                         ) : selectedHazard.department === 'Rural / Panchayat' ? (
                                             <div className="grid grid-cols-2 gap-4 text-xs">
                                                 <div><span className="block text-[9px] text-slate-500 uppercase tracking-widest mb-1">District</span><span className="font-bold text-slate-300">{selectedHazard.normDistrict || 'N/A'}</span></div>
                                                 <div><span className="block text-[9px] text-slate-500 uppercase tracking-widest mb-1">Panchayat</span><span className="font-bold text-slate-300">{selectedHazard.normPanchayat || 'N/A'}</span></div>
                                             </div>
                                         ) : (
                                             <div className="text-xs font-bold text-amber-500 flex items-center gap-2">
                                                 <span className="material-icons-round text-sm">warning</span>
                                                 Needs Jurisdiction Review
                                             </div>
                                         )}
                                     </div>
                                 </div>

                                 {/* Officer Assignment & Escalation */}
                                 <div className="pt-8 border-t border-white/5">
                                     <div className="flex items-center justify-between mb-6">
                                          <h5 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">Officer Assignment & Escalation</h5>
                                          <span className="material-icons-round text-slate-700 cursor-help">assignment_ind</span>
                                     </div>
                                     
                                     <div className="space-y-4">
                                        <div className="p-5 rounded-[24px] bg-white/5 border border-white/5">
                                            <div className="flex justify-between items-center mb-3">
                                                <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Assigned Role</span>
                                                <span className={`px-2 py-1 rounded text-[9px] font-bold uppercase border 
                                                    ${selectedHazard.status === 'Pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                                                    {selectedHazard.status === 'Pending' ? 'Pending Review' : 'Assigned'}
                                                </span>
                                            </div>
                                            <p className="text-sm font-black text-white">{selectedHazard.assignedOfficerRole || selectedHazard.suggestedOfficerRole}</p>
                                            
                                            {selectedHazard.status === 'Pending' && (
                                                <button 
                                                    onClick={handleAssignOfficer}
                                                    className="mt-4 w-full py-2 bg-blue-500/20 hover:bg-blue-500/40 text-blue-400 text-xs font-bold rounded-xl transition-colors border border-blue-500/30"
                                                >
                                                    Confirm & Assign Report
                                                </button>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-4 rounded-[20px] bg-white/5 border border-white/5">
                                                <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest block mb-1">Escalation Lvl</span>
                                                <div className={`text-lg font-black ${selectedHazard.escalationLevel >= 2 ? 'text-red-400' : 'text-emerald-400'}`}>
                                                    Level {selectedHazard.escalationLevel || 0}
                                                </div>
                                            </div>
                                            <div className="p-4 rounded-[20px] bg-white/5 border border-white/5">
                                                <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest block mb-1">Days Open</span>
                                                <div className="text-lg font-black text-white">{selectedHazard.daysOpen}</div>
                                            </div>
                                        </div>

                                        {selectedHazard.status !== 'Pending' && !selectedHazard.resolved && selectedHazard.isOverdue && selectedHazard.escalationLevel < 3 && (
                                            <button 
                                                onClick={() => handleEscalate(selectedHazard.escalationLevel + 1)}
                                                className="w-full py-2 bg-red-500/20 hover:bg-red-500/40 text-red-400 text-xs font-bold rounded-xl transition-colors border border-red-500/30 flex items-center justify-center gap-2"
                                            >
                                                <span className="material-icons-round text-sm">trending_up</span>
                                                Escalate to Level {selectedHazard.escalationLevel + 1}
                                            </button>
                                        )}
                                     </div>
                                 </div>

                                 <div className="pt-8 border-t border-white/5">
                                     <div className="flex items-center justify-between mb-8">
                                          <h5 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">Lifecycle Management</h5>
                                          <span className="material-icons-round text-slate-700 cursor-help">info_outline</span>
                                     </div>
                                     <div className="grid grid-cols-2 gap-3">
                                         {['Pending', 'Verified', 'Assigned', 'In Progress', 'Resolved', 'Closed', 'Invalid / Rejected', 'Duplicate'].map(s => (
                                             <button 
                                                key={s}
                                                onClick={() => handleStatusUpdate(selectedHazard.ids || selectedHazard.id, s)}
                                                className={`group w-full py-4 rounded-[16px] text-[10px] font-black transition-all border flex items-center justify-between px-4
                                                    ${selectedHazard.status === s 
                                                        ? 'bg-white text-slate-950 border-white shadow-[0_10px_20px_rgba(255,255,255,0.1)] scale-[1.02]' 
                                                        : 'bg-slate-900 text-slate-500 border-white/5 hover:border-white/10 hover:text-slate-300'}`}
                                             >
                                                 <span className="truncate pr-2">{s.toUpperCase()}</span>
                                                 <span className={`material-icons-round text-sm transition-all ${selectedHazard.status === s ? 'text-slate-950 opacity-100' : 'opacity-0 group-hover:opacity-40'}`}>
                                                     {s === 'Resolved' || s === 'Closed' ? 'done_all' : 'sync'}
                                                 </span>
                                             </button>
                                         ))}
                                     </div>
                                 </div>

                                 {/* Admin Communications */}
                                 <div className="pt-8 border-t border-white/5 space-y-6">
                                     <div className="flex items-center justify-between">
                                         <h5 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">Admin Communications</h5>
                                         <span className="material-icons-round text-slate-700">chat</span>
                                     </div>

                                     {/* Public Response */}
                                     <div className="space-y-3">
                                         <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-2">
                                             <span className="material-icons-round text-xs">public</span> Public Response to User
                                         </label>
                                         <div className="flex flex-wrap gap-2 mb-2">
                                             {PUBLIC_TEMPLATES.map((tmpl, idx) => (
                                                 <button
                                                     key={idx}
                                                     onClick={() => setAdminPublicResponse(tmpl)}
                                                     className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[9px] text-slate-400 hover:text-white hover:bg-white/10 transition-colors text-left max-w-[200px] truncate"
                                                     title={tmpl}
                                                 >
                                                     {tmpl}
                                                 </button>
                                             ))}
                                         </div>
                                         <textarea
                                             value={adminPublicResponse}
                                             onChange={(e) => setAdminPublicResponse(e.target.value)}
                                             placeholder="Type a message to the citizen..."
                                             className="w-full h-24 bg-slate-900/50 border border-white/10 rounded-2xl p-4 text-xs text-slate-300 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 resize-none transition-all placeholder:text-slate-700"
                                         />
                                     </div>

                                     {/* Internal Note */}
                                     <div className="space-y-3">
                                         <label className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
                                             <span className="material-icons-round text-xs">lock</span> Internal Admin Note
                                         </label>
                                         <textarea
                                             value={adminInternalNote}
                                             onChange={(e) => setAdminInternalNote(e.target.value)}
                                             placeholder="Private notes for staff..."
                                             className="w-full h-20 bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 text-xs text-amber-200 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 resize-none transition-all placeholder:text-amber-700/50"
                                         />
                                     </div>

                                     <button
                                         onClick={handleSaveNotes}
                                         disabled={isSavingNotes}
                                         className={`w-full py-4 rounded-[20px] text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2
                                            ${isSavingNotes ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-500 hover:shadow-[0_10px_20px_rgba(37,99,235,0.2)]'}`}
                                     >
                                         {isSavingNotes ? 'Saving...' : 'Save Notes'}
                                         <span className="material-icons-round text-sm">{isSavingNotes ? 'hourglass_empty' : 'save'}</span>
                                     </button>

                                     {/* Note History Collapsible */}
                                     {selectedHazard.noteHistory && selectedHazard.noteHistory.length > 0 && (
                                         <div className="pt-4 border-t border-white/5">
                                             <button 
                                                 onClick={() => setShowHistory(!showHistory)}
                                                 className="flex items-center justify-between w-full text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-slate-300 transition-colors"
                                             >
                                                 View Note History ({selectedHazard.noteHistory.length})
                                                 <span className="material-icons-round text-sm">{showHistory ? 'expand_less' : 'expand_more'}</span>
                                             </button>
                                             {showHistory && (
                                                 <div className="mt-4 space-y-4 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                                                     {[...selectedHazard.noteHistory].reverse().map((note, i) => (
                                                         <div key={i} className={`p-3 rounded-xl border ${note.type === 'public' ? 'bg-blue-500/5 border-blue-500/10' : 'bg-amber-500/5 border-amber-500/10'}`}>
                                                             <div className="flex items-center justify-between mb-1.5">
                                                                 <span className={`text-[9px] font-black uppercase tracking-widest ${note.type === 'public' ? 'text-blue-400' : 'text-amber-500'}`}>
                                                                     {note.type === 'public' ? 'Public' : 'Internal'}
                                                                 </span>
                                                                 <span className="text-[8px] text-slate-600 font-mono">
                                                                     {new Date(note.createdAt).toLocaleString()}
                                                                 </span>
                                                             </div>
                                                             <p className="text-xs text-slate-300 leading-relaxed">{note.message}</p>
                                                             <p className="text-[8px] text-slate-600 mt-2 font-black uppercase tracking-wider text-right">- {note.createdByRole}</p>
                                                         </div>
                                                     ))}
                                                 </div>
                                             )}
                                         </div>
                                     )}
                                     {/* Developer Debug Info */}
                                     <div className="pt-4 border-t border-white/5">
                                         <details className="group cursor-pointer">
                                             <summary className="text-[10px] font-black text-fuchsia-500 uppercase tracking-widest hover:text-fuchsia-400 transition-colors flex items-center justify-between outline-none">
                                                 Developer Debug Info
                                                 <span className="material-icons-round text-sm group-open:rotate-180 transition-transform">expand_more</span>
                                             </summary>
                                             <div className="mt-4 p-4 rounded-xl bg-slate-950/80 border border-fuchsia-500/20 text-[10px] text-slate-400 font-mono space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                                                 <div className="flex justify-between border-b border-white/5 pb-1"><span className="text-fuchsia-400">masterHazardId:</span> <span>{selectedHazard.id}</span></div>
                                                 <div className="flex justify-between border-b border-white/5 pb-1"><span className="text-fuchsia-400">primaryReportId:</span> <span>{selectedHazard.id}</span></div>
                                                 <div className="flex flex-col border-b border-white/5 pb-1"><span className="text-fuchsia-400">linkedReportIds:</span> <span className="break-all">{JSON.stringify(selectedHazard.ids)}</span></div>
                                                 <div className="flex justify-between border-b border-white/5 pb-1"><span className="text-fuchsia-400">reportCount:</span> <span>{selectedHazard.reportCount}</span></div>
                                                 <div className="flex justify-between border-b border-white/5 pb-1"><span className="text-fuchsia-400">priorityRate:</span> <span>{selectedHazard.priorityRate}</span></div>
                                                 <div className="flex justify-between border-b border-white/5 pb-1"><span className="text-fuchsia-400">groupedStatus:</span> <span>{selectedHazard.status}</span></div>
                                                 <div className="flex justify-between border-b border-white/5 pb-1"><span className="text-fuchsia-400">assignedRole:</span> <span>{selectedHazard.assignedOfficerRole || 'null'}</span></div>
                                                 <div className="flex justify-between border-b border-white/5 pb-1"><span className="text-fuchsia-400">assignedDept:</span> <span>{selectedHazard.assignedDepartment || 'null'}</span></div>
                                                 <div className="flex justify-between border-b border-white/5 pb-1"><span className="text-fuchsia-400">assignedAt:</span> <span>{selectedHazard.assignedAt ? new Date(selectedHazard.assignedAt.seconds * 1000).toISOString() : 'null'}</span></div>
                                                 <div className="flex justify-between border-b border-white/5 pb-1"><span className="text-fuchsia-400">authority:</span> <span>{selectedHazard.jurisdiction?.Authority || selectedHazard.normAuth || 'null'}</span></div>
                                                 <div className="flex justify-between border-b border-white/5 pb-1"><span className="text-fuchsia-400">jurisdiction:</span> <span>{selectedHazard.jurisdiction?.Type || selectedHazard.normJur || 'null'}</span></div>
                                                 <div className="flex justify-between border-b border-white/5 pb-1"><span className="text-fuchsia-400">ward:</span> <span>{selectedHazard.jurisdiction?.Details?.split(',')[0] || selectedHazard.normWard || 'null'}</span></div>
                                                 <div className="flex justify-between pb-1"><span className="text-fuchsia-400">zone:</span> <span>{selectedHazard.jurisdiction?.Details?.split(',')[1] || selectedHazard.normZone || 'null'}</span></div>
                                                 <div className="mt-2 text-fuchsia-300">Firebase sync updates to all linkedReportIds in the 'hazards' collection.</div>
                                             </div>
                                         </details>
                                     </div>
                                 </div>
                             </div>
                        </div>
                    )}
                </main>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
