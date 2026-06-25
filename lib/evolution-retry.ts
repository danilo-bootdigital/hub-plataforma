import { createClient } from '@/lib/supabase/server'
import { normalizarTelefoneParaComparacao } from './nome-contato'

interface RetryConfig {
  maxAttempts: number
  baseDelay: number
  maxDelay: number
  backoffMultiplier: number
}

interface EvolutionResponse {
  success: boolean
  data?: any
  error?: string
  attempt: number
}

export class EvolutionRetry {
  private static config: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2
  }

  static async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    customConfig?: Partial<RetryConfig>
  ): Promise<T> {
    const config = { ...this.config, ...customConfig }
    let lastError: Error

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        const result = await operation()

        // Log de sucesso
        console.log(`[EvolutionRetry] ${operationName} succeeded on attempt ${attempt}`)
        return result

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        // Se for último attempt, falha
        if (attempt === config.maxAttempts) {
          console.error(`[EvolutionRetry] ${operationName} failed after ${attempt} attempts:`, lastError.message)
          throw lastError
        }

        // Calcular delay com exponential backoff
        const delay = Math.min(
          config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1),
          config.maxDelay
        )

        console.warn(`[EvolutionRetry] ${operationName} failed (attempt ${attempt}), retrying in ${delay}ms:`, lastError.message)

        // Aguardar antes de retry
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    throw lastError!
  }

  static async sendMessage(
    instanceName: string,
    phoneNumber: string,
    message: string
  ): Promise<string> {
    return this.withRetry(
      async () => {
        const response = await fetch(`${process.env.EVOLUTION_API_URL}/message/sendText/${instanceName}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.EVOLUTION_API_KEY!
          },
          body: JSON.stringify({
            number: phoneNumber,
            text: message
          })
        })

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`Evolution API error: ${response.status} - ${errorText}`)
        }

        const data = await response.json()
        if (!data.key?.id) {
          throw new Error('Evolution API did not return message ID')
        }

        return data.key.id
      },
      'sendMessage',
      { maxAttempts: 3 }
    )
  }

  static async sendMedia(
    instanceName: string,
    phoneNumber: string,
    mediaBase64: string,
    mimeType: string,
    fileName?: string,
    caption?: string
  ): Promise<string> {
    return this.withRetry(
      async () => {
        const mediaType = mimeType.startsWith('image/') ? 'image' :
                         mimeType.startsWith('audio/') ? 'audio' :
                         mimeType.startsWith('video/') ? 'video' : 'document'

        const endpoint = mediaType === 'document'
          ? `/message/sendMedia/${instanceName}`
          : `/message/send${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)}WhatsApp${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)}/${instanceName}`

        const body: any = {
          number: phoneNumber,
          mediatype: mediaType,
          media: mediaBase64,
          mimetype: mimeType
        }

        if (caption) body.caption = caption
        if (fileName) body.fileName = fileName

        const response = await fetch(`${process.env.EVOLUTION_API_URL}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.EVOLUTION_API_KEY!
          },
          body: JSON.stringify(body)
        })

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`Evolution API media error: ${response.status} - ${errorText}`)
        }

        const data = await response.json()
        if (!data.key?.id) {
          throw new Error('Evolution API did not return media message ID')
        }

        return data.key.id
      },
      'sendMedia',
      { maxAttempts: 3 }
    )
  }

  static async getConnectionState(instanceName: string): Promise<string> {
    return this.withRetry(
      async () => {
        const response = await fetch(`${process.env.EVOLUTION_API_URL}/instance/connectionState/${instanceName}`, {
          method: 'GET',
          headers: {
            'apikey': process.env.EVOLUTION_API_KEY!
          }
        })

        if (!response.ok) {
          throw new Error(`Failed to get connection state: ${response.status}`)
        }

        const data = await response.json()
        return data.instance?.state || 'close'
      },
      'getConnectionState',
      { maxAttempts: 2 }
    )
  }

  static async createInstance(
    instanceName: string,
    webhookUrl: string
  ): Promise<void> {
    return this.withRetry(
      async () => {
        const response = await fetch(`${process.env.EVOLUTION_API_URL}/instance/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.EVOLUTION_API_KEY!
          },
          body: JSON.stringify({
            instanceName,
            qrcode: true,
            integration: 'WHATSAPP-BAILEYS',
            webhook: {
              url: webhookUrl,
              events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE', 'MESSAGES_UPDATE']
            }
          })
        })

        if (!response.ok) {
          throw new Error(`Failed to create instance: ${response.status}`)
        }
      },
      'createInstance',
      { maxAttempts: 2 }
    )
  }

  static async deleteInstance(instanceName: string): Promise<void> {
    return this.withRetry(
      async () => {
        const response = await fetch(`${process.env.EVOLUTION_API_URL}/instance/delete/${instanceName}`, {
          method: 'DELETE',
          headers: {
            'apikey': process.env.EVOLUTION_API_KEY!
          }
        })

        if (!response.ok && response.status !== 404) {
          throw new Error(`Failed to delete instance: ${response.status}`)
        }
      },
      'deleteInstance',
      { maxAttempts: 2 }
    )
  }
}