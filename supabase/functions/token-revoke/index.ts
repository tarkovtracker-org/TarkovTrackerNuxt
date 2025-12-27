import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from '@supabase/supabase-js';
import { corsHeadersFor } from '../_shared/cors.ts';

const supabaseUrl =
  Deno.env.get('SB_URL') ||
  Deno.env.get('SUPABASE_URL') ||
  (() => {
    throw new Error('Missing SB_URL/SUPABASE_URL env');
  })();
const supabaseServiceKey =
  Deno.env.get('SB_SERVICE_ROLE_KEY') ||
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ||
  (() => {
    throw new Error('Missing SB_SERVICE_ROLE_KEY/SUPABASE_SERVICE_ROLE_KEY env');
  })();
// UUID format check (case-insensitive) for token identifiers.
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const jsonResponse = (body: { success: boolean; message: string }, status: number, req: Request) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeadersFor(req), 'Content-Type': 'application/json' },
  });

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return jsonResponse({ success: true, message: 'ok' }, 200, req);
  }

  try {
    // Only allow DELETE method
    if (req.method !== 'DELETE') {
      return jsonResponse({ success: false, message: 'Method not allowed' }, 405, req);
    }

    // Get authorization header to verify user identity
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return jsonResponse(
        { success: false, message: 'Missing or invalid authorization header' },
        401,
        req
      );
    }

    // Get token from request body
    let tokenId: string | undefined;
    try {
      ({ tokenId } = (await req.json()) as { tokenId?: string });
    } catch {
      return jsonResponse({ success: false, message: 'Malformed JSON' }, 400, req);
    }
    if (!tokenId) {
      return jsonResponse({ success: false, message: 'Token ID is required' }, 400, req);
    }
    // Validate UUID format
    if (!UUID_REGEX.test(tokenId)) {
      return jsonResponse({ success: false, message: 'Invalid token ID format' }, 400, req);
    }

    // Create Supabase client with service role key for admin operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user JWT token
    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return jsonResponse({ success: false, message: 'Invalid authentication token' }, 401, req);
    }

    // Delete the token (only if it belongs to the authenticated user)
    const { error: deleteError } = await supabase
      .from('api_tokens')
      .delete()
      .eq('token_id', tokenId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Token deletion failed:', deleteError);
      return jsonResponse({ success: false, message: 'Failed to revoke token' }, 500, req);
    }

    return jsonResponse({ success: true, message: 'Token revoked successfully' }, 200, req);
  } catch (error) {
    console.error('Token revoke error:', error);
    return jsonResponse({ success: false, message: 'Internal server error' }, 500, req);
  }
});
