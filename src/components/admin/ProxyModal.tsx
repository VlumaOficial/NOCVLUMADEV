import { useState, useEffect } from 'react'
import { X, Copy, Check } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { criarProxyZabbix } from '../../lib/zabbix'
import type { Proxy } from '../../types/proxy'

interface Tenant {
  id: string
  name: string
  slug: string
}

interface ProxyModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: () => void
  proxy: Proxy | null
}

export default function ProxyModal({ isOpen, onClose, onSave, proxy }: ProxyModalProps) {
  const [formData, setFormData] = useState<Proxy>({
    id: '',
    tenant_id: '',
    name: '',
    zabbix_proxy_name: '',
    psk_identity: '',
    psk_key: '',
    status: 'unknown',
    last_seen: null,
    created_at: '',
    updated_at: ''
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loadingTenants, setLoadingTenants] = useState(false)
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    if (proxy) {
      setFormData(proxy)
    }
  }, [proxy])

  useEffect(() => {
    const loadTenants = async () => {
      setLoadingTenants(true)
      try {
        const { data, error } = await supabase
          .from('tenants')
          .select('id, name, slug')
          .eq('status', 'active')
          .order('name')
        
        if (error) throw error
        setTenants(data || [])
      } catch (error) {
        console.error('Erro ao carregar tenants:', error)
      } finally {
        setLoadingTenants(false)
      }
    }

    if (isOpen) {
      loadTenants()
    }
  }, [isOpen])

  const generatePSK = () => {
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    const hex = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
    setFormData(prev => ({ ...prev, psk_key: hex }))
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.tenant_id.trim()) {
      newErrors.tenant_id = 'Cliente é obrigatório'
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Nome do Proxy é obrigatório'
    }

    if (!formData.zabbix_proxy_name.trim()) {
      newErrors.zabbix_proxy_name = 'Nome no Zabbix é obrigatório'
    }

    if (!formData.psk_identity.trim()) {
      newErrors.psk_identity = 'PSK Identity é obrigatório'
    }

    if (!formData.psk_key.trim()) {
      newErrors.psk_key = 'PSK Key é obrigatório'
    } else if (formData.psk_key.length !== 64) {
      newErrors.psk_key = 'PSK Key deve ter 64 caracteres hexadecimais'
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
      const proxyData = {
        tenant_id: formData.tenant_id.trim(),
        name: formData.name.trim(),
        zabbix_proxy_name: formData.zabbix_proxy_name.trim(),
        psk_identity: formData.psk_identity.trim(),
        psk_key: formData.psk_key.trim(),
        status: 'unknown' as const
      }

      if (proxy?.id) {
        // Atualizar
        const { error } = await supabase
          .from('proxies')
          .update(proxyData)
          .eq('id', proxy.id)
        
        if (error) throw error
      } else {
        // Inserir
        const { error } = await supabase
          .from('proxies')
          .insert(proxyData)
        
        if (error) throw error

        // Criar proxy no Zabbix
        try {
          await criarProxyZabbix({
            name: formData.zabbix_proxy_name.trim(),
            psk_identity: formData.psk_identity.trim(),
            psk_key: formData.psk_key.trim()
          })
        } catch (zabbixError) {
          console.warn('Proxy salvo mas não criado no Zabbix:', zabbixError)
        }
      }

      onSave()
    } catch (error) {
      console.error('Erro ao salvar proxy:', error)
      setErrors({ submit: 'Erro ao salvar proxy. Tente novamente.' })
    } finally {
      setLoading(false)
    }
  }

  const copyDockerCommand = () => {
    const pskKey = formData.psk_key
    const proxyName = formData.zabbix_proxy_name
    const pskIdentity = formData.psk_identity

    const command = `docker volume create zabbix-proxy-psk && docker run --rm -v zabbix-proxy-psk:/enc alpine sh -c "echo '${pskKey}' > /enc/proxy.psk" && docker run --name ${proxyName} --restart unless-stopped --sysctl net.ipv4.ping_group_range="0 2147483647" -e ZBX_HOSTNAME="${proxyName}" -e ZBX_SERVER_HOST="zbx.vluma.com.br" -e ZBX_SERVER_PORT=10051 -e ZBX_TLSCONNECT=psk -e ZBX_TLSACCEPT=psk -e ZBX_TLSPSKIDENTITY="${pskIdentity}" -e ZBX_TLSPSKFILE="/var/lib/zabbix/enc/proxy.psk" -v zabbix-proxy-psk:/var/lib/zabbix/enc -d zabbix/zabbix-proxy-sqlite3:ubuntu-7.0-latest && docker exec -u 0 ${proxyName} apt-get update -qq && docker exec -u 0 ${proxyName} apt-get install -y netcat-openbsd snmp fping && docker exec -u 0 ${proxyName} chmod 4711 /usr/bin/fping`

    navigator.clipboard.writeText(command)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-noc-surface border border-noc-border rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-noc-text">
            {proxy?.id ? 'Editar Proxy' : 'Novo Proxy'}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cliente */}
            <div>
              <label className="block text-sm font-medium text-noc-text mb-2">
                Cliente *
              </label>
              <select
                value={formData.tenant_id}
                onChange={(e) => setFormData({ ...formData, tenant_id: e.target.value })}
                className={`w-full px-4 py-3 bg-noc-bg border border-noc-border rounded-md text-noc-text focus:outline-none focus:ring-2 focus:ring-noc-primary focus:border-transparent ${
                  errors.tenant_id ? 'border-red-500' : ''
                }`}
                required
                disabled={loadingTenants}
              >
                <option value="">Selecione um cliente</option>
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </option>
                ))}
              </select>
              {errors.tenant_id && (
                <p className="text-red-400 text-sm mt-1">{errors.tenant_id}</p>
              )}
            </div>

            {/* Nome do Proxy */}
            <div>
              <label className="block text-sm font-medium text-noc-text mb-2">
                Nome do Proxy *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={`w-full px-4 py-3 bg-noc-bg border border-noc-border rounded-md text-noc-text placeholder-noc-muted focus:outline-none focus:ring-2 focus:ring-noc-primary focus:border-transparent ${
                  errors.name ? 'border-red-500' : ''
                }`}
                placeholder="Proxy-CLIENTE-01"
                required
              />
              {errors.name && (
                <p className="text-red-400 text-sm mt-1">{errors.name}</p>
              )}
            </div>

            {/* Nome no Zabbix */}
            <div>
              <label className="block text-sm font-medium text-noc-text mb-2">
                Nome no Zabbix *
              </label>
              <input
                type="text"
                value={formData.zabbix_proxy_name}
                onChange={(e) => setFormData({ ...formData, zabbix_proxy_name: e.target.value })}
                className={`w-full px-4 py-3 bg-noc-bg border border-noc-border rounded-md text-noc-text placeholder-noc-muted focus:outline-none focus:ring-2 focus:ring-noc-primary focus:border-transparent ${
                  errors.zabbix_proxy_name ? 'border-red-500' : ''
                }`}
                placeholder="Deve ser igual ao ZBX_HOSTNAME"
                required
              />
              {errors.zabbix_proxy_name && (
                <p className="text-red-400 text-sm mt-1">{errors.zabbix_proxy_name}</p>
              )}
            </div>

            {/* PSK Identity */}
            <div>
              <label className="block text-sm font-medium text-noc-text mb-2">
                PSK Identity *
              </label>
              <input
                type="text"
                value={formData.psk_identity}
                onChange={(e) => setFormData({ ...formData, psk_identity: e.target.value })}
                className={`w-full px-4 py-3 bg-noc-bg border border-noc-border rounded-md text-noc-text placeholder-noc-muted focus:outline-none focus:ring-2 focus:ring-noc-primary focus:border-transparent ${
                  errors.psk_identity ? 'border-red-500' : ''
                }`}
                placeholder="LAB-VLUMA-001"
                required
              />
              {errors.psk_identity && (
                <p className="text-red-400 text-sm mt-1">{errors.psk_identity}</p>
              )}
            </div>

            {/* PSK Key */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-noc-text mb-2">
                PSK Key *
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={formData.psk_key}
                  onChange={(e) => setFormData({ ...formData, psk_key: e.target.value })}
                  className={`flex-1 px-4 py-3 bg-noc-bg border border-noc-border rounded-md text-noc-text placeholder-noc-muted focus:outline-none focus:ring-2 focus:ring-noc-primary focus:border-transparent font-mono text-sm ${
                    errors.psk_key ? 'border-red-500' : ''
                  }`}
                  placeholder="64 caracteres hexadecimais"
                  required
                />
                <button
                  type="button"
                  onClick={generatePSK}
                  className="px-4 py-3 bg-noc-accent text-white rounded-md hover:bg-amber-600 transition-colors"
                >
                  Gerar PSK
                </button>
              </div>
              {errors.psk_key && (
                <p className="text-red-400 text-sm mt-1">{errors.psk_key}</p>
              )}
            </div>
          </div>

          {/* Docker Command */}
          {formData.psk_key && formData.zabbix_proxy_name && formData.psk_identity && (
            <div className="mt-6">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-noc-text">
                  Comando Docker
                </label>
                <button
                  type="button"
                  onClick={copyDockerCommand}
                  className={`flex items-center space-x-1 px-3 py-1 text-xs rounded transition-colors ${
                    copiado 
                      ? 'bg-green-500 text-white' 
                      : 'bg-noc-primary text-gray-900 hover:bg-green-600'
                  }`}
                >
                  {copiado ? (
                    <>
                      <Check className="w-3 h-3" />
                      <span>Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              </div>
              <div className="bg-noc-bg border border-noc-border rounded-lg p-4">
                <pre className="text-xs text-noc-muted overflow-x-auto whitespace-nowrap">
{`docker volume create zabbix-proxy-psk && docker run --rm -v zabbix-proxy-psk:/enc alpine sh -c "echo '${formData.psk_key}' > /enc/proxy.psk" && docker run --name ${formData.zabbix_proxy_name} --restart unless-stopped --sysctl net.ipv4.ping_group_range="0 2147483647" -e ZBX_HOSTNAME="${formData.zabbix_proxy_name}" -e ZBX_SERVER_HOST="zbx.vluma.com.br" -e ZBX_SERVER_PORT=10051 -e ZBX_TLSCONNECT=psk -e ZBX_TLSACCEPT=psk -e ZBX_TLSPSKIDENTITY="${formData.psk_identity}" -e ZBX_TLSPSKFILE="/var/lib/zabbix/enc/proxy.psk" -v zabbix-proxy-psk:/var/lib/zabbix/enc -d zabbix/zabbix-proxy-sqlite3:ubuntu-7.0-latest && docker exec -u 0 ${formData.zabbix_proxy_name} apt-get update -qq && docker exec -u 0 ${formData.zabbix_proxy_name} apt-get install -y netcat-openbsd snmp fping && docker exec -u 0 ${formData.zabbix_proxy_name} chmod 4711 /usr/bin/fping`}
                </pre>
              </div>
            </div>
          )}

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
