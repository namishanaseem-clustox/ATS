import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';

// 1. Define mocked axios instance using vi.hoisted
const { vi_mockAxios } = vi.hoisted(() => {
    const mock = {
        create: vi.fn(),
        interceptors: {
            request: { use: vi.fn(), eject: vi.fn() },
            response: { use: vi.fn(), eject: vi.fn() },
        },
        defaults: { headers: { common: {} } },
    };
    mock.create.mockReturnValue(mock);
    return { vi_mockAxios: mock };
});

// 2. Mock axios
vi.mock('axios', () => ({
    default: vi_mockAxios
}));

describe('API Client unit tests', () => {
    let client;

    beforeEach(async () => {
        vi.resetModules();
        vi.clearAllMocks();
        localStorage.clear();
        // Import the client module dynamically to ensure it uses the mock and fresh state
        const mod = await import('../api/client');
        client = mod.default;
    });

    it('adds Authorization header if token exists', () => {
        // Find the request interceptor registration
        const requestInterceptor = vi_mockAxios.interceptors.request.use.mock.calls[0][0];

        localStorage.setItem('token', 'test-token');
        const config = { headers: {} };
        const result = requestInterceptor(config);

        expect(result.headers['Authorization']).toBe('Bearer test-token');
    });

    it('does not add Authorization header if no token exists', () => {
        const requestInterceptor = vi_mockAxios.interceptors.request.use.mock.calls[0][0];
        const config = { headers: {} };
        const result = requestInterceptor(config);
        expect(result.headers['Authorization']).toBeUndefined();
    });

    it('returns error in request interceptor', async () => {
        const errorInterceptor = vi_mockAxios.interceptors.request.use.mock.calls[0][1];
        const error = new Error('Request Error');
        await expect(errorInterceptor(error)).rejects.toThrow('Request Error');
    });

    it('handles 401 response and clears token', async () => {
        const responseErrorInterceptor = vi_mockAxios.interceptors.response.use.mock.calls[0][1];

        localStorage.setItem('token', 'expired-token');
        const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

        const error = {
            response: { status: 401 }
        };

        await expect(responseErrorInterceptor(error)).rejects.toEqual(error);

        expect(localStorage.getItem('token')).toBeNull();
        expect(dispatchSpy).toHaveBeenCalledWith(expect.any(CustomEvent));
        expect(dispatchSpy.mock.calls[0][0].type).toBe('session:expired');
    });

    it('returns response in response interceptor', () => {
        const responseInterceptor = vi_mockAxios.interceptors.response.use.mock.calls[0][0];
        const response = { data: 'test' };
        expect(responseInterceptor(response)).toBe(response);
    });

    it('ignores 401 if no token was present', async () => {
        const responseErrorInterceptor = vi_mockAxios.interceptors.response.use.mock.calls[0][1];
        const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

        const error = {
            response: { status: 401 }
        };

        await expect(responseErrorInterceptor(error)).rejects.toEqual(error);
        expect(dispatchSpy).not.toHaveBeenCalled();
    });

    it('ignores non-401 error or error without response', async () => {
        const responseErrorInterceptor = vi_mockAxios.interceptors.response.use.mock.calls[0][1];

        // No response object
        const errorNoResp = new Error('Network Error');
        await expect(responseErrorInterceptor(errorNoResp)).rejects.toThrow('Network Error');

        // Non-401 status
        const error500 = { response: { status: 500 } };
        await expect(responseErrorInterceptor(error500)).rejects.toEqual(error500);
    });
});
