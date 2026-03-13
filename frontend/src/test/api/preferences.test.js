import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getMyPreferences, updateMyPreferences } from '../../api/preferences';
import api from '../../api/client';

vi.mock('../../api/client', () => ({
    default: {
        get: vi.fn(),
        put: vi.fn(),
    }
}));

describe('Preferences API', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getMyPreferences', () => {
        it('fetches user preferences successfully', async () => {
            const mockPreferences = {
                theme: 'dark',
                notifications_enabled: true,
                email_frequency: 'daily'
            };

            api.get.mockResolvedValue({ data: mockPreferences });

            const result = await getMyPreferences();

            expect(api.get).toHaveBeenCalledWith('/preferences/me');
            expect(result).toEqual(mockPreferences);
        });

        it('propagates errors when fetching preferences fails', async () => {
            const error = new Error('Network error');
            api.get.mockRejectedValue(error);

            await expect(getMyPreferences()).rejects.toThrow('Network error');
            expect(api.get).toHaveBeenCalledWith('/preferences/me');
        });
    });

    describe('updateMyPreferences', () => {
        it('updates user preferences successfully', async () => {
            const prefsData = {
                theme: 'light',
                notifications_enabled: false
            };
            const mockResponse = {
                ...prefsData,
                updated_at: '2024-01-01T00:00:00Z'
            };

            api.put.mockResolvedValue({ data: mockResponse });

            const result = await updateMyPreferences(prefsData);

            expect(api.put).toHaveBeenCalledWith('/preferences/me', prefsData);
            expect(result).toEqual(mockResponse);
        });

        it('propagates errors when updating preferences fails', async () => {
            const prefsData = { theme: 'dark' };
            const error = new Error('Update failed');
            api.put.mockRejectedValue(error);

            await expect(updateMyPreferences(prefsData)).rejects.toThrow('Update failed');
            expect(api.put).toHaveBeenCalledWith('/preferences/me', prefsData);
        });

        it('handles empty preferences object', async () => {
            const emptyPrefs = {};
            api.put.mockResolvedValue({ data: emptyPrefs });

            const result = await updateMyPreferences(emptyPrefs);

            expect(api.put).toHaveBeenCalledWith('/preferences/me', emptyPrefs);
            expect(result).toEqual(emptyPrefs);
        });
    });
});
