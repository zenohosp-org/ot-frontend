import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
    const { user } = useAuth();

    useEffect(() => {
        if (user) {
            window.location.href = '/board';
            return;
        }

        if (import.meta.env.VITE_DEV_MOCK_AUTH === 'true') {
            window.location.href = '/board';
            return;
        }
    }, [user]);

    const handleLogin = () => {
        window.location.href = '/oauth2/authorization/directory';
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
                <h1 className="text-3xl font-bold text-center mb-2">OT Management</h1>
                <p className="text-center text-gray-600 mb-8">Operating Theater Room Management System</p>

                <button
                    onClick={handleLogin}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition"
                >
                    Sign in with SSO
                </button>

                <p className="text-center text-sm text-gray-500 mt-4">
                    Redirecting to Directory SSO authentication
                </p>
            </div>
        </div>
    );
}
