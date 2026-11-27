import { createSeed } from '@/domain/seed';
import type { Tables } from '@/domain/types';

// Armazenamento local em tabelas (desenvolvimento e demonstração).
// Em produção, o Supabase substitui esta classe; veja supabase/migrations.

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function memoryStorage(): KeyValueStorage {
  const map = new Map<string, string>();
  return {
    getItem: k => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: k => void map.delete(k)
  };
}

const DB_KEY = 'dramix_web_db_v1';

// crypto.randomUUID só existe em contexto seguro (https/localhost); fora dele, usa getRandomValues
export function uid(): string {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  const b = new Uint8Array(16);
  c.getRandomValues(b);
  return Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
}

type Row = { id: string };

export class LocalStore {
  private data: Tables;

  constructor(private storage: KeyValueStorage) {
    this.data = this.load();
  }

  private load(): Tables {
    const seed = createSeed();
    const raw = this.storage.getItem(DB_KEY);
    if (!raw) return seed;
    try {
      const parsed = JSON.parse(raw) as Partial<Tables>;
      // Tabelas novas entram com o valor inicial, sem apagar o que já existe
      return { ...seed, ...parsed } as Tables;
    } catch {
      return seed;
    }
  }

  private save() {
    try {
      this.storage.setItem(DB_KEY, JSON.stringify(this.data));
    } catch (err) {
      // localStorage cheio ou bloqueado (aba anônima): mantém em memória
      console.warn('DRAMIX: não foi possível salvar os dados localmente.', err);
    }
  }

  reset() {
    this.data = createSeed();
    this.save();
  }

  all<K extends keyof Tables>(table: K): Tables[K] {
    return this.data[table];
  }

  find<K extends keyof Tables>(table: K, pred: (r: Tables[K][number]) => boolean): Tables[K][number][] {
    return (this.data[table] as Tables[K][number][]).filter(pred);
  }

  findOne<K extends keyof Tables>(table: K, pred: (r: Tables[K][number]) => boolean): Tables[K][number] | undefined {
    return (this.data[table] as Tables[K][number][]).find(pred);
  }

  byId<K extends keyof Tables>(table: K, id: string): Tables[K][number] | undefined {
    return (this.data[table] as Row[]).find(r => r.id === id) as Tables[K][number] | undefined;
  }

  insert<K extends keyof Tables>(table: K, row: Omit<Tables[K][number], 'id' | 'created_at'> & { id?: string; created_at?: string }): Tables[K][number] {
    const full = {
      ...row,
      id: row.id ?? `${String(table).slice(0, 3)}_${Date.now().toString(36)}_${uid().slice(0, 8)}`,
      created_at: row.created_at ?? new Date().toISOString()
    } as Tables[K][number];
    (this.data[table] as Tables[K][number][]).push(full);
    this.save();
    return full;
  }

  update<K extends keyof Tables>(table: K, id: string, patch: Partial<Tables[K][number]>): Tables[K][number] | undefined {
    const list = this.data[table] as Row[];
    const idx = list.findIndex(r => r.id === id);
    if (idx === -1) return undefined;
    list[idx] = { ...list[idx], ...patch };
    this.save();
    return list[idx] as Tables[K][number];
  }

  remove<K extends keyof Tables>(table: K, pred: (r: Tables[K][number]) => boolean): number {
    const list = this.data[table] as Tables[K][number][];
    const keep = list.filter(r => !pred(r));
    const removed = list.length - keep.length;
    if (removed) {
      (this.data as unknown as Record<string, unknown>)[table] = keep;
      this.save();
    }
    return removed;
  }
}
