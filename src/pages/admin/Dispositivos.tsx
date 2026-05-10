import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import DispositivoModal from '../../components/admin/DispositivoModal'
import { sincronizarStatusDispositivos, excluirHostZabbix } from '../../lib/zabbix'
import type { Device } from '../../types/device'

export default function Dispositivos() {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [deviceEditando, setDeviceEditando] = useState<Device | null>(null)
  const [deviceExcluindo, setDeviceExcluindo] = useState<Device | null>(null)
  const [filtroCliente, setFiltroCliente] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [tenants, setTenants] = useState<any[]>([])

  const carregarDispositivos = async () => {
    try {
      const { data, error } = await supabase
        .from('devices')
        .select('*, tenant:tenants(name,slug), proxy:proxies(name,zabbix_proxy_name)')
        .order('created_at', { ascending: false })

      if (error) throw error
      setDevices(data || [])
      
      // Carregar tenants para filtros
      const { data: tenantsData } = await supabase
        .from('tenants')
        .select('id, name, slug')
        .eq('status', 'active')
        .order('name')
      
      setTenants(tenantsData || [])
      
      // Sincronizar status com Zabbix
      if (data && data.length > 0) {
        try {
          const statusAtualizados = await sincronizarStatusDispositivos(data)
          
          // Atualizar dispositivos com status sincronizado
          for (const dispositivo of statusAtualizados) {
            await supabase
              .from('devices')
              .update({ 
                status: dispositivo.status,
                updated_at: new Date().toISOString()
              })
              .eq('id', dispositivo.id)
          }
          
          // Atualizar estado local
          setDevices(prev => prev.map(d => {
            const atualizado = statusAtualizados.find(s => s.id === d.id)
            return atualizado ? { ...d, status: atualizado.status } : d
          }))
        } catch (error) {
          console.error('Erro ao sincronizar status:', error)
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dispositivos:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarDispositivos()
  }, [])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-500 text-white'
      case 'offline':
        return 'bg-red-500 text-white'
      case 'unknown':
        return 'bg-gray-500 text-white'
      default:
        return 'bg-gray-500 text-white'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online':
        return 'Online'
      case 'offline':
        return 'Offline'
      case 'unknown':
        return 'Desconhecido'
      default:
        return status
    }
  }

  const getTipoBadge = (type: string) => {
    switch (type) {
      case 'switch':
        return 'bg-blue-500 text-white'
      case 'camera':
        return 'bg-red-500 text-white'
      case 'server':
        return 'bg-orange-500 text-white'
      case 'router':
        return 'bg-yellow-500 text-white'
      case 'ups':
        return 'bg-purple-500 text-white'
      case 'other':
        return 'bg-gray-500 text-white'
      default:
        return 'bg-gray-500 text-white'
    }
  }

  const getTipoText = (type: string) => {
    switch (type) {
      case 'switch':
        return 'Switch'
      case 'camera':
        return 'Câmera'
      case 'server':
        return 'Servidor'
      case 'router':
        return 'Roteador'
      case 'ups':
        return 'UPS'
      case 'other':
        return 'Outro'
      default:
        return type
    }
  }

  const getMetodoTexto = (method: string) => {
    switch (method) {
      case 'snmp_v2c':
        return 'SNMP v2c'
      case 'snmp_v3':
        return 'SNMP v3'
      case 'icmp':
        return 'ICMP (Ping)'
      case 'ssh':
        return 'SSH'
      case 'api_rest':
        return 'API REST'
      default:
        return method
    }
  }

  const dispositivosFiltrados = devices.filter(device => {
    const matchCliente = !filtroCliente || device.tenant?.name?.toLowerCase().includes(filtroCliente.toLowerCase())
    const matchTipo = !filtroTipo || device.type === filtroTipo
    return matchCliente && matchTipo
  })

  const handleEdit = (device: Device) => {
    setDeviceEditando(device)
    setModalOpen(true)
  }

  const handleDelete = (device: Device) => {
    setDeviceExcluindo(device)
  }

  const confirmarExclusao = async () => {
    if (!deviceExcluindo) return

    setLoading(true)
    
    try {
      // Excluir do Zabbix primeiro
      if (deviceExcluindo.zabbix_host_id) {
        try {
          await excluirHostZabbix(deviceExcluindo.zabbix_host_id)
        } catch (error) {
          console.error('Erro ao excluir host do Zabbix:', error)
        }
      }

      // Excluir do Supabase
      const { error } = await supabase
        .from('devices')
        .delete()
        .eq('id', deviceExcluindo.id)
      
      if (error) throw error
      
      setDevices(devices.filter(d => d.id !== deviceExcluindo.id))
      setDeviceExcluindo(null)
    } catch (error) {
      console.error('Erro ao excluir dispositivo:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleModalClose = () => {
    setModalOpen(false)
    setDeviceEditando(null)
  }

  const handleModalSave = () => {
    setModalOpen(false)
    setDeviceEditando(null)
    carregarDispositivos()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-noc-muted">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-noc-text">
          Gerenciamento de Dispositivos
        </h1>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-noc-primary text-gray-900 rounded-lg hover:bg-green-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Dispositivo</span>
        </button>
      </div>

      {/* Filtros */}
      <div className="flex space-x-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-noc-text mb-2">
            Cliente
          </label>
          <select
            value={filtroCliente}
            onChange={(e) => setFiltroCliente(e.target.value)}
            className="px-4 py-2 bg-noc-surface border border-noc-border rounded-md text-noc-text focus:outline-none focus:ring-2 focus:ring-noc-primary focus:border-transparent"
          >
            <option value="">Todos os clientes</option>
            {tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.name}>
                {tenant.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-noc-text mb-2">
            Tipo de dispositivo
          </label>
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="px-4 py-2 bg-noc-surface border border-noc-border rounded-md text-noc-text focus:outline-none focus:ring-2 focus:ring-noc-primary focus:border-transparent"
          >
            <option value="">Todos os tipos</option>
            <option value="switch">Switch</option>
            <option value="camera">Câmera</option>
            <option value="server">Servidor</option>
            <option value="router">Roteador</option>
            <option value="ups">UPS</option>
            <option value="other">Outro</option>
          </select>
        </div>
      </div>

      {/* Tabela */}
      {dispositivosFiltrados.length === 0 ? (
        <div className="text-center py-12 text-noc-muted">
          Nenhum dispositivo cadastrado
        </div>
      ) : (
        <div className="bg-noc-surface border border-noc-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-noc-border">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-noc-muted uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-noc-muted uppercase tracking-wider">
                    Nome
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-noc-muted uppercase tracking-wider">
                    IP
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-noc-muted uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-noc-muted uppercase tracking-wider">
                    Fabricante
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-noc-muted uppercase tracking-wider">
                    Método
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-noc-muted uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-noc-muted uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-noc-border">
                {dispositivosFiltrados.map((device) => (
                  <tr key={device.id} className="hover:bg-noc-border/20">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-noc-text">
                      {device.tenant?.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-noc-text">
                      {device.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-noc-text">
                      {device.ip}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTipoBadge(device.type)}`}>
                        {getTipoText(device.type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-noc-text">
                      {device.manufacturer || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-noc-text">
                      {getMetodoTexto(device.monitor_method)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(device.status)}`}>
                        {getStatusText(device.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(device)}
                          className="p-1 text-noc-muted hover:text-noc-primary transition-colors"
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(device)}
                          className="p-1 text-noc-muted hover:text-red-400 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      <DispositivoModal
        isOpen={modalOpen}
        onClose={handleModalClose}
        onSave={handleModalSave}
        device={deviceEditando}
      />

      {/* Dialog de Confirmação de Exclusão */}
      {deviceExcluindo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-noc-surface border border-noc-border rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-noc-text mb-4">
              Confirmar Exclusão
            </h3>
            <p className="text-noc-muted mb-6">
              Tem certeza que deseja excluir o dispositivo "{deviceExcluindo.name}"?
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setDeviceExcluindo(null)}
                className="flex-1 px-4 py-3 border border-noc-border rounded-md text-noc-text hover:bg-noc-border/50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarExclusao}
                className="flex-1 px-4 py-3 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
