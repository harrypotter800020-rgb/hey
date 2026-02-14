(function () {
  const STORAGE_KEY = 'medReminders';
  const CHECK_INTERVAL_MS = 15000;
  let reminders = [];
  let audioContext = null;
  let reminderInterval = null;

  function supportsNotifications() {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  function todayKey(date = new Date()) {
    return date.toISOString().slice(0, 10);
  }

  function loadReminders() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
      reminders = parsed.map((r) => ({
        id: r.id || Date.now() + Math.random(),
        medicine: r.medicine,
        time: r.time,
        taken: Boolean(r.taken),
        lastNotifiedDate: r.lastNotifiedDate || null,
      }));
    } catch (_error) {
      reminders = [];
    }
  }

  function saveReminders() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
    displayReminders();
  }

  function initAudio() {
    if (audioContext) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    audioContext = new AudioCtx();
  }

  function playAlertSound() {
    initAudio();
    if (!audioContext) return;
    if (audioContext.state === 'suspended') audioContext.resume();

    const now = audioContext.currentTime;
    for (let i = 0; i < 4; i += 1) {
      const osc = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gainNode.gain.setValueAtTime(0.28, now + i * 0.2);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + i * 0.2 + 0.16);
      osc.connect(gainNode);
      gainNode.connect(audioContext.destination);
      osc.start(now + i * 0.2);
      osc.stop(now + i * 0.2 + 0.2);
    }
  }

  function maybeRequestNotificationPermission() {
    if (!supportsNotifications()) return;
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  function showReminderNotification(reminder) {
    if (supportsNotifications() && Notification.permission === 'granted') {
      new Notification('MediConnect Reminder', {
        body: `Time to take ${reminder.medicine}`,
        icon: 'https://cdn-icons-png.flaticon.com/512/2966/2966327.png',
      });
    }
  }

  function checkReminders() {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const dateKey = todayKey(now);
    let changed = false;

    reminders.forEach((r) => {
      if (!r.time || !r.medicine) return;
      if (r.time === currentTime && r.lastNotifiedDate !== dateKey) {
        showReminderNotification(r);
        playAlertSound();
        alert(`⏰ Medicine Reminder: ${r.medicine} at ${r.time}`);
        r.lastNotifiedDate = dateKey;
        r.taken = true;
        changed = true;
      }
    });

    if (changed) saveReminders();
  }

  function startReminderChecker() {
    if (reminderInterval) clearInterval(reminderInterval);
    checkReminders();
    reminderInterval = setInterval(checkReminders, CHECK_INTERVAL_MS);
  }

  function markTaken(id) {
    const reminder = reminders.find((item) => item.id === id);
    if (!reminder) return;
    reminder.taken = true;
    reminder.lastNotifiedDate = todayKey();
    saveReminders();
  }

  function deleteReminder(id) {
    reminders = reminders.filter((item) => item.id !== id);
    saveReminders();
  }

  function displayReminders() {
    const list = document.getElementById('reminderList');
    if (!list) return;

    if (!reminders.length) {
      list.innerHTML = '<p style="color:#64748b; text-align:center;">No reminders yet.</p>';
      return;
    }

    list.innerHTML = reminders
      .map(
        (r) => `
          <div class="reminder-item">
              <div><strong>${r.medicine}</strong> at ${r.time} ${r.taken ? '✅' : '⏳'}</div>
              <div>
                  <button onclick="markTaken(${r.id})" style="background:#10b981; color:white; border:none; padding:0.4rem 0.9rem; border-radius:30px;"><i class="fas fa-check"></i></button>
                  <button onclick="deleteReminder(${r.id})" style="background:#ef4444; color:white; border:none; padding:0.4rem 0.9rem; border-radius:30px; margin-left:0.5rem;"><i class="fas fa-trash"></i></button>
              </div>
          </div>
      `,
      )
      .join('');
  }

  function addReminder() {
    const medInput = document.getElementById('reminderMed');
    const timeInput = document.getElementById('reminderTime');
    if (!medInput || !timeInput) return;

    const med = medInput.value.trim();
    const time = timeInput.value;

    if (!med || !time) {
      alert('Enter medicine and time');
      return;
    }

    maybeRequestNotificationPermission();

    reminders.push({
      id: Date.now(),
      medicine: med,
      time,
      taken: false,
      lastNotifiedDate: null,
    });

    saveReminders();
    medInput.value = '';
    timeInput.value = '';
    alert(`⏰ Reminder set for ${med} at ${time}. You'll hear a beep and get a notification.`);
    initAudio();
    checkReminders();
  }

  window.addReminder = addReminder;
  window.markTaken = markTaken;
  window.deleteReminder = deleteReminder;
  window.displayReminders = displayReminders;
  window.startReminderChecker = startReminderChecker;
  window.initAudio = initAudio;

  loadReminders();
  maybeRequestNotificationPermission();

  window.addEventListener('beforeunload', () => {
    if (reminderInterval) clearInterval(reminderInterval);
  });
})();
