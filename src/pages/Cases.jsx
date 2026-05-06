import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBookings, createBooking, addConsumptionItem, getHmsPatients, getHmsRooms, getDirectorySurgeons, getInventoryKits, getOtAdmissions } from '../api/client';
import { Plus, Search, Trash2 } from 'lucide-react';

const MAX_RETRIES = 3;

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
    const [otAdmissions, setOtAdmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [prefilledPatient, setPrefilledPatient] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetchBookings();
        fetchOtAdmissions();
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

    const fetchOtAdmissions = async () => {
        try {
            const res = await getOtAdmissions();
            setOtAdmissions(res.data || []);
        } catch {
            setOtAdmissions([]);
        }
    };

    const handleAdmitPatient = (admission) => {
        setPrefilledPatient({
            patientId: admission.patientId,
            patientName: admission.patientName,
            patientMrn: admission.patientMrn,
            roomId: admission.roomId,
            roomName: admission.roomNumber,
        });
        setShowModal(true);
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

    const formatDate = (dt) => new Date(dt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const formatTime = (dt) => new Date(dt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    const getDuration = (start, end) => {
        const mins = Math.round((new Date(end) - new Date(start)) / 60000);
        return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
    };
    const isToday = (dt) => new Date(dt).toDateString() === new Date().toDateString();

    if (loading) return <div className="flex items-center justify-center h-64"><p className="text-sm font-medium text-slate-500">Loading...</p></div>;

    return (
        <div className="flex flex-col h-full bg-slate-50 gap-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Cases</h1>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 bg-slate-900 hover:bg-slate-700 text-white font-semibold px-4 py-2 rounded-lg transition-all text-sm"
                >
                    <Plus size={20} />
                    New Booking
                </button>
            </div>

            {otAdmissions.length > 0 && (
                <div>
                    <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">Patients in OT Rooms</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {otAdmissions.map((admission) => {
                            const alreadyBooked = bookings.some(
                                b => String(b.patientId) === String(admission.patientId) &&
                                     !['COMPLETED', 'CANCELLED'].includes(b.status)
                            );
                            return (
                                <div key={admission.id} className="bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-between shadow-sm">
                                    <div>
                                        <p className="font-semibold text-slate-900 text-sm">{admission.patientName}</p>
                                        <p className="text-xs text-slate-500">MRN: {admission.patientMrn}</p>
                                        <p className="text-xs text-slate-500 mt-0.5">Room: {admission.roomNumber}</p>
                                    </div>
                                    {alreadyBooked
                                        ? <span className="text-xs bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-md font-semibold">Booked</span>
                                        : <button
                                            onClick={() => handleAdmitPatient(admission)}
                                            className="flex items-center gap-1 text-xs bg-slate-900 hover:bg-slate-700 text-white font-semibold px-3 py-1.5 rounded-lg transition-all"
                                          >
                                            <Plus size={14} /> Book OT
                                          </button>
                                    }
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-slate-100 bg-slate-50">
                            <th className="px-5 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-left">Patient</th>
                            <th className="px-5 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-left">Procedure</th>
                            <th className="px-5 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-left">Room</th>
                            <th className="px-5 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-left">Surgeon</th>
                            <th className="px-5 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-left">Schedule</th>
                            <th className="px-5 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-left">Status</th>
                            <th className="px-5 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-left">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {bookings.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-5 py-10 text-center text-sm font-medium text-slate-500">No cases found</td>
                            </tr>
                        )}
                        {bookings.map(booking => (
                            <tr key={booking.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => navigate(`/cases/${booking.id}`)}>
                                <td className="px-5 py-4">
                                    <p className="text-sm font-semibold text-slate-900">{booking.patientName}</p>
                                    {booking.patientMrn && <p className="text-xs text-slate-500 mt-0.5">MRN: {booking.patientMrn}</p>}
                                </td>
                                <td className="px-5 py-4">
                                    <p className="text-sm font-semibold text-slate-900">{booking.procedureName}</p>
                                    {booking.procedureCharge && (
                                        <p className="text-xs text-slate-500 mt-0.5">₹{Number(booking.procedureCharge).toLocaleString('en-IN')}</p>
                                    )}
                                </td>
                                <td className="px-5 py-4 text-sm font-semibold text-slate-900">{booking.roomName}</td>
                                <td className="px-5 py-4 text-sm font-semibold text-slate-900">{booking.surgeonName}</td>
                                <td className="px-5 py-4">
                                    <div className="flex items-center gap-1">
                                        <p className="text-sm font-semibold text-slate-900">{formatDate(booking.scheduledStart)}</p>
                                        {isToday(booking.scheduledStart) && (
                                            <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-md font-semibold">Today</span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        {formatTime(booking.scheduledStart)} – {formatTime(booking.scheduledEnd)}
                                        <span className="ml-1 text-slate-400">({getDuration(booking.scheduledStart, booking.scheduledEnd)})</span>
                                    </p>
                                </td>
                                <td className="px-5 py-4">
                                    <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border inline-flex items-center ${getStatusColor(booking.status)}`}>
                                        {booking.status.replace('_', ' ')}
                                    </span>
                                </td>
                                <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                                    <button
                                        onClick={() => navigate(`/cases/${booking.id}`)}
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
                    prefilled={prefilledPatient}
                    onClose={() => { setShowModal(false); setPrefilledPatient(null); }}
                    onSuccess={() => {
                        setShowModal(false);
                        setPrefilledPatient(null);
                        fetchBookings();
                        fetchOtAdmissions();
                    }}
                />
            )}
        </div>
    );
}

function CreateBookingModal({ onClose, onSuccess, prefilled = null }) {
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
    const retryTimeoutRef = useRef({ rooms: null, kits: null });
    const retryCountRef = useRef({ rooms: 0, kits: 0 });
    const [selectedKits, setSelectedKits] = useState([]);
    const [formData, setFormData] = useState({
        patientId: prefilled?.patientId ?? '',
        patientName: prefilled?.patientName ?? '',
        patientMrn: prefilled?.patientMrn ?? '',
        procedureName: '',
        procedureCharge: '',
        roomId: prefilled?.roomId ?? '',
        roomName: prefilled?.roomName ?? '',
        surgeonId: '',
        surgeonName: '',
        scheduledStart: '',
        scheduledEnd: '',
        notes: '',
    });

    useEffect(() => {
        const fetchRooms = async (retryCount = 0) => {
            retryCount === 0 ? setLoadingRooms(true) : setRetryingRooms(true);
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
                if (retryCount < MAX_RETRIES) {
                    setRoomError('Failed to load rooms. Retrying...');
                    setRetryingRooms(true);
                    retryTimeoutRef.current.rooms = setTimeout(() => fetchRooms(retryCount + 1), 5000);
                } else {
                    setRoomError('Could not load rooms. Enter room name manually.');
                    setRetryingRooms(false);
                }
            } finally {
                if (retryCount === 0) setLoadingRooms(false);
            }
        };

        const fetchKits = async (retryCount = 0) => {
            retryCount === 0 ? setLoadingKits(true) : setRetryingKits(true);
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
                if (retryCount < MAX_RETRIES) {
                    setKitError('Loading inventory kits... You can add custom items.');
                    setRetryingKits(true);
                    retryTimeoutRef.current.kits = setTimeout(() => fetchKits(retryCount + 1), 5000);
                } else {
                    setKitError('Inventory unavailable. Add custom items manually.');
                    setRetryingKits(false);
                }
            } finally {
                if (retryCount === 0) setLoadingKits(false);
            }
        };

        fetchRooms();
        fetchKits();

        return () => {
            clearTimeout(retryTimeoutRef.current.rooms);
            clearTimeout(retryTimeoutRef.current.kits);
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
                        {/* Patient Search */}
                        <div className="col-span-2 relative">
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Search Patient</label>
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400">
                                    <Search size={16} />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search by name or MRN..."
                                    value={patientSearch}
                                    onChange={handlePatientSearchChange}
                                    onFocus={() => setShowPatientDropdown(true)}
                                    className="w-full pl-9 px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300 text-sm transition-all"
                                />
                                {searchingPatients && (
                                    <div className="absolute right-3 top-3">
                                        <div className="animate-spin h-4 w-4 border-2 border-blue-600 rounded-full border-t-transparent"></div>
                                    </div>
                                )}
                            </div>

                            {showPatientDropdown && patients.length > 0 && (
                                <div className="absolute top-full mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden z-10 max-h-48 overflow-y-auto">
                                    {patients.map((patient) => (
                                        <button
                                            key={patient.id}
                                            type="button"
                                            onClick={() => handlePatientSelect(patient)}
                                            className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0"
                                        >
                                            <p className="font-semibold text-slate-900">{patient.name || `${patient.firstName} ${patient.lastName}`}</p>
                                            <p className="text-xs text-slate-500 mt-0.5">MRN: {patient.mrn} | Age: {patient.age}</p>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {showPatientDropdown && patientSearch && patients.length === 0 && !searchingPatients && (
                                <div className="absolute top-full mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden z-10 p-3 text-slate-500 text-sm">
                                    No patients found
                                </div>
                            )}
                        </div>

                        {formData.patientId && (
                            <>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Patient Name</label>
                                    <p className="border border-slate-200 rounded-lg px-4 py-2.5 bg-slate-50 text-slate-900 text-sm">{formData.patientName}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Patient MRN</label>
                                    <p className="border border-slate-200 rounded-lg px-4 py-2.5 bg-slate-50 text-slate-900 text-sm">{formData.patientMrn}</p>
                                </div>
                            </>
                        )}

                        {/* Procedure */}
                        <input
                            type="text"
                            placeholder="Procedure Name"
                            value={formData.procedureName}
                            onChange={(e) => setFormData({ ...formData, procedureName: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300 text-sm transition-all"
                            required
                        />

                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="Procedure Charge (optional)"
                            value={formData.procedureCharge}
                            onChange={(e) => setFormData({ ...formData, procedureCharge: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300 text-sm transition-all"
                        />

                        {/* Room Search */}
                        <div className="relative">
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Search Room</label>
                            {roomError && (
                                <div className={`mb-2 text-xs p-2 rounded flex items-center gap-2 ${
                                    retryingRooms ? 'text-blue-600 bg-blue-50' : 'text-rose-600 bg-rose-50'
                                }`}>
                                    {retryingRooms && (
                                        <div className="animate-spin h-3 w-3 border-2 border-blue-600 rounded-full border-t-transparent"></div>
                                    )}
                                    {roomError}
                                </div>
                            )}
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400">
                                    <Search size={16} />
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
                                    className="w-full pl-9 px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300 text-sm transition-all"
                                />
                                {loadingRooms && (
                                    <div className="absolute right-3 top-3">
                                        <div className="animate-spin h-4 w-4 border-2 border-blue-600 rounded-full border-t-transparent"></div>
                                    </div>
                                )}
                            </div>

                            {!roomError && showRoomDropdown && rooms.length > 0 && (
                                <div className="absolute top-full mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden z-10 max-h-48 overflow-y-auto">
                                    {rooms.map((room) => (
                                        <button
                                            key={room.id}
                                            type="button"
                                            onClick={() => handleRoomSelect(room)}
                                            className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0"
                                        >
                                            <p className="font-semibold text-slate-900">{room.roomNumber}</p>
                                            <p className="text-xs text-slate-500 mt-0.5">Type: {room.roomType}</p>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {!roomError && showRoomDropdown && rooms.length === 0 && !loadingRooms && (
                                <div className="absolute top-full mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden z-10 p-3 text-slate-500 text-sm">
                                    No rooms found
                                </div>
                            )}
                        </div>

                        {formData.roomId && (
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Selected Room</label>
                                <p className="border border-slate-200 rounded-lg px-4 py-2.5 bg-slate-50 text-slate-900 text-sm">{formData.roomName}</p>
                            </div>
                        )}

                        {/* Surgeon Search */}
                        <div className="relative">
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Search Surgeon</label>
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400">
                                    <Search size={16} />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search by surgeon name..."
                                    value={surgeonSearch}
                                    onChange={handleSurgeonSearchChange}
                                    onFocus={() => setShowSurgeonDropdown(true)}
                                    className="w-full pl-9 px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300 text-sm transition-all"
                                />
                                {searchingSurgeons && (
                                    <div className="absolute right-3 top-3">
                                        <div className="animate-spin h-4 w-4 border-2 border-blue-600 rounded-full border-t-transparent"></div>
                                    </div>
                                )}
                            </div>

                            {showSurgeonDropdown && surgeons.length > 0 && (
                                <div className="absolute top-full mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden z-10 max-h-48 overflow-y-auto">
                                    {surgeons.map((surgeon) => (
                                        <button
                                            key={surgeon.id}
                                            type="button"
                                            onClick={() => handleSurgeonSelect(surgeon)}
                                            className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0"
                                        >
                                            <p className="font-semibold text-slate-900">{surgeon.name || `${surgeon.firstName} ${surgeon.lastName}`}</p>
                                            <p className="text-xs text-slate-500 mt-0.5">{surgeon.email}</p>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {showSurgeonDropdown && surgeonSearch && surgeons.length === 0 && !searchingSurgeons && (
                                <div className="absolute top-full mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden z-10 p-3 text-slate-500 text-sm">
                                    No surgeons found
                                </div>
                            )}
                        </div>

                        {formData.surgeonId && (
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Selected Surgeon</label>
                                <p className="border border-slate-200 rounded-lg px-4 py-2.5 bg-slate-50 text-slate-900 text-sm">{formData.surgeonName}</p>
                            </div>
                        )}

                        {/* Time slots */}
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

                        {/* Inventory Kits */}
                        <div className="col-span-2">
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                Inventory Kits {kitError && <span className="text-xs text-slate-500">(Manual entry)</span>}
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
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400">
                                    <Search size={16} />
                                </div>
                                <input
                                    type="text"
                                    placeholder={kitError ? 'Enter kit name...' : 'Search kit...'}
                                    value={kitSearch}
                                    onChange={handleKitSearchChange}
                                    onFocus={() => {
                                        if (!kitError) setShowKitDropdown(true);
                                    }}
                                    className="w-full pl-9 px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300 text-sm transition-all"
                                />
                                {loadingKits && (
                                    <div className="absolute right-3 top-3">
                                        <div className="animate-spin h-4 w-4 border-2 border-blue-600 rounded-full border-t-transparent"></div>
                                    </div>
                                )}
                            </div>

                            {!kitError && showKitDropdown && kits.length > 0 && (
                                <div className="absolute z-10 w-96 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                                    {kits.map((kit) => (
                                        <button
                                            key={kit.id}
                                            type="button"
                                            onClick={() => handleAddKit(kit)}
                                            className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0"
                                        >
                                            <p className="font-semibold text-slate-900">{kit.name}</p>
                                            <p className="text-xs text-slate-500 mt-0.5">Code: {kit.code}</p>
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
                                    className="mt-2 text-sm font-semibold text-slate-600 hover:text-slate-900 underline"
                                >
                                    + Add "{kitSearch}" as custom kit
                                </button>
                            )}

                            {selectedKits.length > 0 && (
                                <div className="space-y-2 mt-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    {selectedKits.map((kit) => (
                                        <div key={kit.id} className="flex gap-2 items-center bg-white p-3 rounded-lg border border-slate-200">
                                            <div className="flex-1">
                                                <p className="text-sm font-semibold text-slate-900">{kit.name}</p>
                                            </div>
                                            <input
                                                type="number"
                                                min="1"
                                                value={kit.quantity}
                                                onChange={(e) => handleKitQuantityChange(kit.id, e.target.value)}
                                                className="w-16 border border-slate-200 rounded-lg px-2 py-1 text-slate-900 text-sm bg-slate-50"
                                            />
                                            <span className="text-xs text-slate-500">Qty</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={kit.unitPrice}
                                                onChange={(e) => handleKitPriceChange(kit.id, e.target.value)}
                                                className="w-20 border border-slate-200 rounded-lg px-2 py-1 text-slate-900 text-sm bg-slate-50"
                                            />
                                            <span className="text-xs text-slate-500">₹</span>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveKit(kit.id)}
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Notes */}
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
