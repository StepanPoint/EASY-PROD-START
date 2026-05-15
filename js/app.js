import * as webllm from "@mlc-ai/web-llm";

// Конфигурация
const MODEL_ID = "Phi-3-mini-4k-instruct-q4f32_1-MLC";
// Другие варианты моделей (поменьше/побыстрее):
// "Llama-3.2-1B-Instruct-q4f32_1-MLC"

let engine = null;
let modelLoaded = false;

// DOM элементы
const studio = document.getElementById('studioPanel');
const openBtn = document.getElementById('openStudioBtn');
const generateBtn = document.getElementById('generateBtn');
const resultDiv = document.getElementById('resultBox');
const copyArea = document.getElementById('copyBtnArea');
const copyBtn = document.getElementById('copyBtn');
const modelStatusDiv = document.getElementById('modelStatus');

// Открытие студии
openBtn.addEventListener('click', () => {
    studio.classList.toggle('hidden');
    if (!studio.classList.contains('hidden')) {
        studio.scrollIntoView({ behavior: 'smooth' });
        // Загружаем модель при первом открытии
        if (!modelLoaded) {
            initModel();
        }
    }
});

// Инициализация нейросети
async function initModel() {
    try {
        modelStatusDiv.innerHTML = "📥 Загрузка нейросети... (первые 5-10 минут, потом всегда быстро)";
        modelStatusDiv.style.background = "#2a3a2a";
        
        engine = new webllm.MLCEngine();
        await engine.reload(MODEL_ID, {
            temperature: 0.85,
            top_p: 0.95,
            max_gen_len: 1500
        });
        
        modelLoaded = true;
        modelStatusDiv.innerHTML = "✅ Нейросеть готова! Можно генерировать тексты";
        modelStatusDiv.style.background = "#1a3a2a";
        
    } catch (err) {
        console.error(err);
        modelStatusDiv.innerHTML = "❌ Ошибка загрузки модели. Попробуй обновить страницу";
        modelStatusDiv.style.background = "#3a2a2a";
    }
}

// Генерация текста
async function generateLyrics() {
    if (!modelLoaded) {
        alert("Нейросеть ещё не загрузилась. Подожди немного...");
        return;
    }
    
    // Собираем настройки
    const language = document.getElementById('lang').value;
    const bpm = document.getElementById('bpm').value;
    const topic = document.getElementById('topic').value.trim() || "свободная тема";
    const verses = parseInt(document.getElementById('verses').value);
    const choruses = parseInt(document.getElementById('choruses').value);
    const stressEnabled = document.getElementById('stressMarks').checked;
    const vibe = document.getElementById('vibe').value;
    
    const langName = language === 'russian' ? 'русском' : 'english';
    
    // Настройка стиля
    const vibeMap = {
        street: 'уличный, дерзкий, с характером, используй сленг',
        emotional: 'эмоциональный, глубокий, душевный',
        abstract: 'абстрактный, метафоричный, образный'
    };
    
    // Инструкция по ударениям
    let stressInstruction = '';
    if (stressEnabled && language === 'russian') {
        stressInstruction = ' ВАЖНО: выдели ударные гласные ЗАГЛАВНЫМИ буквами. Например: "моЯ душА в туманЕ".';
    }
    
    // Промпт для нейросети
    const prompt = `Ты профессиональный автор рэп-текстов. Напиши текст песни на ${langName} языке.

Параметры:
- Тема: ${topic}
- Стиль: ${vibeMap[vibe]}
- BPM: ${bpm}
- Куплетов: ${verses}
- Припевов: ${choruses}${stressInstruction}

Структура:
${'[КУПЛЕТ]\n' + '...\n'.repeat(verses)}
${'[ПРИПЕВ]\n' + '...\n'.repeat(choruses)}

Важно: строки короткие (8-10 слогов), ритмичные. Пиши ТОЛЬКО текст, без пояснений.`;
    
    // Показываем, что генерируем
    resultDiv.style.display = 'block';
    resultDiv.innerText = "⏳ Генерируем текст... (первые запросы могут быть медленнее)";
    copyArea.style.display = 'none';
    
    try {
        const messages = [
            { role: "system", content: "Ты профессиональный автор рэп-текстов. Отвечаешь только текстом песен." },
            { role: "user", content: prompt }
        ];
        
        let fullResponse = "";
        const completion = await engine.chat.completions.create({
            messages: messages,
            stream: true,
        });
        
        // Читаем ответ по частям (стриминг)
        for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content || "";
            fullResponse += content;
            resultDiv.innerText = fullResponse;
        }
        
        copyArea.style.display = 'flex';
        
    } catch (err) {
        console.error(err);
        resultDiv.innerText = "❌ Ошибка генерации. Попробуй ещё раз.";
    }
}

// Копирование текста
copyBtn.addEventListener('click', () => {
    const text = resultDiv.innerText;
    if (text && !text.includes('❌') && !text.includes('⏳')) {
        navigator.clipboard.writeText(text);
        alert('✅ Текст скопирован!');
        copyBtn.textContent = '✓ Готово!';
        setTimeout(() => {
            copyBtn.textContent = '📋 Копировать текст';
        }, 2000);
    }
});

generateBtn.addEventListener('click', generateLyrics);
