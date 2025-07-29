window.addEventListener('load', () => {
    const statusElement = document.getElementById('status');
    if (window.Telegram && window.Telegram.WebApp) {
      const webApp = window.Telegram.WebApp;
      webApp.ready();
      webApp.expand();
      statusElement.textContent = webApp.initDataUnsafe.user
        ? `Hello, ${webApp.initDataUnsafe.user.first_name}! Ready to start your trial.`
        : 'Ready to start your trial.';
      document.getElementById('start-trial').addEventListener('click', () => {
        statusElement.textContent = 'Starting your free trial...';
        setTimeout(() => {
          statusElement.textContent = 'Trial activated! Check @InstaClassBot.';
        }, 1000);
      });
    } else {
      statusElement.textContent = 'Please open this app in Telegram.';
    }
  });