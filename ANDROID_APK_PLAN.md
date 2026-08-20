# 📱 Srushti AI — Complete Native Android App (Kotlin + Jetpack Compose) Master Plan

**Document:** `ANDROID_APK_PLAN.md`  
**Purpose:** Comprehensive, step-by-step master architectural blueprint to convert Srushti AI from Next.js/Web to a **100% Pure Native Android App (Kotlin + Jetpack Compose + Room Database + Google AI Android SDK)** with **Zero WebView, Zero Server dependency, 120 FPS performance, and native Home Widgets**.

---

## 📑 Table of Contents
1. [Tech Stack & Architecture](#1-tech-stack--architecture)
2. [Database Schema (Room Database / SQLite)](#2-database-schema-room-database--sqlite)
3. [UI Components & Jetpack Compose Screens](#3-ui-components--jetpack-compose-screens)
4. [AI & Gemini Multi-Agent Engine (Kotlin Coroutines)](#4-ai--gemini-multi-agent-engine-kotlin-coroutines)
5. [Exclusive Native Android Features (Widgets, Alarms, Tiles)](#5-exclusive-native-android-features)
6. [Project File Structure](#6-project-file-structure)
7. [Step-by-Step Build & Implementation Guide](#7-step-by-step-build--implementation-guide)

---

## 1. Tech Stack & Architecture

```text
┌────────────────────────────────────────────────────────────────────────┐
│                   SRUSHTI AI — 100% NATIVE ANDROID                     │
│                                                                        │
│  ┌───────────────────────────┐         ┌────────────────────────────┐  │
│  │   Jetpack Compose UI      │ ◀─────▶ │   State & ViewModels       │  │
│  │ (Home, Chat, Calendar,    │ (Flow)  │ (HomeViewModel,            │  │
│  │  Goals, Habits, Memory)   │         │  ChatViewModel, etc.)      │  │
│  └───────────────────────────┘         └─────────────┬──────────────┘  │
│                ▲                                     │                 │
│                │                                     ▼                 │
│  ┌─────────────┴─────────────┐         ┌────────────────────────────┐  │
│  │  Android Home Widgets     │         │   Room Database (SQLite)   │  │
│  │  (Glance Widget Engine)   │         │ (Tasks, Goals, Habits,     │  │
│  └───────────────────────────┘         │  Events, Memory Vault)     │  │
│                                        └─────────────▲──────────────┘  │
│                                                      │ (Tool Execution)│
│                                        ┌─────────────┴──────────────┐  │
│  [Google Gemini Cloud API]  ◀────────  │ Google Generative AI SDK   │  │
│  (Gemini 2.5 / 3.6 Flash)    (HTTPS)   │ (Native Coroutine Flow)    │  │
│                                        └────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

### Core Technologies:
- **Language:** Kotlin 2.0+
- **UI Framework:** Jetpack Compose (Material3 + Custom Cyberpunk & Glassmorphism Design System)
- **Local Storage:** Room Database (Type-Safe SQLite with Kotlin `Flow`)
- **AI Engine:** Official Google AI Android SDK (`com.google.ai.client.generativeai`)
- **Background Tasks:** `WorkManager` & `AlarmManager` (Exact lockscreen alarms)
- **Home Screen Widgets:** Jetpack Glance Widget API
- **Speech-to-Text:** Android `SpeechRecognizer` (Instant voice dictation)

---

## 2. Database Schema (Room Database / SQLite)

### 2.1 Task Entity (`TaskEntity.kt`)
```kotlin
@Entity(tableName = "tasks")
data class TaskEntity(
    @PrimaryKey val id: String = UUID.randomUUID().toString(),
    val title: String,
    val description: String? = null,
    val category: String = "personal", // study, work, personal, health
    val priority: String = "medium",   // critical, high, medium, low
    val status: String = "planned",     // planned, in_progress, completed, postponed
    val estimatedMinutes: Int = 30,
    val scheduledStart: Long? = null,  // Timestamp
    val scheduledEnd: Long? = null,
    val deadline: Long? = null,
    val postponeCount: Int = 0,
    val isAiGenerated: Boolean = false,
    val createdAt: Long = System.currentTimeMillis()
)
```

### 2.2 Goal & Milestone Entities (`GoalEntity.kt`)
```kotlin
@Entity(tableName = "goals")
data class GoalEntity(
    @PrimaryKey val id: String = UUID.randomUUID().toString(),
    val title: String,
    val description: String? = null,
    val category: String = "learning",
    val status: String = "active", // active, paused, completed
    val priority: String = "high",
    val progress: Int = 0, // 0 - 100
    val targetDate: Long? = null,
    val createdAt: Long = System.currentTimeMillis()
)

@Entity(
    tableName = "milestones",
    foreignKeys = [ForeignKey(
        entity = GoalEntity::class,
        parentColumns = ["id"],
        childColumns = ["goalId"],
        onDelete = ForeignKey.CASCADE
    )]
)
data class MilestoneEntity(
    @PrimaryKey val id: String = UUID.randomUUID().toString(),
    val goalId: String,
    val title: String,
    val isCompleted: Boolean = false,
    val orderIndex: Int = 0
)
```

### 2.3 Habit & Habit Log Entities (`HabitEntity.kt`)
```kotlin
@Entity(tableName = "habits")
data class HabitEntity(
    @PrimaryKey val id: String = UUID.randomUUID().toString(),
    val title: String,
    val category: String = "productivity",
    val frequency: String = "daily",
    val scheduledTime: String = "08:30",
    val currentStreak: Int = 0,
    val longestStreak: Int = 0,
    val totalCompleted: Int = 0,
    val createdAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "habit_logs")
data class HabitLogEntity(
    @PrimaryKey val id: String = UUID.randomUUID().toString(),
    val habitId: String,
    val dateString: String, // YYYY-MM-DD
    val isCompleted: Boolean = true,
    val loggedAt: Long = System.currentTimeMillis()
)
```

### 2.4 Memory Vault Entity (`MemoryEntity.kt`)
```kotlin
@Entity(tableName = "memories")
data class MemoryEntity(
    @PrimaryKey val id: String = UUID.randomUUID().toString(),
    val content: String,
    val category: String = "preference", // goal, preference, commitment, fact, habit
    val importance: String = "high",     // low, medium, high, critical
    val tags: String = "",
    val accessCount: Int = 1,
    val createdAt: Long = System.currentTimeMillis()
)
```

---

## 3. UI Components & Jetpack Compose Screens

### 3.1 Design System & Theme (`SrushtiTheme.kt`)
- **Primary Gradient:** `Brush.linearGradient(listOf(Color(0xFF5B6BF0), Color(0xFF8B5CF6), Color(0xFFEC4899)))`
- **Surface Dark:** `Color(0xFF171B26)`
- **Background Base:** `Color(0xFF0F1117)`
- **Success / Focus:** `Color(0xFF10B981)`
- **Typography:** Custom Font Family using Google Fonts Outfit & Inter.

### 3.2 Screen Breakdown

| Screen | File Name | Key Compose UI Features |
| :--- | :--- | :--- |
| **Home Dashboard** | `HomeScreen.kt` | `Good evening, Sanket` Hero Gradient Card, Circular Productivity Ring, `Focus Now` card, Eisenhower Matrix tabs (`All`, `Pending`, `Completed`), animated checklist with spring physics. |
| **AI Chatbot** | `ChatScreen.kt` | History Slide-Over Drawer, live token streaming, latency badge (`⚡ 0.84s · Gemini 2.5 Flash`), tool calling execution cards, voice input button. |
| **Calendar** | `CalendarScreen.kt` | Horizontal scrollable Day-Strip with selected date pill, Week/Month view toggle, Timeline agenda with gradient cards. |
| **Goals Radar** | `GoalsScreen.kt` | Vision Radar card, Progress bars, dynamic milestone checkable steps, add goal dialog. |
| **Habit Tracker** | `HabitsScreen.kt` | Streak flame badges (`🔥 7d streak`), 7-day check-in dots, heatmaps. |
| **Memory Vault** | `MemoryScreen.kt` | Categorized cards, search bar, mandatory delete confirmation dialog. |
| **Settings** | `SettingsScreen.kt` | Gemini API key input with connection test, masked key display, JSON backup export/import, reduced opacity at bottom. |

---

## 4. AI & Gemini Multi-Agent Engine (Kotlin Coroutines)

### 4.1 Native Gemini Streaming (`SrushtiAiService.kt`)
```kotlin
import com.google.ai.client.generativeai.GenerativeModel
import com.google.ai.client.generativeai.type.content

class SrushtiAiService(private val apiKey: String, private val roomDb: SrushtiDatabase) {

    private val generativeModel = GenerativeModel(
        modelName = "gemini-2.5-flash",
        apiKey = apiKey
    )

    suspend fun streamChat(
        userMessage: String,
        onChunkReceived: (String) -> Unit
    ): String {
        // 1. Gather live context from Room DB
        val tasks = roomDb.taskDao().getPendingTasksSync()
        val habits = roomDb.habitDao().getAllHabitsSync()
        val memories = roomDb.memoryDao().getAllMemoriesSync()

        val systemInstruction = """
            You are Srushti — a personal AI assistant and life manager.
            User: Sanket.
            Tasks: ${tasks.joinToString { it.title }}
            Habits: ${habits.joinToString { "${it.title} (streak: ${it.currentStreak})" }}
            Memories: ${memories.joinToString { it.content }}
            Always be direct, proactive, and practical.
        """.trimIndent()

        var fullResponse = ""
        val responseFlow = generativeModel.generateContentStream(
            content {
                text(systemInstruction)
                text("User: $userMessage")
            }
        )

        responseFlow.collect { chunk ->
            chunk.text?.let {
                fullResponse += it
                onChunkReceived(it)
            }
        }

        // 2. Extract proactive memories & tasks locally
        if (userMessage.contains("remember", ignoreCase = true) || userMessage.contains("prefer", ignoreCase = true)) {
            roomDb.memoryDao().insertMemory(
                MemoryEntity(content = userMessage, category = "preference")
            )
        }

        return fullResponse
    }
}
```

---

## 5. Exclusive Native Android Features

### 5.1 Android Home Screen Widget (`SrushtiAppWidget.kt`)
Using **Jetpack Glance**:
- Shows **Top Priority Task** & **Next Schedule Item** directly on phone wallpaper.
- Checkbox on widget to mark task as done without opening the app!
- Fire icon showing current habit streaks.

### 5.2 Deep AlarmManager & Lockscreen Wake (`SrushtiAlarmReceiver.kt`)
```kotlin
class SrushtiAlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val title = intent.getStringExtra("TITLE") ?: "🌱 Srushti Focus Reminder"
        val body = intent.getStringExtra("BODY") ?: "Time for your scheduled focus block!"

        NotificationHelper.showHeadsUpNotification(
            context = context,
            title = title,
            body = body,
            channelId = "srushti_alarms_channel"
        )
    }
}
```

### 5.3 Quick Settings Notification Tile (`SrushtiTileService.kt`)
- Tap the tile in Android's notification shade to instantly record a task or open the voice assistant from anywhere on the phone.

---

## 6. Project File Structure

```text
srushti-android/
├── app/
│   ├── build.gradle.kts
│   └── src/
│       └── main/
│           ├── AndroidManifest.xml
│           ├── java/com/sdr/srushti/
│           │   ├── MainActivity.kt
│           │   ├── SrushtiApp.kt
│           │   ├── data/
│           │   │   ├── SrushtiDatabase.kt
│           │   │   ├── dao/
│           │   │   │   ├── TaskDao.kt
│           │   │   │   ├── GoalDao.kt
│           │   │   │   ├── HabitDao.kt
│           │   │   │   └── MemoryDao.kt
│           │   │   └── entities/
│           │   │       ├── TaskEntity.kt
│           │   │       ├── GoalEntity.kt
│           │   │       └── HabitEntity.kt
│           │   ├── ai/
│           │   │   ├── SrushtiAiService.kt
│           │   │   └── ToolsDefinition.kt
│           │   ├── ui/
│           │   │   ├── theme/
│           │   │   │   ├── Color.kt
│           │   │   │   ├── Theme.kt
│           │   │   │   └── Type.kt
│           │   │   ├── components/
│           │   │   │   ├── AppHeader.kt
│           │   │   │   ├── BottomNavBar.kt
│           │   │   │   └── PriorityBadge.kt
│           │   │   └── screens/
│           │   │       ├── home/HomeScreen.kt
│           │   │       ├── chat/ChatScreen.kt
│           │   │       ├── calendar/CalendarScreen.kt
│           │   │       ├── goals/GoalsScreen.kt
│           │   │       ├── habits/HabitsScreen.kt
│           │   │       ├── memory/MemoryScreen.kt
│           │   │       └── settings/SettingsScreen.kt
│           │   ├── widget/
│           │   │   └── SrushtiHomeWidget.kt
│           │   └── receiver/
│           │       └── SrushtiAlarmReceiver.kt
│           └── res/
│               ├── drawable/
│               │   └── ic_stat_notification.png
│               └── mipmap-xxxhdpi/
│                   └── ic_launcher.png (Srushti.png)
└── build.gradle.kts
```

---

## 7. Step-by-Step Build & Implementation Guide

When you are ready to generate the full Kotlin Android App, execute these commands:

### Step 1: Initialize Native Android Project
```bash
# Create native Jetpack Compose Android app template
android create empty-activity --name="Srushti AI" --output=./srushti-android
```

### Step 2: Add Android Dependencies (`app/build.gradle.kts`)
```kotlin
dependencies {
    // Jetpack Compose BOM
    implementation(platform("androidx.compose:compose-bom:2024.09.00"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.navigation:navigation-compose:2.8.0")

    // Room Database
    implementation("androidx.room:room-runtime:2.6.1")
    implementation("androidx.room:room-ktx:2.6.1")
    ksp("androidx.room:room-compiler:2.6.1")

    // Official Google AI Android SDK
    implementation("com.google.ai.client.generativeai:generativeai:0.9.0")

    // Glance Home Screen Widget
    implementation("androidx.glance:glance-appwidget:1.1.0")

    // WorkManager
    implementation("androidx.work:work-runtime-ktx:2.9.1")
}
```

### Step 3: Build & Generate Pure Native APK
```bash
cd srushti-android
./gradlew assembleDebug
```
The compiled pure native APK will be at:  
`srushti-android/app/build/outputs/apk/debug/app-debug.apk`.
