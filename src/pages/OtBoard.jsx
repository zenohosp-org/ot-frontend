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

    if (loading) return <div className="p-8">Loading...</div>;

    const rooms = [...new Set(bookings.map(b => b.roomId))].sort();
    const timeSlots = generateTimeSlots();

    const getStatusColor = (status) => {
        const colors = {
            REQUESTED: 'bg-gray-200',
            CONFIRMED: 'bg-blue-200',
            IN_PROGRESS: 'bg-green-200 animate-pulse',
            COMPLETED: 'bg-slate-200',
            CANCELLED: 'bg-red-200',
        };
        return colors[status] || 'bg-gray-100';
    };

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold mb-8">OT Board - Today's Schedule</h1>

            <div className="overflow-x-auto bg-white rounded-lg shadow">
                <table className="w-full">
                    <thead>
                        <tr className="border-b bg-gray-50">
                            <th className="px-4 py-3 text-left font-semibold w-32">Time</th>
                            {rooms.map(roomId => (
                                <th key={roomId} className="px-4 py-3 text-left font-semibold border-l">
                                    Room {roomId}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {timeSlots.map((slot, i) => (
                            <tr key={i} className="border-b hover:bg-gray-50">
                                <td className="px-4 py-2 font-medium text-sm bg-gray-50">{slot}</td>
                                {rooms.map(roomId => {
                                    const booking = bookings.find(
                                        b => b.roomId === roomId &&
                                            isTimeInRange(slot, b.scheduledStart, b.scheduledEnd)
                                    );
                                    return (
                                        <td key={`${roomId}-${i}`} className="px-4 py-2 border-l">
                                            {booking && (
                                                <div className={`p-2 rounded text-sm ${getStatusColor(booking.status)}`}>
                                                    <div className="font-semibold">{booking.procedureName}</div>
                                                    <div className="text-xs">{booking.surgeonName}</div>
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
