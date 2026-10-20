// ============================================================
// js/supabase.js - Conexão com o Banco de Dados na Nuvem
// ============================================================

// Substitua a linha do import no js/supabase.js por esta:
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = 'https://fghcoxferprkzsemicnw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnaGNveGZlcnBya3pzZW1pY253Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI1MDg2ODYsImV4cCI6MjEwODA4NDY4Nn0.o2LRgl3s3rL_tYsLE8Ujk_GLWVQj0fPwZv-bgtEP7i4';

export const supabase = createClient(supabaseUrl, supabaseKey);