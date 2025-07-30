window.Telegram.WebApp.ready();
const user = window.Telegram.WebApp.initDataUnsafe.user;
const status = document.getElementById('status');

if (user) {
    status.textContent = `Hello, ${user.first_name}! Ready to start your trial.`;
} else {
    status.textContent = 'Ready to start your trial.';
}

document.getElementById('trialButton').addEventListener('click', () => {
    status.textContent = 'Starting your free trial...';
    setTimeout(() => {
        status.textContent = 'Trial activated! Check @InstaClassEduBot.';
    }, 1000);
});