import { NextResponse } from 'next/server';
import { supabase } from '@lib/supabase';  // ✅ reuse

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('MenuItem')
      .select('*');

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch menu' },
      { status: 500 }
    );
  }
}