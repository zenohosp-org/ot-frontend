import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    getBookings, createBooking, addConsumptionItem,
    getHmsPatients, getHmsRooms, getHmsDoctors,
    getInventoryKits, getActiveAdmissions,
} from '../api/client';
import { Plus, Search, Trash2, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';

const MAX_RETRIES = 3;

function isOtRoom(room) {
    return room?.roomType === 'OT' ||
        (room?.roomNumber || '').toString().toLowerCase().includes('ot') ||
        (room?.roomCode || '').toString().toLowerCase().includes('ot');
}

function overlapsWithBuffer(desiredStart, desiredEnd, existingStart, existingEnd, bufferMinutes = 30) {
    const desiredEndWithBuffer = new Date(desiredEnd.getTime() + bufferMinutes * 60 * 1000);
    return existingStart < desiredEndWithBuffer && existingEnd > desiredStart;
}

const STATUS_CONFIG = {
    REQUESTED:          { label: 'Requested',          classes: 'bg-gray-100 text-gray-700 border border-gray-300' },
    CONFIRMED:          { label: 'Confirmed',           classes: 'bg-blue-100 text-blue-800 border border-blue-300' },
    IN_PROGRESS:        { label: 'In Progress',         classes: 'bg-green-100 text-green-800 border border-green-300' },
    PENDING_SANITATION: { label: 'Pending Sanitation',  classes: 'bg-amber-100 text-amber-800 border border-amber-300' },
    COMPLETED:          { label: 'Completed',           classes: 'bg-slate-100 text-slate-700 border border-slate-300' },
    CANCELLED:          { label: 'Cancelled',           classes: 'bg-red-100 text-red-700 border border-red-300' },
};

function StatusBadge({ status }) {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.REQUESTED;
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.classes}`}>
            {cfg.label}
        </span>
    );
}

function formatDate(dt) {
    return new Date(dt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function formatTime(dt) {
    return new Date(dt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}
function getDuration(start, end) {
    const mins = Math.round((new Date(end) - new Date(start)) / 60000);
    return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
}
function isToday(dt) {
    return new Date(dt).toDateString() === new Date().toDateString();
}

export default function Cases() {
    const [bookings, setBookings] = useState([]);
    const [admissions, setAdmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [prefilledPatient, setPrefilledPatient] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetchBookings();
        fetchAdmissions();
    }, []);

    const fetchBookings = async () => {
        try {
            const res = await getBookings({});
            setBookings(Array.isArray(res.data) ? res.data : []);
        } catch {
            setBookings([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchAdmissions = async () => {
        try {
            const res = await getActiveAdmissions();
            setAdmissions(Array.isArray(res.data) ? res.data : []);
        } catch {
            setAdmissions([]);
        }
    };

    const handleBookFromAdmission = (admission) => {
        setPrefilledPatient({
            patientId: admission.patientId,
            patientName: admission.patientName,
            patientMrn: admission.patientMrn,
            roomId: admission.roomType === 'OT' ? admission.roomId : '',
            roomName: admission.roomType === 'OT' ? admission.roomNumber : '',
        });
        setShowModal(true);
    };

    const activeAdmissions = admissions.filter(a =>
        !bookings.some(
            b => String(b.patientId) === String(a.patientId) &&
                 !['COMPLETED', 'CANCELLED'].includes(b.status)
        )
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Cases</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Manage OT bookings and surgical cases</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                    <Plus size={16} />
                    New Booking
                </button>
            </div>

            {/* Admitted Patients Panel */}
            {activeAdmissions.length > 0 && (
                <section>
                    <div className="flex items-center gap-2 mb-3">
                        <AlertCircle size={16} className="text-amber-600" />
                        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                            Admitted Patients Awaiting OT Booking
                        </h2>
                        <span className="ml-1 bg-amber-100 text-amber-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                            {activeAdmissions.length}
                        </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {activeAdmissions.map((admission) => (
                            <AdmissionCard
                                key={admission.id}
                                admission={admission}
                                onBook={() => handleBookFromAdmission(admission)}
                            />
                        ))}
                    </div>
                </section>
            )}

            {/* Bookings Table */}
            <section>
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-gray-700">All Bookings</h2>
                        <span className="text-xs text-gray-500">{bookings.length} total</span>
                    </div>

                    {bookings.length === 0 ? (
                        <div className="py-16 text-center">
                            <CheckCircle2 size={40} className="mx-auto text-gray-300 mb-3" />
                            <p className="text-gray-500 text-sm">No bookings yet</p>
                            <button
                                onClick={() => setShowModal(true)}
                                className="mt-3 text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                                Create the first booking
                            </button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                        <th className="px-6 py-3">Patient</th>
                                        <th className="px-6 py-3">Procedure</th>
                                        <th className="px-6 py-3">Room</th>
                                        <th className="px-6 py-3">Surgeon</th>
                                        <th className="px-6 py-3">Schedule</th>
                                        <th className="px-6 py-3">Status</th>
                                        <th className="px-6 py-3 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {bookings.map(booking => (
                                        <BookingRow
                                            key={booking.id}
                                            booking={booking}
                                            onClick={() => navigate(`/cases/${booking.id}`)}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </section>

            {showModal && (
                <CreateBookingModal
                    prefilled={prefilledPatient}
                    onClose={() => { setShowModal(false); setPrefilledPatient(null); }}
                    onSuccess={() => {
                        setShowModal(false);
                        setPrefilledPatient(null);
                        fetchBookings();
                        fetchAdmissions();
                    }}
                />
            )}
        </div>
    );
}

function AdmissionCard({ admission, onBook }) {
    const isOT = admission.roomType === 'OT';
    return (
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex flex-col gap-3">
            <div>
                <p className="font-semibold text-gray-900 text-sm">{admission.patientName}</p>
                <p className="text-xs text-gray-500 mt-0.5">MRN: {admission.patientMrn}</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                        ${isOT ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {admission.roomNumber || 'No room'}
                    </span>
                    <span className="text-xs text-gray-400">{admission.roomType}</span>
                </div>
            </div>
            <button
                onClick={onBook}
                className="w-full inline-flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-md transition-colors"
            >
                <Plus size={13} />
                Book for OT
            </button>
        </div>
    );
}

function BookingRow({ booking, onClick }) {
    return (
        <tr
            className="hover:bg-gray-50 cursor-pointer transition-colors"
            onClick={onClick}
        >
            <td className="px-6 py-4">
                <p className="font-semibold text-gray-900">{booking.patientName}</p>
                {booking.patientMrn && (
                    <p className="text-xs text-gray-500 mt-0.5">MRN: {booking.patientMrn}</p>
                )}
            </td>
            <td className="px-6 py-4">
                <p className="text-gray-800">{booking.procedureName}</p>
                {booking.procedureCharge && (
                    <p className="text-xs text-gray-500 mt-0.5">
                        ₹{Number(booking.procedureCharge).toLocaleString('en-IN')}
                    </p>
                )}
            </td>
            <td className="px-6 py-4 text-gray-700">{booking.roomName}</td>
            <td className="px-6 py-4 text-gray-700">{booking.surgeonName}</td>
            <td className="px-6 py-4">
                <div className="flex items-center gap-1.5">
                    <p className="text-gray-800">{formatDate(booking.scheduledStart)}</p>
                    {isToday(booking.scheduledStart) && (
                        <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-1.5 py-0.5 rounded">
                            Today
                        </span>
                    )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                    {formatTime(booking.scheduledStart)} – {formatTime(booking.scheduledEnd)}
                    <span className="ml-1 text-gray-400">
                        ({getDuration(booking.scheduledStart, booking.scheduledEnd)})
                    </span>
                </p>
            </td>
            <td className="px-6 py-4">
                <StatusBadge status={booking.status} />
            </td>
            <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                <button
                    onClick={onClick}
                    className="text-blue-600 hover:text-blue-800 font-medium"
                >
                    View
                </button>
            </td>
        </tr>
    );
}

// ─── Create Booking Modal ─────────────────────────────────────────────────────

function CreateBookingModal({ onClose, onSuccess, prefilled = null }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Patient
    const [patients, setPatients] = useState([]);
    const [patientSearch, setPatientSearch] = useState('');
    const [showPatientDrop, setShowPatientDrop] = useState(false);
    const [searchingPatients, setSearchingPatients] = useState(false);

    // Room
    const [allRooms, setAllRooms] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [roomSearch, setRoomSearch] = useState('');
    const [showRoomDrop, setShowRoomDrop] = useState(false);
    const [loadingRooms, setLoadingRooms] = useState(false);
    const [roomError, setRoomError] = useState(null);

    // Surgeon
    const [surgeons, setSurgeons] = useState([]);
    const [surgeonSearch, setSurgeonSearch] = useState('');
    const [showSurgeonDrop, setShowSurgeonDrop] = useState(false);
    const [searchingSurgeons, setSearchingSurgeons] = useState(false);
    const [specialization, setSpecialization] = useState('');

    // Kits
    const [allKits, setAllKits] = useState([]);
    const [kitSearch, setKitSearch] = useState('');
    const [showKitDrop, setShowKitDrop] = useState(false);
    const [loadingKits, setLoadingKits] = useState(false);
    const [kitError, setKitError] = useState(null);
    const [selectedKits, setSelectedKits] = useState([]);

    // Day bookings for conflict preview
    const [dayBookings, setDayBookings] = useState([]);

    const retryTimeout = useRef({ rooms: null, kits: null });

    const [form, setForm] = useState({
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

    // Load rooms
    useEffect(() => {
        const fetchRooms = async (retry = 0) => {
            if (retry === 0) setLoadingRooms(true);
            setRoomError(null);
            try {
                const res = await getHmsRooms();
                const otRooms = (res.data || []).filter(isOtRoom);
                setAllRooms(otRooms);
                setRooms(otRooms);
            } catch {
                if (retry < MAX_RETRIES) {
                    setRoomError('Retrying room list...');
                    retryTimeout.current.rooms = setTimeout(() => fetchRooms(retry + 1), 4000);
                } else {
                    setRoomError('Could not load rooms. Enter manually.');
                }
            } finally {
                if (retry === 0) setLoadingRooms(false);
            }
        };

        const fetchKits = async (retry = 0) => {
            if (retry === 0) setLoadingKits(true);
            setKitError(null);
            try {
                const res = await getInventoryKits();
                setAllKits(res.data || []);
            } catch {
                if (retry < MAX_RETRIES) {
                    setKitError('Loading inventory kits...');
                    retryTimeout.current.kits = setTimeout(() => fetchKits(retry + 1), 4000);
                } else {
                    setKitError('Inventory unavailable. Add items manually.');
                }
            } finally {
                if (retry === 0) setLoadingKits(false);
            }
        };

        fetchRooms();
        fetchKits();
        return () => {
            clearTimeout(retryTimeout.current.rooms);
            clearTimeout(retryTimeout.current.kits);
        };
    }, []);

    // Fetch day bookings when start time changes (for conflict preview)
    useEffect(() => {
        const start = form.scheduledStart ? new Date(form.scheduledStart) : null;
        if (!start || Number.isNaN(start.getTime())) { setDayBookings([]); return; }
        const date = start.toISOString().slice(0, 10);
        getBookings({ date }).then(r => setDayBookings(r.data || [])).catch(() => setDayBookings([]));
    }, [form.scheduledStart]);

    // Recompute available rooms when time or bookings change
    useEffect(() => {
        const available = getAvailableRooms();
        const q = roomSearch.toLowerCase();
        setRooms(available.filter(r =>
            !q || r.roomNumber?.toLowerCase().includes(q) || r.roomType?.toLowerCase().includes(q)
        ));
        if (form.roomId) {
            const ids = new Set(available.map(r => Number(r.id)));
            if (!ids.has(Number(form.roomId))) setForm(f => ({ ...f, roomId: '', roomName: '' }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.scheduledStart, form.scheduledEnd, dayBookings, allRooms]);

    const getAvailableRooms = () => {
        const s = form.scheduledStart ? new Date(form.scheduledStart) : null;
        const e = form.scheduledEnd ? new Date(form.scheduledEnd) : null;
        if (!s || !e || Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return allRooms;
        const active = dayBookings.filter(b => !['CANCELLED', 'COMPLETED'].includes(b.status));
        return allRooms.filter(room =>
            !active.some(b => {
                if (Number(b.roomId) !== Number(room.id)) return false;
                const bs = new Date(b.scheduledStart), be = new Date(b.scheduledEnd);
                return !Number.isNaN(bs.getTime()) && overlapsWithBuffer(s, e, bs, be, 30);
            })
        );
    };

    const searchPatients = async (q) => {
        if (q.length < 2) { setPatients([]); return; }
        setSearchingPatients(true);
        try {
            const res = await getHmsPatients(q);
            setPatients(res.data || []);
        } catch { setPatients([]); } finally { setSearchingPatients(false); }
    };

    const searchSurgeons = async (q) => {
        if (q.length < 2) { setSurgeons([]); return; }
        setSearchingSurgeons(true);
        try {
            const res = await getHmsDoctors(q, specialization || undefined);
            setSurgeons(res.data || []);
        } catch { setSurgeons([]); } finally { setSearchingSurgeons(false); }
    };

    const handlePatientSelect = (p) => {
        setForm(f => ({
            ...f,
            patientId: p.id,
            patientName: p.name || `${p.firstName || ''} ${p.lastName || ''}`.trim(),
            patientMrn: p.mrn || '',
        }));
        setPatientSearch(''); setShowPatientDrop(false); setPatients([]);
    };

    const handleSurgeonSelect = (s) => {
        setForm(f => ({
            ...f,
            surgeonId: s.id || s.userId || '',
            surgeonName: s.name || `${s.firstName || ''} ${s.lastName || ''}`.trim(),
        }));
        setSurgeonSearch(''); setShowSurgeonDrop(false); setSurgeons([]);
    };

    const handleRoomSelect = (r) => {
        setForm(f => ({ ...f, roomId: r.id, roomName: r.roomNumber || '' }));
        setRoomSearch(''); setShowRoomDrop(false);
    };

    const handleAddKit = (kit) => {
        if (selectedKits.find(k => k.id === kit.id)) return;
        setSelectedKits(prev => [...prev, { id: kit.id, name: kit.name, quantity: 1, unitPrice: kit.price || 0 }]);
        setKitSearch(''); setShowKitDrop(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.patientId) { setError('Please select a patient'); return; }
        if (!form.roomId) { setError('Please select a room'); return; }
        if (!form.surgeonId) { setError('Please select a surgeon'); return; }

        setLoading(true);
        setError(null);
        try {
            const payload = {
                ...form,
                patientId: Number(form.patientId),
                roomId: Number(form.roomId),
                procedureCharge: form.procedureCharge ? Number(form.procedureCharge) : null,
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
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create booking');
        } finally {
            setLoading(false);
        }
    };

    const filteredKits = allKits.filter(k =>
        !kitSearch || k.name?.toLowerCase().includes(kitSearch.toLowerCase()) || k.code?.toLowerCase().includes(kitSearch.toLowerCase())
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                {/* Modal header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
                    <h2 className="text-lg font-bold text-gray-900">New OT Booking</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="overflow-y-auto px-6 py-5 space-y-5 flex-1">
                    {error && (
                        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                            <XCircle size={16} className="flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    {/* Patient search */}
                    <FormSection title="Patient">
                        <SearchField
                            placeholder="Search by name, MRN or phone..."
                            value={patientSearch}
                            onChange={v => { setPatientSearch(v); setShowPatientDrop(true); searchPatients(v); }}
                            onFocus={() => setShowPatientDrop(true)}
                            loading={searchingPatients}
                        />
                        {showPatientDrop && patients.length > 0 && (
                            <Dropdown>
                                {patients.map(p => (
                                    <DropdownItem key={p.id} onClick={() => handlePatientSelect(p)}>
                                        <span className="font-medium text-gray-900">
                                            {p.name || `${p.firstName} ${p.lastName}`}
                                        </span>
                                        <span className="text-xs text-gray-500 mt-0.5">
                                            MRN: {p.mrn} {p.age != null ? `· Age: ${p.age}` : ''}
                                        </span>
                                    </DropdownItem>
                                ))}
                            </Dropdown>
                        )}
                        {form.patientId && (
                            <SelectedTag label={form.patientName} sub={`MRN: ${form.patientMrn}`} onClear={() => setForm(f => ({ ...f, patientId: '', patientName: '', patientMrn: '' }))} />
                        )}
                    </FormSection>

                    {/* Procedure */}
                    <FormSection title="Procedure">
                        <div className="grid grid-cols-2 gap-3">
                            <input
                                className="col-span-2 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Procedure name *"
                                value={form.procedureName}
                                onChange={e => setForm(f => ({ ...f, procedureName: e.target.value.slice(0, 300) }))}
                                required
                            />
                            <input
                                className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                type="number" step="0.01" min="0"
                                placeholder="Procedure charge (₹)"
                                value={form.procedureCharge}
                                onChange={e => setForm(f => ({ ...f, procedureCharge: e.target.value }))}
                            />
                        </div>
                    </FormSection>

                    {/* Schedule */}
                    <FormSection title="Schedule">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Start *</label>
                                <input
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    type="datetime-local"
                                    value={form.scheduledStart}
                                    onChange={e => setForm(f => ({ ...f, scheduledStart: e.target.value }))}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">End *</label>
                                <input
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    type="datetime-local"
                                    value={form.scheduledEnd}
                                    onChange={e => setForm(f => ({ ...f, scheduledEnd: e.target.value }))}
                                    required
                                />
                            </div>
                        </div>
                    </FormSection>

                    {/* Room */}
                    <FormSection title="OT Room">
                        {roomError && (
                            <p className="text-xs text-amber-600 mb-1">{roomError}</p>
                        )}
                        <SearchField
                            placeholder={roomError ? 'Enter room name manually...' : 'Search OT room...'}
                            value={roomSearch}
                            onChange={v => {
                                setRoomSearch(v);
                                if (!roomError) setShowRoomDrop(true);
                                const q = v.toLowerCase();
                                setRooms(getAvailableRooms().filter(r =>
                                    !q || r.roomNumber?.toLowerCase().includes(q)
                                ));
                            }}
                            onFocus={() => { if (!roomError) setShowRoomDrop(true); }}
                            loading={loadingRooms}
                        />
                        {!roomError && showRoomDrop && rooms.length > 0 && (
                            <Dropdown>
                                {rooms.map(r => (
                                    <DropdownItem key={r.id} onClick={() => handleRoomSelect(r)}>
                                        <span className="font-medium text-gray-900">{r.roomNumber}</span>
                                        <span className="text-xs text-gray-500">{r.roomType}</span>
                                    </DropdownItem>
                                ))}
                            </Dropdown>
                        )}
                        {form.roomId && (
                            <SelectedTag label={form.roomName} sub="OT Room" onClear={() => setForm(f => ({ ...f, roomId: '', roomName: '' }))} />
                        )}
                    </FormSection>

                    {/* Surgeon */}
                    <FormSection title="Surgeon">
                        <div className="mb-2">
                            <select
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                value={specialization}
                                onChange={e => { setSpecialization(e.target.value); setSurgeons([]); setSurgeonSearch(''); }}
                            >
                                <option value="">All Specializations</option>
                                <option>Cardiology</option>
                                <option>Orthopedics</option>
                                <option>Neurosurgery</option>
                                <option>General Surgery</option>
                                <option>ENT</option>
                                <option>Ophthalmology</option>
                                <option>Urology</option>
                                <option>Oncology</option>
                            </select>
                        </div>
                        <SearchField
                            placeholder="Search by surgeon name..."
                            value={surgeonSearch}
                            onChange={v => { setSurgeonSearch(v); setShowSurgeonDrop(true); searchSurgeons(v); }}
                            onFocus={() => setShowSurgeonDrop(true)}
                            loading={searchingSurgeons}
                        />
                        {showSurgeonDrop && surgeons.length > 0 && (
                            <Dropdown>
                                {surgeons.map(s => (
                                    <DropdownItem key={s.id || s.userId} onClick={() => handleSurgeonSelect(s)}>
                                        <span className="font-medium text-gray-900">
                                            {s.name || `${s.firstName} ${s.lastName}`}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            {s.specialization && <span className="text-blue-600 mr-1">{s.specialization}</span>}
                                            {s.email}
                                        </span>
                                    </DropdownItem>
                                ))}
                            </Dropdown>
                        )}
                        {form.surgeonId && (
                            <SelectedTag label={form.surgeonName} sub="Surgeon" onClear={() => setForm(f => ({ ...f, surgeonId: '', surgeonName: '' }))} />
                        )}
                    </FormSection>

                    {/* Inventory Kits */}
                    <FormSection title="Inventory Kits">
                        {kitError && (
                            <p className="text-xs text-amber-600 mb-1">{kitError}</p>
                        )}
                        <SearchField
                            placeholder={kitError ? 'Enter kit name...' : 'Search kit...'}
                            value={kitSearch}
                            onChange={v => { setKitSearch(v); if (!kitError) setShowKitDrop(true); }}
                            onFocus={() => { if (!kitError) setShowKitDrop(true); }}
                            loading={loadingKits}
                        />
                        {!kitError && showKitDrop && filteredKits.length > 0 && (
                            <Dropdown>
                                {filteredKits.map(k => (
                                    <DropdownItem key={k.id} onClick={() => handleAddKit(k)}>
                                        <span className="font-medium text-gray-900">{k.name}</span>
                                        {k.code && <span className="text-xs text-gray-500">Code: {k.code}</span>}
                                    </DropdownItem>
                                ))}
                            </Dropdown>
                        )}
                        {kitError && kitSearch && (
                            <button
                                type="button"
                                onClick={() => handleAddKit({ id: `manual_${Date.now()}`, name: kitSearch, price: 0 })}
                                className="mt-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
                            >
                                + Add "{kitSearch}" as custom item
                            </button>
                        )}
                        {selectedKits.length > 0 && (
                            <div className="mt-3 space-y-2">
                                {selectedKits.map(kit => (
                                    <div key={kit.id} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2 border border-gray-200">
                                        <span className="flex-1 text-sm font-medium text-gray-900 truncate">{kit.name}</span>
                                        <input
                                            type="number" min="1" value={kit.quantity}
                                            onChange={e => setSelectedKits(kits => kits.map(k => k.id === kit.id ? { ...k, quantity: Math.max(1, Number(e.target.value)) } : k))}
                                            className="w-14 border border-gray-300 rounded px-2 py-1 text-xs text-center"
                                        />
                                        <span className="text-xs text-gray-500">qty</span>
                                        <input
                                            type="number" step="0.01" min="0" value={kit.unitPrice}
                                            onChange={e => setSelectedKits(kits => kits.map(k => k.id === kit.id ? { ...k, unitPrice: Math.max(0, Number(e.target.value)) } : k))}
                                            className="w-20 border border-gray-300 rounded px-2 py-1 text-xs text-center"
                                        />
                                        <span className="text-xs text-gray-500">₹</span>
                                        <button type="button" onClick={() => setSelectedKits(kits => kits.filter(k => k.id !== kit.id))}>
                                            <Trash2 size={14} className="text-red-500 hover:text-red-700" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </FormSection>

                    {/* Notes */}
                    <FormSection title="Notes">
                        <textarea
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            rows={2}
                            placeholder="Clinical notes, special requirements..."
                            value={form.notes}
                            onChange={e => setForm(f => ({ ...f, notes: e.target.value.slice(0, 1000) }))}
                        />
                    </FormSection>
                </form>

                {/* Modal footer */}
                <div className="px-6 py-4 border-t border-gray-100 flex gap-3 flex-shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-2 rounded-lg transition-colors text-sm"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="booking-form"
                        disabled={loading}
                        onClick={handleSubmit}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2 rounded-lg transition-colors text-sm"
                    >
                        {loading ? 'Creating...' : 'Create Booking'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Shared small components ──────────────────────────────────────────────────

function FormSection({ title, children }) {
    return (
        <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{title}</h3>
            <div className="relative">{children}</div>
        </div>
    );
}

function SearchField({ placeholder, value, onChange, onFocus, loading }) {
    return (
        <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
                type="text"
                placeholder={placeholder}
                value={value}
                onChange={e => onChange(e.target.value)}
                onFocus={onFocus}
                className="w-full border border-gray-300 rounded-lg pl-9 pr-9 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {loading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="animate-spin h-4 w-4 border-2 border-blue-600 rounded-full border-t-transparent" />
                </div>
            )}
        </div>
    );
}

function Dropdown({ children }) {
    return (
        <div className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
            {children}
        </div>
    );
}

function DropdownItem({ onClick, children }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="w-full text-left px-4 py-2.5 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 flex flex-col gap-0.5"
        >
            {children}
        </button>
    );
}

function SelectedTag({ label, sub, onClear }) {
    return (
        <div className="mt-2 flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
            <div>
                <p className="text-sm font-semibold text-blue-900">{label}</p>
                {sub && <p className="text-xs text-blue-600">{sub}</p>}
            </div>
            <button type="button" onClick={onClear} className="text-blue-400 hover:text-blue-700 text-lg leading-none ml-3">✕</button>
        </div>
    );
}
