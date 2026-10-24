"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { login, logout, getMe, getStoredUser, isAuthenticated as checkAuth, isAuthenticatedInDevelopment, LoginRequest, LoginResponse } from '@/lib/api'
import { AuthLoading } from '@/components/auth-loading'

interface AuthContextType {
  isAuthenticated: boolean
  user: LoginResponse['user'] | null
  isLoading: boolean
  isLoginLoading: boolean
  authStatus: 'loading' | 'success' | 'error' | 'no-auth'
  errorMessage: string | null
  login: (credentials: LoginRequest) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<LoginResponse['user'] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoginLoading, setIsLoginLoading] = useState(false)
  const [authStatus, setAuthStatus] = useState<'loading' | 'success' | 'error' | 'no-auth'>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const router = useRouter()

  // Función para hidratar la sesión al cargar la aplicación
  const hydrateSession = async () => {
    // Verificar que estamos en el cliente
    if (typeof window === 'undefined') {
      setIsLoading(false)
      setAuthStatus('no-auth')
      return
    }

    console.log('🔄 [AUTH_CONTEXT] Iniciando hidratación de sesión...')
    setAuthStatus('loading')
    
    // Verificar si estamos en modo desarrollo
    const isDevelopment = process.env.NODE_ENV === 'development'
    
    try {
      // En desarrollo, reducir delays significativamente
      if (isDevelopment) {
        await new Promise(resolve => setTimeout(resolve, 300)) // Solo 300ms en desarrollo
      } else {
        await new Promise(resolve => setTimeout(resolve, 2500)) // Mantener delay en producción
      }
      
      // Debug: Verificar estado completo del localStorage
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
      const user = typeof window !== 'undefined' ? localStorage.getItem('user') : null
      const hasToken = typeof window !== 'undefined' ? checkAuth() : false
      
      console.log('🔍 [AUTH_CONTEXT] Estado completo del localStorage:', { 
        token: token ? 'existe' : 'no existe',
        user: user ? 'existe' : 'no existe',
        hasToken,
        currentPath: typeof window !== 'undefined' ? window.location.pathname : 'N/A',
        tokenLength: token?.length || 0,
        isDevelopment
      })
      
      if (!hasToken) {
        console.log('🔍 [AUTH_CONTEXT] No hay token disponible, usuario no autenticado')
        setIsAuthenticated(false)
        setUser(null)
        setAuthStatus('no-auth')
        setErrorMessage(null)
        setIsLoading(false)
        
        // Si estamos en una ruta protegida, redirigir al login
        if (typeof window !== 'undefined') {
          const currentPath = window.location.pathname
          const isProtectedRoute = ['/dashboard', '/ventas', '/punto-venta', '/clientes', '/stock', '/compras', '/produccion', '/pedidos', '/presupuestos', '/tienda', '/personal', '/proveedores', '/bancos', '/facturacion', '/caja'].some(route => currentPath.startsWith(route))
          
          console.log('🔍 [AUTH_CONTEXT] Verificando redirección:', { currentPath, isProtectedRoute })
          
          if (isProtectedRoute) {
            console.log('🚫 [AUTH_CONTEXT] Ruta protegida sin autenticación, redirigiendo al login')
            if (typeof window !== 'undefined') {
              router.replace('/login')
            }
          }
        }
        return
      }

      console.log('🔐 [AUTH_CONTEXT] Token encontrado, validando con el servidor...')
      
      // En desarrollo, intentar usar datos del localStorage primero para evitar llamadas innecesarias
      if (isDevelopment) {
        const sessionData = checkSessionInDevelopment()
        if (sessionData) {
          console.log('🔍 [AUTH_CONTEXT] Usando datos del localStorage en desarrollo:', sessionData.user)
          setIsAuthenticated(true)
          setUser(sessionData.user)
          setAuthStatus('success')
          setErrorMessage(null)
          
          // Reducir delay en desarrollo
          await new Promise(resolve => setTimeout(resolve, 200))
          
          // Si estamos en el login y ya estamos autenticados, redirigir al dashboard
          if (typeof window !== 'undefined') {
            const currentPath = window.location.pathname
            console.log('🔍 [AUTH_CONTEXT] Verificando redirección después de hidratación:', { currentPath })
            
            if (currentPath === '/login') {
              console.log('✅ [AUTH_CONTEXT] Usuario autenticado en ruta de login, redirigiendo al dashboard')
              router.replace('/dashboard')
            }
          }
          
          setIsLoading(false)
          return
        }
      }
      
      // Intentar obtener datos del usuario usando el token
      try {
        const userData = await getMe()
        console.log('🔍 [AUTH_CONTEXT] Respuesta de getMe():', { userData, type: typeof userData })
        
        if (userData) {
          console.log('✅ [AUTH_CONTEXT] Sesión hidratada exitosamente:', userData)
          setIsAuthenticated(true)
          setUser(userData)
          setAuthStatus('success')
          setErrorMessage(null)
          
          // En desarrollo, reducir delay
          if (isDevelopment) {
            await new Promise(resolve => setTimeout(resolve, 200))
          } else {
            await new Promise(resolve => setTimeout(resolve, 800))
          }
          
          // Si estamos en el login y ya estamos autenticados, redirigir al dashboard
          if (typeof window !== 'undefined') {
            const currentPath = window.location.pathname
            console.log('🔍 [AUTH_CONTEXT] Verificando redirección después de hidratación:', { currentPath })
            
            if (currentPath === '/login') {
              console.log('✅ [AUTH_CONTEXT] Usuario autenticado en ruta de login, redirigiendo al dashboard')
              // Usar replace en lugar de push para evitar problemas de navegación
              router.replace('/dashboard')
            }
          }
          // Nota: La ruta '/' ahora se maneja en app/page.tsx
        } else {
          // getMe retornó null (token inválido, parse error, etc.): tratar como no autenticado
          setIsAuthenticated(false)
          setUser(null)
          setAuthStatus('no-auth')
          setErrorMessage(null)
          const currentPath = typeof window !== 'undefined' ? window.location.pathname : ''
          const isProtectedRoute = ['/dashboard', '/ventas', '/punto-venta', '/clientes', '/stock', '/compras', '/produccion', '/pedidos', '/presupuestos', '/tienda', '/personal', '/proveedores', '/bancos', '/facturacion', '/caja', '/productos', '/categorias'].some(route => currentPath.startsWith(route))
          if (isProtectedRoute) {
            router.replace('/login')
          }
        }
      } catch (error) {
        console.error('❌ [AUTH_CONTEXT] Error durante la verificación:', error)
        setIsAuthenticated(false)
        setUser(null)
        setAuthStatus('error')
        setErrorMessage(error instanceof Error ? error.message : 'Error al verificar la sesión con el servidor')
        
        // Si estamos en una ruta protegida, redirigir al login
        if (typeof window !== 'undefined') {
          const currentPath = window.location.pathname
          const isProtectedRoute = ['/dashboard', '/ventas', '/punto-venta', '/clientes', '/stock', '/compras', '/produccion', '/pedidos', '/presupuestos', '/tienda', '/personal', '/proveedores', '/bancos', '/facturacion', '/caja'].some(route => currentPath.startsWith(route))
          
          console.log('🔍 [AUTH_CONTEXT] Verificando redirección por fallo:', { currentPath, isProtectedRoute })
          
          if (isProtectedRoute) {
            console.log('🚫 [AUTH_CONTEXT] Ruta protegida sin autenticación válida, redirigiendo al login')
            router.replace('/login')
          }
        }
      }
    } catch (error) {
      console.error('💥 [AUTH_CONTEXT] Error durante la hidratación:', error)
      // Si hay error, limpiar el estado
      setIsAuthenticated(false)
      setUser(null)
      setAuthStatus('error')
      setErrorMessage(error instanceof Error ? error.message : 'Error desconocido durante la hidratación')
      
      // Si estamos en una ruta protegida, redirigir al login
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname
        const isProtectedRoute = ['/dashboard', '/ventas', '/punto-venta', '/clientes', '/stock', '/compras', '/produccion', '/pedidos', '/presupuestos', '/tienda', '/personal', '/proveedores', '/bancos', '/facturacion', '/caja'].some(route => currentPath.startsWith(route))
        
        if (isProtectedRoute) {
          console.log('🚫 [AUTH_CONTEXT] Error en ruta protegida, redirigiendo al login')
          router.replace('/login')
        }
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Función para hacer login
  const handleLogin = async (credentials: LoginRequest) => {
    console.log('🔐 [AUTH_CONTEXT] Iniciando proceso de login...')
    setIsLoginLoading(true)
    
    // Verificar si estamos en modo desarrollo
    const isDevelopment = process.env.NODE_ENV === 'development'
    
    try {
      const loginData = await login(credentials)
      
      console.log('✅ [AUTH_CONTEXT] Login exitoso:', loginData.user)
      setIsAuthenticated(true)
      setUser(loginData.user)
      
      // En desarrollo, reducir delay significativamente
      if (isDevelopment) {
        await new Promise(resolve => setTimeout(resolve, 500)) // Solo 500ms en desarrollo
      } else {
        await new Promise(resolve => setTimeout(resolve, 1500)) // Mantener delay en producción
      }
      
      // Redirigir al dashboard
      router.replace('/dashboard')
    } catch (error) {
      console.error('❌ [AUTH_CONTEXT] Error en el login:', error)
      throw error // Re-lanzar para que el componente pueda manejarlo
    } finally {
      setIsLoginLoading(false)
    }
  }

  // Función para hacer logout
  const handleLogout = () => {
    console.log('🚪 [AUTH_CONTEXT] Cerrando sesión...')
    
    logout()
    setIsAuthenticated(false)
    setUser(null)
    
    // Redirigir al login
    router.replace('/login')
  }

  // Función para verificar sesión en desarrollo sin llamadas al servidor
  const checkSessionInDevelopment = () => {
    if (typeof window === 'undefined') return false
    
    const isDevelopment = process.env.NODE_ENV === 'development'
    
    if (!isDevelopment) return false
    
    // Usar la función optimizada de la API
    if (isAuthenticatedInDevelopment()) {
      const user = getStoredUser()
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
      
      if (user && token) {
        console.log('🔍 [AUTH_CONTEXT] Sesión válida encontrada en desarrollo:', user)
        return { user, token }
      }
    }
    
    return false
  }

  // Efecto para hidratar la sesión al montar el componente
  useEffect(() => {
    hydrateSession()
  }, [])

  const value: AuthContextType = {
    isAuthenticated,
    user,
    isLoading,
    isLoginLoading,
    authStatus,
    errorMessage,
    login: handleLogin,
    logout: handleLogout
  }

  return (
    <AuthContext.Provider value={value}>
      {isLoading ? <AuthLoading status={authStatus} errorMessage={errorMessage || undefined} /> : children}
    </AuthContext.Provider>
  )
}

// Hook para usar el contexto de autenticación
export function useAuth() {
  const context = useContext(AuthContext)
  
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider')
  }
  
  return context
}
