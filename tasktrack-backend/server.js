const express = require('express');
const webpush = require('web-push');
const cron = require('node-cron');
const fetch = require('node-fetch');

const app = express();
// Support CORS to allow frontend calls
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});
app.use(express.json());

// VAPID keys
webpush.setVapidDetails(
  'mailto:your@email.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

// Endpoint to save push subscription from browser
app.post('/subscribe', async (req, res) => {
  const { userId, subscription } = req.body;
  if (!userId || !subscription) {
      return res.status(400).json({ error: 'Missing userId or subscription' });
  }

  try {
      await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${userId}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ push_subscription: JSON.stringify(subscription) })
      });
      res.json({ success: true });
  } catch (err) {
      console.error('Subscription error:', err);
      res.status(500).json({ error: 'Failed to save subscription' });
  }
});

// Cron job — runs every hour
cron.schedule('0 * * * *', async () => {
  console.log('Running notification cron job...');
  await checkAndNotifyAllUsers();
});

async function checkAndNotifyAllUsers() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
      console.log('Skipping cron: Missing Supabase credentials');
      return;
  }

  try {
      // Fetch all users with push subscriptions and notifications enabled from Supabase
      const usersRes = await fetch(
        `${SUPABASE_URL}/rest/v1/users?push_subscription=not.is.null&notifications_enabled=eq.true`,
        { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
      );
      if (!usersRes.ok) throw new Error('Failed to fetch users');
      const users = await usersRes.json();

      for (const user of users) {
        await processUserNotifications(user);
      }
  } catch (err) {
      console.error('Error checking users:', err);
  }
}

async function processUserNotifications(user) {
  const now = new Date();
  const hour = now.getHours();

  try {
      // Fetch user's tasks from Supabase
      const tasksRes = await fetch(
        `${SUPABASE_URL}/rest/v1/tasks?user_id=eq.${user.id}&status=neq.completed`,
        { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
      );
      const tasks = await tasksRes.json();

      // Fetch recurring tasks
      const recurringRes = await fetch(
        `${SUPABASE_URL}/rest/v1/recurring_tasks?user_id=eq.${user.id}&is_active=eq.true`,
        { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
      );
      const recurringTasks = await recurringRes.json();

      let notificationMessage = null;

      // 8AM — morning briefing
      if (hour === 8) {
        notificationMessage = await generateAINotification(
          user, tasks, recurringTasks, 'morning_briefing'
        );
      }
      // 7PM — recurring task check
      else if (hour === 19) {
        const incomplete = recurringTasks.filter(t => t.last_completed_date !== today());
        if (incomplete.length > 0) {
          notificationMessage = await generateAINotification(
            user, tasks, incomplete, 'recurring_reminder'
          );
        }
      }
      // 8PM — streak reminder
      else if (hour === 20) {
        notificationMessage = await generateAINotification(
          user, tasks, recurringTasks, 'streak_reminder'
        );
      }
      
      // Any hour — deadline within 24 hours check
      const urgentTasks = tasks.filter(t => {
        const dueDate = new Date(t.due_date);
        const hoursUntilDue = (dueDate - now) / (1000 * 60 * 60);
        return hoursUntilDue > 0 && hoursUntilDue <= 24;
      });
      if (urgentTasks.length > 0 && hour === 9) {
        notificationMessage = await generateAINotification(
          user, urgentTasks, [], 'deadline_warning'
        );
      }

      if (notificationMessage && user.push_subscription) {
        try {
          await webpush.sendNotification(
            JSON.parse(user.push_subscription),
            JSON.stringify({
              title: 'TaskTrack 📚',
              body: notificationMessage,
              icon: '/logo192.png',
              badge: '/logo96.png',
              url: '/'
            })
          );
          console.log(`Sent notification to ${user.name}`);
        } catch (err) {
          console.error(`Failed to notify user ${user.id}:`, err);
        }
      }
  } catch (err) {
      console.error(`Error processing notifications for ${user.id}:`, err);
  }
}

async function generateAINotification(user, tasks, recurring, type) {
  if (!GROQ_API_KEY) return "You have pending tasks in TaskTrack! Open the app to see them.";

  const prompt = `You are a witty notification writer for TaskTrack student app.
  Student name: ${user.name}, Streak: ${user.streak} days, Coins: ${user.coins}.
  Tasks: ${JSON.stringify(tasks.slice(0, 5))}.
  Recurring tasks: ${JSON.stringify(recurring.slice(0, 3))}.
  Notification type: ${type}.
  Write ONE short push notification body (max 100 characters). Be fun, use emojis, reference real task names.
  For streak_reminder — be dramatic about losing the streak.
  For recurring_reminder — mention the coin penalty.
  For morning_briefing — be warm and motivating.
  For deadline_warning — create urgency but with humor.
  Return ONLY the notification text, nothing else.`;

  try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 100,
          temperature: 1.0
        })
      });
      const data = await res.json();
      return data.choices[0].message.content.trim().replace(/^["']|["']$/g, '');
  } catch (err) {
      console.error('Groq generation error:', err);
      // Fallback texts
      if (type === 'morning_briefing') return `Good morning ${user.name}! Let's tackle today's tasks!`;
      if (type === 'streak_reminder') return `Protect your ${user.streak}-day streak before midnight!`;
      if (type === 'deadline_warning') return `You have tasks due very soon!`;
      return `You have pending tasks in TaskTrack!`;
  }
}

function today() {
  return new Date().toISOString().split('T')[0];
}

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`TaskTrack backend running on port ${port}`));
