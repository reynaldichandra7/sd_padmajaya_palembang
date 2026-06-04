// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Diperbarui dengan menambahkan Access-Control-Allow-Methods agar browser memberikan izin penuh
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

// Menggunakan sintaks modern native Deno.serve (Mencegah Crash pada Runtime Supabase)
Deno.serve(async (req) => {
  // Handle CORS preflight request dari browser
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { email, password, full_name, username, role } = await req.json()

    // 1. Daftarkan Akun ke Supabase Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: { full_name, username }
    })

    if (authError) throw authError

    // 2. Gunakan UPSERT (bukan update) agar jika data belum ada, dia akan otomatis membuat baris baru.
    // Kita sertakan juga kolom email-nya agar sinkron dengan tabel di UI.
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({ 
        id: authUser.user.id, 
        full_name: full_name, 
        username: username, 
        email: email,
        roles: [role] 
      })

    if (profileError) throw profileError

    return new Response(JSON.stringify({ success: true, user: authUser.user }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})