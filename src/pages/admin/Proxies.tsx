import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import ProxyModal from '../../components/admin/ProxyModal'
import type { Proxy } from '../../types/proxy'

export default function Proxies() {
  const [proxies, setProxies] = useState<Proxy[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [proxyEditando, setProxyEditando] = useState<Proxy | null>(null)
  const [proxyExcluindo, setProxyExcluindo] = useState<Proxy | null>(null)

  const carregarProxies = async () => {
    try {
      const { data, error } = await supabase
        .from('proxies')
        .select('*, tenant:tenants(name, slug)')
        .order('created_at', { ascending: false })

      if (error) throw error
      setProxies(data || [])
    } catch (error) {
      console.error('Erro ao carregar proxies:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarProxies()
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

  const formatarData = (dataString: string | null) => {
    if (!dataString) return 'Nunca'
    return new Date(dataString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
  }

  const handleEdit = (proxy: Proxy) => {
    setProxyEditando(proxy)
    setModalOpen(true)
  }

  const handleDelete = (proxy: Proxy) => {
    setProxyExcluindo(proxy)
  }

  const confirmarExclusao = async () => {
    if (!proxyExcluindo) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('proxies')
        .delete()
        .eq('id', proxyExcluindo.id)
      
      if (error) throw error
      
      setProxies(proxies.filter(p => p.id !== proxyExcluindo.id))
      setProxyExcluindo(null)
    } catch (error) {
      console.error('Erro ao excluir proxy:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleModalClose = () => {
    setModalOpen(false)
    setProxyEditando(null)
  }

  const handleModalSave = () => {
    setModalOpen(false)
    setProxyEditando(null)
    carregarProxies()
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
          Gerenciamento de Proxies
        </h1>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-noc-primary text-gray-900 rounded-lg hover:bg-green-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Proxy</span>
        </button>
      </div>

      {/* Tabela */}
      {proxies.length === 0 ? (
        <div className="text-center py-12 text-noc-muted">
          Nenhum proxy cadastrado
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
                    Nome do Proxy
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-noc-muted uppercase tracking-wider">
                    Proxy Zabbix
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-noc-muted uppercase tracking-wider">
                    PSK Identity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-noc-muted uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-noc-muted uppercase tracking-wider">
                    Último Contato
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-noc-muted uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-noc-border">
                {proxies.map((proxy) => (
                  <tr key={proxy.id} className="hover:bg-noc-border/20">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-noc-text">
                      {proxy.tenant?.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-noc-text">
                      {proxy.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-noc-text">
                      {proxy.zabbix_proxy_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-noc-text">
                      {proxy.psk_identity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(proxy.status)}`}>
                        {getStatusText(proxy.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-noc-muted">
                      {formatarData(proxy.last_seen)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(proxy)}
                          className="p-1 text-noc-muted hover:text-noc-primary transition-colors"
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(proxy)}
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
      <ProxyModal
        isOpen={modalOpen}
        onClose={handleModalClose}
        onSave={handleModalSave}
        proxy={proxyEditando}
      />

      {/* Dialog de Confirmação de Exclusão */}
      {proxyExcluindo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-noc-surface border border-noc-border rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-noc-text mb-4">
              Confirmar Exclusão
            </h3>
            <p className="text-noc-muted mb-6">
              Tem certeza que deseja excluir o proxy "{proxyExcluindo.name}"?
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setProxyExcluindo(null)}
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
