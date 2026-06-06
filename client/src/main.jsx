import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Данные считаются свежими 30 секунд — при переключении вкладок
      // НЕ будет нового запроса если данные загружены менее 30 сек назад
      staleTime: 30 * 1000,

      // Данные хранятся в кэше 5 минут после того как компонент размонтирован
      gcTime: 5 * 60 * 1000,

      // Не перезапрашивать при возврате на вкладку браузера
      refetchOnWindowFocus: false,

      // Повторять запрос только 1 раз при ошибке (вместо 3 по умолчанию)
      retry: 1,
    },
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <App />
        <Toaster position="top-right" />
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>
)