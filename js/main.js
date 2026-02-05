const authScreen = document.getElementById("auth-screen");
const contentScreen = document.getElementById("content-screen");
const loaderScreen = document.getElementById("loader-screen");
const uuidInput = document.getElementById("uuid-input");
const searchBtn = document.getElementById("search-btn");
const errorMsg = document.getElementById("error-msg");
const questionsContainer = document.getElementById("questions-container");

searchBtn.addEventListener("click", async () => {
    const uuid = uuidInput.value.trim();
    if (!uuid) return showError("Введите UUID");

    // Показываем лоадер
    loaderScreen.classList.remove("hidden");
    searchBtn.disabled = true;

    try {
        const proxyUrl = "https://api.allorigins.win/get?url=";
        const targetUrl = encodeURIComponent(
            `https://create.kahoot.it/rest/kahoots/${uuid}`,
        );

        const response = await fetch(`${proxyUrl}${targetUrl}`);
        const wrapper = await response.json();
        const data = JSON.parse(wrapper.contents);

        if (typeof clearHighlights === "function") clearHighlights();
        document.getElementById("query-input").value = "";

        renderQuiz(data);

        // Имитация "взлома" для красоты анимации
        setTimeout(() => {
            loaderScreen.classList.add("hidden");
            authScreen.classList.add("hidden");
            contentScreen.classList.remove("hidden");
            authScreen.style.opacity = "0";
            searchBtn.disabled = false;
        }, 1200);
    } catch (err) {
        loaderScreen.classList.add("hidden");
        showError("Ошибка доступа или неверный UUID");
        searchBtn.disabled = false;
    }
});

function renderQuiz(data) {
    document.getElementById("quiz-title").textContent =
        data.title || "Kahoot Quiz";
    questionsContainer.innerHTML = "";

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

    initAccordion();
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
