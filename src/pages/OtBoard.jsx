import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getBookings, getHmsRooms } from '../api/client';

function isOtRoom(room) {
    const roomNumber = (room?.roomNumber || '').toString().toLowerCase();
    const roomCode = (room?.roomCode || '').toString().toLowerCase();
    return roomNumber.includes('ot') || roomCode.includes('ot');
}

export default function OtBoard() {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const roomIdParam = searchParams.get('roomId');
    const [bookings, setBookings] = useState([]);
    const [rooms, setRooms] = useState([]);
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

        const fetchRooms = async () => {
            try {
                const res = await getHmsRooms();
                const allRooms = res.data || [];
                setRooms(allRooms.filter(isOtRoom));
            } catch (error) {
                console.error('Error fetching rooms:', error);
                setRooms([]);
            }
        };

        fetchRooms();
        fetchBookings();
        const interval = setInterval(fetchBookings, 30000);
        return () => clearInterval(interval);
    }, []);

    if (loading) return <div className="p-8 text-black">Loading...</div>;

    const roomColumns = useMemo(() => {
        const baseColumns = rooms.length
            ? rooms
            : [...new Set(bookings.map(b => b.roomId))].sort().map((id) => ({ id, roomNumber: id }));

        if (!roomIdParam) return baseColumns;
        const roomId = Number(roomIdParam);
        if (Number.isNaN(roomId)) return baseColumns;
        return baseColumns.filter((r) => Number(r.id) === roomId);
    }, [rooms, bookings, roomIdParam]);

    const selectedRoomLabel = useMemo(() => {
        if (!roomIdParam) return null;
        const roomId = Number(roomIdParam);
        if (Number.isNaN(roomId)) return null;
        const r = rooms.find((x) => Number(x.id) === roomId);
        return r?.roomNumber || `Room ${roomId}`;
    }, [roomIdParam, rooms]);
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
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold text-black">
                    {selectedRoomLabel ? `Schedules - ${selectedRoomLabel}` : "Schedules - All Rooms"}
                </h1>
                <button
                    onClick={() => navigate('/bookings')}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
                >
                    View Cases
                </button>
            </div>

            <div className="mb-6 bg-white rounded-lg shadow p-4">
                <label className="block text-sm font-semibold text-black mb-2">Filter by Room</label>
                <select
                    value={roomIdParam || ''}
                    onChange={(e) => {
                        if (e.target.value) {
                            setSearchParams({ roomId: e.target.value });
                        } else {
                            setSearchParams({});
                        }
                    }}
                    className="border rounded px-3 py-2 text-black"
                >
                    <option value="">All Rooms</option>
                    {rooms.map((room) => (
                        <option key={room.id} value={room.id}>
                            {room.roomNumber} ({room.roomType})
                        </option>
                    ))}
                </select>
            </div>
            <div className="overflow-x-auto bg-white rounded-lg shadow">
                <table className="w-full">
                    <thead>
                        <tr className="border-b bg-gray-50">
                            <th className="px-4 py-3 text-left font-semibold w-32 text-black">Time</th>
                            {roomColumns.map((room) => (
                                <th key={room.id} className="px-4 py-3 text-left font-semibold border-l text-black">
                                    Room {room.roomNumber || room.id}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {timeSlots.map((slot, i) => (
                            <tr key={i} className="border-b hover:bg-gray-50">
                                <td className="px-4 py-2 font-medium text-sm bg-gray-50 text-black">{slot}</td>
                                {roomColumns.map((room) => {
                                    const booking = bookings.find(
                                        b => b.roomId === room.id &&
                                            isTimeInRange(slot, b.scheduledStart, b.scheduledEnd)
                                    );
                                    return (
                                        <td key={`${room.id}-${i}`} className="px-4 py-2 border-l">
                                            {booking && (
                                                <div className={`p-2 rounded text-sm text-black ${getStatusColor(booking.status)}`}>
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
