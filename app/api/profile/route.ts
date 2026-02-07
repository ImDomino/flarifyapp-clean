import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
// PATCH /api/profile
// Update user profile fields
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, username, display_name, avatar_url, bio } = body;

    if (!user_id) {
      return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });
    }

    const supabase = createClient();

    // Build update object with only provided fields
    const updates: Record<string, any> = {};
    if (username !== undefined && username !== '') updates.username = username;
    if (display_name !== undefined) updates.display_name = display_name;
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;
    if (bio !== undefined) updates.bio = bio;
    updates.updated_at = new Date().toISOString();

    if (Object.keys(updates).length <= 1) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    console.log('📝 Profile update request:', { user_id, updates: Object.keys(updates) });

    // Validate username if provided
    if (updates.username) {
      const uname = updates.username;
      if (uname.length < 2 || uname.length > 30) {
        return NextResponse.json(
          { error: 'Username must be 2-30 characters' },
          { status: 400 }
        );
      }
      if (!/^[a-zA-Z0-9_]+$/.test(uname)) {
        return NextResponse.json(
          { error: 'Username can only contain letters, numbers, and underscores' },
          { status: 400 }
        );
      }

      // Check uniqueness (exclude current user)
      const { data: existing, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', uname)
        .neq('id', user_id)
        .maybeSingle();

      if (checkError) {
        console.error('❌ Username check error:', checkError);
      }

      if (existing) {
        return NextResponse.json(
          { error: 'Username already taken' },
          { status: 409 }
        );
      }
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user_id)
      .select()
      .single();

    if (error) {
      console.error('❌ Supabase update error:', error);
      throw error;
    }

    console.log('✅ Profile updated:', data?.id, 'username:', data?.username);

    return NextResponse.json({ success: true, profile: data });
  } catch (error: any) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to update profile' },
      { status: 500 }
    );
  }
}

// GET /api/profile?user_id=X
// Get profile data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });
    }

    const supabase = createClient();

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return NextResponse.json({ profile: null, error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json({ profile: data });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}
