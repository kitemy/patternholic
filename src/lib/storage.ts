const DB = 'patternholic'
const STORE = 'analyses'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => { req.result.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true }) }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function saveAnalysis(data: any) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    const req = store.add(JSON.parse(JSON.stringify({ ...data, savedAt: Date.now() })))
    tx.oncomplete = () => { db.close(); resolve(req.result) }
    tx.onabort = () => { db.close(); reject(tx.error || new Error('Could not save this analysis.')) }
    tx.onerror = () => { db.close(); reject(tx.error) }
  })
}

export async function loadAnalyses() {
  const db = await openDb()
  return new Promise<any[]>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const store = tx.objectStore(STORE)
    const req = store.getAll()
    tx.oncomplete = () => { db.close(); resolve(req.result || []) }
    tx.onabort = () => { db.close(); reject(tx.error || new Error('Could not load saved analyses.')) }
    tx.onerror = () => { db.close(); reject(tx.error) }
  })
}
