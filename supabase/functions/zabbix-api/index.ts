import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const ZABBIX_URL = Deno.env.get("ZABBIX_URL") || ""
const ZABBIX_USER = Deno.env.get("ZABBIX_USER") || ""
const ZABBIX_PASSWORD = Deno.env.get("ZABBIX_PASSWORD") || ""

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

async function getZabbixToken(): Promise<string> {
  const response = await fetch(ZABBIX_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "user.login",
      params: { username: ZABBIX_USER, password: ZABBIX_PASSWORD },
      id: 1,
    }),
  })
  const data = await response.json()
  if (data.error) throw new Error(data.error.data)
  return data.result
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { method, params } = await req.json()

    const token = await getZabbixToken()

    const response = await fetch(ZABBIX_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method,
        params,
        auth: token,
        id: 1,
      }),
    })

    const data = await response.json()

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    })
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    )
  }
})
