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
        <div className="flex h-screen bg-gray-50" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
            {/* Sidebar */}
            <aside className="w-60 bg-white border-r border-gray-100 flex flex-col shadow-sm">
                {/* Logo */}
                <div className="px-5 py-5 border-b border-gray-100">
                    <span className="text-lg font-bold tracking-tight text-gray-900">
                        Zeno<span className="text-gray-900">OT</span>
                    </span>
                </div>

                {/* Nav */}
                <nav className="flex-1 px-3 py-4 space-y-1">
                    <NavItem
                        icon={<BarChart3 size={18} />}
                        label="Dashboard"
                        active={isActive('/dashboard')}
                        onClick={() => navigate('/dashboard')}
                    />
                    <NavItem
                        icon={<Grid3x3 size={18} />}
                        label="Schedules"
                        active={isActive('/schedules')}
                        onClick={() => navigate('/schedules')}
                    />
                    <NavItem
                        icon={<BookOpen size={18} />}
                        label="Cases"
                        active={isActive('/cases')}
                        onClick={() => navigate('/cases')}
                    />
                </nav>

                {/* Sign Out */}
                <div className="px-3 py-4 border-t border-gray-100">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium text-rose-500 bg-rose-50 hover:bg-rose-100 transition-colors duration-150"
                    >
                        <LogOut size={16} />
                        <span>Sign Out</span>
                    </button>
                    <p className="text-center text-[10px] text-slate-300 mt-3">
                        © 2026 OT Manager
                    </p>
                </div>
            </aside>

            {/* Main Content */}
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
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150 ${active
                    ? 'bg-gray-900 text-white'
                    : 'text-slate-500 hover:bg-gray-100 hover:text-gray-900'
                }`}
        >
            {icon}
            <span>{label}</span>
        </button>
    );
}
