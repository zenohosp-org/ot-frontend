import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBookings, getHmsRooms } from '../api/client';

function isOtRoom(room) {
    const roomNumber = (room?.roomNumber || '').toString().toLowerCase();
    const roomCode = (room?.roomCode || '').toString().toLowerCase();
    return roomNumber.includes('ot') || roomCode.includes('ot');
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

const STATUS_COLORS = {
    REQUESTED: 'bg-gray-200',
    CONFIRMED: 'bg-blue-200',
    IN_PROGRESS: 'bg-green-200 animate-pulse',
    PENDING_SANITATION: 'bg-amber-200',
    COMPLETED: 'bg-slate-200',
    CANCELLED: 'bg-red-200',
};

export default function Schedules() {
    const navigate = useNavigate();
    const [tab, setTab] = useState('rooms');
    const [rooms, setRooms] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [loadingRooms, setLoadingRooms] = useState(true);
    const [loadingBookings, setLoadingBookings] = useState(true);

    useEffect(() => {
        getHmsRooms()
            .then((res) => setRooms(Array.isArray(res.data) ? res.data.filter(isOtRoom) : []))
            .catch(() => setRooms([]))
            .finally(() => setLoadingRooms(false));
    }, []);

    useEffect(() => {
        const fetch = () => {
            const today = new Date().toISOString().split('T')[0];
            getBookings({ date: today })
                .then((res) => setBookings(Array.isArray(res.data) ? res.data : []))
                .catch(() => setBookings([]))
                .finally(() => setLoadingBookings(false));
        };
        fetch();
        const interval = setInterval(fetch, 30000);
        return () => clearInterval(interval);
    }, []);

    const timelineColumns = rooms.length
        ? rooms
        : [...new Set(bookings.map((b) => b.roomId))].sort().map((id) => ({ id, roomNumber: id }));

    const timeSlots = generateTimeSlots();

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold mb-6 text-black">Schedules</h1>

            <div className="flex gap-2 mb-6 border-b border-gray-200">
                <TabButton label="Room List" active={tab === 'rooms'} onClick={() => setTab('rooms')} />
                <TabButton label="Timeline" active={tab === 'timeline'} onClick={() => setTab('timeline')} />
            </div>

            {tab === 'rooms' && (
                <RoomCardGrid rooms={rooms} loading={loadingRooms} onSelectRoom={(room) => navigate(`/schedules/rooms/${room.id}`, { state: { room } })} />
            )}

            {tab === 'timeline' && (
                <Timeline
                    columns={timelineColumns}
                    bookings={bookings}
                    loading={loadingBookings}
                    timeSlots={generateTimeSlots()}
                />
            )}
        </div>
    );
}

function TabButton({ label, active, onClick }) {
    return (
        <button
            onClick={onClick}
            className={`px-5 py-2 font-medium text-sm border-b-2 transition -mb-px ${
                active
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-black'
            }`}
        >
            {label}
        </button>
    );
}

function RoomCardGrid({ rooms, loading, onSelectRoom }) {
    if (loading) return <div className="text-black">Loading rooms...</div>;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map((room) => (
                <div
                    key={room.id}
                    onClick={() => onSelectRoom(room)}
                    className="bg-white rounded-lg shadow hover:shadow-lg transition cursor-pointer p-6 border border-gray-200"
                >
                    <div className="flex items-start justify-between mb-4">
                        <h3 className="text-2xl font-bold text-black">{room.roomNumber}</h3>
                        <div className={`w-3 h-3 rounded-full ${room.status === 'AVAILABLE' ? 'bg-green-500' : 'bg-amber-500'}`} />
                    </div>
                    <p className="text-sm text-gray-600 mb-2">Type: {room.roomType}</p>
                    <p className="text-xs text-gray-500">Status: {room.status}</p>
                </div>
            ))}
            {rooms.length === 0 && (
                <div className="col-span-full text-center py-12 text-black">No OT rooms found</div>
            )}
        </div>
    );
}

function Timeline({ columns, bookings, loading, timeSlots }) {
    if (loading) return <div className="text-black">Loading timeline...</div>;

    return (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
            <table className="w-full">
                <thead>
                    <tr className="border-b bg-gray-50">
                        <th className="px-4 py-3 text-left font-semibold w-32 text-black">Time</th>
                        {columns.map((room) => (
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
                            {columns.map((room) => {
                                const booking = bookings.find(
                                    (b) =>
                                        b.roomId === room.id &&
                                        isTimeInRange(slot, b.scheduledStart, b.scheduledEnd)
                                );
                                return (
                                    <td key={`${room.id}-${i}`} className="px-4 py-2 border-l">
                                        {booking && (
                                            <div className={`p-2 rounded text-sm text-black ${STATUS_COLORS[booking.status] || 'bg-gray-100'}`}>
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
    );
}
