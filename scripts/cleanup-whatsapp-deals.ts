import { createAdminClient } from '../lib/supabase/admin'
import { writeFile } from 'fs/promises'

interface Deal {
  id: string;
  lead_id: string;
}

interface Lead {
  id: string;
}

interface MessageCount {
  lead_id: string;
  sent_messages: number;
  received_messages: number;
}

async function main() {
  const supabase = createAdminClient()

  // Find deals to delete
  const { data: deals, error: dealsError } = await supabase
    .from('deals')
    .select('id, organization_id, lead_id')
    .eq('status', 'novo')
    .eq('origem_lead', 'whatsapp')
    .neq('lead_id', null);

  if (dealsError) {
    console.error('Error fetching deals:', dealsError)
    return
  }

  if (!deals || deals.length === 0) {
    console.log('No deals found to process')
    return
  }

  // Get leads for these deals
  const { data: leads, error: leadsError } = await supabase
    .from('leads')
    .select('id')
    .in('id', deals.map(d => d.lead_id))
    .eq('origem', 'whatsapp')

  if (leadsError) {
    console.error('Error fetching leads:', leadsError)
    return
  }

  // Get messages count for each lead
  const leadsIds = leads.map(l => l.id)
  const { data: messages, error: messagesError } = await supabase.rpc('count_messages_for_leads', { lead_ids: leadsIds })

  if (messagesError) {
    console.error('Error counting messages:', messagesError)
    return
  }

  if (!messages) {
    console.log('No message data found')
    return
  }

  // Filter deals: only those with sent_messages > 0 AND received_messages = 0
  const dealsToDelete = deals.filter(deal => {
    const lead = leads.find(l => l.id === deal.lead_id)
    if (!lead) return false

    const messageCount = messages.find((m: MessageCount) => m.lead_id === deal.lead_id)
    return messageCount && messageCount.sent_messages > 0 && messageCount.received_messages === 0
  })

  if (dealsToDelete.length === 0) {
    console.log('No deals to delete')
    return
  }

  // Create backup data
  const backup = {
    timestamp: new Date().toISOString(),
    deals: dealsToDelete,
    total_deals: deals.length,
    deleted_count: dealsToDelete.length
  }

  // Save backup
  await writeFile('backup.json', JSON.stringify(backup, null, 2))

  // Delete deals
  for (const deal of dealsToDelete) {
    const { error: deleteError } = await supabase
      .from('deals')
      .delete()
      .eq('id', deal.id)

    if (deleteError) {
      console.error('Error deleting deal:', deal.id, deleteError)
    }
  }

  console.log(`Processed ${deals.length} deals, Removed: ${dealsToDelete.length} deals`)
  console.log(`Backup saved to backup.json`)
}

main()