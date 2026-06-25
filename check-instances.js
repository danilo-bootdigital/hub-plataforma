const { createClient } = require('@supabase/supabase-js')

require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Variáveis de ambiente não configuradas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkInstances() {
  const { data, error } = await supabase
    .from('whatsapp_instances')
    .select('*')
    .order('criado_em', { ascending: false })

  if (error) {
    console.error('Erro ao buscar instâncias:', error)
    return
  }

  console.log('Instâncias encontradas:', data.length)
  data.forEach(inst => {
    console.log('\n---')
    console.log('ID:', inst.id)
    console.log('Nome:', inst.nome)
    console.log('Instance Name:', inst.evolution_instance_name)
    console.log('Status:', inst.status_conexao)
    console.log('Compartilhado:', inst.compartilhado)
    console.log('Vendedor ID:', inst.vendedor_id)
    console.log('Criado em:', new Date(inst.criado_em).toLocaleString())
    console.log('Atualizado em:', new Date(inst.atualizado_em).toLocaleString())
  })
}

checkInstances()