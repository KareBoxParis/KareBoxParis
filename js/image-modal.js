document.addEventListener("DOMContentLoaded", function () {
    const modal = document.getElementById("image-modal");
    const modalPicture = document.getElementById("image-modal-picture");
    const modalCaption = document.getElementById("image-modal-caption");
    const closeButton = document.getElementById("image-modal-close");
    const zoomableImages = document.querySelectorAll(".zoomable-image");

    if (
        !modal ||
        !modalPicture ||
        !modalCaption ||
        !closeButton
    ) {
        return;
    }

    function openModal(image) {
        modalPicture.src = image.src;
        modalPicture.alt = image.alt;
        modalCaption.textContent = image.alt;

        modal.classList.add("open");
        modal.setAttribute("aria-hidden", "false");

        document.body.classList.add("modal-open");

        closeButton.focus();
    }

    function closeModal() {
        modal.classList.remove("open");
        modal.setAttribute("aria-hidden", "true");

        document.body.classList.remove("modal-open");

        modalPicture.src = "";
        modalPicture.alt = "";
        modalCaption.textContent = "";
    }

    zoomableImages.forEach(function (image) {
        image.addEventListener("click", function () {
            openModal(image);
        });

        image.setAttribute("tabindex", "0");
        image.setAttribute("role", "button");
        image.setAttribute(
            "aria-label",
            "Agrandir l’image : " + image.alt
        );

        image.addEventListener("keydown", function (event) {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openModal(image);
            }
        });
    });

    closeButton.addEventListener("click", closeModal);

    modal.addEventListener("click", function (event) {
        if (event.target === modal) {
            closeModal();
        }
    });

    document.addEventListener("keydown", function (event) {
        if (
            event.key === "Escape" &&
            modal.classList.contains("open")
        ) {
            closeModal();
        }
    });
});
