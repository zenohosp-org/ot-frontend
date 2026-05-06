import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBookings, createBooking } from '../api/client';
import { Plus } from 'lucide-react';

export default function Bookings() {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        fetchBookings();
    }, []);

    const fetchBookings = async () => {
        try {
            const res = await getBookings({});
            setBookings(res.data);
        } catch (error) {
            console.error('Error fetching bookings:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            REQUESTED: 'bg-slate-100 text-slate-700 border-slate-200',
            CONFIRMED: 'bg-blue-50 text-blue-700 border-blue-200',
            IN_PROGRESS: 'bg-amber-50 text-amber-700 border-amber-200',
            COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            CANCELLED: 'bg-rose-50 text-rose-600 border-rose-200',
        };
        return colors[status] || 'bg-slate-100 text-slate-700 border-slate-200';
    };

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <p className="text-sm font-medium text-slate-500">Loading...</p>
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-slate-50 gap-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Bookings</h1>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-slate-900 hover:bg-slate-700 text-white font-semibold px-4 py-2 rounded-lg flex items-center gap-2 transition-all text-sm"
                >
                    <Plus size={20} />
                    New Booking
                </button>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-slate-100 bg-slate-50">
                            <th className="px-5 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-left">Patient</th>
                            <th className="px-5 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-left">Procedure</th>
                            <th className="px-5 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-left">Room</th>
                            <th className="px-5 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-left">Surgeon</th>
                            <th className="px-5 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-left">Scheduled</th>
                            <th className="px-5 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-left">Status</th>
                            <th className="px-5 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-left">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {bookings.map(booking => (
                            <tr key={booking.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer">
                                <td className="px-5 py-4"><p className="text-sm font-semibold text-slate-900">{booking.patientName}</p></td>
                                <td className="px-5 py-4"><p className="text-sm font-semibold text-slate-900">{booking.procedureName}</p></td>
                                <td className="px-5 py-4"><p className="text-sm font-semibold text-slate-900">{booking.roomName}</p></td>
                                <td className="px-5 py-4"><p className="text-sm font-semibold text-slate-900">{booking.surgeonName}</p></td>
                                <td className="px-5 py-4"><p className="text-sm font-semibold text-slate-900">{new Date(booking.scheduledStart).toLocaleString()}</p></td>
                                <td className="px-5 py-4">
                                    <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border inline-flex items-center ${getStatusColor(booking.status)}`}>
                                        {booking.status}
                                    </span>
                                </td>
                                <td className="px-5 py-4">
                                    <button
                                        onClick={() => navigate(`/bookings/${booking.id}`)}
                                        className="text-sm font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                                    >
                                        View
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <CreateBookingModal
                    onClose={() => setShowModal(false)}
                    onSuccess={() => {
                        setShowModal(false);
                        fetchBookings();
                    }}
                />
            )}
        </div>
    );
}

function CreateBookingModal({ onClose, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        patientId: '',
        patientName: '',
        patientMrn: '',
        procedureName: '',
        roomId: '',
        roomName: '',
        surgeonId: '',
        surgeonName: '',
        scheduledStart: '',
        scheduledEnd: '',
        notes: '',
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await createBooking(formData);
            onSuccess();
        } catch (error) {
            setError(error.response?.data?.message || 'Failed to create booking');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 w-full min-h-screen flex items-start justify-center overflow-y-auto p-4 pt-10">
            <div className="absolute inset-0 w-full min-h-screen bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl my-8 overflow-hidden border border-slate-200 relative z-10">
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <h2 className="text-lg font-bold text-slate-900">Create Booking</h2>
                    <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {error && (
                        <div className="bg-rose-50 border border-rose-200 text-rose-600 px-4 py-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Patient Name</label>
                            <input
                                type="text"
                                placeholder="Patient Name"
                                value={formData.patientName}
                                onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300 text-sm transition-all"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Patient MRN</label>
                            <input
                                type="text"
                                placeholder="Patient MRN"
                                value={formData.patientMrn}
                                onChange={(e) => setFormData({ ...formData, patientMrn: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300 text-sm transition-all"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Procedure Name</label>
                            <input
                                type="text"
                                placeholder="Procedure Name"
                                value={formData.procedureName}
                                onChange={(e) => setFormData({ ...formData, procedureName: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300 text-sm transition-all"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Room Name</label>
                            <input
                                type="text"
                                placeholder="Room Name"
                                value={formData.roomName}
                                onChange={(e) => setFormData({ ...formData, roomName: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300 text-sm transition-all"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Surgeon Name</label>
                            <input
                                type="text"
                                placeholder="Surgeon Name"
                                value={formData.surgeonName}
                                onChange={(e) => setFormData({ ...formData, surgeonName: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300 text-sm transition-all"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Scheduled Start</label>
                            <input
                                type="datetime-local"
                                value={formData.scheduledStart}
                                onChange={(e) => setFormData({ ...formData, scheduledStart: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300 text-sm transition-all"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Scheduled End</label>
                            <input
                                type="datetime-local"
                                value={formData.scheduledEnd}
                                onChange={(e) => setFormData({ ...formData, scheduledEnd: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300 text-sm transition-all"
                                required
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Notes</label>
                            <textarea
                                placeholder="Notes"
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300 text-sm transition-all resize-none"
                                rows="2"
                            />
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-slate-900 hover:bg-slate-700 text-white font-semibold py-2.5 rounded-lg transition-all text-sm disabled:opacity-50"
                        >
                            {loading ? 'Creating...' : 'Create Booking'}
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
