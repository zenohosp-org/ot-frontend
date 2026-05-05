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

    if (loading) return <div className="p-8 text-black">Loading...</div>;
    if (!booking) return <div className="p-8 text-black">Booking not found</div>;

    const canConfirm = booking.status === 'REQUESTED';
    const canStart = booking.status === 'CONFIRMED';
    const canEnd = booking.status === 'IN_PROGRESS';
    const canCancel = ['REQUESTED', 'CONFIRMED', 'IN_PROGRESS'].includes(booking.status);

    return (
        <div className="p-8">
            <button onClick={() => navigate('/bookings')} className="text-blue-600 hover:text-blue-800 mb-4">
                ← Back to Bookings
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-lg shadow p-6 mb-6">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h1 className="text-3xl font-bold mb-2 text-black">{booking.procedureName}</h1>
                                <p className="text-black">Room: {booking.roomName} | Surgeon: {booking.surgeonName}</p>
                            </div>
                            <div className={`px-4 py-2 rounded font-semibold ${getStatusColor(booking.status)}`}>
                                {booking.status}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-black text-sm">Patient</p>
                                <p className="font-semibold text-black">{booking.patientName}</p>
                                <p className="text-black text-sm">MRN: {booking.patientMrn}</p>
                            </div>
                            <div>
                                <p className="text-black text-sm">Scheduled Start</p>
                                <p className="font-semibold text-black">{new Date(booking.scheduledStart).toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-black text-sm">Scheduled End</p>
                                <p className="font-semibold text-black">{new Date(booking.scheduledEnd).toLocaleString()}</p>
                            </div>
                            {booking.actualStart && (
                                <div>
                                    <p className="text-black text-sm">Actual Start</p>
                                    <p className="font-semibold text-black">{new Date(booking.actualStart).toLocaleString()}</p>
                                </div>
                            )}
                            {booking.actualEnd && (
                                <div>
                                    <p className="text-black text-sm">Actual End</p>
                                    <p className="font-semibold text-black">{new Date(booking.actualEnd).toLocaleString()}</p>
                                </div>
                            )}
                        </div>

                        {booking.notes && (
                            <div className="mt-4 p-3 bg-gray-50 rounded">
                                <p className="text-black text-sm">Notes</p>
                                <p className="text-black">{booking.notes}</p>
                            </div>
                        )}
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-xl font-bold mb-4 text-black">Consumption Items</h2>

                        <div className="space-y-3 mb-6">
                            {consumption.length === 0 ? (
                                <p className="text-black">No consumption items added</p>
                            ) : (
                                consumption.map(item => (
                                    <div key={item.id} className="flex justify-between items-center p-3 border rounded hover:bg-gray-50">
                                        <div className="flex-1">
                                            <p className="font-semibold text-black">{item.itemName}</p>
                                            <p className="text-black text-sm">
                                                {item.itemType} • Qty: {item.quantity} • ₹{item.unitPrice.toFixed(2)} each
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteConsumption(item.id)}
                                            className="text-red-600 hover:text-red-800 ml-4"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>

                        <button
                            onClick={() => setShowAddConsumption(true)}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition"
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

                <div>
                    <div className="bg-white rounded-lg shadow p-6 sticky top-8">
                        <h3 className="text-lg font-bold mb-4 text-black">Actions</h3>

                        <div className="space-y-3">
                            {canConfirm && (
                                <button
                                    onClick={() => handleStatusChange('confirm')}
                                    disabled={actionLoading}
                                    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50"
                                >
                                    Confirm Booking
                                </button>
                            )}

                            {canStart && (
                                <button
                                    onClick={() => handleStatusChange('start')}
                                    disabled={actionLoading}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50"
                                >
                                    Start Surgery
                                </button>
                            )}

                            {canEnd && (
                                <button
                                    onClick={() => handleStatusChange('end')}
                                    disabled={actionLoading}
                                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50"
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
                                    className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50"
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
        REQUESTED: 'bg-gray-300 text-gray-900 font-semibold',
        CONFIRMED: 'bg-blue-300 text-blue-900 font-semibold',
        IN_PROGRESS: 'bg-green-400 text-green-900 font-bold',
        COMPLETED: 'bg-slate-300 text-slate-900 font-semibold',
        CANCELLED: 'bg-red-300 text-red-900 font-semibold',
    };
    return colors[status] || 'bg-gray-300 text-gray-900';
}

function AddConsumptionModal({ bookingId, onClose, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        itemName: '',
        itemType: 'CONSUMABLE',
        quantity: 1,
        unitPrice: 0,
        billable: true,
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
                <div className="p-6 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold">Add Consumption Item</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-sm">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-semibold mb-2">Item Name</label>
                        <input
                            type="text"
                            value={formData.itemName}
                            onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                            className="w-full border rounded px-3 py-2"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold mb-2">Type</label>
                        <select
                            value={formData.itemType}
                            onChange={(e) => setFormData({ ...formData, itemType: e.target.value })}
                            className="w-full border rounded px-3 py-2"
                        >
                            <option>KIT</option>
                            <option>IMPLANT</option>
                            <option>CONSUMABLE</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold mb-2">Quantity</label>
                        <input
                            type="number"
                            value={formData.quantity}
                            onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                            className="w-full border rounded px-3 py-2"
                            min="1"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold mb-2">Unit Price</label>
                        <input
                            type="number"
                            value={formData.unitPrice}
                            onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                            className="w-full border rounded px-3 py-2"
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
                        <label className="text-sm font-semibold">Billable</label>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50"
                        >
                            {loading ? 'Adding...' : 'Add Item'}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 rounded-lg transition"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
