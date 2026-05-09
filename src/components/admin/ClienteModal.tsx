import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Cliente } from '../../types/cliente'

interface ClienteModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: () => void
  cliente: Cliente | null
}

export default function ClienteModal({ isOpen, onClose, onSave, cliente }: ClienteModalProps) {
  const [formData, setFormData] = useState<Cliente>({
    id: '',
    name: '',
    slug: '',
    plan: 'starter',
    device_limit: 10,
    status: 'active',
    created_at: '',
    updated_at: ''
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (cliente) {
      setFormData(cliente)
    }
  }, [cliente])

  useEffect(() => {
    // Auto-gerar slug a partir do nome
    if (formData.name && !formData.slug) {
      const slug = formData.name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
      setFormData(prev => ({ ...prev, slug }))
    }
  }, [formData.name])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Nome da empresa é obrigatório'
    }

    if (!formData.slug.trim()) {
      newErrors.slug = 'Slug é obrigatório'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)
    try {
      const clienteData = {
        name: formData.name.trim(),
        slug: formData.slug.trim(),
        plan: formData.plan,
        device_limit: formData.device_limit,
        status: formData.status
      }

      if (cliente?.id) {
        // Atualizar
        const { error } = await supabase
          .from('tenants')
          .update(clienteData)
          .eq('id', cliente.id)
        
        if (error) throw error
      } else {
        // Inserir
        const { error } = await supabase
          .from('tenants')
          .insert(clienteData)
        
        if (error) throw error
      }

      onSave()
    } catch (error) {
      console.error('Erro ao salvar cliente:', error)
      setErrors({ submit: 'Erro ao salvar cliente. Tente novamente.' })
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-noc-surface border border-noc-border rounded-lg p-6 w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-noc-text">
            {cliente?.id ? 'Editar Cliente' : 'Novo Cliente'}
          </h2>
          <button
            onClick={onClose}
            className="text-noc-muted hover:text-noc-text transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome */}
          <div>
            <label className="block text-sm font-medium text-noc-text mb-2">
              Nome da empresa *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full px-4 py-3 bg-noc-bg border border-noc-border rounded-md text-noc-text placeholder-noc-muted focus:outline-none focus:ring-2 focus:ring-noc-primary focus:border-transparent ${
                errors.name ? 'border-red-500' : ''
              }`}
              placeholder="Nome da empresa"
              required
            />
            {errors.name && (
              <p className="text-red-400 text-sm mt-1">{errors.name}</p>
            )}
          </div>

          {/* Slug */}
          <div>
            <label className="block text-sm font-medium text-noc-text mb-2">
              Slug *
            </label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              className={`w-full px-4 py-3 bg-noc-bg border border-noc-border rounded-md text-noc-text placeholder-noc-muted focus:outline-none focus:ring-2 focus:ring-noc-primary focus:border-transparent ${
                errors.slug ? 'border-red-500' : ''
              }`}
              placeholder="slug-empresa"
              required
            />
            {errors.slug && (
              <p className="text-red-400 text-sm mt-1">{errors.slug}</p>
            )}
          </div>

          {/* Plano */}
          <div>
            <label className="block text-sm font-medium text-noc-text mb-2">
              Plano
            </label>
            <select
              value={formData.plan}
              onChange={(e) => setFormData({ ...formData, plan: e.target.value as 'starter' | 'professional' | 'enterprise' })}
              className="w-full px-4 py-3 bg-noc-bg border border-noc-border rounded-md text-noc-text focus:outline-none focus:ring-2 focus:ring-noc-primary focus:border-transparent"
            >
              <option value="starter">Starter</option>
              <option value="professional">Professional</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>

          {/* Limite de Dispositivos */}
          <div>
            <label className="block text-sm font-medium text-noc-text mb-2">
              Limite de dispositivos
            </label>
            <input
              type="number"
              value={formData.device_limit}
              onChange={(e) => setFormData({ ...formData, device_limit: parseInt(e.target.value) || 10 })}
              className="w-full px-4 py-3 bg-noc-bg border border-noc-border rounded-md text-noc-text placeholder-noc-muted focus:outline-none focus:ring-2 focus:ring-noc-primary focus:border-transparent"
              min="1"
              max="1000"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-noc-text mb-2">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'suspended' })}
              className="w-full px-4 py-3 bg-noc-bg border border-noc-border rounded-md text-noc-text focus:outline-none focus:ring-2 focus:ring-noc-primary focus:border-transparent"
            >
              <option value="active">Ativo</option>
              <option value="suspended">Suspenso</option>
            </select>
          </div>

          {/* Erro de submit */}
          {errors.submit && (
            <div className="text-red-400 text-sm">{errors.submit}</div>
          )}

          {/* Botões */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-noc-border rounded-md text-noc-text hover:bg-noc-border/50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-noc-primary text-gray-900 rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-noc-primary focus:ring-offset-2 focus:ring-offset-noc-surface transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
