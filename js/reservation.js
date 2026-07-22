document.addEventListener("DOMContentLoaded", function () {
    /*
     * =========================================================
     * KAREBOXPARIS - GESTION DE LA DEMANDE DE DISPONIBILITÉ
     * =========================================================
     *
     * Ce fichier gère :
     *
     * - le choix du volume ;
     * - les tarifs mensuels ;
     * - la récupération des dates du calendrier ;
     * - l'estimation de la durée ;
     * - l'estimation du prix ;
     * - le préremplissage depuis l'adresse URL ;
     * - la validation du formulaire ;
     * - la préparation d'un e-mail de demande.
     */


    /* =========================================================
       CONFIGURATION
       ========================================================= */

    const PRICES = {
        2: 50,
        4: 80,
        6: 110,
        12: 180
    };

    /*
     * Remplace cette adresse par ton adresse e-mail professionnelle.
     *
     * Exemple :
     * contact@kareboxparis.fr
     */
    const CONTACT_EMAIL = "VOTRE-EMAIL@EXEMPLE.FR";


    /* =========================================================
       ÉLÉMENTS DE LA PAGE
       ========================================================= */

    const reservationForm = document.getElementById("reservationForm");

    const volumeInputs = document.querySelectorAll(
        'input[name="volume"]'
    );

    const clientNameInput = document.getElementById("clientName");
    const clientEmailInput = document.getElementById("clientEmail");
    const clientPhoneInput = document.getElementById("clientPhone");
    const clientTypeInput = document.getElementById("clientType");
    const storageUseInput = document.getElementById("storageUse");
    const clientMessageInput = document.getElementById("clientMessage");

    const prohibitedItemsAgreement = document.getElementById(
        "prohibitedItemsAgreement"
    );

    const contactAgreement = document.getElementById(
        "contactAgreement"
    );

    const selectedVolumeInput = document.getElementById(
        "selectedVolume"
    );

    const selectedPriceInput = document.getElementById(
        "selectedPrice"
    );

    const selectedStartDateInput = document.getElementById(
        "selectedStartDate"
    );

    const selectedEndDateInput = document.getElementById(
        "selectedEndDate"
    );

    const estimatedTotalInput = document.getElementById(
        "estimatedTotal"
    );

    const summaryVolume = document.getElementById("summaryVolume");

    const summaryMonthlyPrice = document.getElementById(
        "summaryMonthlyPrice"
    );

    const summaryStartDate = document.getElementById(
        "summaryStartDate"
    );

    const summaryEndDate = document.getElementById(
        "summaryEndDate"
    );

    const summaryDuration = document.getElementById(
        "summaryDuration"
    );

    const summaryTotal = document.getElementById("summaryTotal");

    const volumeError = document.getElementById("volumeError");
    const dateError = document.getElementById("dateError");
    const formError = document.getElementById("formError");

    const reservationConfirmation = document.getElementById(
        "reservationConfirmation"
    );

    const confirmationMessage = document.getElementById(
        "confirmationMessage"
    );

    const submitButton = document.getElementById(
        "reservationSubmit"
    );


    /* =========================================================
       ÉTAT DE LA RÉSERVATION
       ========================================================= */

    const reservationState = {
        volume: null,
        monthlyPrice: null,
        startDate: null,
        endDate: null,
        durationMonths: null,
        durationDays: null,
        estimatedTotal: null
    };

    window.kareboxReservation =
        window.kareboxReservation || reservationState;


    /* =========================================================
       OUTILS POUR LES DATES
       ========================================================= */

    function normalizeDate(date) {
        if (!(date instanceof Date)) {
            return null;
        }

        if (Number.isNaN(date.getTime())) {
            return null;
        }

        return new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate()
        );
    }


    function parseInputDate(value) {
        if (!value) {
            return null;
        }

        const parts = value.split("-");

        if (parts.length !== 3) {
            return null;
        }

        const year = Number(parts[0]);
        const month = Number(parts[1]) - 1;
        const day = Number(parts[2]);

        const date = new Date(year, month, day);

        return normalizeDate(date);
    }


    function formatDateForDisplay(date) {
        const normalizedDate = normalizeDate(date);

        if (!normalizedDate) {
            return "—";
        }

        return new Intl.DateTimeFormat("fr-FR", {
            day: "numeric",
            month: "long",
            year: "numeric"
        }).format(normalizedDate);
    }


    function formatDateForEmail(date) {
        const normalizedDate = normalizeDate(date);

        if (!normalizedDate) {
            return "Non renseignée";
        }

        return new Intl.DateTimeFormat("fr-FR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }).format(normalizedDate);
    }


    function getDaysBetween(startDate, endDate) {
        const start = normalizeDate(startDate);
        const end = normalizeDate(endDate);

        if (!start || !end || end < start) {
            return 0;
        }

        const millisecondsPerDay = 1000 * 60 * 60 * 24;

        return Math.round(
            (end.getTime() - start.getTime()) /
            millisecondsPerDay
        );
    }


    /*
     * Calcule une durée mensuelle commerciale.
     *
     * Exemples :
     *
     * 10 septembre → 10 octobre = 1 mois
     * 10 septembre → 25 octobre = environ 1,5 mois
     * 10 septembre → 10 novembre = 2 mois
     */
    function calculateRentalDuration(startDate, endDate) {
        const start = normalizeDate(startDate);
        const end = normalizeDate(endDate);

        if (!start || !end || end < start) {
            return {
                days: 0,
                exactMonths: 0,
                billableMonths: 0
            };
        }

        const days = getDaysBetween(start, end);

        let completeMonths =
            (end.getFullYear() - start.getFullYear()) * 12 +
            (end.getMonth() - start.getMonth());

        const anniversaryDate = new Date(
            start.getFullYear(),
            start.getMonth() + completeMonths,
            start.getDate()
        );

        /*
         * Corrige les dates comme le 31 janvier.
         */
        if (anniversaryDate > end) {
            completeMonths -= 1;
        }

        const completedMonthDate = addMonthsSafely(
            start,
            completeMonths
        );

        const nextMonthDate = addMonthsSafely(
            start,
            completeMonths + 1
        );

        const remainingDays = getDaysBetween(
            completedMonthDate,
            end
        );

        const currentMonthLength = Math.max(
            getDaysBetween(completedMonthDate, nextMonthDate),
            1
        );

        const partialMonth = remainingDays / currentMonthLength;

        const exactMonths = completeMonths + partialMonth;

        /*
         * Facturation estimative au prorata mensuel.
         * Le minimum reste toujours un mois.
         */
        const billableMonths = Math.max(exactMonths, 1);

        return {
            days: days,
            exactMonths: exactMonths,
            billableMonths: billableMonths
        };
    }


    function addMonthsSafely(date, numberOfMonths) {
        const normalizedDate = normalizeDate(date);

        if (!normalizedDate) {
            return null;
        }

        const originalDay = normalizedDate.getDate();

        const firstDayOfTargetMonth = new Date(
            normalizedDate.getFullYear(),
            normalizedDate.getMonth() + numberOfMonths,
            1
        );

        const targetYear =
            firstDayOfTargetMonth.getFullYear();

        const targetMonth =
            firstDayOfTargetMonth.getMonth();

        const lastDayOfTargetMonth = new Date(
            targetYear,
            targetMonth + 1,
            0
        ).getDate();

        return new Date(
            targetYear,
            targetMonth,
            Math.min(originalDay, lastDayOfTargetMonth)
        );
    }


    function formatDuration(duration) {
        if (!duration || duration.billableMonths <= 0) {
            return "—";
        }

        const exactMonths = duration.exactMonths;
        const days = duration.days;

        if (Math.abs(exactMonths - 1) < 0.03) {
            return `1 mois (${days} jours)`;
        }

        if (
            Math.abs(exactMonths - Math.round(exactMonths)) <
            0.03
        ) {
            const roundedMonths = Math.round(exactMonths);

            return `${roundedMonths} mois (${days} jours)`;
        }

        const roundedValue = exactMonths
            .toFixed(1)
            .replace(".", ",");

        return `Environ ${roundedValue} mois (${days} jours)`;
    }


    /* =========================================================
       OUTILS POUR LES PRIX
       ========================================================= */

    function formatPrice(value) {
        if (
            value === null ||
            value === undefined ||
            Number.isNaN(Number(value))
        ) {
            return "—";
        }

        return new Intl.NumberFormat("fr-FR", {
            style: "currency",
            currency: "EUR",
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(Number(value));
    }


    function calculateEstimatedTotal() {
        if (
            !reservationState.monthlyPrice ||
            !reservationState.startDate ||
            !reservationState.endDate
        ) {
            reservationState.estimatedTotal = null;
            reservationState.durationMonths = null;
            reservationState.durationDays = null;

            return;
        }

        const duration = calculateRentalDuration(
            reservationState.startDate,
            reservationState.endDate
        );

        reservationState.durationMonths =
            duration.billableMonths;

        reservationState.durationDays =
            duration.days;

        reservationState.estimatedTotal =
            reservationState.monthlyPrice *
            duration.billableMonths;
    }


    /* =========================================================
       MESSAGES D'ERREUR
       ========================================================= */

    function setError(element, message) {
        if (element) {
            element.textContent = message;
        }
    }


    function clearError(element) {
        if (element) {
            element.textContent = "";
        }
    }


    function clearAllErrors() {
        clearError(volumeError);
        clearError(dateError);
        clearError(formError);
    }


    /* =========================================================
       CHOIX DU VOLUME
       ========================================================= */

    function findSelectedVolumeInput() {
        return document.querySelector(
            'input[name="volume"]:checked'
        );
    }


    function selectVolume(volumeValue) {
        const normalizedVolume = Number(volumeValue);

        if (!PRICES[normalizedVolume]) {
            return false;
        }

        const matchingInput = document.querySelector(
            `input[name="volume"][value="${normalizedVolume}"]`
        );

        if (!matchingInput) {
            return false;
        }

        matchingInput.checked = true;

        reservationState.volume = normalizedVolume;
        reservationState.monthlyPrice =
            PRICES[normalizedVolume];

        window.kareboxReservation.volume =
            normalizedVolume;

        window.kareboxReservation.monthlyPrice =
            PRICES[normalizedVolume];

        if (selectedVolumeInput) {
            selectedVolumeInput.value =
                String(normalizedVolume);
        }

        if (selectedPriceInput) {
            selectedPriceInput.value =
                String(PRICES[normalizedVolume]);
        }

        clearError(volumeError);

        calculateEstimatedTotal();
        updateSummary();

        return true;
    }


    volumeInputs.forEach(function (input) {
        input.addEventListener("change", function () {
            selectVolume(input.value);
        });
    });


    /* =========================================================
       PRÉREMPLISSAGE DEPUIS L'URL
       ========================================================= */

    function preselectVolumeFromUrl() {
        const parameters = new URLSearchParams(
            window.location.search
        );

        const volumeParameter = parameters.get("volume");

        if (volumeParameter) {
            selectVolume(volumeParameter);
            return;
        }

        /*
         * Par défaut, aucun volume n'est imposé.
         * Le client doit faire son choix.
         */
        updateSummary();
    }


    /* =========================================================
       RÉCUPÉRATION DES DATES DU CALENDRIER
       ========================================================= */

    function updateDatesFromCalendar(eventDetail) {
        let startDate = null;
        let endDate = null;

        if (eventDetail) {
            startDate = normalizeDate(
                eventDetail.startDate
            );

            endDate = normalizeDate(
                eventDetail.endDate
            );
        }

        if (!startDate && selectedStartDateInput) {
            startDate = parseInputDate(
                selectedStartDateInput.value
            );
        }

        if (!endDate && selectedEndDateInput) {
            endDate = parseInputDate(
                selectedEndDateInput.value
            );
        }

        reservationState.startDate = startDate;
        reservationState.endDate = endDate;

        window.kareboxReservation.startDate =
            startDate;

        window.kareboxReservation.endDate =
            endDate;

        calculateEstimatedTotal();
        updateSummary();
    }


    document.addEventListener(
        "kareboxDatesChanged",
        function (event) {
            updateDatesFromCalendar(event.detail);
        }
    );


    /* =========================================================
       MISE À JOUR DU RÉCAPITULATIF
       ========================================================= */

    function updateSummary() {
        if (summaryVolume) {
            summaryVolume.textContent =
                reservationState.volume
                    ? `${reservationState.volume} m³`
                    : "À sélectionner";
        }

        if (summaryMonthlyPrice) {
            summaryMonthlyPrice.textContent =
                reservationState.monthlyPrice
                    ? `${formatPrice(
                        reservationState.monthlyPrice
                    )} / mois`
                    : "—";
        }

        if (summaryStartDate) {
            summaryStartDate.textContent =
                reservationState.startDate
                    ? formatDateForDisplay(
                        reservationState.startDate
                    )
                    : "—";
        }

        if (summaryEndDate) {
            summaryEndDate.textContent =
                reservationState.endDate
                    ? formatDateForDisplay(
                        reservationState.endDate
                    )
                    : "—";
        }

        if (summaryDuration) {
            if (
                reservationState.startDate &&
                reservationState.endDate
            ) {
                const duration = calculateRentalDuration(
                    reservationState.startDate,
                    reservationState.endDate
                );

                summaryDuration.textContent =
                    formatDuration(duration);
            } else {
                summaryDuration.textContent = "—";
            }
        }

        if (summaryTotal) {
            summaryTotal.textContent =
                reservationState.estimatedTotal !== null
                    ? formatPrice(
                        reservationState.estimatedTotal
                    )
                    : "—";
        }

        if (estimatedTotalInput) {
            estimatedTotalInput.value =
                reservationState.estimatedTotal !== null
                    ? reservationState.estimatedTotal.toFixed(2)
                    : "";
        }
    }


    /* =========================================================
       VALIDATION DU FORMULAIRE
       ========================================================= */

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
            email.trim()
        );
    }


    function isValidPhone(phone) {
        const cleanedPhone = phone.replace(
            /[\s().-]/g,
            ""
        );

        return /^(\+33|0)[1-9]\d{8}$/.test(
            cleanedPhone
        );
    }


    function validateReservation() {
        clearAllErrors();

        let isValid = true;
        let firstInvalidElement = null;

        const selectedVolume = findSelectedVolumeInput();

        if (!selectedVolume) {
            setError(
                volumeError,
                "Veuillez sélectionner un volume de stockage."
            );

            firstInvalidElement =
                document.getElementById("volumeGrid");

            isValid = false;
        }

        if (
            !reservationState.startDate ||
            !reservationState.endDate
        ) {
            setError(
                dateError,
                "Veuillez sélectionner une date de début et une date de fin."
            );

            if (!firstInvalidElement) {
                firstInvalidElement =
                    document.getElementById("calendar");
            }

            isValid = false;
        }

        if (
            reservationState.startDate &&
            reservationState.endDate
        ) {
            const minimumEndDate = addMonthsSafely(
                reservationState.startDate,
                1
            );

            if (
                reservationState.endDate <
                minimumEndDate
            ) {
                setError(
                    dateError,
                    "La durée minimale de location est d’un mois."
                );

                if (!firstInvalidElement) {
                    firstInvalidElement =
                        document.getElementById("calendar");
                }

                isValid = false;
            }
        }

        if (
            !clientNameInput ||
            clientNameInput.value.trim().length < 2
        ) {
            setError(
                formError,
                "Veuillez renseigner votre nom et votre prénom."
            );

            firstInvalidElement =
                firstInvalidElement ||
                clientNameInput;

            isValid = false;
        } else if (
            !clientEmailInput ||
            !isValidEmail(clientEmailInput.value)
        ) {
            setError(
                formError,
                "Veuillez renseigner une adresse e-mail valide."
            );

            firstInvalidElement =
                firstInvalidElement ||
                clientEmailInput;

            isValid = false;
        } else if (
            !clientPhoneInput ||
            !isValidPhone(clientPhoneInput.value)
        ) {
            setError(
                formError,
                "Veuillez renseigner un numéro de téléphone français valide."
            );

            firstInvalidElement =
                firstInvalidElement ||
                clientPhoneInput;

            isValid = false;
        } else if (
            !storageUseInput ||
            storageUseInput.value.trim().length < 3
        ) {
            setError(
                formError,
                "Veuillez indiquer ce que vous souhaitez stocker."
            );

            firstInvalidElement =
                firstInvalidElement ||
                storageUseInput;

            isValid = false;
        } else if (
            !prohibitedItemsAgreement ||
            !prohibitedItemsAgreement.checked
        ) {
            setError(
                formError,
                "Veuillez confirmer que vous ne stockerez aucun produit interdit."
            );

            firstInvalidElement =
                firstInvalidElement ||
                prohibitedItemsAgreement;

            isValid = false;
        } else if (
            !contactAgreement ||
            !contactAgreement.checked
        ) {
            setError(
                formError,
                "Veuillez accepter d’être contacté pour la confirmation."
            );

            firstInvalidElement =
                firstInvalidElement ||
                contactAgreement;

            isValid = false;
        }

        if (!isValid && firstInvalidElement) {
            firstInvalidElement.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });

            if (
                typeof firstInvalidElement.focus ===
                "function"
            ) {
                window.setTimeout(function () {
                    firstInvalidElement.focus({
                        preventScroll: true
                    });
                }, 500);
            }
        }

        return isValid;
    }


    /* =========================================================
       PRÉPARATION DE LA DEMANDE
       ========================================================= */

    function getClientTypeLabel(value) {
        const labels = {
            particulier: "Particulier",
            professionnel: "Professionnel",
            association: "Association",
            autre: "Autre"
        };

        return labels[value] || "Non précisé";
    }


    function createEmailSubject() {
        return (
            `Demande de disponibilité KareBoxParis - ` +
            `${reservationState.volume} m³`
        );
    }


    function createEmailBody() {
        const duration = calculateRentalDuration(
            reservationState.startDate,
            reservationState.endDate
        );

        const message =
            clientMessageInput &&
            clientMessageInput.value.trim()
                ? clientMessageInput.value.trim()
                : "Aucun message complémentaire.";

        return [
            "Bonjour,",
            "",
            "Je souhaite vérifier la disponibilité d’un espace de stockage KareBoxParis.",
            "",
            "ESPACE SOUHAITÉ",
            `Volume : ${reservationState.volume} m³`,
            `Tarif mensuel : ${formatPrice(
                reservationState.monthlyPrice
            )}`,
            "",
            "PÉRIODE SOUHAITÉE",
            `Date de début : ${formatDateForEmail(
                reservationState.startDate
            )}`,
            `Date de fin : ${formatDateForEmail(
                reservationState.endDate
            )}`,
            `Durée estimée : ${formatDuration(duration)}`,
            `Montant estimé : ${formatPrice(
                reservationState.estimatedTotal
            )}`,
            "",
            "INFORMATIONS DU CLIENT",
            `Nom et prénom : ${clientNameInput.value.trim()}`,
            `E-mail : ${clientEmailInput.value.trim()}`,
            `Téléphone : ${clientPhoneInput.value.trim()}`,
            `Profil : ${getClientTypeLabel(
                clientTypeInput.value
            )}`,
            "",
            "OBJETS À STOCKER",
            storageUseInput.value.trim(),
            "",
            "MESSAGE COMPLÉMENTAIRE",
            message,
            "",
            "Je confirme ne pas souhaiter stocker de produits dangereux, inflammables, périssables, interdits ou illicites.",
            "",
            "Je comprends que cette demande ne constitue pas une réservation définitive et qu’aucun paiement ne sera effectué avant confirmation.",
            "",
            "Cordialement,",
            clientNameInput.value.trim()
        ].join("\n");
    }


    function createMailtoLink() {
        const subject = encodeURIComponent(
            createEmailSubject()
        );

        const body = encodeURIComponent(
            createEmailBody()
        );

        return `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
    }


    /* =========================================================
       CONFIRMATION VISIBLE
       ========================================================= */

    function showConfirmation() {
        if (!reservationConfirmation) {
            return;
        }

        reservationConfirmation.hidden = false;

        if (confirmationMessage) {
            confirmationMessage.textContent =
                `Votre demande pour un espace de ` +
                `${reservationState.volume} m³, du ` +
                `${formatDateForDisplay(
                    reservationState.startDate
                )} au ${formatDateForDisplay(
                    reservationState.endDate
                )}, a été préparée. ` +
                `Votre application de messagerie va s’ouvrir afin de l’envoyer.`;
        }

        reservationConfirmation.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    }


    /* =========================================================
       ENVOI DU FORMULAIRE
       ========================================================= */

    if (reservationForm) {
        reservationForm.addEventListener(
            "submit",
            function (event) {
                event.preventDefault();

                updateDatesFromCalendar();

                if (!validateReservation()) {
                    return;
                }

                calculateEstimatedTotal();
                updateSummary();

                if (
                    CONTACT_EMAIL ===
                    "VOTRE-EMAIL@EXEMPLE.FR"
                ) {
                    setError(
                        formError,
                        "Avant de mettre le formulaire en ligne, remplacez l’adresse VOTRE-EMAIL@EXEMPLE.FR dans js/reservation.js par votre véritable adresse e-mail."
                    );

                    return;
                }

                if (submitButton) {
                    submitButton.disabled = true;
                    submitButton.textContent =
                        "Préparation de la demande...";
                }

                showConfirmation();

                const mailtoLink = createMailtoLink();

                window.setTimeout(function () {
                    window.location.href = mailtoLink;

                    if (submitButton) {
                        submitButton.disabled = false;
                        submitButton.textContent =
                            "Demander la disponibilité";
                    }
                }, 350);
            }
        );
    }


    /* =========================================================
       EFFACEMENT DES ERREURS PENDANT LA SAISIE
       ========================================================= */

    const clientFields = [
        clientNameInput,
        clientEmailInput,
        clientPhoneInput,
        clientTypeInput,
        storageUseInput,
        clientMessageInput
    ];

    clientFields.forEach(function (field) {
        if (!field) {
            return;
        }

        field.addEventListener("input", function () {
            clearError(formError);
        });

        field.addEventListener("change", function () {
            clearError(formError);
        });
    });

    [
        prohibitedItemsAgreement,
        contactAgreement
    ].forEach(function (checkbox) {
        if (!checkbox) {
            return;
        }

        checkbox.addEventListener(
            "change",
            function () {
                clearError(formError);
            }
        );
    });


    /* =========================================================
       INITIALISATION
       ========================================================= */

    preselectVolumeFromUrl();
    updateDatesFromCalendar();
    updateSummary();
});
