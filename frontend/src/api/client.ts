import axios from 'axios'

const client = axios.create({
  baseURL: '/api/v1',
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
