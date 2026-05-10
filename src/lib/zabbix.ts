import { supabase } from './supabase'

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

export async function getProxies() {
  return callZabbixAPI('proxy.get', {
    output: ['proxyid', 'name', 'lastaccess', 'state']
  })
}

export async function getHosts(proxyIds?: string[]) {
  const params: Record<string, unknown> = {
    output: ['hostid', 'host', 'name', 'status'],
    selectInterfaces: ['ip', 'type', 'port'],
    proxyids: proxyIds
  }
  return callZabbixAPI('host.get', params)
}

export async function getTriggers(hostIds?: string[]) {
  return callZabbixAPI('trigger.get', {
    output: ['triggerid', 'description', 'priority', 'value', 'lastchange'],
    hostids: hostIds,
    only_true: true,
    sortfield: 'priority',
    sortorder: 'DESC'
  })
}
