import { useState, useEffect } from 'react'
import { Plus, Pencil, ToggleLeft, ToggleRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import ClienteModal from '../../components/admin/ClienteModal'

interface Cliente {
  id: string
  name: string
  slug: string
  plan: 'starter' | 'professional' | 'enterprise'
  status: 'active' | 'suspended' | 'cancelled'
  device_limit: number
  created_at: string
}

export default function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [clienteEditando, setClienteEditando] = useState<Cliente | null>(null)

  const carregarClientes = async () => {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setClientes(data || [])
    } catch (error) {
      console.error('Erro ao carregar clientes:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarClientes()
  }, [])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500 text-white'
      case 'suspended':
        return 'bg-yellow-500 text-white'
      case 'cancelled':
        return 'bg-red-500 text-white'
      default:
        return 'bg-gray-500 text-white'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Ativo'
      case 'suspended':
        return 'Suspenso'
      case 'cancelled':
        return 'Cancelado'
      default:
        return 'Desconhecido'
    }
  }

  const getPlanText = (plan: string) => {
    switch (plan) {
      case 'starter':
        return 'Starter'
      case 'professional':
        return 'Professional'
      case 'enterprise':
        return 'Enterprise'
      default:
        return plan
    }
  }

  const toggleStatus = async (cliente: Cliente) => {
    try {
      const newStatus = cliente.status === 'active' ? 'suspended' : 'active'
      const { error } = await supabase
        .from('tenants')
        .update({ status: newStatus })
        .eq('id', cliente.id)

      if (error) throw error
      
      setClientes(clientes.map(c => 
        c.id === cliente.id ? { ...c, status: newStatus } : c
      ))
    } catch (error) {
      console.error('Erro ao alterar status:', error)
    }
  }

  const handleEdit = (cliente: Cliente) => {
    setClienteEditando(cliente)
    setModalOpen(true)
  }

  const handleModalClose = () => {
    setModalOpen(false)
    setClienteEditando(null)
  }

  const handleModalSave = () => {
    setModalOpen(false)
    setClienteEditando(null)
    carregarClientes()
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
          Gestão de Clientes
        </h1>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-noc-primary text-gray-900 rounded-lg hover:bg-green-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Cliente</span>
        </button>
      </div>

      {/* Tabela */}
      {clientes.length === 0 ? (
        <div className="text-center py-12 text-noc-muted">
          Nenhum cliente cadastrado
        </div>
      ) : (
        <div className="bg-noc-surface border border-noc-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-noc-border">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-noc-muted uppercase tracking-wider">
                    Nome
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-noc-muted uppercase tracking-wider">
                    Slug
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-noc-muted uppercase tracking-wider">
                    Plano
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-noc-muted uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-noc-muted uppercase tracking-wider">
                    Dispositivos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-noc-muted uppercase tracking-wider">
                    Criado em
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-noc-muted uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-noc-border">
                {clientes.map((cliente) => (
                  <tr key={cliente.id} className="hover:bg-noc-border/20">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-noc-text">
                      {cliente.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-noc-muted">
                      {cliente.slug}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-noc-text">
                      {getPlanText(cliente.plan)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(cliente.status)}`}>
                        {getStatusText(cliente.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-noc-text">
                      {cliente.device_limit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-noc-muted">
                      {new Date(cliente.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(cliente)}
                          className="p-1 text-noc-muted hover:text-noc-primary transition-colors"
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toggleStatus(cliente)}
                          className="p-1 text-noc-muted hover:text-noc-accent transition-colors"
                          title={cliente.status === 'active' ? 'Suspender' : 'Ativar'}
                        >
                          {cliente.status === 'active' ? (
                            <ToggleLeft className="w-4 h-4" />
                          ) : (
                            <ToggleRight className="w-4 h-4" />
                          )}
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
      <ClienteModal
        isOpen={modalOpen}
        onClose={handleModalClose}
        onSave={handleModalSave}
        cliente={clienteEditando}
      />
    </div>
  )
}
