/**
 * DRISHTI-X — API Client
 * Typed Axios client for all backend endpoints.
 */
import axios from "axios"

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
})

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("drishti_token")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("drishti_token")
      window.location.href = "/login"
    }
    return Promise.reject(err)
  }
)

// ─── Auth ────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post("/api/auth/login", { email, password }),
  register: (data: object) => api.post("/api/auth/register", data),
  me: () => api.get("/api/auth/me"),
}

// ─── Patients ─────────────────────────────────────────────────
export const patientsApi = {
  create: (data: object) => api.post("/api/patients", data),
  list: (params?: object) => api.get("/api/patients", { params }),
  get: (id: string) => api.get(`/api/patients/${id}`),
}

// ─── Screenings ───────────────────────────────────────────────
export const screeningsApi = {
  create: (data: object) => api.post("/api/screenings", data),
  list: (params?: object) => api.get("/api/screenings", { params }),
  get: (id: string) => api.get(`/api/screenings/${id}`),
  uploadImage: (id: string, file: File) => {
    const form = new FormData()
    form.append("file", file)
    return api.post(`/api/screenings/${id}/image`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    })
  },
  analyze: (id: string) => api.post(`/api/screenings/${id}/analyze`),
  doctorReview: (id: string, data: object) =>
    api.post(`/api/screenings/${id}/doctor-review`, data),
  recapture: (id: string, reason: string) =>
    api.post(`/api/screenings/${id}/recapture`, null, { params: { reason } }),
}

// ─── Dashboard ────────────────────────────────────────────────
export const dashboardApi = {
  statistics: () => api.get("/api/dashboard/statistics"),
  referralQueue: (params?: object) =>
    api.get("/api/dashboard/referral-queue", { params }),
  models: () => api.get("/api/models"),
  audit: (params?: object) => api.get("/api/audit", { params }),
  datasets: () => api.get("/api/datasets"),
}

// ─── Health ────────────────────────────────────────────────────
export const healthApi = {
  check: () => api.get("/api/health"),
}
