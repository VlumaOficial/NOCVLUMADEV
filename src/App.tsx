import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import SuperAdminLayout from './layouts/SuperAdminLayout'

// Páginas Admin
import AdminDashboard from './pages/admin/Dashboard'
import Clientes from './pages/admin/Clientes'
import Proxies from './pages/admin/Proxies'
import Configuracoes from './pages/admin/Configuracoes'
import Dispositivos from './pages/admin/Dispositivos'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        
        {/* Rotas Admin com SuperAdminLayout */}
        <Route path="/admin" element={<SuperAdminLayout />}>
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="clientes" element={<Clientes />} />
          <Route path="dispositivos" element={<Dispositivos />} />
          <Route path="proxies" element={<Proxies />} />
          <Route path="configuracoes" element={<Configuracoes />} />
        </Route>
      </Routes>
    </Router>
  )
}

export default App
