const authScreen = document.getElementById("auth-screen");
const contentScreen = document.getElementById("content-screen");
const loaderScreen = document.getElementById("loader-screen");
const uuidInput = document.getElementById("uuid-input");
const searchBtn = document.getElementById("search-btn");
const errorMsg = document.getElementById("error-msg");
const questionsContainer = document.getElementById("questions-container");

// Функция для получения данных с прокси (вынесена отдельно для удобства)
async function fetchQuizData(uuid) {
    const proxyUrl = "https://api.allorigins.win/get?url=";
    // Добавляем случайный параметр в конец, чтобы прокси не выдавал старый кэш
    const targetUrl = encodeURIComponent(
        `https://create.kahoot.it/rest/kahoots/${uuid}?nocache=${Date.now()}`,
    );

    const response = await fetch(`${proxyUrl}${targetUrl}`);
    if (!response.ok) throw new Error("Network response was not ok");

    const wrapper = await response.json();

    // Проверка: иногда прокси возвращает ответ, но contents внутри пустой (null)
    if (!wrapper.contents) {
        throw new Error("Empty contents from proxy");
    }

    return JSON.parse(wrapper.contents);
}

searchBtn.addEventListener("click", async () => {
    const uuid = uuidInput.value.trim();
    if (!uuid) return showError("Введите UUID");

    loaderScreen.classList.remove("hidden");
    searchBtn.disabled = true;
    errorMsg.textContent = ""; // Сбрасываем старые ошибки

    try {
        let data;
        try {
            // Первая попытка
            data = await fetchQuizData(uuid);
        } catch (firstTryErr) {
            console.warn(
                "Первая попытка не удалась, пробую еще раз...",
                firstTryErr,
            );
            // Вторая попытка (Retry) через 500мс
            await new Promise((resolve) => setTimeout(resolve, 500));
            data = await fetchQuizData(uuid);
        }

        // Если дошли сюда — данные получены
        if (typeof clearHighlights === "function") clearHighlights();
        const queryInput = document.getElementById("query-input");
        if (queryInput) queryInput.value = "";

        renderQuiz(data);

        setTimeout(() => {
            loaderScreen.classList.add("hidden");
            authScreen.classList.add("hidden");
            contentScreen.classList.remove("hidden");
            authScreen.style.opacity = "0";
            searchBtn.disabled = false;
        }, 1200);
    } catch (err) {
        console.error("Ошибка загрузки:", err);
        loaderScreen.classList.add("hidden");
        showError("Ошибка доступа или неверный UUID");
        searchBtn.disabled = false;
    }
});

function renderQuiz(data) {
    document.getElementById("quiz-title").textContent =
        data.title || "Kahoot Quiz";
    questionsContainer.innerHTML = "";

    if (!data.questions) return;

    data.questions.forEach((q, index) => {
        if (q.type !== "quiz" && q.type !== "multiple_select_quiz") return;

        const item = document.createElement("div");
        item.className = "accordion-item";

        const choicesHtml = q.choices
            .map(
                (choice) => `
            <div class="answer-option ${choice.correct ? "correct" : ""}">
                ${choice.answer}
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

document.getElementById("back-btn").addEventListener("click", () => {
    contentScreen.classList.add("hidden");
    authScreen.classList.remove("hidden");
    authScreen.style.opacity = "1";
});
