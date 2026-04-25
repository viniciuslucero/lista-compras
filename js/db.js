/**
 * DataService — camada de abstração de dados
 * Hoje: IndexedDB (offline, local)
 * Futuro: trocar USE_API para true e apontar API_URL para o backend
 */

const USE_API = false;
const API_URL = 'https://sua-api.com'; // futuro

const DB_NAME = 'lista-compras';
const DB_VERSION = 1;

let _db = null;

async function getDB() {
  if (_db) return _db;
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('compras')) {
        const store = db.createObjectStore('compras', { keyPath: 'id', autoIncrement: true });
        store.createIndex('data', 'data');
        store.createIndex('descricao', 'descricao');
        store.createIndex('chave', 'chave');
      }
      if (!db.objectStoreNames.contains('ajustes')) {
        db.createObjectStore('ajustes', { keyPath: 'descricao' });
      }
    };
    req.onsuccess = e => { _db = e.target.result; resolve(_db); };
    req.onerror = () => reject(req.error);
  });
}

// ─── COMPRAS ────────────────────────────────────────────────

export async function salvarCompras(itens) {
  if (USE_API) {
    await fetch(`${API_URL}/compras`, { method: 'POST', body: JSON.stringify(itens), headers: { 'Content-Type': 'application/json' } });
    return;
  }
  const db = await getDB();
  const tx = db.transaction('compras', 'readwrite');
  for (const item of itens) tx.objectStore('compras').add(item);
  return new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });
}

export async function listarCompras() {
  if (USE_API) {
    const r = await fetch(`${API_URL}/compras`);
    return r.json();
  }
  const db = await getDB();
  return new Promise((res, rej) => {
    const req = db.transaction('compras').objectStore('compras').getAll();
    req.onsuccess = () => res(req.result);
    req.onerror = rej;
  });
}

export async function contarCompras() {
  const db = await getDB();
  return new Promise((res, rej) => {
    const req = db.transaction('compras').objectStore('compras').count();
    req.onsuccess = () => res(req.result);
    req.onerror = rej;
  });
}

export async function limparCompras() {
  const db = await getDB();
  return new Promise((res, rej) => {
    const req = db.transaction('compras', 'readwrite').objectStore('compras').clear();
    req.onsuccess = res;
    req.onerror = rej;
  });
}

// ─── AJUSTES DO USUÁRIO ──────────────────────────────────────

export async function salvarAjuste(descricao, qtde) {
  if (USE_API) {
    await fetch(`${API_URL}/ajustes`, { method: 'POST', body: JSON.stringify({ descricao, qtde }), headers: { 'Content-Type': 'application/json' } });
    return;
  }
  const db = await getDB();
  return new Promise((res, rej) => {
    const req = db.transaction('ajustes', 'readwrite').objectStore('ajustes').put({ descricao, qtde });
    req.onsuccess = res;
    req.onerror = rej;
  });
}

export async function listarAjustes() {
  if (USE_API) {
    const r = await fetch(`${API_URL}/ajustes`);
    return r.json();
  }
  const db = await getDB();
  return new Promise((res, rej) => {
    const req = db.transaction('ajustes').objectStore('ajustes').getAll();
    req.onsuccess = () => res(req.result);
    req.onerror = rej;
  });
}
