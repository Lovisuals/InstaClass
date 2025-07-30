// C:\Users\CLOUD9\Documents\AgentX\InstaClass-Project\app.js
const Telegram = window.Telegram.WebApp;
Telegram.expand();

// Simulate Free Trial access (replace with database check later)
if (Telegram.WebApp.initDataUnsafe.user) {
  const userPlan = 'Free Trial'; // Hardcoded for now
  if (userPlan === 'Free Trial') {
    window.location.href = 'dashboard.html';
  } else {
    Telegram.showAlert('Please select a plan to access the dashboard.');
  }
}