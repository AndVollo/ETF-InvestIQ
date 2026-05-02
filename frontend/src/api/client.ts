import axios from 'axios'

// In dev, Vite's proxy forwards /api → localhost:8000.
// In production (Tauri shell), call the Python sidecar directly on 127.0.0.1.
const API_BASE_URL = import.meta.env.PROD
  ? 'http://127.0.0.1:8000/api/v1'
  : '/api/v1'

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
})

client.interceptors.response.use(
  (r) => r,
  (err) => {
    const data = err.response?.data
    if (data?.message_key) {
      return Promise.reject(data)
    }
    return Promise.reject({ message_key: 'error.internal', params: {} })
  }
)

export default client
