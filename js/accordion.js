function initAccordion() {
    const headers = document.querySelectorAll(".question-header");

    headers.forEach((header) => {
        header.addEventListener("click", () => {
            const item = header.parentElement;
            const body = header.nextElementSibling;
            const isOpen = item.classList.contains("active");

            // Закрываем все остальные
            document.querySelectorAll(".accordion-item").forEach((el) => {
                el.classList.remove("active");
                el.querySelector(".answers-list").style.maxHeight = null;
            });

            // Если текущий был закрыт — открываем его
            if (!isOpen) {
                item.classList.add("active");
                body.style.maxHeight = body.scrollHeight + "px";
            }
        });
    });
}
