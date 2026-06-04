import { createClient } from '@supabase/supabase-js'

export const supabaseUrl = 'https://dcngchlskwahmmhfeoqr.supabase.co'
export const supabaseKey = 'sb_publishable_tApbXE6XEMrLR7mMtBnVQA_1jA-JxuM'

export const supabase = createClient(supabaseUrl, supabaseKey)