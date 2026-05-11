import { useState, useEffect } from 'react'
import { X, ChevronLeft, CheckCircle, XCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { criarHostZabbix, atualizarHostZabbix } from '../../lib/zabbix'
import type { Device } from '../../types/device'

interface DispositivoModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: () => void
  device: Device | null
}

export default function DispositivoModal({ isOpen, onClose, onSave, device }: DispositivoModalProps) {
  const [etapa, setEtapa] = useState(1)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [testando, setTestando] = useState(false)
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null)
  
  const [formData, setFormData] = useState({
    tenant_id: device?.tenant_id || '',
    proxy_id: device?.proxy_id || '',
    name: device?.name || '',
    ip: device?.ip || '',
    type: device?.type || 'switch',
    manufacturer: device?.manufacturer || '',
    model: device?.model || '',
    monitor_method: device?.monitor_method || 'snmp_v2c',
    snmp_community: device?.snmp_community || '',
    snmp_version: device?.snmp_version || '2c',
    zabbix_host_id: device?.zabbix_host_id || '',
    status: 'unknown'
  })

  const [tenants, setTenants] = useState<any[]>([])
  const [proxies, setProxies] = useState<any[]>([])

  useEffect(() => {
    if (device) {
      setFormData({
        tenant_id: device.tenant_id || '',
        proxy_id: device.proxy_id || '',
        name: device.name || '',
        ip: device.ip || '',
        type: device.type || 'switch',
        manufacturer: device.manufacturer || '',
        model: device.model || '',
        monitor_method: device.monitor_method || 'snmp_v2c',
        snmp_community: device.snmp_community || '',
        snmp_version: device.snmp_version || '2c',
        zabbix_host_id: device.zabbix_host_id || '',
        status: device.status || 'unknown'
      })
    }
  }, [device])

  useEffect(() => {
    if (isOpen && !device) {
      setEtapa(1)
      setErrors({})
      setTestResult(null)
      setFormData({
        tenant_id: '',
        proxy_id: '',
        name: '',
        ip: '',
        type: 'switch',
        manufacturer: '',
        model: '',
        monitor_method: 'snmp_v2c',
        snmp_community: '',
        snmp_version: '2c',
        zabbix_host_id: '',
        status: 'unknown'
      })
    }
  }, [isOpen, device])

  useEffect(() => {
    const carregarDados = async () => {
      try {
        // Carregar tenants
        const { data: tenantsData } = await supabase
          .from('tenants')
          .select('id, name, slug')
          .eq('status', 'active')
          .order('name')
        
        // Carregar proxies
        const { data: proxiesData } = await supabase
          .from('proxies')
          .select('id, name, zabbix_proxy_name')
          .order('name')
        
        setTenants(tenantsData || [])
        setProxies(proxiesData || [])
      } catch (error) {
        console.error('Erro ao carregar dados:', error)
      }
    }

    if (isOpen) {
      carregarDados()
    }
  }, [isOpen])

  const _validateEtapa1 = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.tenant_id.trim()) {
      newErrors.tenant_id = 'Cliente é obrigatório'
    }
    
    if (!formData.name.trim()) {
      newErrors.name = 'Nome do dispositivo é obrigatório'
    }
    
    if (!formData.ip.trim()) {
      newErrors.ip = 'IP é obrigatório'
    }
    
    // Validar formato IP xxx.xxx.xxx.xxx
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/
    if (formData.ip && !ipRegex.test(formData.ip)) {
      newErrors.ip = 'Formato de IP inválido. Use xxx.xxx.xxx.xxx'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const _validateEtapa2 = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.monitor_method) {
      newErrors.monitor_method = 'Método de monitoramento é obrigatório'
    }
    
    if (formData.monitor_method === 'snmp_v2c' || formData.monitor_method === 'snmp_v3') {
      if (!formData.snmp_community.trim()) {
        newErrors.snmp_community = 'Community SNMP é obrigatório'
      }
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const testarConectividade = async () => {
    setTestando(true)
    setTestResult(null)
    
    try {
      // Chamar Edge Function para testar conectividade
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/zabbix-api`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          method: 'host.get',
          params: {
            output: ['hostid', 'host', 'name', 'status'],
            filter: {
              ip: formData.ip
            }
          }
        })
      })

      const data = await response.json()
      
      if (data.error) {
        setTestResult('error')
      } else if (data.result && data.result.length > 0) {
        setTestResult('success')
      } else {
        setTestResult('error')
      }
    } catch (error) {
      console.error('Erro ao testar conectividade:', error)
      setTestResult('error')
    } finally {
      setTestando(false)
    }
  }

  const handleSubmit = async () => {
    if (etapa < 3) {
      if (etapa === 1 && !_validateEtapa1()) return
      if (etapa === 2 && !_validateEtapa2()) return
      setEtapa(etapa + 1)
      return
    }
    
    setLoading(true)
    
    try {
      const deviceData = {
        tenant_id: formData.tenant_id.trim(),
        proxy_id: formData.proxy_id.trim() || null,
        name: formData.name.trim(),
        ip: formData.ip.trim(),
        type: formData.type,
        manufacturer: formData.manufacturer.trim() || null,
        model: formData.model.trim() || null,
        monitor_method: formData.monitor_method,
        snmp_community: formData.snmp_community.trim() || null,
        snmp_version: formData.snmp_version || null,
        zabbix_host_id: formData.zabbix_host_id.trim() || null,
        status: 'unknown'
      }

      let zabbixHostId: string | null = null
      let zabbixError: string | null = null

      try {
        if (device?.id) {
          // Atualizar
          await atualizarHostZabbix(device.zabbix_host_id!, {
            name: formData.name.trim(),
            ip: formData.ip.trim(),
            monitor_method: formData.monitor_method,
            snmp_community: formData.snmp_community?.trim() || null
          })
          zabbixHostId = device.zabbix_host_id
        } else {
          // Criar novo
          const tenantSelecionado = tenants.find((t: any) => t.id === formData.tenant_id)
          const proxySelecionado = proxies.find((p: any) => p.id === formData.proxy_id)
          const zabbixProxyName = proxySelecionado?.zabbix_proxy_name || null
          
          zabbixHostId = await criarHostZabbix({
            name: formData.name.trim(),
            ip: formData.ip.trim(),
            monitor_method: formData.monitor_method,
            snmp_community: formData.snmp_community?.trim() || null,
            zabbix_proxy_name: zabbixProxyName,
            tenant_name: tenantSelecionado?.name || null
          })
        }
      } catch (error) {
        console.error('Erro ao sincronizar com Zabbix:', error)
        zabbixError = 'Não foi possível sincronizar com o Zabbix'
      }

      // Salvar no Supabase
      const deviceDataComZabbix = {
        ...deviceData,
        zabbix_host_id: zabbixHostId
      }

      if (device?.id) {
        // Atualizar
        const { error } = await supabase
          .from('devices')
          .update(deviceDataComZabbix)
          .eq('id', device.id)
        
        if (error) throw error
      } else {
        // Inserir
        const { error } = await supabase
          .from('devices')
          .insert(deviceDataComZabbix)
        
        if (error) throw error
      }

      if (zabbixError) {
        setErrors({ 
          submit: `Dispositivo salvo mas não sincronizado com o Zabbix. ${zabbixError}` 
        })
      }
      onSave()
    } catch (error) {
      console.error('Erro ao salvar dispositivo:', error)
      setErrors({ submit: 'Erro ao salvar dispositivo. Tente novamente.' })
    } finally {
      setLoading(false)
    }
  }

  const proxiosFiltrados = tenants.length > 0 
    ? proxies.filter((proxy: any) => {
        const tenant = tenants.find((t: any) => t.id === formData.tenant_id)
        return tenant ? proxy : null
      }).filter(Boolean)
    : []

  const handleClose = () => {
    setEtapa(1)
    setErrors({})
    setTestResult(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-noc-surface border border-noc-border rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-noc-text">
            {device?.id ? 'Editar Dispositivo' : 'Novo Dispositivo'}
          </h2>
          <button
            onClick={handleClose}
            className="text-noc-muted hover:text-noc-text transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Indicador de Etapa */}
        <div className="flex items-center justify-center mb-6">
          <div className="flex items-center space-x-2">
            {[1, 2, 3].map((num) => (
              <div
                key={num}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  num === etapa 
                    ? 'bg-noc-primary text-gray-900' 
                    : num < etapa 
                      ? 'bg-green-500 text-white' 
                      : 'bg-noc-border text-noc-muted'
                }`}
              >
                {num}
              </div>
            ))}
          </div>
          <div className="text-sm text-noc-muted">
            {etapa === 1 && 'Identificação'}
            {etapa === 2 && 'Monitoramento'}
            {etapa === 3 && 'Configurações'}
          </div>
        </div>

        {/* Formulário */}
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit() }}>
          {etapa === 1 && (
            <div className="space-y-4">
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

              {/* Proxy */}
              <div>
                <label className="block text-sm font-medium text-noc-text mb-2">
                  Proxy
                </label>
                <select
                  value={formData.proxy_id}
                  onChange={(e) => setFormData({ ...formData, proxy_id: e.target.value })}
                  className="w-full px-4 py-3 bg-noc-bg border border-noc-border rounded-md text-noc-text focus:outline-none focus:ring-2 focus:ring-noc-primary focus:border-transparent"
                >
                  <option value="">Nenhum</option>
                  {proxiosFiltrados.map((proxy) => (
                    <option key={proxy.id} value={proxy.id}>
                      {proxy.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Nome do Dispositivo */}
              <div>
                <label className="block text-sm font-medium text-noc-text mb-2">
                  Nome do dispositivo *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-4 py-3 bg-noc-bg border border-noc-border rounded-md text-noc-text placeholder-noc-muted focus:outline-none focus:ring-2 focus:ring-noc-primary focus:border-transparent ${
                    errors.name ? 'border-red-500' : ''
                  }`}
                  placeholder="Ex: Switch-CORE-01"
                  required
                />
                {errors.name && (
                  <p className="text-red-400 text-sm mt-1">{errors.name}</p>
                )}
              </div>

              {/* IP */}
              <div>
                <label className="block text-sm font-medium text-noc-text mb-2">
                  IP *
                </label>
                <input
                  type="text"
                  value={formData.ip}
                  onChange={(e) => setFormData({ ...formData, ip: e.target.value })}
                  className={`w-full px-4 py-3 bg-noc-bg border border-noc-border rounded-md text-noc-text placeholder-noc-muted focus:outline-none focus:ring-2 focus:ring-noc-primary focus:border-transparent ${
                    errors.ip ? 'border-red-500' : ''
                  }`}
                  placeholder="192.168.1.100"
                  required
                />
                {errors.ip && (
                  <p className="text-red-400 text-sm mt-1">{errors.ip}</p>
                )}
              </div>

              {/* Tipo */}
              <div>
                <label className="block text-sm font-medium text-noc-text mb-2">
                  Tipo de dispositivo *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full px-4 py-3 bg-noc-bg border border-noc-border rounded-md text-noc-text focus:outline-none focus:ring-2 focus:ring-noc-primary focus:border-transparent"
                  required
                >
                  <option value="switch">Switch</option>
                  <option value="camera">Câmera</option>
                  <option value="server">Servidor</option>
                  <option value="router">Roteador</option>
                  <option value="ups">UPS</option>
                  <option value="other">Outro</option>
                </select>
              </div>

              {/* Fabricante e Modelo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-noc-text mb-2">
                    Fabricante
                  </label>
                  <input
                    type="text"
                    value={formData.manufacturer}
                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                    className="w-full px-4 py-3 bg-noc-bg border border-noc-border rounded-md text-noc-text placeholder-noc-muted focus:outline-none focus:ring-2 focus:ring-noc-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-noc-text mb-2">
                    Modelo
                  </label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="w-full px-4 py-3 bg-noc-bg border border-noc-border rounded-md text-noc-text placeholder-noc-muted focus:outline-none focus:ring-2 focus:ring-noc-primary focus:border-transparent"
                  />
                </div>
              </div>

              {/* Botões */}
              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 border border-noc-border rounded-md text-noc-text hover:bg-noc-border/50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-noc-primary text-gray-900 rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-noc-primary focus:ring-offset-2 focus:ring-offset-noc-surface transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Salvando...' : 'Próximo'}
                </button>
              </div>
            </div>
          )}

          {etapa === 2 && (
            <div className="space-y-4">
              {/* Método de Monitoramento */}
              <div>
                <label className="block text-sm font-medium text-noc-text mb-2">
                  Método de monitoramento *
                </label>
                <select
                  value={formData.monitor_method}
                  onChange={(e) => setFormData({ ...formData, monitor_method: e.target.value as any })}
                  className={`w-full px-4 py-3 bg-noc-bg border border-noc-border rounded-md text-noc-text focus:outline-none focus:ring-2 focus:ring-noc-primary focus:border-transparent ${
                    errors.monitor_method ? 'border-red-500' : ''
                  }`}
                  required
                >
                  <option value="">Selecione um método</option>
                  <option value="snmp_v2c">SNMP v2c</option>
                  <option value="snmp_v3">SNMP v3</option>
                  <option value="icmp">ICMP (Ping)</option>
                  <option value="ssh">SSH</option>
                  <option value="api_rest">API REST</option>
                </select>
                {errors.monitor_method && (
                  <p className="text-red-400 text-sm mt-1">{errors.monitor_method}</p>
                )}
              </div>

              {/* Configurações SNMP */}
              {(formData.monitor_method === 'snmp_v2c' || formData.monitor_method === 'snmp_v3') && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-noc-text mb-2">
                      Community/Usuário SNMP *
                    </label>
                    <input
                      type="text"
                      value={formData.snmp_community}
                      onChange={(e) => setFormData({ ...formData, snmp_community: e.target.value })}
                      className={`w-full px-4 py-3 bg-noc-bg border border-noc-border rounded-md text-noc-text placeholder-noc-muted focus:outline-none focus:ring-2 focus:ring-noc-primary focus:border-transparent ${
                        errors.snmp_community ? 'border-red-500' : ''
                      }`}
                      placeholder="public"
                      required
                    />
                    {errors.snmp_community && (
                      <p className="text-red-400 text-sm mt-1">{errors.snmp_community}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-noc-text mb-2">
                      Versão SNMP
                    </label>
                    <select
                      value={formData.snmp_version}
                      onChange={(e) => setFormData({ ...formData, snmp_version: e.target.value })}
                      className="w-full px-4 py-3 bg-noc-bg border border-noc-border rounded-md text-noc-text focus:outline-none focus:ring-2 focus:ring-noc-primary focus:border-transparent"
                    >
                      <option value="2c">v2c</option>
                      <option value="3">v3</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Botão Testar Conectividade */}
              <div className="bg-noc-bg border border-noc-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-noc-text">
                    Testar Conectividade
                  </h3>
                  <button
                    type="button"
                    onClick={testarConectividade}
                    disabled={testando || !formData.ip}
                    className="px-4 py-2 bg-noc-accent text-white rounded-md hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-noc-accent focus:ring-offset-2 focus:ring-offset-noc-surface transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {testando ? 'Testando...' : 'Testar'}
                  </button>
                </div>

                {/* Resultado do Teste */}
                {testResult && (
                  <div className={`flex items-center space-x-2 p-3 rounded-md ${
                    testResult === 'success' 
                      ? 'bg-green-100 border-green-500 text-green-800' 
                      : 'bg-red-100 border-red-500 text-red-800'
                  }`}>
                    {testResult === 'success' ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                    <span className="text-sm font-medium">
                      {testResult === 'success' ? 'Dispositivo acessível' : 'Sem resposta'}
                    </span>
                  </div>
                )}
              </div>

              {/* Botões */}
              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => setEtapa(1)}
                  className="px-4 py-2 border border-noc-border rounded-md text-noc-text hover:bg-noc-border/50 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Anterior
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-noc-primary text-gray-900 rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-noc-primary focus:ring-offset-2 focus:ring-offset-noc-surface transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Salvando...' : 'Próximo'}
                </button>
              </div>
            </div>
          )}

          {etapa === 3 && (
            <div className="space-y-4">
              {/* Resumo */}
              <div className="bg-noc-bg border border-noc-border rounded-lg p-4">
                <h3 className="text-sm font-medium text-noc-text mb-3">
                  Resumo do Dispositivo
                </h3>
                <div className="space-y-2 text-sm text-noc-muted">
                  <div><strong>Cliente:</strong> {tenants.find(t => t.id === formData.tenant_id)?.name || '-'}</div>
                  <div><strong>Nome:</strong> {formData.name}</div>
                  <div><strong>IP:</strong> {formData.ip}</div>
                  <div><strong>Tipo:</strong> {formData.type}</div>
                  <div><strong>Fabricante:</strong> {formData.manufacturer || '-'}</div>
                  <div><strong>Modelo:</strong> {formData.model || '-'}</div>
                  <div><strong>Método:</strong> {formData.monitor_method}</div>
                  {formData.proxy_id && (
                    <div><strong>Proxy:</strong> {proxies.find(p => p.id === formData.proxy_id)?.name || '-'}</div>
                  )}
                </div>
              </div>

              {/* Botões */}
              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => setEtapa(2)}
                  className="px-4 py-2 border border-noc-border rounded-md text-noc-text hover:bg-noc-border/50 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Anterior
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-noc-primary text-gray-900 rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-noc-primary focus:ring-offset-2 focus:ring-offset-noc-surface transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          )}

          {/* Erro de submit */}
          {errors.submit && (
            <div className="text-red-400 text-sm mt-4">{errors.submit}</div>
          )}
        </form>
      </div>
    </div>
  )
}
