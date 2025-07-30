// C:\Users\CLOUD9\Documents\AgentX\InstaClass-Project\app.js
const Telegram = window.Telegram.WebApp;
Telegram.expand();

function goToDashboard() {
  const userPlan = 'Free Trial'; // Hardcoded for now
  if (userPlan === 'Free Trial') {
    document.getElementById('status').innerText = 'Redirecting to dashboard...';
    window.location.href = 'dashboard.html';
  } else {
    Telegram.showAlert('Please select a plan to access the dashboard.');
    document.getElementById('status').innerText = 'Plan selection required.';
  }
}

// Optional: Auto-redirect for testing
if (Telegram.WebApp.initDataUnsafe.user) {
  goToDashboard();
}