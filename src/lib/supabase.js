import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key || key === 'your_anon_key_here') {
  throw new Error(
    'Supabase non configuré.\n' +
    'Ouvrez le fichier .env et remplacez your_anon_key_here par votre clé anon Supabase.'
  )
}

export const supabase = createClient(url, key)
