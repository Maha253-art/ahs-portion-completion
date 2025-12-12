import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard/facilitator';

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Check if user exists in our users table
      const { data: existingUser } = await supabase
        .from('users')
        .select('role')
        .eq('id', data.user.id)
        .single();

      // If user doesn't exist in users table, create them
      if (!existingUser) {
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            email: data.user.email!,
            first_name: data.user.user_metadata?.full_name?.split(' ')[0] || data.user.user_metadata?.name?.split(' ')[0] || 'User',
            last_name: data.user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || data.user.user_metadata?.name?.split(' ').slice(1).join(' ') || '',
            role: 'facilitator',
          });

        if (insertError) {
          console.error('Error creating user profile:', insertError);
        }

        return NextResponse.redirect(`${origin}/dashboard/facilitator`);
      }

      // Redirect based on role
      if (existingUser?.role === 'super_admin') {
        return NextResponse.redirect(`${origin}/dashboard/admin`);
      } else if (existingUser?.role === 'student') {
        return NextResponse.redirect(`${origin}/dashboard/student`);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/login?error=Could not authenticate`);
}
