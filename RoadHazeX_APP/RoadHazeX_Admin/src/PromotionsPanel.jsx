import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, updateDoc, doc, onSnapshot, serverTimestamp } from 'firebase/firestore';

const PromotionsPanel = () => {
    const [promotions, setPromotions] = useState([]);
    const [isAdding, setIsAdding] = useState(false);
    
    // Form state
    const [form, setForm] = useState({
        businessName: '',
        category: '',
        address: '',
        latitude: '',
        longitude: '',
        promotionText: '',
        voiceText: '',
        radiusMeters: 300,
        active: true,
        sponsored: true,
        isTestPromotion: true
    });

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'partner_promotions'), (snapshot) => {
            const data = [];
            snapshot.forEach(doc => {
                data.push({ id: doc.id, ...doc.data() });
            });
            setPromotions(data);
        });
        return () => unsub();
    }, []);

    const handleAddTestPromotion = () => {
        setForm({
            businessName: 'Shree Divyam Cafe',
            category: 'Pure Vegetarian Cafe',
            address: 'Bharathi Salai, Andavar Nagar, Ramapuram, Chennai, Greater Chennai, Tamil Nadu 600089',
            latitude: '13.0189', // Rough approx if needed, but manual entry allows exact. Let's leave blank for demo fill
            longitude: '80.1802',
            promotionText: 'Pure vegetarian delight in Ramapuram!',
            voiceText: 'Shree Divyam Cafe — a pure vegetarian delight in Ramapuram!',
            radiusMeters: 300,
            active: true,
            sponsored: true,
            isTestPromotion: true
        });
        setIsAdding(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await addDoc(collection(db, 'partner_promotions'), {
                ...form,
                latitude: Number(form.latitude),
                longitude: Number(form.longitude),
                radiusMeters: Number(form.radiusMeters),
                impressionCount: 0,
                clickCount: 0,
                voicePlayCount: 0,
                dismissCount: 0,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            alert('Promotion Added');
            setIsAdding(false);
        } catch (err) {
            console.error("Error adding promotion", err);
            alert("Failed to add promotion");
        }
    };

    const toggleActive = async (id, currentStatus) => {
        try {
            await updateDoc(doc(db, 'partner_promotions', id), {
                active: !currentStatus,
                updatedAt: serverTimestamp()
            });
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="w-full h-full bg-slate-950 p-8 overflow-y-auto custom-scrollbar text-white">
            <div className="max-w-5xl mx-auto space-y-8">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-black uppercase tracking-tight text-white mb-2 flex items-center gap-3">
                            <span className="material-icons-round text-[#FF7A3D]">storefront</span>
                            B2B Partner Promotions
                        </h1>
                        <p className="text-slate-400">Manage local business sponsorships and navigation triggers.</p>
                    </div>
                    <button 
                        onClick={handleAddTestPromotion}
                        className="px-6 py-3 bg-[#FF7A3D] hover:bg-[#ff8f59] text-white font-bold rounded-xl shadow-lg transition-all"
                    >
                        + Add Promotion
                    </button>
                </div>

                {isAdding && (
                    <div className="bg-slate-900 border border-white/10 p-6 rounded-2xl shadow-xl">
                        <h2 className="text-xl font-bold mb-4">Add New Promotion</h2>
                        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1">Business Name</label>
                                <input required className="w-full bg-slate-950 border border-white/10 rounded-lg p-2" value={form.businessName} onChange={e => setForm({...form, businessName: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1">Category</label>
                                <input required className="w-full bg-slate-950 border border-white/10 rounded-lg p-2" value={form.category} onChange={e => setForm({...form, category: e.target.value})} />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-slate-400 mb-1">Address</label>
                                <input required className="w-full bg-slate-950 border border-white/10 rounded-lg p-2" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1">Latitude</label>
                                <input required type="number" step="any" className="w-full bg-slate-950 border border-white/10 rounded-lg p-2" value={form.latitude} onChange={e => setForm({...form, latitude: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1">Longitude</label>
                                <input required type="number" step="any" className="w-full bg-slate-950 border border-white/10 rounded-lg p-2" value={form.longitude} onChange={e => setForm({...form, longitude: e.target.value})} />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-slate-400 mb-1">Promotion Text</label>
                                <input required className="w-full bg-slate-950 border border-white/10 rounded-lg p-2" value={form.promotionText} onChange={e => setForm({...form, promotionText: e.target.value})} />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-slate-400 mb-1">Voiceover Text</label>
                                <input required className="w-full bg-slate-950 border border-white/10 rounded-lg p-2" value={form.voiceText} onChange={e => setForm({...form, voiceText: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1">Trigger Radius (meters)</label>
                                <input required type="number" className="w-full bg-slate-950 border border-white/10 rounded-lg p-2" value={form.radiusMeters} onChange={e => setForm({...form, radiusMeters: e.target.value})} />
                            </div>
                            
                            <div className="col-span-2 flex justify-end gap-3 mt-4">
                                <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 bg-slate-800 text-white rounded-lg">Cancel</button>
                                <button type="submit" className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg">Save Promotion</button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {promotions.map(promo => (
                        <div key={promo.id} className="bg-slate-900 border border-white/10 rounded-2xl p-5 shadow-lg flex flex-col">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className="text-lg font-black text-white">{promo.businessName}</h3>
                                    <p className="text-xs text-[#FF7A3D] uppercase tracking-widest font-bold">{promo.category}</p>
                                </div>
                                <button 
                                    onClick={() => toggleActive(promo.id, promo.active)}
                                    className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${promo.active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}
                                >
                                    {promo.active ? 'ACTIVE' : 'INACTIVE'}
                                </button>
                            </div>
                            <p className="text-sm text-slate-400 line-clamp-2 mb-4 flex-1">{promo.promotionText}</p>
                            
                            <div className="grid grid-cols-2 gap-2 mt-auto">
                                <div className="bg-slate-950 p-2 rounded-lg text-center">
                                    <div className="text-xs text-slate-500 uppercase tracking-widest">Impressions</div>
                                    <div className="text-xl font-bold text-white">{promo.impressionCount || 0}</div>
                                </div>
                                <div className="bg-slate-950 p-2 rounded-lg text-center">
                                    <div className="text-xs text-slate-500 uppercase tracking-widest">Voice Plays</div>
                                    <div className="text-xl font-bold text-white">{promo.voicePlayCount || 0}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {promotions.length === 0 && !isAdding && (
                        <div className="col-span-3 text-center py-20 text-slate-500">
                            No active promotions. Click 'Add Promotion' to start.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PromotionsPanel;
