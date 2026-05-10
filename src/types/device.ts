export interface Device {
  id: string
  tenant_id: string
  proxy_id: string | null
  name: string
  ip: string
  type: 'switch' | 'camera' | 'server' | 'router' | 'ups' | 'other'
  manufacturer: string | null
  model: string | null
  monitor_method: 'snmp_v2c' | 'snmp_v3' | 'icmp' | 'ssh' | 'api_rest'
  snmp_community: string | null
  snmp_version: string | null
  zabbix_host_id: string | null
  status: 'online' | 'offline' | 'unknown'
  created_at: string
  updated_at: string
  tenant?: { name: string; slug: string }
  proxy?: { name: string; zabbix_proxy_name: string }
}
