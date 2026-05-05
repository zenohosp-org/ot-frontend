import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBookings, createBooking, addConsumptionItem, getHmsPatients, getHmsRooms, getDirectorySurgeons, getInventoryKits } from '../api/client';
import { Plus, Search, Trash2 } from 'lucide-react';

function isOtRoom(room) {
    const roomNumber = (room?.roomNumber || '').toString().toLowerCase();
    const roomCode = (room?.roomCode || '').toString().toLowerCase();
    return roomNumber.includes('ot') || roomCode.includes('ot');
}

function overlapsWithBuffer(desiredStart, desiredEnd, existingStart, existingEnd, bufferMinutes = 30) {
    const desiredEndWithBuffer = new Date(desiredEnd.getTime() + bufferMinutes * 60 * 1000);
    return existingStart < desiredEndWithBuffer && existingEnd > desiredStart;
}

export default function Cases() {
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
            REQUESTED: 'bg-gray-200 text-gray-900',
            CONFIRMED: 'bg-blue-200 text-blue-900 font-semibold',
            IN_PROGRESS: 'bg-green-300 text-green-900 font-semibold',
            COMPLETED: 'bg-slate-200 text-slate-900',
            CANCELLED: 'bg-red-200 text-red-900',
        };
        return colors[status] || 'bg-gray-200 text-gray-900';
    };

    const formatDate = (dt) => new Date(dt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const formatTime = (dt) => new Date(dt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    const getDuration = (start, end) => {
        const mins = Math.round((new Date(end) - new Date(start)) / 60000);
        return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
    };
    const isToday = (dt) => new Date(dt).toDateString() === new Date().toDateString();

    if (loading) return <div className="p-8 text-black">Loading...</div>;

    return (
        <div className="p-8">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold text-black">Cases</h1>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
                >
                    <Plus size={20} />
                    New Booking
                </button>
            </div>

            <div className="bg-white rounded-lg shadow overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b bg-gray-50">
                            <th className="px-6 py-3 text-left font-semibold text-black">Patient</th>
                            <th className="px-6 py-3 text-left font-semibold text-black">Procedure</th>
                            <th className="px-6 py-3 text-left font-semibold text-black">Room</th>
                            <th className="px-6 py-3 text-left font-semibold text-black">Surgeon</th>
                            <th className="px-6 py-3 text-left font-semibold text-black">Schedule</th>
                            <th className="px-6 py-3 text-left font-semibold text-black">Status</th>
                            <th className="px-6 py-3 text-left font-semibold text-black">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {bookings.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-6 py-10 text-center text-gray-500">No cases found</td>
                            </tr>
                        )}
                        {bookings.map(booking => (
                            <tr key={booking.id} className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/cases/${booking.id}`)}>
                                <td className="px-6 py-4">
                                    <p className="text-sm font-semibold text-black">{booking.patientName}</p>
                                    {booking.patientMrn && <p className="text-xs text-gray-500 mt-0.5">MRN: {booking.patientMrn}</p>}
                                </td>
                                <td className="px-6 py-4">
                                    <p className="text-sm text-black">{booking.procedureName}</p>
                                    {booking.procedureCharge && (
                                        <p className="text-xs text-gray-500 mt-0.5">₹{Number(booking.procedureCharge).toLocaleString('en-IN')}</p>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-sm text-black">{booking.roomName}</td>
                                <td className="px-6 py-4 text-sm text-black">{booking.surgeonName}</td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-1">
                                        <p className="text-sm text-black">{formatDate(booking.scheduledStart)}</p>
                                        {isToday(booking.scheduledStart) && (
                                            <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-semibold">Today</span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        {formatTime(booking.scheduledStart)} – {formatTime(booking.scheduledEnd)}
                                        <span className="ml-1 text-gray-400">({getDuration(booking.scheduledStart, booking.scheduledEnd)})</span>
                                    </p>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-3 py-1 rounded text-xs font-semibold ${getStatusColor(booking.status)}`}>
                                        {booking.status.replace('_', ' ')}
                                    </span>
                                </td>
                                <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                    <button
                                        onClick={() => navigate(`/cases/${booking.id}`)}
                                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
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
    const [patients, setPatients] = useState([]);
    const [patientSearch, setPatientSearch] = useState('');
    const [showPatientDropdown, setShowPatientDropdown] = useState(false);
    const [searchingPatients, setSearchingPatients] = useState(false);
    const [surgeons, setSurgeons] = useState([]);
    const [surgeonSearch, setSurgeonSearch] = useState('');
    const [showSurgeonDropdown, setShowSurgeonDropdown] = useState(false);
    const [searchingSurgeons, setSearchingSurgeons] = useState(false);
    const [rooms, setRooms] = useState([]);
    const [allRooms, setAllRooms] = useState([]);
    const [roomSearch, setRoomSearch] = useState('');
    const [showRoomDropdown, setShowRoomDropdown] = useState(false);
    const [loadingRooms, setLoadingRooms] = useState(false);
    const [roomError, setRoomError] = useState(null);
    const [retryingRooms, setRetryingRooms] = useState(false);
    const [dayBookings, setDayBookings] = useState([]);
    const [kits, setKits] = useState([]);
    const [allKits, setAllKits] = useState([]);
    const [kitSearch, setKitSearch] = useState('');
    const [showKitDropdown, setShowKitDropdown] = useState(false);
    const [loadingKits, setLoadingKits] = useState(false);
    const [kitError, setKitError] = useState(null);
    const [retryingKits, setRetryingKits] = useState(false);
    const retryTimeoutRef = { rooms: null, kits: null };
    const [selectedKits, setSelectedKits] = useState([]);
    const [formData, setFormData] = useState({
        patientId: '',
        patientName: '',
        patientMrn: '',
        procedureName: '',
        procedureCharge: '',
        roomId: '',
        roomName: '',
        surgeonId: '',
        surgeonName: '',
        scheduledStart: '',
        scheduledEnd: '',
        notes: '',
    });

    useEffect(() => {
        const fetchRooms = async (isRetry = false) => {
            if (isRetry) {
                setRetryingRooms(true);
            } else {
                setLoadingRooms(true);
            }
            setRoomError(null);
            try {
                const res = await getHmsRooms();
                const otRooms = (res.data || []).filter(isOtRoom);
                setAllRooms(otRooms);
                setRooms(otRooms);
                setRoomError(null);
                setRetryingRooms(false);
            } catch (e) {
                console.error('Error fetching rooms:', e);
                setAllRooms([]);
                setRooms([]);
                setRoomError('Failed to load rooms. Retrying...');
                setRetryingRooms(true);

                // Retry every 5 seconds
                retryTimeoutRef.rooms = setTimeout(() => fetchRooms(true), 5000);
            } finally {
                if (!isRetry) {
                    setLoadingRooms(false);
                }
            }
        };

        const fetchKits = async (isRetry = false) => {
            if (isRetry) {
                setRetryingKits(true);
            } else {
                setLoadingKits(true);
            }
            setKitError(null);
            try {
                const res = await getInventoryKits();
                setAllKits(res.data || []);
                setKits(res.data || []);
                setKitError(null);
                setRetryingKits(false);
            } catch (e) {
                console.error('Error fetching kits:', e);
                setAllKits([]);
                setKits([]);
                setKitError('Loading inventory kits... You can add custom items.');
                setRetryingKits(true);

                // Retry every 5 seconds
                retryTimeoutRef.kits = setTimeout(() => fetchKits(true), 5000);
            } finally {
                if (!isRetry) {
                    setLoadingKits(false);
                }
            }
        };

        fetchRooms();
        fetchKits();

        return () => {
            if (retryTimeoutRef.rooms) clearTimeout(retryTimeoutRef.rooms);
            if (retryTimeoutRef.kits) clearTimeout(retryTimeoutRef.kits);
        };
    }, []);

    useEffect(() => {
        const start = formData.scheduledStart ? new Date(formData.scheduledStart) : null;
        if (!start || Number.isNaN(start.getTime())) {
            setDayBookings([]);
            return;
        }

        const fetchDayBookings = async () => {
            try {
                const date = start.toISOString().slice(0, 10);
                const res = await getBookings({ date });
                setDayBookings(res.data || []);
            } catch (e) {
                setDayBookings([]);
            }
        };

        fetchDayBookings();
    }, [formData.scheduledStart]);

    const getAvailableRooms = () => {
        const desiredStart = formData.scheduledStart ? new Date(formData.scheduledStart) : null;
        const desiredEnd = formData.scheduledEnd ? new Date(formData.scheduledEnd) : null;

        if (!desiredStart || !desiredEnd || Number.isNaN(desiredStart.getTime()) || Number.isNaN(desiredEnd.getTime())) {
            return allRooms;
        }

        const activeBookings = (dayBookings || []).filter(
            (b) => !['CANCELLED', 'COMPLETED'].includes(b.status)
        );

        return allRooms.filter((room) => {
            const conflicts = activeBookings.some((b) => {
                if (Number(b.roomId) !== Number(room.id)) return false;
                const bStart = new Date(b.scheduledStart);
                const bEnd = new Date(b.scheduledEnd);
                if (Number.isNaN(bStart.getTime()) || Number.isNaN(bEnd.getTime())) return false;
                return overlapsWithBuffer(desiredStart, desiredEnd, bStart, bEnd, 30);
            });
            return !conflicts;
        });
    };

    const updateRoomOptions = (query) => {
        const available = getAvailableRooms();
        const q = (query || '').toLowerCase();
        const filtered = available.filter((room) => {
            if (!q) return true;
            return (
                room.roomNumber?.toLowerCase().includes(q) ||
                room.roomType?.toLowerCase().includes(q) ||
                room.roomCode?.toLowerCase().includes(q)
            );
        });
        setRooms(filtered);
    };

    const updateKitOptions = (query) => {
        const q = (query || '').toLowerCase();
        const filtered = allKits.filter((kit) => {
            if (!q) return true;
            return kit.name?.toLowerCase().includes(q) || kit.code?.toLowerCase().includes(q);
        });
        setKits(filtered);
    };

    const searchPatients = async (query) => {
        if (query.length < 2) {
            setPatients([]);
            return;
        }

        setSearchingPatients(true);
        try {
            const res = await getHmsPatients(query);
            setPatients(res.data || []);
        } catch (error) {
            console.error('Error searching patients:', error);
            setPatients([]);
        } finally {
            setSearchingPatients(false);
        }
    };

    const searchSurgeons = async (query) => {
        if (query.length < 2) {
            setSurgeons([]);
            return;
        }

        setSearchingSurgeons(true);
        try {
            const res = await getDirectorySurgeons(query);
            setSurgeons(res.data || []);
        } catch (error) {
            console.error('Error searching surgeons:', error);
            setSurgeons([]);
        } finally {
            setSearchingSurgeons(false);
        }
    };

    useEffect(() => {
        updateRoomOptions(roomSearch);

        if (formData.roomId) {
            const availableIds = new Set(getAvailableRooms().map((r) => Number(r.id)));
            if (!availableIds.has(Number(formData.roomId))) {
                setFormData((prev) => ({ ...prev, roomId: '', roomName: '' }));
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData.scheduledStart, formData.scheduledEnd, dayBookings, allRooms]);

    const handlePatientSelect = (patient) => {
        setFormData({
            ...formData,
            patientId: patient.id ?? '',
            patientName: patient.name || patient.firstName + ' ' + patient.lastName || '',
            patientMrn: patient.mrn || '',
        });
        setPatientSearch('');
        setShowPatientDropdown(false);
        setPatients([]);
    };

    const handleSurgeonSelect = (surgeon) => {
        setFormData({
            ...formData,
            surgeonId: surgeon.id || '',
            surgeonName: surgeon.name || surgeon.firstName + ' ' + surgeon.lastName || '',
        });
        setSurgeonSearch('');
        setShowSurgeonDropdown(false);
        setSurgeons([]);
    };

    const handleRoomSelect = (room) => {
        setFormData({
            ...formData,
            roomId: room.id ?? '',
            roomName: room.roomNumber || '',
        });
        setRoomSearch('');
        setShowRoomDropdown(false);
        setRooms([]);
    };

    const handlePatientSearchChange = (e) => {
        const value = e.target.value;
        setPatientSearch(value);
        setShowPatientDropdown(true);
        searchPatients(value);
    };

    const handleSurgeonSearchChange = (e) => {
        const value = e.target.value;
        setSurgeonSearch(value);
        setShowSurgeonDropdown(true);
        searchSurgeons(value);
    };

    const handleRoomSearchChange = (e) => {
        const value = e.target.value;
        setRoomSearch(value);
        setShowRoomDropdown(true);
        updateRoomOptions(value);
    };

    const handleKitSearchChange = (e) => {
        const value = e.target.value;
        setKitSearch(value);
        setShowKitDropdown(true);
        updateKitOptions(value);
    };

    const handleAddKit = (kit) => {
        setSelectedKits([...selectedKits, {
            id: kit.id,
            name: kit.name,
            quantity: 1,
            unitPrice: kit.price || 0,
        }]);
        setKitSearch('');
        setShowKitDropdown(false);
        updateKitOptions('');
    };

    const handleRemoveKit = (kitId) => {
        setSelectedKits(selectedKits.filter((k) => k.id !== kitId));
    };

    const handleKitQuantityChange = (kitId, quantity) => {
        setSelectedKits(
            selectedKits.map((k) =>
                k.id === kitId ? { ...k, quantity: Math.max(1, Number(quantity)) } : k
            )
        );
    };

    const handleKitPriceChange = (kitId, price) => {
        setSelectedKits(
            selectedKits.map((k) =>
                k.id === kitId ? { ...k, unitPrice: Math.max(0, Number(price)) } : k
            )
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (!formData.patientId) {
                setError('Please select a patient');
                return;
            }
            if (!formData.roomId) {
                setError('Please select a room');
                return;
            }
            if (!formData.surgeonId) {
                setError('Please select a surgeon');
                return;
            }

            const payload = {
                ...formData,
                patientId: Number(formData.patientId),
                roomId: Number(formData.roomId),
                procedureCharge: formData.procedureCharge ? Number(formData.procedureCharge) : null,
            };

            const res = await createBooking(payload);
            const bookingId = res.data.id;

            for (const kit of selectedKits) {
                await addConsumptionItem(bookingId, {
                    itemName: kit.name,
                    itemType: 'KIT',
                    quantity: kit.quantity,
                    unitPrice: kit.unitPrice,
                    inventoryItemId: kit.id,
                    billable: true,
                });
            }

            onSuccess();
        } catch (error) {
            setError(error.response?.data?.message || 'Failed to create booking');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold text-black">Create Booking</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        {/* Patient Search */}
                        <div className="col-span-2 relative">
                            <label className="block text-sm font-semibold text-black mb-2">Search Patient</label>
                            <div className="relative">
                                <div className="absolute left-3 top-3 text-gray-400">
                                    <Search size={18} />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search by name or MRN..."
                                    value={patientSearch}
                                    onChange={handlePatientSearchChange}
                                    onFocus={() => setShowPatientDropdown(true)}
                                    className="w-full border rounded px-10 py-2 text-black"
                                />
                                {searchingPatients && (
                                    <div className="absolute right-3 top-3">
                                        <div className="animate-spin h-4 w-4 border-2 border-blue-600 rounded-full border-t-transparent"></div>
                                    </div>
                                )}
                            </div>

                            {showPatientDropdown && patients.length > 0 && (
                                <div className="absolute top-full mt-1 w-full bg-white border rounded shadow-lg z-10 max-h-48 overflow-y-auto">
                                    {patients.map((patient) => (
                                        <button
                                            key={patient.id}
                                            type="button"
                                            onClick={() => handlePatientSelect(patient)}
                                            className="w-full text-left px-4 py-2 hover:bg-blue-50 border-b last:border-b-0 text-black"
                                        >
                                            <p className="font-semibold">{patient.name || `${patient.firstName} ${patient.lastName}`}</p>
                                            <p className="text-xs text-gray-600">MRN: {patient.mrn} | Age: {patient.age}</p>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {showPatientDropdown && patientSearch && patients.length === 0 && !searchingPatients && (
                                <div className="absolute top-full mt-1 w-full bg-white border rounded shadow-lg z-10 p-3 text-gray-600 text-sm">
                                    No patients found
                                </div>
                            )}
                        </div>

                        {formData.patientId && (
                            <>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Patient Name</label>
                                    <p className="border rounded px-3 py-2 bg-gray-50 text-black">{formData.patientName}</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Patient MRN</label>
                                    <p className="border rounded px-3 py-2 bg-gray-50 text-black">{formData.patientMrn}</p>
                                </div>
                            </>
                        )}

                        {/* Procedure */}
                        <input
                            type="text"
                            placeholder="Procedure Name"
                            value={formData.procedureName}
                            onChange={(e) => setFormData({ ...formData, procedureName: e.target.value })}
                            className="border rounded px-3 py-2 text-black"
                            required
                        />

                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="Procedure Charge (optional)"
                            value={formData.procedureCharge}
                            onChange={(e) => setFormData({ ...formData, procedureCharge: e.target.value })}
                            className="border rounded px-3 py-2 text-black"
                        />

                        {/* Room Search */}
                        <div className="relative">
                            <label className="block text-sm font-semibold text-black mb-2">Search Room</label>
                            {roomError && (
                                <div className={`mb-2 text-xs p-2 rounded flex items-center gap-2 ${
                                    retryingRooms ? 'text-blue-600 bg-blue-50' : 'text-red-600 bg-red-50'
                                }`}>
                                    {retryingRooms && (
                                        <div className="animate-spin h-3 w-3 border-2 border-blue-600 rounded-full border-t-transparent"></div>
                                    )}
                                    {roomError}
                                </div>
                            )}
                            <div className="relative">
                                <div className="absolute left-3 top-3 text-gray-400">
                                    <Search size={18} />
                                </div>
                                <input
                                    type="text"
                                    placeholder={roomError ? 'Enter room name manually...' : 'Search OT room...'}
                                    value={roomSearch}
                                    onChange={handleRoomSearchChange}
                                    onFocus={() => {
                                        if (!roomError) {
                                            setShowRoomDropdown(true);
                                            updateRoomOptions(roomSearch);
                                        }
                                    }}
                                    className="w-full border rounded px-10 py-2 text-black"
                                />
                                {loadingRooms && (
                                    <div className="absolute right-3 top-3">
                                        <div className="animate-spin h-4 w-4 border-2 border-blue-600 rounded-full border-t-transparent"></div>
                                    </div>
                                )}
                            </div>

                            {!roomError && showRoomDropdown && rooms.length > 0 && (
                                <div className="absolute top-full mt-1 w-full bg-white border rounded shadow-lg z-10 max-h-48 overflow-y-auto">
                                    {rooms.map((room) => (
                                        <button
                                            key={room.id}
                                            type="button"
                                            onClick={() => handleRoomSelect(room)}
                                            className="w-full text-left px-4 py-2 hover:bg-blue-50 border-b last:border-b-0 text-black"
                                        >
                                            <p className="font-semibold">{room.roomNumber}</p>
                                            <p className="text-xs text-gray-600">Type: {room.roomType}</p>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {!roomError && showRoomDropdown && rooms.length === 0 && !loadingRooms && (
                                <div className="absolute top-full mt-1 w-full bg-white border rounded shadow-lg z-10 p-3 text-gray-600 text-sm">
                                    No rooms found
                                </div>
                            )}
                        </div>

                        {formData.roomId && (
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">Selected Room</label>
                                <p className="border rounded px-3 py-2 bg-gray-50 text-black">{formData.roomName}</p>
                            </div>
                        )}

                        {/* Surgeon Search */}
                        <div className="relative">
                            <label className="block text-sm font-semibold text-black mb-2">Search Surgeon</label>
                            <div className="relative">
                                <div className="absolute left-3 top-3 text-gray-400">
                                    <Search size={18} />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search by surgeon name..."
                                    value={surgeonSearch}
                                    onChange={handleSurgeonSearchChange}
                                    onFocus={() => setShowSurgeonDropdown(true)}
                                    className="w-full border rounded px-10 py-2 text-black"
                                />
                                {searchingSurgeons && (
                                    <div className="absolute right-3 top-3">
                                        <div className="animate-spin h-4 w-4 border-2 border-blue-600 rounded-full border-t-transparent"></div>
                                    </div>
                                )}
                            </div>

                            {showSurgeonDropdown && surgeons.length > 0 && (
                                <div className="absolute top-full mt-1 w-full bg-white border rounded shadow-lg z-10 max-h-48 overflow-y-auto">
                                    {surgeons.map((surgeon) => (
                                        <button
                                            key={surgeon.id}
                                            type="button"
                                            onClick={() => handleSurgeonSelect(surgeon)}
                                            className="w-full text-left px-4 py-2 hover:bg-blue-50 border-b last:border-b-0 text-black"
                                        >
                                            <p className="font-semibold">{surgeon.name || `${surgeon.firstName} ${surgeon.lastName}`}</p>
                                            <p className="text-xs text-gray-600">{surgeon.email}</p>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {showSurgeonDropdown && surgeonSearch && surgeons.length === 0 && !searchingSurgeons && (
                                <div className="absolute top-full mt-1 w-full bg-white border rounded shadow-lg z-10 p-3 text-gray-600 text-sm">
                                    No surgeons found
                                </div>
                            )}
                        </div>

                        {formData.surgeonId && (
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">Selected Surgeon</label>
                                <p className="border rounded px-3 py-2 bg-gray-50 text-black">{formData.surgeonName}</p>
                            </div>
                        )}

                        {/* Time slots */}
                        <div>
                            <label className="block text-sm font-semibold text-black mb-2">Scheduled Start</label>
                            <input
                                type="datetime-local"
                                value={formData.scheduledStart}
                                onChange={(e) => setFormData({ ...formData, scheduledStart: e.target.value })}
                                className="w-full border rounded px-3 py-2 text-black"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-black mb-2">Scheduled End</label>
                            <input
                                type="datetime-local"
                                value={formData.scheduledEnd}
                                onChange={(e) => setFormData({ ...formData, scheduledEnd: e.target.value })}
                                className="w-full border rounded px-3 py-2 text-black"
                                required
                            />
                        </div>

                        {/* Inventory Kits */}
                        <div className="col-span-2">
                            <label className="block text-sm font-semibold text-black mb-2">
                                Inventory Kits {kitError && <span className="text-xs text-gray-600">(Manual entry)</span>}
                            </label>
                            {kitError && (
                                <div className={`mb-2 text-xs p-2 rounded flex items-center gap-2 ${
                                    retryingKits ? 'text-blue-600 bg-blue-50' : 'text-amber-600 bg-amber-50'
                                }`}>
                                    {retryingKits && (
                                        <div className="animate-spin h-3 w-3 border-2 border-blue-600 rounded-full border-t-transparent"></div>
                                    )}
                                    {kitError}
                                </div>
                            )}
                            <div className="relative mb-3">
                                <div className="absolute left-3 top-3 text-gray-400">
                                    <Search size={18} />
                                </div>
                                <input
                                    type="text"
                                    placeholder={kitError ? 'Enter kit name...' : 'Search kit...'}
                                    value={kitSearch}
                                    onChange={handleKitSearchChange}
                                    onFocus={() => {
                                        if (!kitError) setShowKitDropdown(true);
                                    }}
                                    className="w-full border rounded px-10 py-2 text-black"
                                />
                                {loadingKits && (
                                    <div className="absolute right-3 top-3">
                                        <div className="animate-spin h-4 w-4 border-2 border-blue-600 rounded-full border-t-transparent"></div>
                                    </div>
                                )}
                            </div>

                            {!kitError && showKitDropdown && kits.length > 0 && (
                                <div className="absolute z-10 w-96 bg-white border rounded shadow-lg max-h-48 overflow-y-auto">
                                    {kits.map((kit) => (
                                        <button
                                            key={kit.id}
                                            type="button"
                                            onClick={() => handleAddKit(kit)}
                                            className="w-full text-left px-4 py-2 hover:bg-blue-50 border-b last:border-b-0 text-black"
                                        >
                                            <p className="font-semibold">{kit.name}</p>
                                            <p className="text-xs text-gray-600">Code: {kit.code}</p>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {kitError && kitSearch && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        const newId = 'manual_' + Date.now();
                                        handleAddKit({
                                            id: newId,
                                            name: kitSearch,
                                            code: '',
                                        });
                                    }}
                                    className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
                                >
                                    + Add "{kitSearch}" as custom kit
                                </button>
                            )}

                            {selectedKits.length > 0 && (
                                <div className="space-y-2 mt-3 bg-gray-50 p-3 rounded">
                                    {selectedKits.map((kit) => (
                                        <div key={kit.id} className="flex gap-2 items-center bg-white p-2 rounded border">
                                            <div className="flex-1">
                                                <p className="text-sm font-semibold text-black">{kit.name}</p>
                                            </div>
                                            <input
                                                type="number"
                                                min="1"
                                                value={kit.quantity}
                                                onChange={(e) => handleKitQuantityChange(kit.id, e.target.value)}
                                                className="w-16 border rounded px-2 py-1 text-black text-sm"
                                            />
                                            <span className="text-xs text-black">Qty</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={kit.unitPrice}
                                                onChange={(e) => handleKitPriceChange(kit.id, e.target.value)}
                                                className="w-20 border rounded px-2 py-1 text-black text-sm"
                                            />
                                            <span className="text-xs text-black">₹</span>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveKit(kit.id)}
                                                className="text-red-600 hover:text-red-800"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Notes */}
                        <div className="col-span-2">
                            <label className="block text-sm font-semibold text-black mb-2">Notes</label>
                            <textarea
                                placeholder="Notes"
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                className="w-full border rounded px-3 py-2 text-black"
                                rows="2"
                            />
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50"
                        >
                            {loading ? 'Creating...' : 'Create Booking'}
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
