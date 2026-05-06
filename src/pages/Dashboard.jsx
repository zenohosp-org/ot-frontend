import { useEffect, useState } from 'react';
import { getBookings } from '../api/client';
import { Calendar, Clock, CheckCircle, AlertCircle } from 'lucide-react';

import {
    BarChart,
    Bar,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend,
} from 'recharts';

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

    const chartData = [
        { status: 'Confirmed', value: stats.confirmed, fill: '#0f172a' },
        { status: 'In Progress', value: stats.inProgress, fill: '#f59e0b' },
        { status: 'Completed', value: stats.completed, fill: '#94a3b8' },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-sm font-medium text-slate-500">Loading...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-50 gap-6 p-6">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                        OT Dashboard
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Here's your operating theater overview for today.
                    </p>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <StatCard
                    icon={<Calendar className="w-8 h-8 mb-2" />}
                    label="Today's Bookings"
                    sublabel="Scheduled for today"
                    value={stats.total}
                />
                <StatCard
                    icon={<CheckCircle className="w-8 h-8 mb-2" />}
                    label="Confirmed"
                    sublabel="Ready to proceed"
                    value={stats.confirmed}
                />
                <StatCard
                    icon={<Clock className="w-8 h-8 mb-2" />}
                    label="In Progress"
                    sublabel="Currently active"
                    value={stats.inProgress}
                />
                <StatCard
                    icon={<AlertCircle className="w-8 h-8 mb-2" />}
                    label="Completed"
                    sublabel="Finished today"
                    value={stats.completed}
                />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Bar Chart */}
                <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-900 mb-4">
                        Booking Status Overview
                    </h3>

                    <div style={{ width: '100%', height: 250 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                                <XAxis dataKey="status" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                                <Tooltip />
                                <CartesianGrid stroke="rgba(148,163,184,0.1)" />
                                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={index} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Pie Chart */}
                <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-900 mb-4">
                        Distribution
                    </h3>

                    <div style={{ width: '100%', height: 250 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    dataKey="value"
                                    nameKey="status"
                                    innerRadius={60}
                                    outerRadius={90}
                                    paddingAngle={4}
                                    minAngle={5}
                                >
                                    {chartData.map((entry, index) => (
                                        <Cell key={index} fill={entry.fill} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend
                                    iconType="circle"
                                    iconSize={8}
                                    wrapperStyle={{ fontSize: '12px' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>
        </div>
    );
}

function StatCard({ icon, label, sublabel, value }) {
    return (
        <div className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col gap-1 shadow-sm">
            {icon}
            <p className="text-base font-bold text-slate-900 mt-1">{label}</p>
            <p className="text-sm text-slate-500 mt-0.5">{sublabel}</p>
            <p className="text-4xl font-bold text-slate-900 mt-3">{value}</p>
        </div>
    );
}