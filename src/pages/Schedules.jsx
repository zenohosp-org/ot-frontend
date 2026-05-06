import { useEffect, useMemo, useState } from 'react';
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
    REQUESTED: 'bg-slate-200',
    CONFIRMED: 'bg-blue-200',
    IN_PROGRESS: 'bg-amber-200 animate-pulse',
    COMPLETED: 'bg-slate-200',
    CANCELLED: 'bg-rose-200',
};

export default function Schedules() {
    const [tab, setTab] = useState('rooms');
    const [selectedRoom, setSelectedRoom] = useState(null);
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

    const handleViewTimeline = (room) => {
        setSelectedRoom(room);
        setTab('timeline');
    };

    const handleClearRoom = () => {
        setSelectedRoom(null);
    };

    const timelineColumns = useMemo(() => {
        if (selectedRoom) return [selectedRoom];
        return rooms.length
            ? rooms
            : [...new Set(bookings.map((b) => b.roomId))].sort().map((id) => ({ id, roomNumber: id }));
    }, [rooms, bookings, selectedRoom]);

    const timeSlots = generateTimeSlots();

    return (
        <div className="flex flex-col h-full bg-slate-50 gap-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Schedules</h1>
                </div>
            </div>

            <div className="flex gap-2 border-b border-slate-200">
                <TabButton label="Room List" active={tab === 'rooms'} onClick={() => setTab('rooms')} />
                <TabButton label="Timeline" active={tab === 'timeline'} onClick={() => setTab('timeline')} />
            </div>

            {tab === 'rooms' && (
                <RoomList rooms={rooms} loading={loadingRooms} onViewTimeline={handleViewTimeline} />
            )}

            {tab === 'timeline' && (
                <Timeline
                    columns={timelineColumns}
                    bookings={bookings}
                    loading={loadingBookings}
                    selectedRoom={selectedRoom}
                    timeSlots={timeSlots}
                    onClearRoom={handleClearRoom}
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
                    ? 'border-slate-900 text-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
        >
            {label}
        </button>
    );
}

function RoomList({ rooms, loading, onViewTimeline }) {
    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <p className="text-sm font-medium text-slate-500">Loading rooms...</p>
        </div>
    );

    return (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full">
                <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                        <th className="px-5 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-left">Room</th>
                        <th className="px-5 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-left">Type</th>
                        <th className="px-5 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-left">Status</th>
                        <th className="px-5 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-left">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {rooms.map((room) => (
                        <tr key={room.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer">
                            <td className="px-5 py-4"><p className="text-sm font-semibold text-slate-900">{room.roomNumber}</p></td>
                            <td className="px-5 py-4"><p className="text-sm font-semibold text-slate-900">{room.roomType}</p></td>
                            <td className="px-5 py-4"><p className="text-sm font-semibold text-slate-900">{room.status}</p></td>
                            <td className="px-5 py-4">
                                <button
                                    onClick={() => onViewTimeline(room)}
                                    className="text-sm font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                                >
                                    View Timeline
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {rooms.length === 0 && (
                <div className="px-5 py-10 text-center text-sm font-medium text-slate-500">No OT rooms found</div>
            )}
        </div>
    );
}

function Timeline({ columns, bookings, loading, selectedRoom, timeSlots, onClearRoom }) {
    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <p className="text-sm font-medium text-slate-500">Loading timeline...</p>
        </div>
    );

    return (
        <div>
            {selectedRoom && (
                <div className="flex items-center gap-4 mb-4">
                    <span className="text-sm font-semibold text-slate-900">Room: {selectedRoom.roomNumber}</span>
                    <button
                        onClick={onClearRoom}
                        className="text-sm font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                        Show all rooms
                    </button>
                </div>
            )}

            <div className="overflow-x-auto bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-slate-100 bg-slate-50">
                            <th className="px-5 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-left w-32">Time</th>
                            {columns.map((room) => (
                                <th key={room.id} className="px-5 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-left border-l border-slate-100">
                                    Room {room.roomNumber || room.id}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {timeSlots.map((slot, i) => (
                            <tr key={i} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                <td className="px-5 py-4 font-medium text-sm bg-slate-50 text-slate-900">{slot}</td>
                                {columns.map((room) => {
                                    const booking = bookings.find(
                                        (b) =>
                                            b.roomId === room.id &&
                                            isTimeInRange(slot, b.scheduledStart, b.scheduledEnd)
                                    );
                                    return (
                                        <td key={`${room.id}-${i}`} className="px-4 py-2 border-l border-slate-100">
                                            {booking && (
                                                <div className={`p-2 rounded-lg text-sm text-slate-900 ${STATUS_COLORS[booking.status] || 'bg-slate-100'}`}>
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
