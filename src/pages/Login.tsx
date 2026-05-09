import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError('Email ou senha incorretos')
        return
      }

      if (data.user) {
        navigate('/dashboard')
      }
    } catch (err) {
      setError('Erro ao fazer login. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-noc-bg flex flex-col justify-center items-center relative p-4">
      {/* Card Principal */}
      <div className="w-full max-w-md bg-noc-surface border border-noc-border rounded-lg p-8 shadow-[0_0_20px_rgba(74,222,128,0.1)]">
        {/* Logo e Título */}
        <div className="text-center mb-8">
          <img 
            src="/logo.png" 
            alt="VLUMA Logo" 
            className="w-20 h-20 mx-auto mb-4"
          />
          <h1 className="text-3xl font-bold text-noc-primary mb-2">
            NOC VLUMA
          </h1>
          <p className="text-sm text-noc-muted">
            Network Operations Center
          </p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Campo Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-noc-text mb-2">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-noc-bg border border-noc-border rounded-md text-noc-text placeholder-noc-muted focus:outline-none focus:ring-2 focus:ring-noc-primary focus:border-transparent"
              placeholder="seu@email.com"
              required
            />
          </div>

          {/* Campo Senha */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-noc-text mb-2">
              Senha
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-noc-bg border border-noc-border rounded-md text-noc-text placeholder-noc-muted focus:outline-none focus:ring-2 focus:ring-noc-primary focus:border-transparent pr-12"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-noc-muted hover:text-noc-text transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Mensagem de Erro */}
          {error && (
            <div className="text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          {/* Botão Entrar */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-noc-primary text-gray-900 font-semibold rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-noc-primary focus:ring-offset-2 focus:ring-offset-noc-surface transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>

      {/* Rodapé Fixo na Base */}
      <div className="absolute bottom-0 left-0 right-0 p-4 text-center">
        <div className="flex items-center justify-center space-x-2 text-noc-muted text-sm">
          <img 
            src="/logo.png" 
            alt="VLUMA Logo" 
            className="w-8 h-8"
          />
          <span>Designed & Developed by </span>
          <span 
            className="font-semibold bg-gradient-to-r from-noc-primary to-noc-accent bg-clip-text text-transparent"
          >
            VLUMA
          </span>
        </div>
      </div>
    </div>
  )
}
