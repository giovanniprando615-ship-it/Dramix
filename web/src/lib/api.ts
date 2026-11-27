import { DramixService } from '@/services/dramix-service';
import { memoryStorage } from '@/services/local-store';

// Ponto único de acesso às regras. Para usar o Supabase, troque esta linha por um SupabaseService
// com os mesmos métodos.
function browserStorage() {
  try {
    const k = '__dramix_probe__';
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
    return localStorage;
  } catch {
    return memoryStorage(); // navegação privada com storage bloqueado: funciona, mas não persiste
  }
}

export const api = new DramixService(browserStorage());
