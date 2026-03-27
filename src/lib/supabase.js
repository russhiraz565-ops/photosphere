import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bcyjuwyyagsunttqhmcr.supabase.co'
const supabaseAnonKey = 'sb_publishable_TMehP3Tfb0pWmAv0vGTdPg_V_zrhTnY'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
