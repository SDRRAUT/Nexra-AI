import { streamText, stepCountIs } from 'ai'
import { getModel } from '@/lib/ai/providers'
import { allTools } from '@/lib/ai/tools'
import { buildContext } from '@/lib/ai/context'
import { buildSystemPrompt } from '@/lib/ai/prompts'
import prisma from '@/lib/db/prisma'
import { NextRequest } from 'next/server'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { messages, conversationId } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Messages array is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Ensure default user exists
    await prisma.user.upsert({
      where: { id: 'default-user' },
      update: {},
      create: {
        id: 'default-user',
        name: 'User',
        timezone: 'Asia/Kolkata',
        setupDone: false,
      },
    })

    // Build context for this request
    const ctx = await buildContext()
    const systemPrompt = buildSystemPrompt(ctx)

    // Save user message to conversation (if conversationId provided)
    const lastUserMessage = messages[messages.length - 1]
    if (conversationId && lastUserMessage?.role === 'user') {
      await prisma.message.create({
        data: {
          conversationId,
          role: 'user',
          content: typeof lastUserMessage.content === 'string'
            ? lastUserMessage.content
            : JSON.stringify(lastUserMessage.content),
        },
      }).catch(() => {})
    }

    // Format messages cleanly for streamText
    const formattedMessages = messages.map((m: any) => ({
      role: (m.role === 'assistant' ? 'assistant' : m.role === 'system' ? 'system' : 'user') as 'assistant' | 'system' | 'user',
      content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content || ''),
    }))

    const result = streamText({
      model: getModel('balanced'),
      system: systemPrompt,
      messages: formattedMessages,
      tools: allTools,
      stopWhen: stepCountIs(10), // Allow up to 10 tool loops per response
      onFinish: async ({ text, toolCalls, toolResults }) => {
        // Save assistant response to conversation
        if (conversationId && text) {
          await prisma.message.create({
            data: {
              conversationId,
              role: 'assistant',
              content: text,
              toolCalls: toolCalls ? JSON.stringify(toolCalls) : undefined,
              toolResults: toolResults ? JSON.stringify(toolResults) : undefined,
            },
          }).catch(() => {})
        }
      },
    })

    return result.toTextStreamResponse()
  } catch (error: any) {
    console.error('Chat API error:', error)
    return new Response(JSON.stringify({ error: error?.message || 'Failed to process request' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
