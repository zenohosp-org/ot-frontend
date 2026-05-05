import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8085';

const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
});

let redirectLockKey = null;

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401 && error.config.url.includes('/api/user/me')) {
            if (!redirectLockKey) {
                redirectLockKey = `ot_auth_redirect_${Date.now()}`;
                sessionStorage.setItem(redirectLockKey, '1');
                setTimeout(() => {
                    redirectLockKey = null;
                    sessionStorage.removeItem(redirectLockKey);
                }, 10000);
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export const getMyProfile = () => api.get('/api/auth/user/me');
export const logout = () => api.post('/api/auth/logout');

export const createBooking = (data) => api.post('/api/ot/bookings', data);
export const getBookings = (params) => api.get('/api/ot/bookings', { params });
export const getBooking = (id) => api.get(`/api/ot/bookings/${id}`);
export const updateBooking = (id, data) => api.put(`/api/ot/bookings/${id}`, data);
export const confirmBooking = (id) => api.patch(`/api/ot/bookings/${id}/confirm`);
export const startBooking = (id) => api.patch(`/api/ot/bookings/${id}/start`);
export const endBooking = (id) => api.patch(`/api/ot/bookings/${id}/end`);
export const cancelBooking = (id) => api.patch(`/api/ot/bookings/${id}/cancel`);

export const getConsumption = (bookingId) => api.get(`/api/ot/bookings/${bookingId}/consumption`);
export const addConsumptionItem = (bookingId, data) => api.post(`/api/ot/bookings/${bookingId}/consumption`, data);
export const deleteConsumptionItem = (itemId) => api.delete(`/api/ot/consumption/${itemId}`);

export const getHmsRooms = () => api.get('/api/proxy/hms/rooms');
export const getHmsPatients = (search) => api.get('/api/proxy/hms/patients', { params: { search } });
export const getInventoryKits = () => api.get('/api/proxy/inventory/kits');

export default api;
