import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qejlwlshxldaeikgaklv.supabase.co';
const supabaseAnonKey = 'sb_publishable_L0OQQeL9S0mcmObLcJgOBA_4OpXeLWo';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

