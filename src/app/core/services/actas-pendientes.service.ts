import { Injectable } from '@angular/core';
import { ActasService, type ActaRegistroInput } from './actas';

export interface ActaPendiente {
  client_id: string;
  data: Omit<ActaRegistroInput, 'fotografia_path'>;
  foto: Blob;
  nombre_archivo: string;
  tipo_archivo: string;
  fotografia_path?: string;
  creada_en: string;
  ultimo_error?: string;
}

@Injectable({ providedIn: 'root' })
export class ActasPendientesService {
  private readonly databaseName = 'control-electoral-local';
  private readonly storeName = 'actas-pendientes';
  private syncEnCurso = false;

  constructor(private readonly actasService: ActasService) {
    if (typeof window !== 'undefined') window.addEventListener('online', () => void this.sincronizar());
  }

  async encolar(record: ActaPendiente): Promise<void> {
    const store = await this.abrirStore('readwrite');
    await this.request(store.put(record));
  }

  async listar(): Promise<ActaPendiente[]> {
    const store = await this.abrirStore('readonly');
    return (await this.request(store.getAll())) as ActaPendiente[];
  }

  async eliminar(clientId: string): Promise<void> {
    const store = await this.abrirStore('readwrite');
    await this.request(store.delete(clientId));
  }

  async sincronizar(): Promise<{ sincronizadas: number; pendientes: number }> {
    if (!navigator.onLine || this.syncEnCurso) return { sincronizadas: 0, pendientes: (await this.listar()).length };
    this.syncEnCurso = true;
    let sincronizadas = 0;
    try {
      const pending = await this.listar();
      for (const item of pending) {
        let current = item;
        try {
          if (!current.fotografia_path) {
            const file = new File([current.foto], current.nombre_archivo, { type: current.tipo_archivo });
            const photo = await this.actasService.subirFotografia(current.data.jrv_id, current.data.dignidad, file);
            current = { ...current, fotografia_path: photo.path };
            const store = await this.abrirStore('readwrite');
            await this.request(store.put(current));
          }
          await this.actasService.registrarActa({ ...current.data, fotografia_path: current.fotografia_path ?? null });
          await this.eliminar(item.client_id);
          sincronizadas += 1;
        } catch (error) {
          const store = await this.abrirStore('readwrite');
          await this.request(
            store.put({ ...current, ultimo_error: error instanceof Error ? error.message : 'No se pudo sincronizar.' }),
          );
        }
      }
    } finally {
      this.syncEnCurso = false;
    }
    return { sincronizadas, pendientes: (await this.listar()).length };
  }

  private async abrirStore(mode: IDBTransactionMode): Promise<IDBObjectStore> {
    if (typeof indexedDB === 'undefined')
      throw new Error('El almacenamiento local no está disponible en este dispositivo.');
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(this.databaseName, 1);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(this.storeName))
          database.createObjectStore(this.storeName, { keyPath: 'client_id' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('No se pudo abrir el almacenamiento local.'));
    });
    return db.transaction(this.storeName, mode).objectStore(this.storeName);
  }

  private request<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('Falló una operación del almacenamiento local.'));
    });
  }
}
