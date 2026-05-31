function showLoader(show) {
    document.getElementById('loader').style.display = show? 'block' : 'none';
    const btn = document.getElementById('analyzeBtn');
    if (btn) btn.disabled = show;
}

function toBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// Add this to js/common.js

const NEXT_STEPS = {
    disease: [
        { titleKey: "check_weather", textKey: "spray_medicine_today", link: "weather.html", icon: "🌦️" },
        { titleKey: "ask_ai_expert", textKey: "more_tips_disease", link: "chatbot.html", icon: "🤖" }
    ],
    weather: [
        { titleKey: "check_market_price", textKey: "good_to_sell_today", link: "market.html", icon: "💰" },
        { titleKey: "irrigation_guide", textKey: "plan_water_rain", link: "irrigation.html", icon: "💧" }
    ],
    market: [
        { titleKey: "govt_schemes", textKey: "check_subsidy_crop", link: "schemes.html", icon: "🏛️" },
        { titleKey: "crop_recommendation", textKey: "grow_next_season", link: "crop-recommend.html", icon: "🌾" }
    ],
    chatbot: [
        { titleKey: "disease_check", textKey: "upload_photo_ai_disease", link: "disease.html", icon: "📷" },
        { titleKey: "growing_guide", textKey: "step_by_step_guide_crop", link: "guide.html", icon: "📖" }
    ]
};

function showNextSteps(pageKey, containerId) {
    const steps = NEXT_STEPS[pageKey];
    if (!steps) return;

    const container = document.getElementById(containerId);
    if (!container) return;

    let html = `<div style="margin-top:24px;"><h3 style="font-size:18px; margin-bottom:12px;" data-i18n="what_to_do_next">${t('what_to_do_next')}</h3>`;

    steps.forEach(step => {
        html += `
        <a href="${step.link}" class="feature-card" style="margin-bottom:8px;">
            <div class="icon">${step.icon}</div>
            <div class="content">
                <h3 data-i18n="${step.titleKey}">${t(step.titleKey)}</h3>
                <p data-i18n="${step.textKey}">${t(step.textKey)}</p>
            </div>
            <div class="arrow">→</div>
        </a>`;
    });

    html += `</div>`;
    container.innerHTML += html;
}

