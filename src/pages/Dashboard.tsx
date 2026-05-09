import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { supabase } from '../lib/supabase'
import MainLayout from '../layouts/MainLayout'

export default function Dashboard() {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          navigate('/')
          return
        }

        // Buscar role do usuário na tabela profiles
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        if (profile?.role) {
          switch (profile.role) {
            case 'super_admin':
              navigate('/admin/clientes')
              break
            case 'owner':
            case 'admin':
              // Permanecer no dashboard normal
              break
            case 'operator':
              // Permanecer no dashboard normal
              break
            default:
              navigate('/')
          }
        }
      } catch (error) {
        console.error('Erro ao verificar role:', error)
      }
    }

    checkUserRole()
  }, [navigate])

  const handleLogout = async () => {
    setLoading(true)
    try {
      await supabase.auth.signOut()
      navigate('/')
    } catch (error) {
      console.error('Erro ao fazer logout:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <MainLayout>
      {/* Header */}
      <header className="bg-noc-surface border-b border-noc-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <img 
                src="/logo.png" 
                alt="VLUMA Logo" 
                className="w-8 h-8"
              />
              <h1 className="text-xl font-bold text-noc-primary">
                NOC VLUMA
              </h1>
            </div>
            
            <button
              onClick={handleLogout}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 text-noc-text hover:text-noc-primary transition-colors disabled:opacity-50"
            >
              <LogOut className="w-4 h-4" />
              <span>{loading ? 'Saindo...' : 'Sair'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-noc-text mb-4">
            Dashboard em construção
          </h2>
          <p className="text-noc-muted text-lg">
            Esta área está sendo desenvolvida para fornecer ferramentas completas de monitoramento e gerenciamento do Network Operations Center.
          </p>
          
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Cards de exemplo */}
            <div className="bg-noc-surface border border-noc-border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-noc-primary mb-2">
                Monitoramento
              </h3>
              <p className="text-noc-muted">
                Status em tempo real dos sistemas e serviços
              </p>
            </div>
            
            <div className="bg-noc-surface border border-noc-border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-noc-accent mb-2">
                Alertas
              </h3>
              <p className="text-noc-muted">
                Sistema de notificações e eventos críticos
              </p>
            </div>
            
            <div className="bg-noc-surface border border-noc-border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-noc-primary mb-2">
                Relatórios
              </h3>
              <p className="text-noc-muted">
                Análises e estatísticas de performance
              </p>
            </div>
          </div>
        </div>
      </main>
    </MainLayout>
  )
}
