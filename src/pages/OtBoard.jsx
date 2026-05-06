import { useEffect, useState } from 'react';
import { getBookings } from '../api/client';

export default function OtBoard() {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBookings = async () => {
            try {
                const today = new Date().toISOString().split('T')[0];
                const res = await getBookings({ date: today });
                setBookings(res.data);
            } catch (error) {
                console.error('Error fetching bookings:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchBookings();
        const interval = setInterval(fetchBookings, 30000);
        return () => clearInterval(interval);
    }, []);

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <p className="text-sm font-medium text-slate-500">Loading...</p>
        </div>
    );

    const rooms = [...new Set(bookings.map(b => b.roomId))].sort();
    const timeSlots = generateTimeSlots();

    const getStatusColor = (status) => {
        const colors = {
            REQUESTED: 'bg-slate-200',
            CONFIRMED: 'bg-blue-200',
            IN_PROGRESS: 'bg-amber-200 animate-pulse',
            COMPLETED: 'bg-slate-200',
            CANCELLED: 'bg-rose-200',
        };
        return colors[status] || 'bg-slate-100';
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 gap-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">OT Board — Today's Schedule</h1>
                </div>
            </div>

            <div className="overflow-x-auto bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-slate-100 bg-slate-50">
                            <th className="px-5 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-left w-32">Time</th>
                            {rooms.map(roomId => (
                                <th key={roomId} className="px-5 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-left border-l border-slate-100">
                                    Room {roomId}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {timeSlots.map((slot, i) => (
                            <tr key={i} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                <td className="px-5 py-4 font-medium text-sm bg-slate-50 text-slate-900">{slot}</td>
                                {rooms.map(roomId => {
                                    const booking = bookings.find(
                                        b => b.roomId === roomId &&
                                            isTimeInRange(slot, b.scheduledStart, b.scheduledEnd)
                                    );
                                    return (
                                        <td key={`${roomId}-${i}`} className="px-4 py-2 border-l border-slate-100">
                                            {booking && (
                                                <div className={`p-2 rounded-lg text-sm text-slate-900 ${getStatusColor(booking.status)}`}>
                                                    <div className="font-semibold">{booking.procedureName}</div>
                                                    <div className="text-xs text-slate-600">{booking.surgeonName}</div>
                                                </div>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function generateTimeSlots() {
    const slots = [];
    for (let i = 8; i < 18; i++) {
        slots.push(`${String(i).padStart(2, '0')}:00`);
    }
    return slots;
}

function isTimeInRange(timeSlot, start, end) {
    const [hour] = timeSlot.split(':').map(Number);
    const startHour = new Date(start).getHours();
    const endHour = new Date(end).getHours();
    return hour >= startHour && hour < endHour;
}
