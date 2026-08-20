import { localDb, type LocalChatMessage } from '@/lib/db/localDb'

export interface ClientAICallback {
  onChunk: (chunk: string) => void
  onToolExecuted?: (toolName: string, result: any) => void
  onFinish?: (fullText: string) => void
}

/**
 * Executes a client-side AI streaming conversation directly with Google Gemini
 * and mutates the phone's local IndexedDB directly!
 */
export async function streamClientChat(
  messages: { role: string; content: string }[],
  callbacks: ClientAICallback
) {
  // 1. Get API key from local DB preferences or localStorage
  let apiKey = ''
  try {
    const keyPref = await localDb.preferences.get('gemini_api_key')
    apiKey = keyPref?.value || ''
  } catch {}
  if (!apiKey && typeof localStorage !== 'undefined') {
    apiKey = localStorage.getItem('srushti_gemini_api_key') || ''
  }

  if (!apiKey) {
    throw new Error('Google Gemini API key is missing. Please go to Settings and enter your key.')
  }

  // 2. Build local context summary from IndexedDB
  const [tasks, habits, goals, memories] = await Promise.all([
    localDb.tasks.toArray(),
    localDb.habits.toArray(),
    localDb.goals.toArray(),
    localDb.memories.toArray(),
  ])

  const contextPrompt = `
You are Srushti — a personal AI assistant and persistent life manager.
You manage the user's schedule, goals, habits, and tasks directly on their phone.

CURRENT LOCAL DATA:
- Tasks (${tasks.length}): ${tasks.slice(0, 5).map(t => `${t.title} [${t.priority}]`).join(', ')}
- Goals (${goals.length}): ${goals.map(g => `${g.title} (${g.progress}%)`).join(', ')}
- Habits (${habits.length}): ${habits.map(h => `${h.title} (streak: ${h.currentStreak})`).join(', ')}
- Memories (${memories.length}): ${memories.slice(0, 5).map(m => m.content).join('; ')}

RULES:
- When user asks you to create a task, study plan, or save a memory, confirm clearly what you did.
- Always be practical, supportive, and direct.
- Never mention internal database structures.
`

  // Format messages for Gemini API
  const contents = [
    { role: 'user', parts: [{ text: contextPrompt }] },
    { role: 'model', parts: [{ text: "Understood. I am Srushti, your personal PA. How can I help you right now?" }] },
    ...messages.slice(-8).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
  ]

  const candidateModels = ['gemini-3.6-flash', 'gemini-2.0-flash', 'gemini-1.5-flash']
  let response: Response | null = null
  let lastErr = ''

  for (const model of candidateModels) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents }),
        }
      )
      if (res.ok) {
        response = res
        break
      } else {
        lastErr = await res.text()
      }
    } catch (e: any) {
      lastErr = e.message || 'Network error'
    }
  }

  if (!response || !response.ok) {
    throw new Error(`Gemini API error: ${lastErr || 'Failed to connect'}`)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('No stream available')

  const decoder = new TextDecoder()
  let fullText = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break

    const chunkStr = decoder.decode(value, { stream: true })
    const lines = chunkStr.split('\n')

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const json = JSON.parse(line.slice(6))
          const textChunk = json.candidates?.[0]?.content?.parts?.[0]?.text || ''
          if (textChunk) {
            fullText += textChunk
            callbacks.onChunk(textChunk)
          }
        } catch {}
      }
    }
  }

  // 3. Proactive local memory & task extraction heuristics from response
  const lastUserText = messages[messages.length - 1]?.content || ''
  if (lastUserText.toLowerCase().includes('remember') || lastUserText.toLowerCase().includes('prefer') || lastUserText.toLowerCase().includes('i like')) {
    await localDb.memories.add({
      id: 'mem-' + Date.now(),
      content: lastUserText,
      category: 'preference',
      importance: 'medium',
      accessCount: 1,
      createdAt: new Date().toISOString(),
    }).catch(() => {})
  }

  if (callbacks.onFinish) {
    callbacks.onFinish(fullText)
  }

  return fullText
}
