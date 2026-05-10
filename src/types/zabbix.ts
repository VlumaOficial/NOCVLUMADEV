export interface ZabbixProxy {
  proxyid: string
  name: string
  lastaccess: string
  state: string
}

export interface ZabbixHost {
  hostid: string
  host: string
  name: string
  status: string
  interfaces?: Array<{
    ip: string
    type: string
    port: string
  }>
}

export interface ZabbixTrigger {
  triggerid: string
  description: string
  priority: string
  value: string
  lastchange: string
}
