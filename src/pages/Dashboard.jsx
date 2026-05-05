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

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard
                    icon={<Calendar className="text-blue-600" />}
                    label="Today's Bookings"
                    value={stats.total}
                />
                <StatCard
                    icon={<CheckCircle className="text-green-600" />}
                    label="Confirmed"
                    value={stats.confirmed}
                />
                <StatCard
                    icon={<Clock className="text-orange-600" />}
                    label="In Progress"
                    value={stats.inProgress}
                />
                <StatCard
                    icon={<AlertCircle className="text-gray-600" />}
                    label="Completed"
                    value={stats.completed}
                />
            </div>
        </div>
    );
}

function StatCard({ icon, label, value }) {
    return (
        <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-gray-600 text-sm">{label}</p>
                    <p className="text-3xl font-bold mt-2">{value}</p>
                </div>
                <div className="text-4xl">{icon}</div>
            </div>
        </div>
    );
}
