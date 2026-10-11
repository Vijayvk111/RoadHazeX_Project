import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend, LineChart, Line } from 'recharts';

// Theme configuration matching RoadHazeX design
const COLORS = {
    'Pending': '#ef4444',
    'Verified': '#3b82f6',
    'Assigned': '#f97316',
    'In Progress': '#eab308',
    'Resolved': '#10b981',
    'Closed': '#10b981',
    'Invalid / Rejected': '#6b7280',
    'Duplicate': '#6b7280',
    'Escalated': '#a855f7'
};

const AnalyticsPanel = ({ hazards: processedHazards = [] }) => {
    const [dateRange, setDateRange] = useState('30d');
    const [departmentFilter, setDepartmentFilter] = useState('All');

    // 1. Data Filtering Logic
    const filteredData = useMemo(() => {
        const now = new Date();
        let cutoff = new Date(0);

        if (dateRange === 'today') {
            cutoff = new Date(now.setHours(0,0,0,0));
        } else if (dateRange === '7d') {
            cutoff = new Date(now.setDate(now.getDate() - 7));
        } else if (dateRange === '30d') {
            cutoff = new Date(now.setDate(now.getDate() - 30));
        }

        return processedHazards.filter(h => {
            const hDate = new Date(h.reportDate || h.createdAt || 0);
            if (hDate < cutoff) return false;
            
            if (departmentFilter !== 'All' && h.department !== departmentFilter) return false;
            
            return true;
        });
    }, [processedHazards, dateRange, departmentFilter]);

    // 2. Overview Metrics Calculation
    const overviewMetrics = useMemo(() => {
        let citizenReports = 0;
        let active = 0;
        let resolved = 0;
        let overdue = 0;
        let escalated = 0;
        let totalResolutionTimeDays = 0;
        let resolutionCount = 0;
        
        filteredData.forEach(h => {
            // Grouped Hazard Rules
            citizenReports += (h.reportCount || 1);
            
            const isInactive = ['Resolved', 'Closed', 'Invalid / Rejected', 'Duplicate'].includes(h.status) || h.resolved;
            const isResolved = ['Resolved', 'Closed'].includes(h.status) || h.resolved;
            
            if (!isInactive) {
                active += 1;
                if (h.isOverdue) overdue += 1;
                if (h.isEscalated) escalated += 1;
            }
            
            if (isResolved) {
                resolved += 1;
                
                // Calculate SLA
                const start = h.assignedAt ? (h.assignedAt.seconds ? new Date(h.assignedAt.seconds * 1000) : new Date(h.assignedAt)) : new Date(h.reportDate);
                const end = h.resolvedAt ? (h.resolvedAt.seconds ? new Date(h.resolvedAt.seconds * 1000) : new Date(h.resolvedAt)) : (h.updatedAt ? (h.updatedAt.seconds ? new Date(h.updatedAt.seconds * 1000) : new Date(h.updatedAt)) : new Date());
                
                const days = Math.max(0, (end - start) / (1000 * 60 * 60 * 24));
                totalResolutionTimeDays += days;
                resolutionCount += 1;
            }
        });

        return {
            citizenReports,
            groupedHazards: filteredData.length,
            active,
            resolved,
            overdue,
            escalated,
            avgResolutionDays: resolutionCount > 0 ? (totalResolutionTimeDays / resolutionCount).toFixed(1) : 0
        };
    }, [filteredData]);

    // 3. Department Matrix
    const deptMatrix = useMemo(() => {
        const matrix = {};
        ['Urban / GCC', 'State Highways', 'National Highways', 'Rural / Panchayat', 'Unclassified / Needs Review'].forEach(d => {
            matrix[d] = { name: d, total: 0, active: 0, resolved: 0, overdue: 0 };
        });

        filteredData.forEach(h => {
            const dept = h.department || 'Unclassified / Needs Review';
            if (matrix[dept]) {
                matrix[dept].total += 1;
                const isInactive = ['Resolved', 'Closed', 'Invalid / Rejected', 'Duplicate'].includes(h.status) || h.resolved;
                if (!isInactive) {
                    matrix[dept].active += 1;
                    if (h.isOverdue) matrix[dept].overdue += 1;
                } else if (['Resolved', 'Closed'].includes(h.status) || h.resolved) {
                    matrix[dept].resolved += 1;
                }
            }
        });
        return Object.values(matrix).filter(d => d.total > 0).sort((a,b) => b.total - a.total);
    }, [filteredData]);

    // 4. Ward / Zone Analytics
    const wardAnalytics = useMemo(() => {
        const wards = {};
        filteredData.filter(h => h.department === 'Urban / GCC').forEach(h => {
            const w = h.normWard || h.normZone || 'Unknown Ward / Needs Review';
            if (!wards[w]) wards[w] = { name: w, active: 0, resolved: 0, total: 0 };
            
            wards[w].total += 1;
            const isInactive = ['Resolved', 'Closed', 'Invalid / Rejected', 'Duplicate'].includes(h.status) || h.resolved;
            if (!isInactive) wards[w].active += 1;
            else if (['Resolved', 'Closed'].includes(h.status) || h.resolved) wards[w].resolved += 1;
        });
        return Object.values(wards).sort((a, b) => b.total - a.total).slice(0, 10); // Top 10
    }, [filteredData]);

    // 5. Hazard Type Intelligence
    const hazardAnalytics = useMemo(() => {
        const types = {};
        filteredData.forEach(h => {
            let t = String(h.type || 'Unknown').trim();
            // Normalization
            if (t.toLowerCase().includes('waterlogging')) t = 'Waterlogging';
            if (t.toLowerCase().includes('pothole')) t = 'Pothole';
            if (t.toLowerCase().includes('tree')) t = 'Tree Obstruction';
            if (t.toLowerCase().includes('broken')) t = 'Broken Road Surface';
            
            if (!types[t]) types[t] = { name: t, total: 0, active: 0, resolved: 0 };
            
            types[t].total += 1;
            const isInactive = ['Resolved', 'Closed', 'Invalid / Rejected', 'Duplicate'].includes(h.status) || h.resolved;
            if (!isInactive) types[t].active += 1;
            else if (['Resolved', 'Closed'].includes(h.status) || h.resolved) types[t].resolved += 1;
        });
        return Object.values(types).sort((a,b) => b.total - a.total);
    }, [filteredData]);

    // 6. Priority Leaderboard
    const leaderboard = useMemo(() => {
        return filteredData
            .filter(h => {
                const isInactive = ['Resolved', 'Closed', 'Invalid / Rejected', 'Duplicate'].includes(h.status) || h.resolved;
                return !isInactive;
            })
            .sort((a, b) => {
                // 1. priorityScore
                if (b.priorityRate !== a.priorityRate) return b.priorityRate - a.priorityRate;
                // 2. escalationLevel
                if (b.escalationLevel !== a.escalationLevel) return (b.escalationLevel || 0) - (a.escalationLevel || 0);
                // 3. overdue
                if (b.isOverdue !== a.isOverdue) return b.isOverdue ? 1 : -1;
                // 4. recency
                const dA = a.reportDate ? new Date(a.reportDate).getTime() : 0;
                const dB = b.reportDate ? new Date(b.reportDate).getTime() : 0;
                return dB - dA;
            })
            .slice(0, 10);
    }, [filteredData]);

    return (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 animate-fade-in pb-20">
            {/* Header Controls */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-2xl font-black text-white tracking-widest uppercase">Analytics & Decision Intelligence</h2>
                    <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest">Authority Workload & SLA Performance</p>
                </div>
                
                <div className="flex gap-4">
                    <select 
                        value={departmentFilter}
                        onChange={(e) => setDepartmentFilter(e.target.value)}
                        className="bg-slate-900/80 border border-white/10 text-white text-xs font-bold px-4 py-2 rounded-xl outline-none"
                    >
                        <option value="All">All Departments</option>
                        <option value="Urban / GCC">Urban / GCC</option>
                        <option value="State Highways">State Highways</option>
                        <option value="National Highways">National Highways</option>
                        <option value="Rural / Panchayat">Rural / Panchayat</option>
                    </select>

                    <select 
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value)}
                        className="bg-slate-900/80 border border-white/10 text-white text-xs font-bold px-4 py-2 rounded-xl outline-none"
                    >
                        <option value="today">Today</option>
                        <option value="7d">Last 7 Days</option>
                        <option value="30d">Last 30 Days</option>
                        <option value="all">All Time</option>
                    </select>
                </div>
            </div>

            {/* Top Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
                {[
                    { label: 'Citizen Reports', value: overviewMetrics.citizenReports, color: 'text-blue-400' },
                    { label: 'Grouped Hazards', value: overviewMetrics.groupedHazards, color: 'text-slate-300' },
                    { label: 'Active', value: overviewMetrics.active, color: 'text-yellow-400' },
                    { label: 'Resolved', value: overviewMetrics.resolved, color: 'text-emerald-400' },
                    { label: 'Overdue', value: overviewMetrics.overdue, color: 'text-orange-400' },
                    { label: 'Escalated', value: overviewMetrics.escalated, color: 'text-purple-400' },
                    { label: 'Avg Time (Days)', value: overviewMetrics.avgResolutionDays, color: 'text-emerald-400' }
                ].map((stat, i) => (
                    <div key={i} className="glass-panel p-4 rounded-3xl border border-white/5 bg-slate-900/50 flex flex-col justify-center items-center text-center">
                        <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">{stat.label}</div>
                        <div className={`text-2xl font-black ${stat.color}`}>{stat.value}</div>
                    </div>
                ))}
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Department Matrix Chart */}
                <div className="glass-panel p-6 rounded-[2rem] border border-white/5 bg-slate-900/40">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Department Workload</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={deptMatrix} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ backgroundColor: '#020617', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', color: '#fff' }} itemStyle={{ fontSize: 12, fontWeight: 'bold' }} />
                                <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                                <Bar dataKey="active" name="Active" stackId="a" fill="#eab308" radius={[0, 0, 4, 4]} />
                                <Bar dataKey="resolved" name="Resolved" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Hazard Type Distribution */}
                <div className="glass-panel p-6 rounded-[2rem] border border-white/5 bg-slate-900/40">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Hazard Type Intelligence</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={hazardAnalytics} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={false} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" tick={{ fill: '#cbd5e1', fontSize: 10, fontWeight: 'bold' }} width={120} axisLine={false} tickLine={false} />
                                <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ backgroundColor: '#020617', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', color: '#fff' }} />
                                <Bar dataKey="active" name="Active" stackId="a" fill="#ef4444" radius={[0, 0, 0, 0]} />
                                <Bar dataKey="resolved" name="Resolved" stackId="a" fill="#10b981" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Row 3: Wards & High Risk */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Ward Analytics */}
                <div className="glass-panel p-6 rounded-[2rem] border border-white/5 bg-slate-900/40">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex justify-between">
                        <span>Civic Focus: Top Wards / Zones</span>
                        <span className="text-slate-600">(Urban / GCC Only)</span>
                    </h3>
                    <div className="space-y-4">
                        {wardAnalytics.length === 0 ? (
                            <div className="text-center text-slate-500 text-xs py-10 font-bold uppercase tracking-widest">No Ward Data</div>
                        ) : wardAnalytics.map((w, i) => (
                            <div key={i} className="flex items-center justify-between border-b border-white/5 pb-3">
                                <span className="text-xs font-bold text-slate-300">{w.name}</span>
                                <div className="flex gap-4">
                                    <span className="text-[10px] font-black text-yellow-500">{w.active} Active</span>
                                    <span className="text-[10px] font-black text-emerald-500">{w.resolved} Resolved</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Priority Leaderboard */}
                <div className="glass-panel p-6 rounded-[2rem] border border-white/5 bg-slate-900/40">
                    <h3 className="text-xs font-black text-fuchsia-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <span className="material-icons-round text-sm">warning</span> High-Risk Unresolved Leaderboard
                    </h3>
                    <div className="space-y-3">
                        {leaderboard.length === 0 ? (
                            <div className="text-center text-slate-500 text-xs py-10 font-bold uppercase tracking-widest">No Active Hazards</div>
                        ) : leaderboard.map((h, i) => (
                            <div key={i} className="bg-slate-950/50 rounded-xl p-4 border border-white/5 flex justify-between items-center hover:bg-slate-900/80 transition-colors">
                                <div className="flex flex-col gap-1">
                                    <span className="text-xs font-black text-white uppercase tracking-widest">{h.type}</span>
                                    <span className="text-[9px] text-slate-400 uppercase tracking-widest">{h.normWard || h.department || 'Location Pending'}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    {h.isOverdue && <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-orange-500/10 text-orange-400 border border-orange-500/20">Overdue</span>}
                                    {h.isEscalated && <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-purple-500/10 text-purple-400 border border-purple-500/20">Escalated</span>}
                                    <div className="w-8 h-8 rounded-full border border-fuchsia-500/50 flex items-center justify-center text-xs font-black text-fuchsia-400 shadow-[0_0_10px_rgba(217,70,239,0.2)]">
                                        {h.priorityRate}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Executive Summary Export Card */}
            <div className="glass-panel p-8 rounded-[2rem] border border-white/10 bg-gradient-to-br from-blue-900/20 to-purple-900/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <span className="material-icons-round text-9xl">analytics</span>
                </div>
                <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6">Executive Summary Report</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-4">
                    <div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Reports</div>
                        <div className="text-xl font-black text-white">{overviewMetrics.citizenReports}</div>
                    </div>
                    <div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Unique Hazards</div>
                        <div className="text-xl font-black text-white">{overviewMetrics.groupedHazards}</div>
                    </div>
                    <div>
                        <div className="text-[10px] font-black text-yellow-500 uppercase tracking-widest mb-1">Active / Pending</div>
                        <div className="text-xl font-black text-white">{overviewMetrics.active}</div>
                    </div>
                    <div>
                        <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Resolved</div>
                        <div className="text-xl font-black text-white">{overviewMetrics.resolved}</div>
                    </div>
                    <div>
                        <div className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-1">Overdue / SLA Breached</div>
                        <div className="text-xl font-black text-white">{overviewMetrics.overdue}</div>
                    </div>
                    <div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Avg Resolution Time</div>
                        <div className="text-xl font-black text-white">{overviewMetrics.avgResolutionDays} Days</div>
                    </div>
                    <div>
                        <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Top Hazard</div>
                        <div className="text-sm font-black text-white uppercase mt-1 truncate">{hazardAnalytics[0]?.name || 'N/A'}</div>
                    </div>
                    <div>
                        <div className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-1">Hotspot Ward</div>
                        <div className="text-sm font-black text-white uppercase mt-1 truncate">{wardAnalytics[0]?.name || 'N/A'}</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsPanel;
