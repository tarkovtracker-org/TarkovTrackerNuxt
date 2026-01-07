/**
 * Team Members API Tests
 *
 * Tests the /api/team/members endpoint for:
 * - Team membership validation
 * - Profile data fallback handling
 * - Authentication context and manual validation fallback
 */
import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { H3Event } from 'h3';
const { mockGetQuery, mockGetRequestHeader, mockFetch } = vi.hoisted(() => ({
  mockGetQuery: vi.fn(),
  mockGetRequestHeader: vi.fn(),
  mockFetch: vi.fn(),
}));
const runtimeConfig = {
  supabaseUrl: 'https://test.supabase.co',
  supabaseServiceKey: 'test-service-key',
  supabaseAnonKey: 'test-anon-key',
};
vi.mock('h3', async () => {
  const actual = await vi.importActual('h3');
  return {
    ...actual,
    getQuery: mockGetQuery,
    getRequestHeader: mockGetRequestHeader,
  };
});
global.fetch = mockFetch as typeof fetch;
mockNuxtImport('useRuntimeConfig', () => () => runtimeConfig);
describe('Team Members API', () => {
  let mockEvent: Partial<H3Event>;
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset runtime config to default state
    runtimeConfig.supabaseUrl = 'https://test.supabase.co';
    runtimeConfig.supabaseServiceKey = 'test-service-key';
    runtimeConfig.supabaseAnonKey = 'test-anon-key';
    mockEvent = {
      context: {
        auth: {
          user: {
            id: 'user-123',
          },
        },
      },
    };
  });
  describe('Configuration validation', () => {
    it('should throw error when supabaseUrl is missing', async () => {
      runtimeConfig.supabaseUrl = '';
      mockGetQuery.mockReturnValue({ teamId: 'team-456' });
      const { default: handler } = await import('../members');
      await expect(handler(mockEvent as H3Event)).rejects.toThrow('Missing required environment variables');
    });
    it('should throw error when supabaseServiceKey is missing', async () => {
      runtimeConfig.supabaseServiceKey = '';
      mockGetQuery.mockReturnValue({ teamId: 'team-456' });
      const { default: handler } = await import('../members');
      await expect(handler(mockEvent as H3Event)).rejects.toThrow('Missing required environment variables');
    });
    it('should throw error when supabaseAnonKey is missing', async () => {
      runtimeConfig.supabaseAnonKey = '';
      mockGetQuery.mockReturnValue({ teamId: 'team-456' });
      const { default: handler } = await import('../members');
      await expect(handler(mockEvent as H3Event)).rejects.toThrow('Missing required environment variables');
    });
  });
  describe('Team membership validation', () => {
    it('should require teamId query parameter', async () => {
      mockGetQuery.mockReturnValue({});
      const { default: handler } = await import('../members');
      await expect(handler(mockEvent as H3Event)).rejects.toThrow('teamId is required');
    });
    it('should require user to be team member', async () => {
      mockGetQuery.mockReturnValue({ teamId: 'team-456' });
      // Mock empty membership check
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });
      const { default: handler } = await import('../members');
      await expect(handler(mockEvent as H3Event)).rejects.toThrow('Not a team member');
    });
    it('should handle failed membership check', async () => {
      mockGetQuery.mockReturnValue({ teamId: 'team-456' });
      // Mock failed membership check
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });
      const { default: handler } = await import('../members');
      await expect(handler(mockEvent as H3Event)).rejects.toThrow('Failed membership check');
    });
    it('should handle failed members fetch', async () => {
      mockGetQuery.mockReturnValue({ teamId: 'team-456' });
      mockFetch
        // Mock successful membership check
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ user_id: 'user-123' }],
        })
        // Mock failed fetch all members
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
        });
      const { default: handler } = await import('../members');
      await expect(handler(mockEvent as H3Event)).rejects.toThrow('Failed to load members');
    });
    it('should return members when user is valid team member', async () => {
      mockGetQuery.mockReturnValue({ teamId: 'team-456' });
      // Mock successful membership check
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ user_id: 'user-123' }],
        })
        // Mock fetch all members
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ user_id: 'user-123' }, { user_id: 'user-789' }],
        })
        // Mock profiles fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            {
              user_id: 'user-123',
              current_game_mode: 'pvp',
              pvp_display_name: 'Player1',
              pvp_level: 15,
              pvp_tasks_completed: 10,
            },
            {
              user_id: 'user-789',
              current_game_mode: 'pve',
              pve_display_name: 'Player2',
              pve_level: 20,
              pve_tasks_completed: 15,
            },
          ],
        });
      const { default: handler } = await import('../members');
      const result = await handler(mockEvent as H3Event);
      expect(result).toEqual({
        members: ['user-123', 'user-789'],
        profiles: {
          'user-123': {
            displayName: 'Player1',
            level: 15,
            tasksCompleted: 10,
          },
          'user-789': {
            displayName: 'Player2',
            level: 20,
            tasksCompleted: 15,
          },
        },
      });
    });
  });
  describe('Profile fallback handling', () => {
    it('should fall back to individual fetches if bulk fetch fails', async () => {
      mockGetQuery.mockReturnValue({ teamId: 'team-456' });
      mockFetch
        // Mock successful membership check
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ user_id: 'user-123' }],
        })
        // Mock fetch all members
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ user_id: 'user-123' }],
        })
        // Mock profiles bulk fetch FAILS
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: async () => 'Internal server error',
        })
        // Mock individual profile fetch succeeds
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            {
              user_id: 'user-123',
              current_game_mode: 'pvp',
              pvp_display_name: 'Player1',
              pvp_level: 10,
              pvp_tasks_completed: 5,
            },
          ],
        });
      const { default: handler } = await import('../members');
      const result = await handler(mockEvent as H3Event);
      expect(result.profiles['user-123']).toEqual({
        displayName: 'Player1',
        level: 10,
        tasksCompleted: 5,
      });
    });
  });
  describe('Authentication fallback', () => {
    it('should validate auth token when context.auth is missing', async () => {
      mockEvent.context = {}; // No auth context
      mockGetQuery.mockReturnValue({ teamId: 'team-456' });
      mockGetRequestHeader.mockImplementation((_, header: string) => {
        if (header === 'authorization') return 'Bearer valid-token';
        return undefined;
      });
      // Mock auth validation
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 'user-123' }),
        })
        // Mock membership check
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ user_id: 'user-123' }],
        })
        // Mock fetch all members
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ user_id: 'user-123' }],
        })
        // Mock profiles fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        });
      const { default: handler } = await import('../members');
      const result = await handler(mockEvent as H3Event);
      expect(result.members).toEqual(['user-123']);
    });
    it('should reject requests without auth token or context', async () => {
      mockEvent.context = {}; // No auth context
      mockGetQuery.mockReturnValue({ teamId: 'team-456' });
      mockGetRequestHeader.mockReturnValue(undefined); // No auth header
      const { default: handler } = await import('../members');
      await expect(handler(mockEvent as H3Event)).rejects.toThrow('Missing auth token');
    });
    it('should reject requests with invalid auth token format', async () => {
      mockEvent.context = {}; // No auth context
      mockGetQuery.mockReturnValue({ teamId: 'team-456' });
      mockGetRequestHeader.mockImplementation((_, header: string) => {
        if (header === 'authorization') return 'InvalidFormat token123';
        return undefined;
      });
      const { default: handler } = await import('../members');
      await expect(handler(mockEvent as H3Event)).rejects.toThrow('Missing auth token');
    });
    it('should reject requests when token validation fails', async () => {
      mockEvent.context = {}; // No auth context
      mockGetQuery.mockReturnValue({ teamId: 'team-456' });
      mockGetRequestHeader.mockImplementation((_, header: string) => {
        if (header === 'authorization') return 'Bearer invalid-token';
        return undefined;
      });
      // Mock auth validation failure
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });
      const { default: handler } = await import('../members');
      await expect(handler(mockEvent as H3Event)).rejects.toThrow('Invalid token');
    });
  });
});
