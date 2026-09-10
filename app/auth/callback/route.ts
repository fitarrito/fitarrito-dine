import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@lib/supabase-server';
import { upsertUserProfile } from '@lib/user-profile';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);

  const code = searchParams.get('code');
  const next = searchParams.get('next');
  const safeNext =
    next && next.startsWith('/') && !next.startsWith('//') ? next : null;

  const appendQuery = (path: string, key: string, value: string) =>
    `${path}${path.includes('?') ? '&' : '?'}${key}=${value}`;

  if (code) {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error,
    } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && user) {
      await upsertUserProfile(supabase, user);

      return NextResponse.redirect(
        `${origin}${safeNext ?? '/subscription?step=menu&plan=2-meals'}`
      );
    }
  }

  const errorPath = appendQuery(
    safeNext ?? '/subscription?step=account',
    'error',
    'auth'
  );

  return NextResponse.redirect(`${origin}${errorPath}`);
}