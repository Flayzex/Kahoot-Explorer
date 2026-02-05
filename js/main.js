const authScreen = document.getElementById("auth-screen");
const contentScreen = document.getElementById("content-screen");
const loaderScreen = document.getElementById("loader-screen");
const uuidInput = document.getElementById("uuid-input");
const searchBtn = document.getElementById("search-btn");
const errorMsg = document.getElementById("error-msg");
const questionsContainer = document.getElementById("questions-container");

/**
 * Валидатор UUID
 */
function isValidUUID(uuid) {
    const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

/**
 * Улучшенная функция получения данных с автоматическими повторами (Retries)
 */
async function fetchQuizWithRetry(uuid, retries = 3) {
    const proxyUrl = "https://api.allorigins.win/get?url=";
    const targetUrl = encodeURIComponent(
        `https://create.kahoot.it/rest/kahoots/${uuid}?nocache=${Date.now()}`,
    );

    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(`${proxyUrl}${targetUrl}`);
            if (!response.ok) throw new Error("Network issues");

            const wrapper = await response.json();
            if (!wrapper.contents) throw new Error("Empty contents");

            const data = JSON.parse(wrapper.contents);

            // Если Kahoot вернул ответ, но там нет вопросов (квиз приватный/удален)
            // Тут ретрай не поможет, поэтому выходим сразу
            if (!data.questions || data.questions.length === 0) {
                return { success: false, error: "empty_quiz" };
            }

            return { success: true, data: data };
        } catch (err) {
            console.warn(`Попытка ${i + 1} провалилась...`);
            if (i === retries - 1) throw err; // Если последняя попытка — пробрасываем ошибку выше
            await new Promise((resolve) => setTimeout(resolve, 800)); // Пауза перед повтором
        }
    }
}

/**
 * Логика поиска
 */
async function handleSearch() {
    const uuid = uuidInput.value.trim();

    if (!uuid) return showError("Введите UUID");
    if (!isValidUUID(uuid)) return showError("Неверный формат UUID");

    loaderScreen.classList.remove("hidden");
    searchBtn.disabled = true;
    errorMsg.textContent = "";

    try {
        const result = await fetchQuizWithRetry(uuid);

        if (!result.success) {
            throw new Error(result.error);
        }

        // Очищаем прошлые результаты поиска (из search.js)
        if (typeof clearHighlights === "function") clearHighlights();
        const queryInput = document.getElementById("query-input");
        if (queryInput) queryInput.value = "";

        renderQuiz(result.data);

        // Финальная анимация перехода
        setTimeout(() => {
            loaderScreen.classList.add("hidden");
            authScreen.classList.add("hidden");
            contentScreen.classList.remove("hidden");
            authScreen.style.opacity = "0";
            searchBtn.disabled = false;
        }, 1000);
    } catch (err) {
        loaderScreen.classList.add("hidden");
        searchBtn.disabled = false;

        if (err.message === "empty_quiz") {
            showError("Квиз пуст или защищен приватностью");
        } else {
            showError("Ошибка доступа. Попробуйте еще раз.");
        }
    }
}

/**
 * Рендеринг интерфейса
 */
function renderQuiz(data) {
    document.getElementById("quiz-title").textContent =
        data.title || "Kahoot Quiz";
    questionsContainer.innerHTML = "";

    data.questions.forEach((q, index) => {
        if (!["quiz", "multiple_select_quiz", "true_false"].includes(q.type))
            return;

        const item = document.createElement("div");
        item.className = "accordion-item";

        const choicesHtml = q.choices
            .map(
                (choice) => `
                <div class="answer-option ${choice.correct ? "correct" : ""}">
                    ${choice.answer || (choice.type === "true" ? "ПРАВДА" : "ЛОЖЬ")}
                    ${choice.correct ? '<b style="float:right">✓</b>' : ""}
                </div>
            `,
            )
            .join("");

        item.innerHTML = `
            <div class="question-header">
                <span><b>${index + 1}.</b> ${q.question}</span>
                <span class="icon">▼</span>
            </div>
            <div class="answers-list">
                ${choicesHtml}
            </div>
        `;
        questionsContainer.appendChild(item);
    });

    if (typeof initAccordion === "function") initAccordion();
}

function showError(text) {
    errorMsg.textContent = text;
    uuidInput.style.borderColor = "var(--neon-pink)";
}

/**
 * Инициализация событий
 */
searchBtn.addEventListener("click", handleSearch);

uuidInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        e.preventDefault();
        handleSearch();
    }
});

document.getElementById("back-btn").addEventListener("click", () => {
    contentScreen.classList.add("hidden");
    authScreen.classList.remove("hidden");
    authScreen.style.opacity = "1";
    uuidInput.value = "";
    errorMsg.textContent = "";
    uuidInput.style.borderColor = "var(--neon-blue)";
});
