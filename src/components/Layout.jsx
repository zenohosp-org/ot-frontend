import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, BarChart3, Grid3x3, BookOpen, Scissors } from 'lucide-react';

export default function Layout() {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const isActive = (path) => location.pathname === path;

    const handleLogout = async () => {
        await logout();
    };

    return (
        <div className="flex h-screen bg-slate-50">
            {/* Sidebar */}
            <aside className="w-56 shrink-0 bg-white border-r border-slate-200 flex flex-col h-full">
                {/* Logo */}
                <div className="flex items-center justify-center gap-2.5 px-4 py-5 border-b border-slate-200">
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-md bg-slate-900 flex items-center justify-center shrink-0">
                            <Scissors className="w-3.5 h-3.5 text-white" />
                        </div>
                        <span className="text-lg font-bold text-slate-900 tracking-tight">
                            Zeno<span className="text-slate-900">OT</span>
                        </span>
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex flex-col gap-0.5 py-3 flex-1">
                    <p className="px-4 pt-5 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Main</p>
                    <NavItem
                        icon={<BarChart3 className="w-4 h-4 shrink-0" />}
                        label="Dashboard"
                        active={isActive('/dashboard')}
                        onClick={() => navigate('/dashboard')}
                    />
                    <NavItem
                        icon={<Grid3x3 className="w-4 h-4 shrink-0" />}
                        label="Schedules"
                        active={isActive('/schedules')}
                        onClick={() => navigate('/schedules')}
                    />
                    <NavItem
                        icon={<BookOpen className="w-4 h-4 shrink-0" />}
                        label="Cases"
                        active={isActive('/cases')}
                        onClick={() => navigate('/cases')}
                    />
                </nav>

                {/* Sign Out */}
                <div className="mt-auto border-t border-slate-200 p-3 space-y-1">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                        <LogOut className="w-4 h-4 shrink-0" />
                        <span>Sign Out</span>
                    </button>
                    <p className="text-[10px] text-slate-400 text-center pb-2">© 2026 OT Manager</p>
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
            className={active
                ? 'flex items-center gap-2.5 px-3 py-2 text-sm font-semibold bg-slate-100 text-slate-900 rounded-lg mx-2'
                : 'flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 rounded-lg mx-2 transition-colors'
            }
        >
            {icon}
            <span>{label}</span>
        </button>
    );
}
