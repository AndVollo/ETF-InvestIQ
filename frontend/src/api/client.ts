import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const API_BASE_URL = import.meta.env.PROD
  ? 'http://127.0.0.1:8000/api/v1'
  : '/api/v1'

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
})

client.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers = config.headers ?? {}
    config.headers['Authorization'] = `Bearer ${token}`
  }
  return config
})

client.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().clearAuth()
      if (!window.location.pathname.startsWith('/login')) {
        window.location.replace('/login')
      }
    }
    const data = err.response?.data
    if (data?.message_key) {
      return Promise.reject(data)
    }
    // Pass through detail if it exists (common for FastAPI validation errors)
    if (data?.detail) {
      return Promise.reject(data)
    }
    return Promise.reject(err)
  }
)

export default client
