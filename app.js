window.Telegram.WebApp.ready();
const user = window.Telegram.WebApp.initDataUnsafe.user;
const status = document.getElementById('status');
const trialButton = document.getElementById('trialButton');
const plans = document.querySelectorAll('input[name="plan"]');

// Personalize greeting
if (user) {
    status.textContent = `Hello, ${user.first_name}! Choose a plan to start.`;
} else {
    status.textContent = 'Choose a plan to start.';
}

// Handle plan selection
plans.forEach(plan => {
    plan.addEventListener('change', () => {
        const selectedPlan = document.querySelector('input[name="plan"]:checked').value;
        status.textContent = `Selected: ${selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)} plan.`;
    });
});

// Handle button click
trialButton.addEventListener('click', () => {
    const selectedPlan = document.querySelector('input[name="plan"]:checked').value;
    status.textContent = `Processing ${selectedPlan} plan...`;
    trialButton.disabled = true;

    setTimeout(() => {
        if (selectedPlan === 'free') {
            status.textContent = 'Free trial activated! Check @InstaClassEduBot.';
        } else {
            status.textContent = `Redirecting to ${selectedPlan} plan payment...`;
            // Mock payment redirect (replace with OPay/PalmPay link in future)
            setTimeout(() => {
                status.textContent = `Payment successful for ${selectedPlan} plan! Check @InstaClassEduBot.`;
            }, 1000);
        }
        trialButton.disabled = false;
    }, 1500);
});