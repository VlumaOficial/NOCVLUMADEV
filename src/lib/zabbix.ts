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
  tenant_name?: string | null
}): Promise<string> {

  // 1. Buscar ou criar grupo de hosts do tenant
  let groupid = '2' // fallback para grupo padrão
  if (params.tenant_name) {
    const grupos = await callZabbixAPI('hostgroup.get', {
      output: ['groupid', 'name'],
      filter: { name: [params.tenant_name] }
    })
    if (grupos.length > 0) {
      groupid = grupos[0].groupid
    } else {
      // Criar grupo com nome do tenant
      const novoGrupo = await callZabbixAPI('hostgroup.create', {
        name: params.tenant_name
      })
      groupid = novoGrupo.groupids[0]
    }
  }

  // 2. Definir interface baseada no método de monitoramento
  const isSNMP = params.monitor_method === 'snmp_v2c' || 
                 params.monitor_method === 'snmp_v3'
  
  const hostInterface: Record<string, unknown> = {
    type: isSNMP ? 2 : 1,
    main: 1,
    useip: 1,
    ip: params.ip,
    dns: '',
    port: isSNMP ? '161' : '10050'
  }

  if (isSNMP) {
    hostInterface.details = {
      version: params.monitor_method === 'snmp_v3' ? 3 : 2,
      community: params.snmp_community || 'public',
      bulk: 1
    }
  }

  // 3. Buscar template adequado
  let templateName = 'ICMP Ping'
  if (isSNMP) {
    templateName = 'Network Generic Device by SNMP'
  }

  const templates = await callZabbixAPI('template.get', {
    output: ['templateid', 'name'],
    filter: { name: [templateName] }
  })

  // 4. Montar parâmetros do host
  const hostParams: Record<string, unknown> = {
    host: params.name,
    name: params.name,
    interfaces: [hostInterface],
    groups: [{ groupid }],
  }

  // 5. Adicionar template se encontrado
  if (templates.length > 0) {
    hostParams.templates = [{ templateid: templates[0].templateid }]
  }

  // 6. Adicionar proxy (Zabbix 7.0: monitored_by=0 servidor, monitored_by=1 proxy)
  hostParams.monitored_by = 0
  hostParams.proxyid = 0
  if (params.zabbix_proxy_name) {
    const proxies = await callZabbixAPI('proxy.get', {
      output: ['proxyid', 'name'],
      filter: { name: [params.zabbix_proxy_name] }
    })
    if (proxies.length > 0) {
      hostParams.monitored_by = 1
      hostParams.proxyid = parseInt(proxies[0].proxyid, 10)
    }
  }

  // 7. Criar host e retornar ID
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

  const items = await callZabbixAPI('item.get', {
    output: ['hostid', 'lastvalue', 'lastclock'],
    hostids: hostIds,
    filter: { key_: 'icmpping' }
  })

  return devices
    .filter(d => d.zabbix_host_id)
    .map(d => {
      const item = items.find((i: { hostid: string; lastvalue: string; lastclock: string }) =>
        i.hostid === d.zabbix_host_id
      )
      if (!item || item.lastclock === '0') {
        return { id: d.id, status: 'unknown' as const }
      }
      return {
        id: d.id,
        status: item.lastvalue === '1' ? 'online' as const : 'offline' as const
      }
    })
}

export async function criarProxyZabbix(params: {
  name: string
  psk_identity: string
  psk_key: string
}): Promise<string> {
  const result = await callZabbixAPI('proxy.create', {
    name: params.name,
    operating_mode: 0,
    tls_connect: 1,
    tls_accept: 2,
    tls_psk_identity: params.psk_identity,
    tls_psk: params.psk_key
  })
  return result.proxyids[0]
}

export async function excluirProxyZabbix(proxyName: string): Promise<void> {
  // Buscar proxyid pelo nome
  const proxies = await callZabbixAPI('proxy.get', {
    output: ['proxyid', 'name'],
    filter: { name: [proxyName] }
  })
  if (proxies.length === 0) return

  const proxyid = proxies[0].proxyid

  // Buscar hosts vinculados ao proxy
  const hosts = await callZabbixAPI('host.get', {
    output: ['hostid'],
    proxyids: [proxyid]
  })

  // Desassociar hosts do proxy antes de deletar
  if (hosts.length > 0) {
    await callZabbixAPI('host.massupdate', {
      hosts: hosts.map((h: { hostid: string }) => ({ hostid: h.hostid })),
      monitored_by: 0,
      proxyid: 0
    })
  }

  // Deletar proxy
  await callZabbixAPI('proxy.delete', [proxyid])
}
