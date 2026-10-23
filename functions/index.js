const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

admin.initializeApp();

/**
 * Firebase Cloud Function: Triggered automatically on task write in Firestore ('tasks/{taskId}')
 * Sends email reminder 24 hours prior to task due date if emailReminder24h is enabled.
 */
exports.sendTaskReminder24h = onDocumentWritten('tasks/{taskId}', async (event) => {
  const snapshot = event.data;
  if (!snapshot || !snapshot.after || !snapshot.after.exists) return;

  const task = snapshot.after.data();
  if (!task || !task.emailReminder24h || task.emailReminderSent) return;

  const assigneeEmail = task.assigneeEmail;
  if (!assigneeEmail) {
    console.log(`[Task Reminder] No assignee email provided for task ${event.params.taskId}`);
    return;
  }

  const dueDateStr = task.dueDate || task.endDate;
  if (!dueDateStr) return;

  const dueDate = new Date(dueDateStr);
  const now = new Date();
  const diffHours = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);

  // If due within 24 hours (or up to 2 hours past) and not sent yet:
  if (diffHours <= 24 && diffHours >= -2) {
    console.log(`[Task Reminder] Sending 24h reminder to ${assigneeEmail} for task "${task.name}"`);

    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.SMTP_USER || '',
          pass: process.env.SMTP_PASS || '',
        },
      });

      await transporter.sendMail({
        from: '"Cabinet KBB App" <notifications@kbb-avocats.com>',
        to: assigneeEmail,
        subject: `⏰ Rappel [24H] - Tâche à échéance : ${task.name}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f8fafc; border-radius: 10px;">
            <h2 style="color: #15447c;">Rappel d'échéance à 24 heures</h2>
            <p>Bonjour,</p>
            <p>Ceci est un rappel automatique pour la tâche suivante :</p>
            <div style="background-color: #ffffff; padding: 15px; border-left: 4px solid #10b981; border-radius: 6px; margin: 15px 0;">
              <p style="margin: 0 0 5px 0;"><strong>Tâche :</strong> ${task.name}</p>
              <p style="margin: 0 0 5px 0;"><strong>Date d'échéance :</strong> ${dueDateStr}</p>
              <p style="margin: 0 0 5px 0;"><strong>Responsable :</strong> ${task.lawyer || 'Non attribué'}</p>
              ${task.notes ? `<p style="margin: 5px 0 0 0; color: #64748b;"><em>Notes : ${task.notes}</em></p>` : ''}
            </div>
            <p style="font-size: 12px; color: #94a3b8;">Cabinet d'Avocats KBB — Notification Firebase Cloud Function</p>
          </div>
        `,
      });

      // Mark reminder as sent in Firestore to prevent duplicate emails
      await snapshot.after.ref.update({ emailReminderSent: true, emailSentAt: new Date().toISOString() });
      console.log(`[Task Reminder] Successfully sent email and updated task ${event.params.taskId}`);
    } catch (err) {
      console.error('[Task Reminder Error]', err);
    }
  }
});

/**
 * Hourly Cron Schedule Function: Checks tasks due in 24 hours
 */
exports.checkScheduledTaskReminders = onSchedule('every 1 hours', async () => {
  const db = admin.firestore();
  const now = new Date();

  try {
    const snapshot = await db.collection('tasks')
      .where('emailReminder24h', '==', true)
      .where('emailReminderSent', '!=', true)
      .get();

    for (const doc of snapshot.docs) {
      const task = doc.data();
      const dueDateStr = task.dueDate || task.endDate;
      if (!dueDateStr) continue;

      const dueDate = new Date(dueDateStr);
      const diffHours = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (diffHours <= 24 && diffHours >= -2 && task.assigneeEmail) {
        // Send email and update doc
        await doc.ref.update({ emailReminderSent: true, emailSentAt: new Date().toISOString() });
      }
    }
  } catch (err) {
    console.error('[Scheduled Task Check Error]', err);
  }
});
