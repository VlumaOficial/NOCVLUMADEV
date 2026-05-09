export interface Cliente {
  id: string
  name: string
  slug: string
  plan: 'starter' | 'professional' | 'enterprise'
  status: 'active' | 'suspended' | 'cancelled'
  device_limit?: number
  created_at: string
  updated_at: string
}
