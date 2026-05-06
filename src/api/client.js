import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    timeout: 8000,
});

let redirectLockKey = null;

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

const shouldRetry = (error, config) => {
    const retryCount = config.__retryCount || 0;
    if (retryCount >= MAX_RETRIES) return false;

    const status = error.response?.status;
    const isRetryableStatus = [502, 503, 504].includes(status);
    const isNetworkError = !error.response || error.code === 'ECONNABORTED';

    return isRetryableStatus || isNetworkError;
};

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const config = error.config;

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
            return Promise.reject(error);
        }

        if (shouldRetry(error, config)) {
            config.__retryCount = (config.__retryCount || 0) + 1;
            const delay = RETRY_DELAY * Math.pow(2, config.__retryCount - 1);

            await new Promise(resolve => setTimeout(resolve, delay));
            return api(config);
        }

        return Promise.reject(error);
    }
);

export const getMyProfile = () => api.get('/api/user/me');
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
export const getOtAdmissions = () => api.get('/api/proxy/hms/ot-admissions');
export const getHmsPatients = (search) => api.get('/api/proxy/hms/patients', { params: { search } });
export const getDirectorySurgeons = (search) => api.get('/api/proxy/directory/surgeons', { params: { search } });
export const getInventoryKits = () => api.get('/api/proxy/inventory/kits');

export default api;
