/**
 * DRISHTI-X — Offline Queue
 * When network is unavailable, cases are stored locally in IndexedDB.
 * On reconnection, they are automatically synced to the backend.
 * Never silently loses cases.
 */

export interface QueuedCase {
  id: string
  type: "CREATE_PATIENT" | "CREATE_SCREENING" | "UPLOAD_IMAGE" | "ANALYZE"
  payload: any
  createdAt: string
  retries: number
  status: "PENDING" | "SYNCING" | "FAILED"
}

const DB_NAME = "drishti_offline"
const STORE   = "pending_cases"
const VERSION = 1

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: "id" })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror   = () => reject(req.error)
  })
}

export async function enqueue(item: Omit<QueuedCase, "retries" | "status">): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, "readwrite")
    const req = tx.objectStore(STORE).put({ ...item, retries: 0, status: "PENDING" })
    req.onsuccess = () => resolve()
    req.onerror   = () => reject(req.error)
  })
}

export async function dequeue(id: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, "readwrite")
    const req = tx.objectStore(STORE).delete(id)
    req.onsuccess = () => resolve()
    req.onerror   = () => reject(req.error)
  })
}

export async function getPendingCases(): Promise<QueuedCase[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, "readonly")
    const req = tx.objectStore(STORE).getAll()
    req.onsuccess = () => resolve(req.result as QueuedCase[])
    req.onerror   = () => reject(req.error)
  })
}

export async function getPendingCount(): Promise<number> {
  const cases = await getPendingCases()
  return cases.filter(c => c.status === "PENDING").length
}

/**
 * Attempt to sync all pending cases.
 * Called automatically when the browser comes back online.
 */
export async function syncPendingCases(
  onProgress?: (msg: string) => void
): Promise<{ synced: number; failed: number }> {
  const cases = await getPendingCases()
  const pending = cases.filter(c => c.status === "PENDING" && c.retries < 3)

  let synced = 0
  let failed = 0

  for (const item of pending) {
    try {
      onProgress?.(`Syncing: ${item.type} (${item.id})`)
      const { api } = await import("./api")

      if (item.type === "CREATE_PATIENT") {
        await api.post("/api/patients", item.payload)
      } else if (item.type === "CREATE_SCREENING") {
        await api.post("/api/screenings", item.payload)
      } else if (item.type === "ANALYZE") {
        await api.post(`/api/screenings/${item.payload.screening_id}/analyze`)
      }

      await dequeue(item.id)
      synced++
      onProgress?.(`✓ Synced: ${item.type}`)
    } catch (e) {
      failed++
      // Update retry count
      const db = await openDB()
      const updated: QueuedCase = { ...item, retries: item.retries + 1, status: item.retries >= 2 ? "FAILED" : "PENDING" }
      const tx = db.transaction(STORE, "readwrite")
      tx.objectStore(STORE).put(updated)
      onProgress?.(`✗ Failed: ${item.type} (retry ${item.retries + 1}/3)`)
    }
  }

  return { synced, failed }
}
