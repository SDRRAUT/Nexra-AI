import { localDb } from '@/lib/db/localDb'
import { scheduleCustomReminder, scheduleTaskReminder } from '@/lib/notifications/native'

export interface ClientAICallback {
  onChunk: (chunk: string) => void
  onToolExecuting?: (toolName: string, params: any) => void
  onToolExecuted?: (toolName: string, result: any) => void
  onFinish?: (fullText: string) => void
}

export interface OnboardingAnswers {
  name: string
  assistantName?: string
  role: string
  mainGoals: string
  dailyRoutine: {
    wakeTime: string
    sleepTime: string
    focusHours: number
  }
  habitsToBuild: string
  upcomingDeadlines: string
  aiTone: string
  apiKey?: string
}

/**
 * Execute client-side tool action directly against IndexedDB
 */
export async function executeClientTool(toolName: string, params: any): Promise<any> {
  try {
    let result: any = { success: true }

    switch (toolName) {
      case 'create_task': {
        const taskId = 'task-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6)
        const newTask = {
          id: taskId,
          title: params.title || 'Untitled Task',
          description: params.description || '',
          category: params.category || 'personal',
          priority: params.priority || 'medium',
          status: 'planned',
          estimatedMinutes: Number(params.estimatedMinutes) || 30,
          deadline: params.deadline ? new Date(params.deadline).toISOString() : undefined,
          scheduledStart: params.scheduledStart ? new Date(params.scheduledStart).toISOString() : undefined,
          postponeCount: 0,
          createdAt: new Date().toISOString(),
        }
        await localDb.tasks.add(newTask)
        if (newTask.scheduledStart || newTask.deadline) {
          scheduleTaskReminder(newTask).catch(() => {})
        }
        result = { success: true, taskId, task: newTask }
        break
      }

      case 'create_reminder':
      case 'schedule_notification': {
        const title = params.title || 'Reminder'
        let scheduleDate = new Date(params.time || params.scheduleAt || Date.now() + 60000)
        if (isNaN(scheduleDate.getTime()) || scheduleDate <= new Date()) {
          scheduleDate = new Date(Date.now() + 60000) // 1 min fallback if past/invalid
        }

        const numericId = await scheduleCustomReminder({
          title,
          body: params.body || `Reminder from your Assistant: ${title}`,
          scheduleAt: scheduleDate,
          actionType: 'task',
        })

        // Also add task to schedule
        const taskId = 'task-' + Date.now()
        await localDb.tasks.add({
          id: taskId,
          title,
          description: params.body || '',
          category: 'reminder',
          priority: 'high',
          status: 'planned',
          scheduledStart: scheduleDate.toISOString(),
          deadline: scheduleDate.toISOString(),
          estimatedMinutes: 15,
          postponeCount: 0,
          createdAt: new Date().toISOString(),
        }).catch(() => {})

        result = { success: true, reminderId: numericId, scheduledAt: scheduleDate.toISOString() }
        break
      }

      case 'complete_task': {
        const tasks = await localDb.tasks.toArray()
        const target = params.taskId
          ? tasks.find(t => t.id === params.taskId)
          : tasks.find(t => t.title.toLowerCase().includes((params.title || '').toLowerCase()))

        if (target) {
          await localDb.tasks.update(target.id, { status: 'completed' })
          result = { success: true, taskId: target.id, title: target.title }
        } else {
          result = { success: false, error: 'Task not found' }
        }
        break
      }

      case 'delete_task': {
        const tasks = await localDb.tasks.toArray()
        const target = params.taskId
          ? tasks.find(t => t.id === params.taskId)
          : tasks.find(t => t.title.toLowerCase().includes((params.title || '').toLowerCase()))

        if (target) {
          await localDb.tasks.delete(target.id)
          result = { success: true, taskId: target.id }
        }
        break
      }

      case 'create_goal': {
        const goalId = 'goal-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6)
        const milestones = (params.milestones || []).map((m: any, idx: number) => ({
          id: `m-${Date.now()}-${idx}`,
          title: typeof m === 'string' ? m : m.title,
          status: 'pending',
        }))

        const newGoal = {
          id: goalId,
          title: params.title || 'New Goal',
          description: params.description || '',
          category: params.category || 'learning',
          status: 'active',
          priority: params.priority || 'high',
          progress: 0,
          targetDate: params.targetDate ? new Date(params.targetDate).toISOString() : undefined,
          milestones: milestones.length > 0 ? milestones : undefined,
          createdAt: new Date().toISOString(),
        }
        await localDb.goals.add(newGoal)
        result = { success: true, goalId, goal: newGoal }
        break
      }

      case 'create_habit': {
        const habitId = 'habit-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6)
        const newHabit = {
          id: habitId,
          title: params.title || 'New Habit',
          category: params.category || 'productivity',
          frequency: params.frequency || 'daily',
          scheduledTime: params.scheduledTime || '09:00',
          currentStreak: 0,
          longestStreak: 0,
          totalCompleted: 0,
          createdAt: new Date().toISOString(),
        }
        await localDb.habits.add(newHabit)
        result = { success: true, habitId, habit: newHabit }
        break
      }

      case 'schedule_event': {
        const eventId = 'evt-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6)
        const newEvent = {
          id: eventId,
          title: params.title || 'Event',
          description: params.description || '',
          startTime: params.startTime ? new Date(params.startTime).toISOString() : new Date().toISOString(),
          endTime: params.endTime ? new Date(params.endTime).toISOString() : new Date(Date.now() + 3600000).toISOString(),
          type: params.type || 'focus',
          createdAt: new Date().toISOString(),
        }
        await localDb.events.add(newEvent)
        result = { success: true, eventId, event: newEvent }
        break
      }

      case 'save_memory': {
        const memId = 'mem-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6)
        const newMemory = {
          id: memId,
          content: params.content,
          category: params.category || 'preference',
          importance: params.importance || 'medium',
          accessCount: 1,
          createdAt: new Date().toISOString(),
        }
        await localDb.memories.add(newMemory)
        result = { success: true, memId, memory: newMemory }
        break
      }

      default:
        result = { success: false, error: 'Unknown tool' }
    }

    // Trigger universal real-time reactivity event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('srushti_data_changed', { detail: { toolName, params, result } }))
    }

    return result
  } catch (err: any) {
    console.error(`Tool execution error for ${toolName}:`, err)
    return { success: false, error: err.message }
  }
}

export interface ClientAICallback {
  onChunk: (chunk: string) => void
  onToolExecuting?: (toolName: string, params: any) => void
  onToolExecuted?: (toolName: string, result: any) => void
}

export interface ClientAIOptions {
  signal?: AbortSignal
}

/**
 * Executes a client-side AI streaming conversation directly with Google Gemini
 * with ultra-fast latency (<300ms time-to-first-token) and automatic sub-agent tool execution!
 */
export async function streamClientChat(
  messages: { role: string; content: string }[],
  callbacks: ClientAICallback,
  options?: ClientAIOptions
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
    throw new Error('Google Gemini API key is missing. Please go to Settings ⚙️ to add your key.')
  }

  // 2. Build local context summary from IndexedDB
  const [tasks, habits, goals, memories, users] = await Promise.all([
    localDb.tasks.toArray(),
    localDb.habits.toArray(),
    localDb.goals.toArray(),
    localDb.memories.toArray(),
    localDb.user.toArray(),
  ])

  const userName = users[0]?.name || (typeof localStorage !== 'undefined' ? localStorage.getItem('srushti_user_name') : 'Sanket') || 'Sanket'
  const assistantName = (typeof localStorage !== 'undefined' ? localStorage.getItem('srushti_assistant_name') : 'Nexra') || 'Nexra'
  const timezone = users[0]?.timezone || 'Asia/Kolkata'

  const contextPrompt = `
You are ${assistantName} — an ultra-fast, proactive personal AI assistant and life manager for ${userName}.
Current Time: ${new Date().toLocaleString('en-US', { timeZone: timezone })}

CURRENT USER DATA IN PHONE:
- Tasks (${tasks.length}): ${tasks.slice(0, 8).map(t => `[${t.status}] ${t.title} (${t.priority})`).join('; ') || 'No tasks yet'}
- Goals (${goals.length}): ${goals.map(g => `${g.title} [${g.progress}%]`).join('; ') || 'No goals yet'}
- Habits (${habits.length}): ${habits.map(h => `${h.title} (streak: ${h.currentStreak})`).join('; ') || 'No habits yet'}
- Memories (${memories.length}): ${memories.slice(0, 6).map(m => m.content).join('; ') || 'No memories yet'}

AVAILABLE AGENT CAPABILITIES / ACTIONS:
When the user asks you to create/modify tasks, goals, habits, memories, or schedule events, you MUST include structured action blocks in your reply.
Format actions with:
\`\`\`action
{"tool": "create_task", "params": {"title": "...", "priority": "high|medium|low|critical", "category": "study|work|personal", "estimatedMinutes": 45}}
\`\`\`
Or:
\`\`\`action
{"tool": "complete_task", "params": {"title": "..."}}
\`\`\`
Or:
\`\`\`action
{"tool": "create_goal", "params": {"title": "...", "category": "learning", "milestones": ["step 1", "step 2"]}}
\`\`\`
Or:
\`\`\`action
{"tool": "create_habit", "params": {"title": "...", "scheduledTime": "08:00"}}
\`\`\`
Or:
\`\`\`action
{"tool": "create_reminder", "params": {"title": "...", "time": "YYYY-MM-DDTHH:mm:ss", "body": "..."}}
\`\`\`
Or:
\`\`\`action
{"tool": "save_memory", "params": {"content": "...", "category": "preference|goal|commitment"}}
\`\`\`

Always speak directly, warmly, and helpfully as ${assistantName}. Keep answers formatted in clean markdown without repeating the action block in text.
`

  // Format messages for Gemini API (send last 8 conversation turns for speed)
  const contents = messages.slice(-8).map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  const systemInstruction = {
    parts: [{ text: contextPrompt }]
  }

  const generationConfig = {
    maxOutputTokens: 1024,
    temperature: 0.7,
    topP: 0.95,
  }

  // Active production models for Google Gemini API
  const candidateModels = [
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-3-flash-preview',
    'gemini-2.0-flash',
    'gemini-1.5-flash'
  ]
  let response: Response | null = null
  let lastErr = ''

  for (const model of candidateModels) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents, systemInstruction, generationConfig }),
          signal: options?.signal,
        }
      )
      if (res.ok) {
        response = res
        break
      } else {
        const textErr = await res.text().catch(() => '')
        try {
          const jsonErr = JSON.parse(textErr)
          lastErr = jsonErr?.error?.message || `HTTP ${res.status}`
        } catch {
          lastErr = textErr || `HTTP ${res.status}`
        }
      }
    } catch (e: any) {
      if (e.name === 'AbortError') {
        throw e
      }
      lastErr = e.message || 'Network error'
    }
  }

  if (!response || !response.ok) {
    throw new Error(`${lastErr || 'Failed to connect to Google Gemini API. Please check your API key in Settings.'}`)
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

  // 3. Scan for and execute any action blocks generated in the response
  const actionRegex = /```action\s*([\s\S]*?)\s*```/g
  let match
  while ((match = actionRegex.exec(fullText)) !== null) {
    try {
      const actionJson = JSON.parse(match[1])
      if (actionJson.tool && actionJson.params) {
        callbacks.onToolExecuting?.(actionJson.tool, actionJson.params)
        const result = await executeClientTool(actionJson.tool, actionJson.params)
        callbacks.onToolExecuted?.(actionJson.tool, result)
      }
    } catch (e) {
      console.error('Failed to parse and execute AI action block:', e)
    }
  }

  // 4. Proactive memory capture
  const lastUserText = messages[messages.length - 1]?.content || ''
  if (
    lastUserText.toLowerCase().includes('remember') ||
    lastUserText.toLowerCase().includes('prefer') ||
    lastUserText.toLowerCase().includes('i like') ||
    lastUserText.toLowerCase().includes('my birthday')
  ) {
    await executeClientTool('save_memory', {
      content: lastUserText,
      category: 'preference',
      importance: 'high',
    })
  }

  if (callbacks.onFinish) {
    callbacks.onFinish(fullText)
  }

  return fullText
}

/**
 * Synthesize initial personalized goals, tasks, habits, and memories
 * from the 8-step onboarding wizard!
 */
export async function generateInitialPlanFromOnboarding(data: OnboardingAnswers): Promise<{
  tasksCount: number
  goalsCount: number
  habitsCount: number
}> {
  const userName = data.name.trim() || 'You'
  const assistantName = data.assistantName?.trim() || 'Nexra'

  // 1. Save User Profile
  await localDb.user.put({
    id: 'default-user',
    name: userName,
    timezone: 'Asia/Kolkata',
    aiAutonomy: data.aiTone || 'autonomous',
    notifications: true,
    morningBriefing: true,
    accountabilityCheck: true,
  })

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('srushti_user_name', userName)
    localStorage.setItem('srushti_assistant_name', assistantName)
    await localDb.preferences.put({ key: 'assistant_name', value: assistantName }).catch(() => {})
    localStorage.setItem('srushti_onboarding_done', 'true')
    if (data.apiKey) {
      localStorage.setItem('srushti_gemini_api_key', data.apiKey.trim())
      await localDb.preferences.put({ key: 'gemini_api_key', value: data.apiKey.trim() })
    }
  }

  // 2. Parse and generate goals
  const goalTitles = data.mainGoals
    .split(/[,;\n]+/)
    .map(g => g.trim())
    .filter(Boolean)

  let goalsCreated = 0
  if (goalTitles.length > 0) {
    for (let i = 0; i < Math.min(goalTitles.length, 3); i++) {
      const title = goalTitles[i]
      await executeClientTool('create_goal', {
        title,
        category: 'learning',
        priority: 'high',
        milestones: [
          `Setup roadmap for ${title}`,
          `Complete foundation milestones`,
          `Review and consolidate progress`,
        ],
      })
      goalsCreated++
    }
  } else {
    await executeClientTool('create_goal', {
      title: 'Daily Productivity & Growth Roadmap',
      category: 'personal',
      priority: 'high',
      milestones: [
        'Organize daily schedule',
        'Build consistent habit streaks',
        'Achieve weekly milestones',
      ],
    })
    goalsCreated++
  }

  // 3. Parse and generate habits
  const habitTitles = data.habitsToBuild
    .split(/[,;\n]+/)
    .map(h => h.trim())
    .filter(Boolean)

  let habitsCreated = 0
  if (habitTitles.length > 0) {
    for (let i = 0; i < Math.min(habitTitles.length, 3); i++) {
      const title = habitTitles[i]
      await executeClientTool('create_habit', {
        title,
        scheduledTime: i === 0 ? '08:30' : i === 1 ? '17:00' : '21:00',
        category: 'productivity',
      })
      habitsCreated++
    }
  } else {
    await executeClientTool('create_habit', {
      title: 'Daily 30m Deep Focus Sprint',
      scheduledTime: '09:00',
      category: 'productivity',
    })
    await executeClientTool('create_habit', {
      title: 'Evening Review & Wind Down',
      scheduledTime: '21:30',
      category: 'wellness',
    })
    habitsCreated += 2
  }

  // 4. Parse deadlines and create initial focus tasks
  let tasksCreated = 0
  if (data.upcomingDeadlines.trim()) {
    const deadlines = data.upcomingDeadlines.split(/[,;\n]+/).map(d => d.trim()).filter(Boolean)
    for (const d of deadlines) {
      await executeClientTool('create_task', {
        title: `Prepare & Review: ${d}`,
        priority: 'high',
        category: 'study',
        estimatedMinutes: 60,
      })
      tasksCreated++
    }
  }

  // Add initial welcome focus task
  await executeClientTool('create_task', {
    title: `Review daily focus priorities with ${assistantName}`,
    priority: 'medium',
    category: 'personal',
    estimatedMinutes: 20,
  })
  tasksCreated++

  // 5. Save memory of daily routine
  await executeClientTool('save_memory', {
    content: `Daily routine: Wakes at ${data.dailyRoutine.wakeTime}, sleeps at ${data.dailyRoutine.sleepTime}, targets ${data.dailyRoutine.focusHours}h focus daily.`,
    category: 'commitment',
    importance: 'high',
  })

  // Trigger universal refresh
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('srushti_data_changed'))
  }

  return { tasksCount: tasksCreated, goalsCount: goalsCreated, habitsCount: habitsCreated }
}
