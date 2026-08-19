import { streamText, stepCountIs } from 'ai'
import { getModel } from '@/lib/ai/providers'
import { allTools } from '@/lib/ai/tools'
import { buildContext } from '@/lib/ai/context'
import { buildSystemPrompt } from '@/lib/ai/prompts'
import prisma from '@/lib/db/prisma'
import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60
const DEFAULT_USER_ID = 'default-user'

// GET: Retrieve conversation history or conversation list
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const listOnly = searchParams.get('list') === 'true'
    const requestedConvId = searchParams.get('conversationId')

    // If requested list of all conversations
    if (listOnly) {
      const conversations = await prisma.conversation.findMany({
        where: { userId: DEFAULT_USER_ID },
        orderBy: { updatedAt: 'desc' },
        include: {
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
        },
      })
      return NextResponse.json({ conversations })
    }

    // Retrieve active or requested conversation
    let conversation
    if (requestedConvId) {
      conversation = await prisma.conversation.findUnique({
        where: { id: requestedConvId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
            take: 100,
          },
        },
      })
    }

    if (!conversation) {
      conversation = await prisma.conversation.findFirst({
        where: { userId: DEFAULT_USER_ID },
        orderBy: { updatedAt: 'desc' },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
            take: 100,
          },
        },
      })
    }

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          userId: DEFAULT_USER_ID,
          title: 'Main Chat',
        },
        include: { messages: true },
      })
    }

    // Fetch conversation list too for drawer
    const allConversations = await prisma.conversation.findMany({
      where: { userId: DEFAULT_USER_ID },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        updatedAt: true,
        _count: { select: { messages: true } },
      },
    })

    return NextResponse.json({
      conversationId: conversation.id,
      messages: conversation.messages.map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
      })),
      conversations: allConversations,
    })
  } catch (error) {
    console.error('Error fetching chat history:', error)
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 })
  }
}

// POST: Stream chat response and persist message history
export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const isNew = searchParams.get('new') === 'true'

    if (isNew) {
      const newConv = await prisma.conversation.create({
        data: {
          userId: DEFAULT_USER_ID,
          title: 'New Conversation',
        },
      })
      return NextResponse.json({ conversationId: newConv.id, title: newConv.title })
    }

    const { messages, conversationId: passedConvId } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Messages array is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Resolve or create conversation
    let convId = passedConvId
    if (!convId) {
      const activeConv = await prisma.conversation.findFirst({
        where: { userId: DEFAULT_USER_ID },
        orderBy: { updatedAt: 'desc' },
      })
      if (activeConv) {
        convId = activeConv.id
      } else {
        const newConv = await prisma.conversation.create({
          data: { userId: DEFAULT_USER_ID, title: 'Main Chat' },
        })
        convId = newConv.id
      }
    }

    // Build context concurrently for fast response
    const [ctx] = await Promise.all([
      buildContext(),
    ])
    const systemPrompt = buildSystemPrompt(ctx)

    // Save user message to database
    const lastUserMessage = messages[messages.length - 1]
    if (convId && lastUserMessage?.role === 'user') {
      const userText = typeof lastUserMessage.content === 'string'
        ? lastUserMessage.content
        : JSON.stringify(lastUserMessage.content)

      await prisma.message.create({
        data: {
          conversationId: convId,
          role: 'user',
          content: userText,
        },
      }).catch((e: any) => console.error('Failed to save user msg', e))

      // Auto-title conversation from first message if default
      const currentConv = await prisma.conversation.findUnique({ where: { id: convId } })
      if (currentConv && (currentConv.title === 'Main Chat' || currentConv.title === 'New Conversation')) {
        const cleanTitle = userText.slice(0, 30).trim() + (userText.length > 30 ? '...' : '')
        await prisma.conversation.update({
          where: { id: convId },
          data: { title: cleanTitle },
        }).catch(() => {})
      }
    }

    // Format clean message history — take only last 8 messages to keep token count compact & ultra-fast
    const recentMessages = messages.slice(-8)
    const formattedMessages = recentMessages.map((m: any) => ({
      role: (m.role === 'assistant' ? 'assistant' : m.role === 'system' ? 'system' : 'user') as 'assistant' | 'system' | 'user',
      content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content || ''),
    }))

    const result = streamText({
      model: getModel('fast'),
      system: systemPrompt,
      messages: formattedMessages,
      tools: allTools,
      stopWhen: stepCountIs(2), // Max 2 steps: 1 for tool execution + 1 for streaming text response
      onFinish: async ({ text, toolCalls, toolResults }) => {
        if (convId && text) {
          await prisma.message.create({
            data: {
              conversationId: convId,
              role: 'assistant',
              content: text,
              toolCalls: toolCalls ? JSON.stringify(toolCalls) : undefined,
              toolResults: toolResults ? JSON.stringify(toolResults) : undefined,
            },
          }).catch((e: any) => console.error('Failed to save assistant msg', e))

          await prisma.conversation.update({
            where: { id: convId },
            data: { updatedAt: new Date() },
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

// DELETE: Delete conversation or clear history
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const conversationId = searchParams.get('conversationId')

    if (conversationId) {
      await prisma.message.deleteMany({
        where: { conversationId },
      })
      await prisma.conversation.delete({
        where: { id: conversationId },
      })
      return NextResponse.json({ success: true })
    }

    const conversation = await prisma.conversation.findFirst({
      where: { userId: DEFAULT_USER_ID },
      orderBy: { updatedAt: 'desc' },
    })

    if (conversation) {
      await prisma.message.deleteMany({
        where: { conversationId: conversation.id },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error clearing chat history:', error)
    return NextResponse.json({ error: 'Failed to clear history' }, { status: 500 })
  }
}
