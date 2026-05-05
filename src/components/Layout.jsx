import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, BarChart3, Grid3x3, BookOpen } from 'lucide-react';

export default function Layout() {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const isActive = (path) => location.pathname === path;

    const handleLogout = async () => {
        await logout();
    };

    return (
        <div className="flex h-screen bg-gray-50">
            <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
                <div className="p-6 border-b border-gray-200">
                    <h1 className="text-xl font-bold text-gray-900">OT Manager</h1>
                    <p className="text-sm text-gray-500 mt-1">Operating Theater</p>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    <NavItem
                        icon={<BarChart3 size={20} />}
                        label="Dashboard"
                        href="/dashboard"
                        active={isActive('/dashboard')}
                        onClick={() => navigate('/dashboard')}
                    />
                    <NavItem
                        icon={<Grid3x3 size={20} />}
                        label="OT Board"
                        href="/board"
                        active={isActive('/board')}
                        onClick={() => navigate('/board')}
                    />
                    <NavItem
                        icon={<BookOpen size={20} />}
                        label="Bookings"
                        href="/bookings"
                        active={isActive('/bookings')}
                        onClick={() => navigate('/bookings')}
                    />
                </nav>

                <div className="p-4 border-t border-gray-200">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                    >
                        <LogOut size={20} />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            <main className="flex-1 overflow-auto">
                <Outlet />
            </main>
        </div>
    );
}

function NavItem({ icon, label, active, onClick }) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                active
                    ? 'bg-blue-100 text-blue-700 font-semibold'
                    : 'text-gray-700 hover:bg-gray-100'
            }`}
        >
            {icon}
            <span>{label}</span>
        </button>
    );
}
