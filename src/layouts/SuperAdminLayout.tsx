import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Users, 
  Server, 
  Settings, 
  LogOut 
} from 'lucide-react'
import Footer from '../components/Footer'

interface MenuItem {
  icon: React.ReactNode
  label: string
  path: string
}

export default function SuperAdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()

  const menuItems: MenuItem[] = [
    {
      icon: <LayoutDashboard className="w-5 h-5" />,
      label: 'Dashboard',
      path: '/admin/dashboard'
    },
    {
      icon: <Users className="w-5 h-5" />,
      label: 'Clientes',
      path: '/admin/clientes'
    },
    {
      icon: <Server className="w-5 h-5" />,
      label: 'Proxies',
      path: '/admin/proxies'
    },
    {
      icon: <Settings className="w-5 h-5" />,
      label: 'Configurações',
      path: '/admin/configuracoes'
    }
  ]

  const handleLogout = async () => {
    try {
      const { supabase } = await import('../lib/supabase')
      await supabase.auth.signOut()
      navigate('/')
    } catch (error) {
      console.error('Erro ao fazer logout:', error)
    }
  }

  return (
    <div className="flex h-screen bg-noc-bg">
      {/* Sidebar */}
      <div className="w-60 bg-noc-surface border-r border-noc-border flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-noc-border">
          <div className="flex items-center space-x-3">
            <img 
              src="/logo.png" 
              alt="VLUMA" 
              width={32}
              height={32}
              style={{ objectFit: 'contain' }}
              onError={(e) => { e.currentTarget.style.display = 'none' }}
            />
            <span className="text-lg font-bold text-noc-primary">
              NOC VLUMA
            </span>
          </div>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {menuItems.map((item) => (
              <li key={item.path}>
                <button
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    location.pathname === item.path
                      ? 'bg-noc-border text-noc-primary'
                      : 'text-noc-muted hover:text-noc-text hover:bg-noc-border/50'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-noc-border">
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-noc-muted hover:text-noc-text hover:bg-noc-border/50 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Sair</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-noc-bg relative">
        <Outlet />
        <Footer />
      </div>
    </div>
  )
}
