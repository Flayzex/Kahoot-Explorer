const authScreen = document.getElementById("auth-screen");
const contentScreen = document.getElementById("content-screen");
const loaderScreen = document.getElementById("loader-screen");
const uuidInput = document.getElementById("uuid-input");
const searchBtn = document.getElementById("search-btn");
const errorMsg = document.getElementById("error-msg");
const questionsContainer = document.getElementById("questions-container");

let currentController = null;
const quizCache = new Map();

/**
 * Валидатор UUID
 */
function isValidUUID(uuid) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        uuid,
    );
}

/**
 * Получение данных с ретраями + abort + cache
 */
async function fetchQuizWithRetry(uuid, retries = 3) {
    if (quizCache.has(uuid)) {
        return { success: true, data: quizCache.get(uuid) };
    }

    if (currentController) currentController.abort();
    currentController = new AbortController();

    const proxyUrl = "https://api.allorigins.win/get?url=";
    const targetUrl = encodeURIComponent(
        `https://create.kahoot.it/rest/kahoots/${uuid}`,
    );

    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(`${proxyUrl}${targetUrl}`, {
                signal: currentController.signal,
            });
            if (!response.ok) throw new Error("network");

            const wrapper = await response.json();
            if (!wrapper.contents) throw new Error("empty");

            const data = JSON.parse(wrapper.contents);

            if (!data.questions || data.questions.length === 0) {
                return { success: false, error: "empty_quiz" };
            }

            quizCache.set(uuid, data);
            return { success: true, data };
        } catch (err) {
            if (err.name === "AbortError") return;
            if (i === retries - 1) throw err;
            await new Promise((r) => setTimeout(r, 300)); // уменьшенная пауза
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
        if (!result || !result.success) throw new Error(result?.error);

        if (typeof clearHighlights === "function") clearHighlights();
        const queryInput = document.getElementById("query-input");
        if (queryInput) queryInput.value = "";

        renderQuiz(result.data);

        loaderScreen.classList.add("hidden");
        authScreen.classList.add("hidden");
        contentScreen.classList.remove("hidden");
        authScreen.style.opacity = "0";
    } catch (err) {
        loaderScreen.classList.add("hidden");
        if (err.message === "empty_quiz") {
            showError("Квиз пуст или защищен приватностью");
        } else if (err.name !== "AbortError") {
            showError("Ошибка доступа. Попробуйте еще раз.");
        }
    } finally {
        searchBtn.disabled = false;
    }
}

/**
 * Рендеринг (ускоренный)
 */
function renderQuiz(data) {
    document.getElementById("quiz-title").textContent =
        data.title || "Kahoot Quiz";

    questionsContainer.innerHTML = "";
    const fragment = document.createDocumentFragment();

    data.questions.forEach((q, index) => {
        if (!["quiz", "multiple_select_quiz", "true_false"].includes(q.type))
            return;

        const item = document.createElement("div");
        item.className = "accordion-item";

        let choicesHtml = "";
        for (const choice of q.choices) {
            choicesHtml += `
                <div class="answer-option ${choice.correct ? "correct" : ""}">
                    ${choice.answer || (choice.type === "true" ? "ПРАВДА" : "ЛОЖЬ")}
                    ${choice.correct ? '<b style="float:right">✓</b>' : ""}
                </div>
            `;
        }

        item.innerHTML = `
            <div class="question-header">
                <span><b>${index + 1}.</b> ${q.question}</span>
                <div class="header-controls">
                    <button class="hide-btn" title="Скрыть">✕</button>
                    <span class="icon">▼</span>
                </div>
            </div>
            <div class="answers-list">
                ${choicesHtml}
            </div>
            <div class="hidden-placeholder hidden">
                <span>Вопрос №${index + 1} скрыт</span>
                <button class="restore-btn">Показать</button>
            </div>
        `;

        const hideBtn = item.querySelector(".hide-btn");
        const restoreBtn = item.querySelector(".restore-btn");
        const qHeader = item.querySelector(".question-header");
        const qAnswers = item.querySelector(".answers-list");
        const placeholder = item.querySelector(".hidden-placeholder");

        item.dataset.index = index; // Сохраняем оригинальный индекс для сортировки

        hideBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            qHeader.classList.add("hidden");
            qAnswers.style.maxHeight = null;
            item.classList.remove("active");
            placeholder.classList.remove("hidden");
            item.classList.add("is-hidden");

            // Перемещаем в конец контейнера
            questionsContainer.appendChild(item);
        });

        restoreBtn.addEventListener("click", () => {
            qHeader.classList.remove("hidden");
            placeholder.classList.add("hidden");
            item.classList.remove("is-hidden");

            // Возвращаем на правильное место по индексу
            const siblings = Array.from(questionsContainer.children);
            const nextSibling = siblings.find(sib => {
                return !sib.classList.contains("is-hidden") && parseInt(sib.dataset.index) > index;
            }) || siblings.find(sib => sib.classList.contains("is-hidden"));

            if (nextSibling) {
                questionsContainer.insertBefore(item, nextSibling);
            } else {
                questionsContainer.appendChild(item);
            }
        });

        fragment.appendChild(item);
    });

    questionsContainer.appendChild(fragment);
    if (typeof initAccordion === "function") initAccordion();
}

function showError(text) {
    errorMsg.textContent = text;
    uuidInput.style.borderColor = "var(--neon-pink)";
}

/**
 * Инициализация
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
