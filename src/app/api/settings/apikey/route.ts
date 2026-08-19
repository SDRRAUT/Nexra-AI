import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'
import { google, createGoogleGenerativeAI } from '@ai-sdk/google'
import { generateText } from 'ai'
import fs from 'fs'
import path from 'path'

const DEFAULT_USER_ID = 'default-user'

// Helper to mask key: AIzaSy...0iaQ
function maskKey(key: string): string {
  if (!key) return ''
  if (key.length <= 8) return '********'
  return `${key.slice(0, 6)}...${key.slice(-4)}`
}

export async function GET() {
  try {
    // Check DB preference first
    const pref = await prisma.preference.findUnique({
      where: {
        userId_key: {
          userId: DEFAULT_USER_ID,
          key: 'gemini_api_key',
        },
      },
    })

    const key = pref?.value || process.env.GOOGLE_GENERATIVE_AI_API_KEY || ''
    const hasKey = Boolean(key && key.trim().length > 0)

    return NextResponse.json({
      hasKey,
      maskedKey: hasKey ? maskKey(key) : '',
    })
  } catch (error) {
    console.error('Error fetching API key status:', error)
    return NextResponse.json({ hasKey: false, maskedKey: '' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { apiKey, testOnly } = body

    if (testOnly) {
      const keyToTest = apiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY
      if (!keyToTest) {
        return NextResponse.json({ success: false, error: 'No API key provided to test' }, { status: 400 })
      }

      try {
        const customGoogle = createGoogleGenerativeAI({ apiKey: keyToTest })
        const res = await generateText({
          model: customGoogle('gemini-3.6-flash'),
          prompt: 'ping',
        })
        return NextResponse.json({ success: true, message: 'API key is valid and working with Gemini 3.6 Flash!' })
      } catch (err: any) {
        return NextResponse.json({ success: false, error: err?.message || 'Invalid API key or quota exceeded' }, { status: 400 })
      }
    }

    if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 })
    }

    const trimmedKey = apiKey.trim()

    // 1. Test key validity before saving
    try {
      const customGoogle = createGoogleGenerativeAI({ apiKey: trimmedKey })
      await generateText({
        model: customGoogle('gemini-3.6-flash'),
        prompt: 'ping',
      })
    } catch (testErr: any) {
      return NextResponse.json({
        error: `Could not validate key with Google Gemini: ${testErr?.message || 'Invalid API key'}`,
      }, { status: 400 })
    }

    // 2. Save key to Database Preference
    await prisma.preference.upsert({
      where: {
        userId_key: {
          userId: DEFAULT_USER_ID,
          key: 'gemini_api_key',
        },
      },
      update: { value: trimmedKey },
      create: {
        userId: DEFAULT_USER_ID,
        key: 'gemini_api_key',
        value: trimmedKey,
      },
    })

    // 3. Update runtime process env
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = trimmedKey

    // 4. Update local .env.local file
    try {
      const envLocalPath = path.join(process.cwd(), '.env.local')
      let envContent = ''
      if (fs.existsSync(envLocalPath)) {
        envContent = fs.readFileSync(envLocalPath, 'utf-8')
      }
      if (envContent.includes('GOOGLE_GENERATIVE_AI_API_KEY=')) {
        envContent = envContent.replace(
          /GOOGLE_GENERATIVE_AI_API_KEY=.*/,
          `GOOGLE_GENERATIVE_AI_API_KEY="${trimmedKey}"`
        )
      } else {
        envContent += `\nGOOGLE_GENERATIVE_AI_API_KEY="${trimmedKey}"\n`
      }
      fs.writeFileSync(envLocalPath, envContent.trim() + '\n')
    } catch (e) {
      console.warn('Could not write to .env.local:', e)
    }

    return NextResponse.json({
      success: true,
      hasKey: true,
      maskedKey: maskKey(trimmedKey),
      message: 'API Key saved and validated successfully!',
    })
  } catch (error: any) {
    console.error('Error saving API key:', error)
    return NextResponse.json({ error: error?.message || 'Failed to save API key' }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    await prisma.preference.deleteMany({
      where: {
        userId: DEFAULT_USER_ID,
        key: 'gemini_api_key',
      },
    })

    process.env.GOOGLE_GENERATIVE_AI_API_KEY = ''

    // Clear from .env.local
    try {
      const envLocalPath = path.join(process.cwd(), '.env.local')
      if (fs.existsSync(envLocalPath)) {
        let envContent = fs.readFileSync(envLocalPath, 'utf-8')
        envContent = envContent.replace(/GOOGLE_GENERATIVE_AI_API_KEY=.*/, 'GOOGLE_GENERATIVE_AI_API_KEY=""')
        fs.writeFileSync(envLocalPath, envContent)
      }
    } catch (e) {}

    return NextResponse.json({ success: true, message: 'API key removed.' })
  } catch (error) {
    console.error('Error deleting API key:', error)
    return NextResponse.json({ error: 'Failed to remove API key' }, { status: 500 })
  }
}
