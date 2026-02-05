const authScreen = document.getElementById("auth-screen");
const contentScreen = document.getElementById("content-screen");
const loaderScreen = document.getElementById("loader-screen");
const uuidInput = document.getElementById("uuid-input");
const searchBtn = document.getElementById("search-btn");
const errorMsg = document.getElementById("error-msg");
const questionsContainer = document.getElementById("questions-container");

/**
 * Валидатор UUID формата xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
 */
function isValidUUID(uuid) {
    const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

/**
 * Функция для получения данных с прокси с механизмом Retry
 */
async function fetchQuizData(uuid) {
    const proxyUrl = "https://api.allorigins.win/get?url=";
    // nocache нужен, чтобы прокси не отдавал старые ошибки из своего кэша
    const targetUrl = encodeURIComponent(
        `https://create.kahoot.it/rest/kahoots/${uuid}?nocache=${Date.now()}`,
    );

    const response = await fetch(`${proxyUrl}${targetUrl}`);
    if (!response.ok) throw new Error("Network response was not ok");

    const wrapper = await response.json();

    if (!wrapper.contents) {
        throw new Error("Empty contents from proxy");
    }

    const data = JSON.parse(wrapper.contents);

    // Если UUID валиден, но квиза нет (например, удален), Kahoot вернет объект без вопросов
    if (!data.questions || data.questions.length === 0) {
        throw new Error("Quiz has no questions or is private");
    }

    return data;
}

searchBtn.addEventListener("click", async () => {
    const uuid = uuidInput.value.trim();

    // 1. Проверка на пустоту
    if (!uuid) return showError("Введите UUID");

    // 2. Валидация формата (Мгновенная проверка)
    if (!isValidUUID(uuid)) {
        return showError("Неверный формат UUID. Проверьте дефисы и символы.");
    }

    // Если проверки пройдены, начинаем "взлом"
    loaderScreen.classList.remove("hidden");
    searchBtn.disabled = true;
    errorMsg.textContent = "";

    try {
        let data;
        try {
            // Первая попытка загрузки
            data = await fetchQuizData(uuid);
        } catch (firstTryErr) {
            // Если квиз приватный, retry не поможет — сразу кидаем ошибку
            if (firstTryErr.message === "Quiz has no questions or is private")
                throw firstTryErr;

            console.warn("Попытка 1 провалена. Запуск Retry...");
            await new Promise((resolve) => setTimeout(resolve, 600));
            data = await fetchQuizData(uuid);
        }

        // Подготовка интерфейса перед показом
        if (typeof clearHighlights === "function") clearHighlights();
        const queryInput = document.getElementById("query-input");
        if (queryInput) queryInput.value = "";

        renderQuiz(data);

        // Красивый выход из лоадера
        setTimeout(() => {
            loaderScreen.classList.add("hidden");
            authScreen.classList.add("hidden");
            contentScreen.classList.remove("hidden");
            authScreen.style.opacity = "0";
            searchBtn.disabled = false;
        }, 1200);
    } catch (err) {
        console.error("Critical Error:", err);
        loaderScreen.classList.add("hidden");

        if (err.message === "Quiz has no questions or is private") {
            showError("Квиз пуст, удален или защищен настройками приватности");
        } else {
            showError("Ошибка соединения. Попробуйте еще раз через секунду.");
        }

        searchBtn.disabled = false;
    }
});

/**
 * Рендеринг вопросов в аккордеон
 */
function renderQuiz(data) {
    document.getElementById("quiz-title").textContent =
        data.title || "Kahoot Quiz";
    questionsContainer.innerHTML = "";

    data.questions.forEach((q, index) => {
        // Пропускаем информационные слайды без вопросов
        if (
            q.type !== "quiz" &&
            q.type !== "multiple_select_quiz" &&
            q.type !== "true_false"
        )
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

    // Инициализируем обработчики кликов для новых элементов
    if (typeof initAccordion === "function") initAccordion();
}

/**
 * Визуальное отображение ошибки
 */
function showError(text) {
    errorMsg.textContent = text;
    uuidInput.style.borderColor = "var(--neon-pink)";
    // Тряска инпута при ошибке (можно добавить в CSS анимацию shake)
    uuidInput.classList.add("shake");
    setTimeout(() => uuidInput.classList.remove("shake"), 500);
}

document.getElementById("back-btn").addEventListener("click", () => {
    contentScreen.classList.add("hidden");
    authScreen.classList.remove("hidden");
    authScreen.style.opacity = "1";
    uuidInput.value = "";
    errorMsg.textContent = "";
    uuidInput.style.borderColor = "var(--neon-blue)";
});
