import { useEffect, useState } from 'react';
import { getBookings } from '../api/client';
import { Calendar, Clock, CheckCircle, AlertCircle } from 'lucide-react';

export default function Dashboard() {
    const [stats, setStats] = useState({
        total: 0,
        confirmed: 0,
        inProgress: 0,
        completed: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const today = new Date().toISOString().split('T')[0];
                const res = await getBookings({ date: today });
                const bookings = res.data;

                setStats({
                    total: bookings.length,
                    confirmed: bookings.filter(b => b.status === 'CONFIRMED').length,
                    inProgress: bookings.filter(b => b.status === 'IN_PROGRESS').length,
                    completed: bookings.filter(b => b.status === 'COMPLETED').length,
                });
            } catch (error) {
                console.error('Error fetching stats:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) return (
        <div className="p-8 bg-gray-50 min-h-screen flex items-center justify-center">
            <p className="text-sm text-slate-400 font-medium">Loading...</p>
        </div>
    );

    return (
        <div className="p-8 bg-gray-50 min-h-screen" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
            {/* Page Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                    OT Dashboard
                </h1>
                <p className="text-sm mt-1 text-slate-500">
                    Here's your operating theater overview for today.
                </p>
            </div>

            {/* Stat Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <StatCard
                    icon={<Calendar size={18} />}
                    iconBg="bg-gray-100"
                    iconColor="text-gray-700"
                    label="Today's Bookings"
                    sublabel="Scheduled for today"
                    value={stats.total}
                />
                <StatCard
                    icon={<CheckCircle size={18} />}
                    iconBg="bg-emerald-50"
                    iconColor="text-emerald-500"
                    label="Confirmed"
                    sublabel="Ready to proceed"
                    value={stats.confirmed}
                />
                <StatCard
                    icon={<Clock size={18} />}
                    iconBg="bg-amber-50"
                    iconColor="text-amber-500"
                    label="In Progress"
                    sublabel="Currently active"
                    value={stats.inProgress}
                />
                <StatCard
                    icon={<AlertCircle size={18} />}
                    iconBg="bg-slate-100"
                    iconColor="text-slate-500"
                    label="Completed"
                    sublabel="Finished today"
                    value={stats.completed}
                />
            </div>
        </div>
    );
}

function StatCard({ icon, iconBg, iconColor, label, sublabel, value }) {
    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow duration-200">
            {/* Icon badge */}
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${iconBg} ${iconColor}`}>
                {icon}
            </div>

            {/* Label */}
            <p className="text-sm font-bold text-gray-900 leading-snug">{label}</p>

            {/* Sublabel */}
            <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{sublabel}</p>

            {/* Value */}
            <p className="text-2xl font-bold text-gray-900 mt-3">{value}</p>
        </div>
    );
}
