import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    getBooking,
    getConsumption,
    confirmBooking,
    startBooking,
    endBooking,
    cancelBooking,
    addConsumptionItem,
    deleteConsumptionItem,
    getInventoryKits,
} from '../api/client';
import { Trash2 } from 'lucide-react';

export default function BookingDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [booking, setBooking] = useState(null);
    const [consumption, setConsumption] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddConsumption, setShowAddConsumption] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        fetchBooking();
    }, [id]);

    const fetchBooking = async () => {
        try {
            const bookingRes = await getBooking(id);
            setBooking(bookingRes.data);

            const consumptionRes = await getConsumption(id);
            setConsumption(consumptionRes.data || []);
        } catch (error) {
            console.error('Error fetching booking:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (action) => {
        setActionLoading(true);
        try {
            let result;
            if (action === 'confirm') result = await confirmBooking(id);
            else if (action === 'start') result = await startBooking(id);
            else if (action === 'end') result = await endBooking(id);
            else if (action === 'cancel') result = await cancelBooking(id);

            setBooking(result.data);
        } catch (error) {
            alert('Error: ' + (error.response?.data?.message || error.message));
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteConsumption = async (itemId) => {
        try {
            await deleteConsumptionItem(itemId);
            setConsumption(consumption.filter(c => c.id !== itemId));
        } catch (error) {
            alert('Error deleting item: ' + error.message);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <p className="text-sm font-medium text-slate-500">Loading...</p>
        </div>
    );
    if (!booking) return (
        <div className="flex items-center justify-center h-64">
            <p className="text-sm font-medium text-slate-500">Booking not found</p>
        </div>
    );

    const canConfirm = booking.status === 'REQUESTED';
    const canStart = booking.status === 'CONFIRMED';
    const canEnd = booking.status === 'IN_PROGRESS';
    const canCancel = ['REQUESTED', 'CONFIRMED', 'IN_PROGRESS'].includes(booking.status);

    return (
        <div className="flex flex-col h-full bg-slate-50 gap-6 p-6">
            <div className="flex items-center justify-between">
                <button
                    onClick={() => navigate('/cases')}
                    className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                >
                    ← Back to Cases
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 flex flex-col gap-6">
                    {/* Main detail card */}
                    <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-1">{booking.procedureName}</h1>
                                <p className="text-sm text-slate-500">Room: {booking.roomName} | Surgeon: {booking.surgeonName}</p>
                            </div>
                            <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border inline-flex items-center ${getStatusColor(booking.status)}`}>
                                {booking.status}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-slate-500">Patient</p>
                                <p className="font-semibold text-slate-900">{booking.patientName}</p>
                                <p className="text-sm text-slate-500 mt-0.5">MRN: {booking.patientMrn}</p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Scheduled Start</p>
                                <p className="font-semibold text-slate-900">{new Date(booking.scheduledStart).toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Scheduled End</p>
                                <p className="font-semibold text-slate-900">{new Date(booking.scheduledEnd).toLocaleString()}</p>
                            </div>
                            {booking.actualStart && (
                                <div>
                                    <p className="text-sm text-slate-500">Actual Start</p>
                                    <p className="font-semibold text-slate-900">{new Date(booking.actualStart).toLocaleString()}</p>
                                </div>
                            )}
                            {booking.actualEnd && (
                                <div>
                                    <p className="text-sm text-slate-500">Actual End</p>
                                    <p className="font-semibold text-slate-900">{new Date(booking.actualEnd).toLocaleString()}</p>
                                </div>
                            )}
                        </div>

                        {booking.notes && (
                            <div className="mt-4 bg-slate-50 rounded-lg p-4 border border-slate-100">
                                <p className="text-sm text-slate-500">Notes</p>
                                <p className="text-sm font-medium text-slate-900 mt-0.5">{booking.notes}</p>
                            </div>
                        )}
                    </div>

                    {/* Consumption card */}
                    <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
                        <h2 className="text-sm font-bold text-slate-900 mb-4">Consumption Items</h2>

                        <div className="space-y-3 mb-6">
                            {consumption.length === 0 ? (
                                <p className="text-sm text-slate-500">No consumption items added</p>
                            ) : (
                                consumption.map(item => (
                                    <div key={item.id} className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold text-slate-900">{item.itemName}</p>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                {item.itemType} • Qty: {item.quantity} • ₹{item.unitPrice.toFixed(2)} each
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteConsumption(item.id)}
                                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>

                        <button
                            onClick={() => setShowAddConsumption(true)}
                            className="w-full bg-slate-900 hover:bg-slate-700 text-white font-semibold px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-all text-sm"
                        >
                            Add Consumption Item
                        </button>

                        {showAddConsumption && (
                            <AddConsumptionModal
                                bookingId={id}
                                onClose={() => setShowAddConsumption(false)}
                                onSuccess={() => {
                                    setShowAddConsumption(false);
                                    fetchBooking();
                                }}
                            />
                        )}
                    </div>
                </div>

                {/* Actions sidebar */}
                <div>
                    <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 sticky top-6">
                        <h3 className="text-sm font-bold text-slate-900 mb-4">Actions</h3>

                        <div className="space-y-3">
                            {canConfirm && (
                                <button
                                    onClick={() => handleStatusChange('confirm')}
                                    disabled={actionLoading}
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 rounded-lg transition-all text-sm disabled:opacity-50"
                                >
                                    Confirm Booking
                                </button>
                            )}

                            {canStart && (
                                <button
                                    onClick={() => handleStatusChange('start')}
                                    disabled={actionLoading}
                                    className="w-full bg-slate-900 hover:bg-slate-700 text-white font-semibold px-4 py-2 rounded-lg transition-all text-sm disabled:opacity-50"
                                >
                                    Start Surgery
                                </button>
                            )}

                            {canEnd && (
                                <button
                                    onClick={() => handleStatusChange('end')}
                                    disabled={actionLoading}
                                    className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold px-4 py-2 rounded-lg transition-all text-sm disabled:opacity-50"
                                >
                                    End Surgery
                                </button>
                            )}

                            {canCancel && (
                                <button
                                    onClick={() => {
                                        if (confirm('Are you sure you want to cancel this booking?')) {
                                            handleStatusChange('cancel');
                                        }
                                    }}
                                    disabled={actionLoading}
                                    className="w-full bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 font-semibold px-4 py-2 rounded-lg transition-all text-sm disabled:opacity-50"
                                >
                                    Cancel Booking
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function getStatusColor(status) {
    const colors = {
        REQUESTED: 'bg-slate-100 text-slate-700 border-slate-200',
        CONFIRMED: 'bg-blue-50 text-blue-700 border-blue-200',
        IN_PROGRESS: 'bg-amber-50 text-amber-700 border-amber-200',
        COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        CANCELLED: 'bg-rose-50 text-rose-600 border-rose-200',
    };
    return colors[status] || 'bg-slate-100 text-slate-700 border-slate-200';
}

function AddConsumptionModal({ bookingId, onClose, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [kits, setKits] = useState([]);
    const [kitSearch, setKitSearch] = useState('');
    const [showKitDropdown, setShowKitDropdown] = useState(false);
    const [loadingKits, setLoadingKits] = useState(false);
    const [formData, setFormData] = useState({
        itemName: '',
        itemType: 'CONSUMABLE',
        quantity: 1,
        unitPrice: 0,
        inventoryItemId: null,
        billable: true,
    });

    useEffect(() => {
        if (formData.itemType !== 'KIT') {
            setKits([]);
            setKitSearch('');
            setShowKitDropdown(false);
            setFormData((prev) => ({ ...prev, inventoryItemId: null }));
            return;
        }

        const fetchKits = async () => {
            setLoadingKits(true);
            try {
                const res = await getInventoryKits();
                setKits(res.data || []);
            } catch (e) {
                setKits([]);
            } finally {
                setLoadingKits(false);
            }
        };

        fetchKits();
    }, [formData.itemType]);

    const filteredKits = kits.filter((k) => {
        if (!kitSearch) return true;
        const q = kitSearch.toLowerCase();
        return k.name?.toLowerCase().includes(q) || k.code?.toLowerCase().includes(q);
    });

    const handleKitSelect = (kit) => {
        setFormData((prev) => ({
            ...prev,
            itemName: kit?.name || prev.itemName,
            inventoryItemId: kit?.id || null,
        }));
        setKitSearch('');
        setShowKitDropdown(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (formData.itemType === 'KIT' && !formData.inventoryItemId) {
                setError('Please select a kit');
                return;
            }
            await addConsumptionItem(bookingId, {
                ...formData,
                quantity: parseInt(formData.quantity),
                unitPrice: parseFloat(formData.unitPrice),
            });
            onSuccess();
        } catch (error) {
            setError(error.response?.data?.message || 'Failed to add item');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 w-full min-h-screen flex items-start justify-center overflow-y-auto p-4 pt-10">
            <div className="absolute inset-0 w-full min-h-screen bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl my-8 overflow-hidden border border-slate-200 relative z-10">
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <h2 className="text-lg font-bold text-slate-900">Add Consumption Item</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
                    >✕</button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {error && (
                        <div className="bg-rose-50 border border-rose-200 text-rose-600 px-4 py-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    {formData.itemType === 'KIT' ? (
                        <div className="relative">
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Select Kit</label>
                            <input
                                type="text"
                                placeholder={loadingKits ? 'Loading kits...' : 'Search kit name/code...'}
                                value={kitSearch}
                                onChange={(e) => {
                                    setKitSearch(e.target.value);
                                    setShowKitDropdown(true);
                                }}
                                onFocus={() => setShowKitDropdown(true)}
                                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300 text-sm transition-all"
                            />

                            {showKitDropdown && filteredKits.length > 0 && (
                                <div className="absolute top-full mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden z-10 max-h-48 overflow-y-auto">
                                    {filteredKits.map((kit) => (
                                        <button
                                            key={kit.id}
                                            type="button"
                                            onClick={() => handleKitSelect(kit)}
                                            className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0"
                                        >
                                            <p className="font-semibold text-slate-900">{kit.name}</p>
                                            {kit.code && <p className="text-xs text-slate-500 mt-0.5">Code: {kit.code}</p>}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {formData.inventoryItemId && (
                                <p className="mt-2 text-sm text-slate-700">
                                    Selected: <span className="font-semibold text-slate-900">{formData.itemName}</span>
                                </p>
                            )}
                        </div>
                    ) : (
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Item Name</label>
                            <input
                                type="text"
                                value={formData.itemName}
                                onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300 text-sm transition-all"
                                required
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Type</label>
                        <select
                            value={formData.itemType}
                            onChange={(e) => setFormData({ ...formData, itemType: e.target.value, itemName: '', inventoryItemId: null })}
                            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300 text-sm transition-all"
                        >
                            <option>KIT</option>
                            <option>IMPLANT</option>
                            <option>CONSUMABLE</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Quantity</label>
                        <input
                            type="number"
                            value={formData.quantity}
                            onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300 text-sm transition-all"
                            min="1"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Unit Price</label>
                        <input
                            type="number"
                            value={formData.unitPrice}
                            onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300 text-sm transition-all"
                            step="0.01"
                            required
                        />
                    </div>

                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            checked={formData.billable}
                            onChange={(e) => setFormData({ ...formData, billable: e.target.checked })}
                            className="w-4 h-4 mr-2"
                        />
                        <label className="text-sm font-medium text-slate-700">Billable</label>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-slate-900 hover:bg-slate-700 text-white font-semibold py-2.5 rounded-lg transition-all text-sm disabled:opacity-50"
                        >
                            {loading ? 'Adding...' : 'Add Item'}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold py-2.5 rounded-lg transition-all text-sm"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
