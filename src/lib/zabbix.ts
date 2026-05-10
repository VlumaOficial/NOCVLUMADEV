import { supabase } from './supabase'
import type { ZabbixProxy, ZabbixHost, ZabbixTrigger } from '../types/zabbix'

const ZABBIX_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/zabbix-api` 

export async function callZabbixAPI(method: string, params: object = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  
  const response = await fetch(ZABBIX_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token}` 
    },
    body: JSON.stringify({ method, params })
  })

  const data = await response.json()
  
  if (data.error) {
    throw new Error(data.error.data || data.error.message)
  }
  
  return data.result
}

export async function getProxies(): Promise<ZabbixProxy[]> {
  return callZabbixAPI('proxy.get', {
    output: ['proxyid', 'name', 'lastaccess', 'state']
  })
}

export async function getHosts(proxyIds?: string[]): Promise<ZabbixHost[]> {
  const params: Record<string, unknown> = {
    output: ['hostid', 'host', 'name', 'status'],
    selectInterfaces: ['ip', 'type', 'port'],
    proxyids: proxyIds
  }
  return callZabbixAPI('host.get', params)
}

export async function getTriggers(hostIds?: string[]): Promise<ZabbixTrigger[]> {
  return callZabbixAPI('trigger.get', {
    output: ['triggerid', 'description', 'priority', 'value', 'lastchange'],
    hostids: hostIds,
    only_true: true,
    sortfield: 'priority',
    sortorder: 'DESC'
  })
}

export async function criarHostZabbix(params: {
  name: string
  ip: string
  monitor_method: string
  snmp_community?: string | null
  snmp_version?: string | null
  zabbix_proxy_name?: string | null
}): Promise<string> {
  
  // Definir interface baseada no método de monitoramento
  const interfaceType = params.monitor_method === 'snmp_v2c' || 
    params.monitor_method === 'snmp_v3' ? 2 : 1 // 1=agent, 2=snmp
  
  const hostInterface: Record<string, unknown> = {
    type: interfaceType,
    main: 1,
    useip: 1,
    ip: params.ip,
    dns: '',
    port: interfaceType === 2 ? '161' : '10050'
  }

  // Adicionar detalhes SNMP se necessário
  if (interfaceType === 2) {
    hostInterface.details = {
      version: params.monitor_method === 'snmp_v3' ? 3 : 2,
      community: params.snmp_community || 'public',
      bulk: 1
    }
  }

  // Buscar grupo de hosts padrão
  const grupos = await callZabbixAPI('hostgroup.get', {
    output: ['groupid', 'name'],
    filter: { name: ['Linux servers'] }
  })
  
  const groupid = grupos.length > 0 ? grupos[0].groupid : '2'

  // Buscar template baseado no método
  let templateName = 'ICMP Ping'
  if (params.monitor_method === 'snmp_v2c' || params.monitor_method === 'snmp_v3') {
    templateName = 'Network Generic Device by SNMP'
  }
  
  const templates = await callZabbixAPI('template.get', {
    output: ['templateid', 'name'],
    filter: { name: [templateName] }
  })

  const hostParams: Record<string, unknown> = {
    host: params.name,
    name: params.name,
    interfaces: [hostInterface],
    groups: [{ groupid }]
  }

  // Adicionar proxy se fornecido
  if (params.zabbix_proxy_name) {
    const proxies = await callZabbixAPI('proxy.get', {
      output: ['proxyid', 'name'],
      filter: { name: [params.zabbix_proxy_name] }
    })
    if (proxies.length > 0) {
      hostParams.monitored_by = 1
      hostParams.proxyid = proxies[0].proxyid
    }
  }

  // Adicionar template se encontrado
  if (templates.length > 0) {
    hostParams.templates = [{ templateid: templates[0].templateid }]
  }

  const result = await callZabbixAPI('host.create', hostParams)
  return result.hostids[0]
}

export async function atualizarHostZabbix(hostId: string, params: {
  name: string
  ip: string
  monitor_method: string
  snmp_community?: string | null
}): Promise<void> {
  const interfaceType = params.monitor_method === 'snmp_v2c' || 
    params.monitor_method === 'snmp_v3' ? 2 : 1

  // Buscar interfaces atuais
  const interfaces = await callZabbixAPI('hostinterface.get', {
    output: ['interfaceid'],
    hostids: [hostId]
  })

  const updates: Record<string, unknown> = {
    hostid: hostId,
    host: params.name,
    name: params.name,
  }

  if (interfaces.length > 0) {
    const interfaceUpdate: Record<string, unknown> = {
      interfaceid: interfaces[0].interfaceid,
      ip: params.ip,
      port: interfaceType === 2 ? '161' : '10050',
    }
    if (interfaceType === 2) {
      interfaceUpdate.details = {
        version: params.monitor_method === 'snmp_v3' ? 3 : 2,
        community: params.snmp_community || 'public',
        bulk: 1
      }
    }
    await callZabbixAPI('hostinterface.update', interfaceUpdate)
  }

  await callZabbixAPI('host.update', updates)
}

export async function excluirHostZabbix(hostId: string): Promise<void> {
  await callZabbixAPI('host.delete', [hostId])
}

export async function sincronizarStatusDispositivos(
  devices: Array<{ id: string; zabbix_host_id: string | null; status: string }>
): Promise<Array<{ id: string; status: 'online' | 'offline' | 'unknown' }>> {
  const hostIds = devices
    .filter(d => d.zabbix_host_id)
    .map(d => d.zabbix_host_id as string)

  if (hostIds.length === 0) return []

  const hosts = await callZabbixAPI('host.get', {
    output: ['hostid', 'available'],
    hostids: hostIds
  })

  return hosts.map((host: { hostid: string; available: string }) => ({
    id: devices.find(d => d.zabbix_host_id === host.hostid)?.id || '',
    status: host.available === '1' ? 'online' : 
            host.available === '2' ? 'offline' : 'unknown'
  }))
}
