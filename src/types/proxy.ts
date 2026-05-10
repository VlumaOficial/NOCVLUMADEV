export interface Proxy {
  id: string
  tenant_id: string
  name: string
  zabbix_proxy_name: string
  psk_identity: string
  psk_key: string
  status: 'online' | 'offline' | 'unknown'
  last_seen: string | null
  created_at: string
  updated_at: string
  tenant?: {
    name: string
    slug: string
  }
}
