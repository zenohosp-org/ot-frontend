import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getHmsRooms } from '../api/client';

function isOtRoom(room) {
    const roomNumber = (room?.roomNumber || '').toString().toLowerCase();
    const roomCode = (room?.roomCode || '').toString().toLowerCase();
    return roomNumber.includes('ot') || roomCode.includes('ot');
}

export default function Rooms() {
    const navigate = useNavigate();
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRooms = async () => {
            try {
                const res = await getHmsRooms();
                setRooms(res.data || []);
            } catch (e) {
                console.error('Error fetching rooms:', e);
                setRooms([]);
            } finally {
                setLoading(false);
            }
        };

        fetchRooms();
    }, []);

    const otRooms = useMemo(() => rooms.filter(isOtRoom), [rooms]);

    if (loading) return <div className="p-8 text-black">Loading...</div>;

    return (
        <div className="p-8">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold text-black">OT Rooms</h1>
            </div>

            <div className="bg-white rounded-lg shadow overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b bg-gray-50">
                            <th className="px-6 py-3 text-left font-semibold text-black">Room</th>
                            <th className="px-6 py-3 text-left font-semibold text-black">Type</th>
                            <th className="px-6 py-3 text-left font-semibold text-black">Status</th>
                            <th className="px-6 py-3 text-left font-semibold text-black">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {otRooms.map((room) => (
                            <tr key={room.id} className="border-b hover:bg-gray-50">
                                <td className="px-6 py-3 text-sm text-black">{room.roomNumber}</td>
                                <td className="px-6 py-3 text-sm text-black">{room.roomType}</td>
                                <td className="px-6 py-3 text-sm text-black">{room.status}</td>
                                <td className="px-6 py-3 text-sm">
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => navigate(`/board?roomId=${room.id}`)}
                                            className="text-blue-600 hover:text-blue-800 font-medium"
                                        >
                                            Board
                                        </button>
                                        <button
                                            onClick={() => navigate(`/bookings?roomId=${room.id}`)}
                                            className="text-blue-600 hover:text-blue-800 font-medium"
                                        >
                                            Bookings
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {otRooms.length === 0 && (
                    <div className="p-6 text-black">No OT rooms found</div>
                )}
            </div>
        </div>
    );
}
