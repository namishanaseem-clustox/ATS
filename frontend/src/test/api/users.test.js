import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as usersApi from '../../api/users';
import client from '../../api/client';

vi.mock('../../api/client');

describe('users API', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getUsers', () => {
        it('fetches all users successfully', async () => {
            const mockUsers = [{ id: 'u1', email: 'test@example.com' }];
            client.get.mockResolvedValue({ data: mockUsers });

            const result = await usersApi.getUsers();

            expect(client.get).toHaveBeenCalledWith('/users');
            expect(result).toEqual(mockUsers);
        });

        it('propagates errors from API', async () => {
            const error = new Error('Network error');
            client.get.mockRejectedValue(error);

            await expect(usersApi.getUsers()).rejects.toThrow('Network error');
        });
    });

    describe('createUser', () => {
        it('creates a user successfully', async () => {
            const userData = { email: 'new@example.com', role: 'hr' };
            const mockResponse = { id: 'u2', ...userData };
            client.post.mockResolvedValue({ data: mockResponse });

            const result = await usersApi.createUser(userData);

            expect(client.post).toHaveBeenCalledWith('/users', userData);
            expect(result).toEqual(mockResponse);
        });

        it('handles creation errors', async () => {
            const error = new Error('User exists');
            client.post.mockRejectedValue(error);

            await expect(usersApi.createUser({})).rejects.toThrow('User exists');
        });
    });

    describe('updateUser', () => {
        it('updates a user successfully', async () => {
            const userId = 'u1';
            const userData = { full_name: 'Updated Name' };
            const mockResponse = { id: userId, ...userData };
            client.put.mockResolvedValue({ data: mockResponse });

            const result = await usersApi.updateUser(userId, userData);

            expect(client.put).toHaveBeenCalledWith(`/users/${userId}`, userData);
            expect(result).toEqual(mockResponse);
        });

        it('handles update errors', async () => {
            const error = new Error('Update failed');
            client.put.mockRejectedValue(error);

            await expect(usersApi.updateUser('u1', {})).rejects.toThrow('Update failed');
        });
    });

    describe('deleteUser', () => {
        it('deletes a user successfully', async () => {
            const userId = 'u1';
            client.delete.mockResolvedValue({});

            await usersApi.deleteUser(userId);

            expect(client.delete).toHaveBeenCalledWith(`/users/${userId}`);
        });

        it('handles deletion errors', async () => {
            const error = new Error('Delete failed');
            client.delete.mockRejectedValue(error);

            await expect(usersApi.deleteUser('u1')).rejects.toThrow('Delete failed');
        });
    });

    describe('inviteUser', () => {
        it('invites a user successfully', async () => {
            const inviteData = { email: 'invite@example.com', role: 'interviewer' };
            const mockResponse = { id: 'inv1', ...inviteData };
            client.post.mockResolvedValue({ data: mockResponse });

            const result = await usersApi.inviteUser(inviteData);

            expect(client.post).toHaveBeenCalledWith('/invitations', inviteData);
            expect(result).toEqual(mockResponse);
        });

        it('handles invitation errors', async () => {
            const error = new Error('Invite failed');
            client.post.mockRejectedValue(error);

            await expect(usersApi.inviteUser({})).rejects.toThrow('Invite failed');
        });
    });

    describe('validateInvite', () => {
        it('validates an invitation token successfully', async () => {
            const token = 'abc123';
            const mockResponse = { email: 'invite@example.com', role: 'hr' };
            client.get.mockResolvedValue({ data: mockResponse });

            const result = await usersApi.validateInvite(token);

            expect(client.get).toHaveBeenCalledWith(`/invitations/${token}`);
            expect(result).toEqual(mockResponse);
        });

        it('handles invalid token errors', async () => {
            const error = new Error('Invalid token');
            client.get.mockRejectedValue(error);

            await expect(usersApi.validateInvite('bad-token')).rejects.toThrow('Invalid token');
        });
    });

    describe('registerInvitedUser', () => {
        it('registers an invited user successfully', async () => {
            const registerData = { token: 'abc123', full_name: 'John Doe', password: 'secret' };
            const mockResponse = { id: 'u3', email: 'john@example.com' };
            client.post.mockResolvedValue({ data: mockResponse });

            const result = await usersApi.registerInvitedUser(registerData);

            expect(client.post).toHaveBeenCalledWith('/register-invited', registerData);
            expect(result).toEqual(mockResponse);
        });

        it('handles registration errors', async () => {
            const error = new Error('Registration failed');
            client.post.mockRejectedValue(error);

            await expect(usersApi.registerInvitedUser({})).rejects.toThrow('Registration failed');
        });
    });

    describe('uploadAvatar', () => {
        it('uploads avatar successfully', async () => {
            const userId = 'u1';
            const file = new File(['dummy'], 'avatar.png', { type: 'image/png' });
            const mockResponse = { avatar_url: 'http://example.com/avatar.png' };
            client.post.mockResolvedValue({ data: mockResponse });

            const result = await usersApi.uploadAvatar(userId, file);

            expect(client.post).toHaveBeenCalledWith(
                `/users/${userId}/avatar`,
                expect.any(FormData),
                { headers: { 'Content-Type': 'multipart/form-data' } }
            );

            const formData = client.post.mock.calls[0][1];
            expect(formData).toBeInstanceOf(FormData);
            expect(formData.get('file')).toBe(file);
            expect(result).toEqual(mockResponse);
        });

        it('handles upload errors', async () => {
            const error = new Error('Upload failed');
            client.post.mockRejectedValue(error);

            const file = new File(['dummy'], 'avatar.png', { type: 'image/png' });
            await expect(usersApi.uploadAvatar('u1', file)).rejects.toThrow('Upload failed');
        });
    });

    describe('removeAvatar', () => {
        it('removes avatar successfully', async () => {
            const userId = 'u1';
            const mockResponse = { message: 'Avatar removed' };
            client.delete.mockResolvedValue({ data: mockResponse });

            const result = await usersApi.removeAvatar(userId);

            expect(client.delete).toHaveBeenCalledWith(`/users/${userId}/avatar`);
            expect(result).toEqual(mockResponse);
        });

        it('handles removal errors', async () => {
            const error = new Error('Removal failed');
            client.delete.mockRejectedValue(error);

            await expect(usersApi.removeAvatar('u1')).rejects.toThrow('Removal failed');
        });
    });
});
