let currentMatchIndex = -1;
let matches = [];

function clearHighlights() {
    const container = document.getElementById("questions-container");
    const counter = document.getElementById("match-counter");

    // 1. Убираем все теги подсветки
    const marks = container.querySelectorAll(".hl");
    marks.forEach((m) => {
        m.replaceWith(document.createTextNode(m.textContent));
    });

    // 2. ВАЖНО: Склеиваем текстовые узлы обратно (нормализация),
    // чтобы поиск не "ломался" на кусках слов
    container.normalize();

    matches = [];
    currentMatchIndex = -1;
    counter.classList.add("hidden");
    counter.textContent = "0 / 0";
}

function performSearch() {
    const queryInput = document.getElementById("query-input");
    const query = queryInput.value.trim().toLowerCase();
    const container = document.getElementById("questions-container");
    const counter = document.getElementById("match-counter");

    // Всегда очищаем старое перед новым поиском
    clearHighlights();

    if (query.length < 1) return;

    // Рекурсивный поиск только в заголовках вопросов
    const headers = container.querySelectorAll(".question-header span:first-child");
    const nodesToReplace = [];

    headers.forEach(header => {
        const walker = document.createTreeWalker(
            header,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        let node;
        while ((node = walker.nextNode())) {
            if (node.textContent.toLowerCase().includes(query)) {
                nodesToReplace.push(node);
            }
        }
    });

    nodesToReplace.forEach((node) => {
        const parent = node.parentNode;
        // Пропускаем, если мы уже внутри другого выделения (на всякий случай)
        if (parent.classList.contains('hl')) return;

        const text = node.textContent;
        const regex = new RegExp(`(${query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, "gi");
        const parts = text.split(regex);

        const fragment = document.createDocumentFragment();
        parts.forEach((part) => {
            if (part.toLowerCase() === query) {
                const mark = document.createElement("span");
                mark.className = "hl";
                mark.textContent = part;
                fragment.appendChild(mark);
                matches.push(mark);
            } else if (part.length > 0) {
                fragment.appendChild(document.createTextNode(part));
            }
        });
        parent.replaceChild(fragment, node);
    });

    if (matches.length > 0) {
        counter.classList.remove("hidden");
        counter.textContent = `0 / ${matches.length}`;
    }
}

function navigateToMatch(index) {
    if (matches.length === 0) return;

    // Убираем подсветку активного элемента
    if (currentMatchIndex !== -1 && matches[currentMatchIndex]) {
        matches[currentMatchIndex].classList.remove("hl-active");
    }

    // Рассчитываем индекс (циклично)
    currentMatchIndex = (index + matches.length) % matches.length;

    const activeMatch = matches[currentMatchIndex];
    activeMatch.classList.add("hl-active");

    // Обновляем счетчик
    document.getElementById("match-counter").textContent =
        `${currentMatchIndex + 1} / ${matches.length}`;

    // Закрываем все открытые аккордеоны, кроме того, где нашли совпадение
    document.querySelectorAll(".accordion-item").forEach((el) => {
        el.classList.remove("active");
        el.querySelector(".answers-list").style.maxHeight = null;
    });

    // Открываем нужный аккордеон
    const accordionItem = activeMatch.closest(".accordion-item");
    const answersList = accordionItem.querySelector(".answers-list");

    accordionItem.classList.add("active");
    answersList.style.maxHeight = answersList.scrollHeight + "px";

    // Плавный скролл к найденному слову
    activeMatch.scrollIntoView({ behavior: "smooth", block: "center" });
}

// Инициализация событий
document.addEventListener("DOMContentLoaded", () => {
    const queryInput = document.getElementById("query-input");
    const findBtn = document.getElementById("find-btn");

    // "Живой" поиск: обновляет выделение, но не прыгает по экрану
    queryInput.addEventListener("input", () => {
        performSearch();
    });

    // Переход к следующему совпадению (кнопка)
    findBtn.addEventListener("click", () => {
        if (matches.length > 0) {
            navigateToMatch(currentMatchIndex + 1);
        } else {
            performSearch();
            if (matches.length > 0) navigateToMatch(0);
        }
    });

    // Переход к следующему совпадению (Enter)
    queryInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault(); // Чтобы не перезагружать страницу
            if (matches.length > 0) {
                navigateToMatch(currentMatchIndex + 1);
            }
        }
    });
});