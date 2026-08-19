# SRUSHTI — MY PERSONAL ASSISTANT

## MASTER BUILD PROMPT

Build and integrate a production-ready **AI Personal Assistant and Life Management System** called:

# 🌱 SRUSHTI

### My Personal Assistant

**Core idea:**

> Srushti is an AI-powered personal PA that understands the user's life, manages dates and time, organizes schedules, tracks tasks and goals, sends intelligent reminders, monitors execution, detects when the user falls behind, asks what happened, adapts the plan, learns from behavior, and continuously helps the user stay on track.

Srushti should feel like a **real personal assistant**, not a chatbot, not a simple todo app, and not a collection of disconnected AI features.

---

# 1. IMPORTANT: EXISTING APP

This is an **existing application**.

Before writing or modifying code:

1. Inspect the entire existing project.
2. Understand the current architecture.
3. Understand frontend structure.
4. Understand backend/API structure.
5. Understand database/schema.
6. Understand authentication.
7. Understand existing navigation.
8. Understand existing task/calendar/reminder functionality.
9. Understand existing state management.
10. Understand the current UI/design system.
11. Identify what can be reused.
12. Identify what must be extended.
13. Do NOT unnecessarily rebuild existing features.
14. Do NOT remove working functionality.
15. Integrate Srushti into the existing architecture.

First create an implementation plan based on the existing codebase, then implement it.

---

# 2. PRODUCT PHILOSOPHY

Srushti's primary job is:

```text
UNDERSTAND MY LIFE
        ↓
UNDERSTAND WHAT NEEDS TO HAPPEN
        ↓
ORGANIZE MY TIME
        ↓
CREATE / ADJUST MY PLAN
        ↓
REMIND ME
        ↓
TRACK WHAT I ACTUALLY DID
        ↓
DETECT WHEN I FALL BEHIND
        ↓
ASK WHAT HAPPENED
        ↓
ADAPT MY PLAN
        ↓
KEEP ME MOVING
```

The system should focus primarily on **life management and execution tracking**.

Srushti does NOT need to actually complete academic/work tasks for the user.

It manages the user's life around those tasks.

---

# 3. THE CORE USER EXPERIENCE

The user should mostly interact with **one AI assistant**.

The user should not need to know which agent handles a request.

Examples:

> "I have CAO exam on Friday."

> "What do I need to do today?"

> "What should I do right now?"

> "Move my 6 PM task to 8."

> "I'm not doing this today."

> "Plan tomorrow."

> "I only have two hours today."

> "What am I behind on?"

> "Why am I falling behind?"

> "How is my week going?"

> "How is my life going?"

Srushti should understand natural language and take the appropriate actions.

---

# 4. SRUSHTI'S PERSONALITY

Srushti should behave like a:

**Personal PA + Planner + Accountability Partner + Life Manager**

Personality:

* Intelligent
* Calm
* Practical
* Direct when necessary
* Supportive
* Proactive
* Concise
* Context-aware
* Never annoying
* Never insulting
* Never manipulative

Srushti should not constantly explain technical AI reasoning.

It should communicate naturally.

Example:

> "You have your CAO exam tomorrow. You've still got two topics pending. I found a 90-minute slot tonight and moved a low-priority task. I've added a reminder for 7:15 PM."

---

# 5. MAIN APP STRUCTURE

Create/integrate these major areas:

```text
HOME
AI ASSISTANT
TODAY
CALENDAR
TASKS
GOALS
HABITS
PRODUCTIVITY
LIFE
MEMORY
AGENTS
SETTINGS
```

Keep navigation clean.

The AI Assistant should remain the central feature.

---

# 6. HOME — PERSONAL COMMAND CENTER

The Home screen should immediately answer:

> **What matters right now?**

Include:

### Greeting

```text
Good Morning 👋
Here's what matters today.
```

### Critical items

```text
🔴 CRITICAL

CAO Exam
Tomorrow
```

### Today progress

```text
Today

████████░░ 78%

5 / 7 tasks completed
```

### Timeline

```text
09:00  College
14:00  Assignment
16:00  CAO Revision
18:00  Exercise
20:00  Free
```

### Next Action

```text
NEXT

CAO Revision
4:00 PM
90 minutes
```

### Risks

```text
⚠️ 2 tasks are at risk
```

### AI recommendation

```text
Srushti recommends:

Finish CAO revision before starting
your lower-priority task tonight.
```

---

# 7. AI CHAT

Create a polished AI assistant interface.

The chat should support:

* Text
* Quick actions
* Suggested commands
* Context-aware responses
* Action confirmation
* Action results
* Schedule previews
* Task previews
* Notification previews

Examples:

```text
"What do I have today?"

"What should I do right now?"

"Plan tomorrow."

"I have an exam next week."

"Move my 5 PM task to 7."

"I'm tired today. Fix my schedule."

"What am I behind on?"

"Show me upcoming deadlines."

"How productive was I this week?"

"How is my life going?"
```

---

# 8. NATURAL LANGUAGE UNDERSTANDING

Srushti must understand natural language dates and times.

Support:

```text
today
tomorrow
tonight
tomorrow evening
next Monday
this Friday
in 2 hours
every Sunday
every weekday
two days before my exam
after college
before lunch
this weekend
next month
```

Convert these into reliable structured values.

Always use the user's local timezone.

If an important date is ambiguous, ask instead of guessing.

Example:

> "When you say Friday, do you mean August 21?"

---

# 9. MULTI-AGENT ARCHITECTURE

Implement a central **Agent Orchestrator**.

Architecture:

```text
                         USER
                           ↓
                    MAIN ASSISTANT
                           ↓
                    CONTEXT ENGINE
                           ↓
                  AGENT ORCHESTRATOR
                           ↓
       ┌───────────────┬───────────────┐
       ↓               ↓               ↓
   SCHEDULE          TASK            STUDY
    AGENT            AGENT           AGENT
       ↓               ↓               ↓
    GOAL             HABIT        PRODUCTIVITY
    AGENT            AGENT           AGENT
       ↓               ↓               ↓
   REMINDER         FINANCE         MEMORY
    AGENT            AGENT           AGENT
                           ↓
                    DECISION ENGINE
                           ↓
                     TOOL LAYER
                           ↓
                       DATABASE
```

The user interacts only with Srushti.

---

# 10. AGENTS

## Main Assistant Agent

Responsibilities:

* Conversation
* Intent detection
* Context retrieval
* Agent delegation
* Result synthesis
* User communication

## Schedule Agent

Responsibilities:

* Time
* Dates
* Availability
* Conflicts
* Schedule blocks
* Rescheduling
* Dynamic planning

## Task Agent

Responsibilities:

* Tasks
* Subtasks
* Deadlines
* Status
* Priority
* Completion
* Rescheduling

## Study Agent

Responsibilities:

* Exams
* Assignments
* Study plans
* Revision sessions
* Academic deadlines

## Goal Agent

Responsibilities:

* Goals
* Milestones
* Goal deadlines
* Progress
* Goal-task relationships

## Habit Agent

Responsibilities:

* Recurring habits
* Habit tracking
* Streaks
* Missed habits
* Habit scheduling

## Productivity Agent

Responsibilities:

* Completion analysis
* Planned vs actual
* Delays
* Task duration
* Productivity patterns

## Reminder Agent

Responsibilities:

* Notifications
* Reminder schedules
* Follow-ups
* Persistent reminders

## Finance Agent

Responsibilities:

* Bills
* Payment dates
* Financial reminders
* Money-related tasks

Do not automatically perform financial transactions.

## Memory Agent

Responsibilities:

* Long-term memory
* Memory retrieval
* Memory updates
* Memory deletion

## Document Agent

Responsibilities:

* Document-related tasks
* Submission deadlines
* Renewal dates
* Important document reminders

---

# 11. AGENT COLLABORATION

Agents must be able to exchange structured context.

Example:

User:

> "I have CAO exam Friday."

Flow:

```text
Main Assistant
      ↓
Study Agent
      ↓
Schedule Agent
      ↓
Task Agent
      ↓
Reminder Agent
      ↓
Goal/Productivity Agent if relevant
      ↓
Decision
      ↓
Main Assistant
      ↓
User
```

Do not show separate agent conversations to the user.

Return one coherent result.

---

# 12. DYNAMIC SCHEDULING ENGINE

This is a core component.

Schedules must adapt dynamically.

The scheduling engine should consider:

* Current time
* Available time
* Existing events
* Task duration
* Deadline
* Priority
* Importance
* Dependencies
* Goals
* Habits
* Buffer time
* Missed tasks
* User behavior

Example:

Original:

```text
5 PM — CAO
6 PM — DSA
7 PM — Exercise
8 PM — Project
```

CAO gets missed.

Srushti should NOT blindly move every task.

It should calculate:

```text
Remaining time
+
Deadlines
+
Priority
+
Duration
+
Conflicts
+
Goals
=
New optimized schedule
```

---

# 13. PRIORITY ENGINE

Srushti automatically determines what matters most.

Use factors such as:

```text
Deadline
Importance
Consequences
Urgency
Goal relevance
Dependencies
Estimated effort
Available time
```

The AI is the default priority decision-maker.

However, the user can override it.

Example:

> "I know CAO is important but I want to do DSA now."

Srushti accepts the decision and recalculates the remaining schedule.

---

# 14. DEADLINE PLANNING

If user says:

> "I need 10 hours of preparation before Friday."

Srushti should:

1. Find the deadline.
2. Determine available time.
3. Check existing commitments.
4. Calculate required sessions.
5. Add buffers.
6. Schedule sessions.
7. Create tasks.
8. Create reminders.
9. Track progress.
10. Adapt if sessions are missed.

Never create impossible plans.

---

# 15. NOTIFICATION SYSTEM

Notifications are a major feature.

They should act like a PA rather than simple alarms.

Example:

### 15 minutes before

> 🔔 CAO Revision starts in 15 minutes.

### Start time

> 🔔 CAO Revision starts now.

### If ignored

> ⚠️ You haven't completed CAO Revision.

Then:

```text
[START NOW]
[RESCHEDULE]
[SKIP]
[CANCEL]
```

The assistant should not assume that ignored means completed.

---

# 16. ACCOUNTABILITY

If an important task is repeatedly postponed:

```text
⚠️ You've postponed this task 3 times.

Your deadline is tomorrow.

I strongly recommend completing it tonight.
```

Srushti should become more direct when necessary.

Never be abusive, insulting, threatening, or manipulative.

---

# 17. AUTONOMY

Srushti should be autonomous for normal life-management operations.

Automatically allowed:

* Create tasks
* Create reminders
* Move tasks
* Reorder tasks
* Re-plan schedules
* Split tasks
* Create subtasks
* Adjust low-risk schedules
* Analyze productivity

Sensitive actions require approval.

Example:

```text
🔔 APPROVAL REQUIRED

Move important event:
5:00 PM → 7:00 PM?

[ALLOW]
[REJECT]
```

Create configurable permission boundaries.

---

# 18. MEMORY

Create long-term personal memory.

Potential memory:

```text
Goals
Preferences
Important dates
Responsibilities
Plans
Decisions
Habits
Productivity patterns
Relevant personal context
```

Use relevant memory retrieval rather than injecting everything into every AI request.

Support:

> "What do you remember about me?"

> "Forget this."

Memory deletion must actually remove the selected memory.

---

# 19. BEHAVIORAL LEARNING

Track:

* Planned duration
* Actual duration
* Completion
* Postponement
* Missed tasks
* Preferred working time
* Schedule adherence
* Rescheduling patterns

Example:

If the user consistently postpones 2-hour tasks:

```text
2 hour task
      ↓
4 × 30 minute sessions
```

Future schedules should automatically adapt.

---

# 20. TASK SYSTEM

Every task should support:

```text
Title
Description
Category
Priority
Status
Deadline
Start Time
Estimated Duration
Actual Duration
Parent Task
Subtasks
Dependencies
Goal
Recurring Rule
Reminder
Notes
Created By
AI Generated
```

Statuses:

```text
Planned
Scheduled
In Progress
Completed
Skipped
Cancelled
Overdue
Rescheduled
```

---

# 21. CALENDAR

Support:

* Day
* Week
* Month
* Timeline

Show:

* Events
* Tasks
* Deadlines
* Study sessions
* Habits
* Reminders

Visually distinguish them.

Allow both:

**Manual editing**

and

**AI editing through chat**

---

# 22. GOALS

Goals should connect to actual execution.

Structure:

```text
GOAL
 ↓
MILESTONES
 ↓
TASKS
 ↓
SCHEDULE
 ↓
EXECUTION
 ↓
PROGRESS
```

Goals should influence priority and planning.

---

# 23. HABITS

Support:

* Recurring habits
* Frequency
* Schedule
* Completion
* Streaks
* Missed habits
* Habit analytics

Habits should be considered by the schedule engine.

---

# 24. PRODUCTIVITY

Track:

```text
Planned tasks
Completed tasks
Missed tasks
Rescheduled tasks
Completion %
Task duration
Schedule adherence
Goal progress
Habit consistency
```

Provide daily, weekly and monthly analytics.

---

# 25. LIFE ANALYSIS

Allow the user to ask:

> "How is my life going?"

Srushti should analyze:

### Current State

### What's going well

### What's going badly

### Goals

### Productivity

### Risks

### Upcoming deadlines

### Recommendations

### Next actions

Example:

> "You've completed 81% of your planned tasks this week. Your main issue is repeated postponement of evening tasks. Two goals are competing for the same available time. I recommend restructuring your next seven days."

---

# 26. TODAY SCREEN

Provide:

## Quick Tasks

```text
☐ CAO Revision
☐ Assignment
☐ Exercise
☐ Pay Bill
```

## Timeline

```text
09:00 College
14:00 Assignment
16:00 CAO
18:00 Exercise
20:00 Free
```

## AI Command Center

Show:

* Critical
* Important
* Routine
* Progress
* Risks
* Upcoming deadlines
* Next action
* AI recommendations

---

# 27. AGENT ACTIVITY

Create an optional activity log.

Example:

```text
12:05 PM
Schedule Agent
Moved CAO → 7:30 PM

12:06 PM
Reminder Agent
Created reminder → 7:15 PM

12:07 PM
Task Agent
Created CAO Revision
```

Allow users to inspect AI activity.

---

# 28. AI EXPLANATION

For meaningful automatic changes, explain why.

Example:

> **Why was this moved?**

> "Your previous session was missed and your exam is tomorrow. I moved this task to the next available high-priority slot."

Provide:

**View Changes**

**Undo**

---

# 29. DATABASE MODEL

Reuse the existing database where possible.

Create/use entities such as:

```text
User
Task
Subtask
Event
ScheduleBlock
Deadline
Reminder
Goal
Milestone
Habit
StudySession
Project
Expense
Document
Memory
Preference
Agent
AgentAction
Notification
ProductivityRecord
BehaviorPattern
```

Maintain proper relationships.

Important distinction:

**Event ≠ Task ≠ Deadline ≠ Reminder ≠ Schedule Block**

Do not collapse everything into one table if the existing architecture supports proper entities.

---

# 30. TOOL LAYER

AI agents must use validated tools.

Example:

```text
createTask()
updateTask()
completeTask()
rescheduleTask()

createEvent()
updateEvent()

createReminder()
cancelReminder()

getSchedule()
findFreeTime()

createGoal()
updateGoal()

createHabit()

getDeadlines()

getProductivity()

saveMemory()
getMemory()
deleteMemory()

recalculateSchedule()
```

AI should not directly generate arbitrary database mutations.

---

# 31. AI ARCHITECTURE

Create an AI abstraction layer so the application isn't permanently tied to one provider.

Example:

```text
AIService
 ├── Provider 1
 ├── Provider 2
 ├── Provider 3
 └── Local Model
```

Support:

* Structured outputs
* Tool calling
* Streaming responses
* Context retrieval
* Agent orchestration

---

# 32. AI CONTEXT

Each AI request should have access to the appropriate combination of:

```text
Current conversation
+
Current date/time
+
Current schedule
+
Relevant tasks
+
Upcoming deadlines
+
Relevant goals
+
Relevant habits
+
Relevant memories
+
Recent activity
```

Do not send irrelevant information.

---

# 33. CONFLICT HANDLING

If schedule is impossible:

Example:

```text
You have 7 hours of planned work.

Available time:
4 hours.

Conflict detected.
```

Srushti should ask:

```text
What should I change?

[Move lower-priority tasks]
[Reduce workload]
[Move deadline]
[I'll decide manually]
```

Do not silently create impossible schedules.

---

# 34. DUPLICATION PROTECTION

Prevent:

* Duplicate tasks
* Duplicate events
* Duplicate reminders
* Duplicate notifications
* Duplicate agent actions

Use idempotent operations where appropriate.

---

# 35. AGENT SAFETY

Prevent:

* Infinite agent loops
* Repeated schedule changes
* Notification spam
* Conflicting agent decisions
* Unauthorized actions
* Accidental deletion
* Invalid dates
* Invalid recurring schedules

Add validation and limits.

---

# 36. USER CONTROL

The user should always be able to:

* Override AI priority
* Edit tasks
* Edit schedule
* Disable reminders
* Reschedule
* Skip
* Cancel
* Undo AI changes
* View AI actions
* Delete memory
* Configure agent permissions

The AI is powerful but **the user remains the final authority**.

---

# 37. DESIGN

Use a premium, modern, mobile-first UI.

Preferred visual direction:

* Light theme
* Clean
* Minimal
* Soft colors
* Premium cards
* Subtle glassmorphism
* Rounded corners
* Clear hierarchy
* Smooth transitions
* Excellent typography
* Strong accessibility
* Responsive desktop layout

Avoid:

* Excessive gradients
* Excessive 3D
* Clutter
* Too many cards
* Fake AI animations
* Generic SaaS dashboard appearance

The product should feel like:

> **A premium personal command center.**

---

# 38. BRANDING

Product name:

# SRUSHTI

Descriptor:

### My Personal Assistant

Use the branding naturally throughout the application.

Example:

```text
SRUSHTI
My Personal Assistant
```

Do not overuse the name in every sentence.

---

# 39. FIRST-TIME USER EXPERIENCE

On first launch, Srushti should guide the user through setup.

Collect only useful information:

* Name
* Timezone
* Typical schedule
* Important commitments
* Current goals
* Main life areas
* Notification preferences
* AI autonomy preferences

Do not ask dozens of unnecessary questions.

Allow setup to be completed later.

---

# 40. DAILY AI LOOP

Implement a daily management cycle.

### Morning

Srushti analyzes:

* Today's schedule
* Deadlines
* Tasks
* Goals
* Important risks

Then provides:

> "Here's what matters today."

### During the day

Track:

* Task completion
* Missed tasks
* Schedule changes
* Upcoming deadlines

### When something is missed

Ask what happened.

### Evening

Analyze:

* Completed
* Missed
* Rescheduled
* Progress

Then prepare the next day if appropriate.

---

# 41. CORE SUCCESS SCENARIO

Test this exact scenario:

User:

> "I have CAO exam on Friday and I haven't started."

Srushti should:

```text
Understand exam
        ↓
Determine date
        ↓
Save deadline
        ↓
Check schedule
        ↓
Calculate available preparation time
        ↓
Create preparation plan
        ↓
Create tasks
        ↓
Schedule sessions
        ↓
Create reminders
        ↓
Track completion
        ↓
Follow up
        ↓
Ask if missed
        ↓
Adapt schedule
        ↓
Learn from behavior
        ↓
Report progress
```

The user should feel:

> **"I told my PA something important, and it organized my life around it."**

---

# 42. DEVELOPMENT ORDER

Implement in this order.

## PHASE 1 — FOUNDATION

Build:

* AI chat
* AI service
* Tool calling
* Tasks
* Events
* Reminders
* Basic memory

## PHASE 2 — TIME INTELLIGENCE

Build:

* Time engine
* Priority engine
* Dynamic scheduling
* Deadline planning
* Conflict detection
* Missed-task recovery

## PHASE 3 — PERSONAL LIFE

Build:

* Goals
* Habits
* Study
* Productivity
* Behavior learning

## PHASE 4 — MULTI-AGENT

Build:

* Agent orchestrator
* Specialized agents
* Shared context
* Agent activity
* Decision synthesis

## PHASE 5 — PERSONAL PA

Build:

* Proactive notifications
* Accountability
* Permission system
* Long-term life analysis
* Advanced memory
* Adaptive planning

---

# 43. DO NOT DO THESE THINGS

Do NOT:

* Build a fake chatbot
* Hard-code AI responses
* Use static mock data in production functionality
* Create disconnected agent screens
* Rebuild the existing app unnecessarily
* Replace existing functionality without reason
* Make every action require confirmation
* Let AI directly mutate the database
* Create impossible schedules
* Spam notifications
* Assume ignored means completed
* Automatically perform sensitive actions
* Hide important AI changes
* Overcomplicate the UI
* Add AI features just for marketing

---

# 44. FINAL PRODUCT TEST

The finished app should allow a user to naturally say:

> "Srushti, I have an exam next Friday."

and then later:

> "What do I need to do today?"

and receive an intelligent answer based on actual stored life data.

Then:

> "I didn't do my 6 PM study session."

Srushti should respond:

> "What happened?"

with:

```text
[Start Now]
[Reschedule]
[Skip]
```

If the user repeatedly postpones:

> "You've postponed this three times. Your deadline is approaching. I recommend doing it tonight."

And if the user says:

> "I only have two hours tomorrow."

Srushti should recalculate the actual plan.

---

# FINAL PRINCIPLE

Build Srushti around this idea:

## **Srushti doesn't just tell me what to do.**

## **Srushti manages my time, tracks what I planned, reminds me, notices when I fall behind, asks me what happened, adapts my schedule, learns how I work, and keeps my life moving toward my goals.**

The application should make the user feel like they have a **persistent AI Personal PA available every day**, while the underlying system remains structured, reliable, transparent, controllable, and production-ready.

Start by inspecting the existing application and then implement this architecture incrementally without breaking existing functionality.
