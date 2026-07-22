document.addEventListener("DOMContentLoaded", function () {
    const calendarElement = document.getElementById("calendar");

    if (!calendarElement || typeof FullCalendar === "undefined") {
        console.error("Le calendrier FullCalendar n'a pas pu être chargé.");
        return;
    }

    /*
     * État partagé de la réservation.
     * Le fichier reservation.js pourra récupérer ces informations.
     */
    window.kareboxReservation = window.kareboxReservation || {
        volume: null,
        monthlyPrice: null,
        startDate: null,
        endDate: null,
        minimumEndDate: null
    };

    let startDate = null;
    let endDate = null;
    let selectionEvent = null;

    const startDateText = document.getElementById("dateDebut");
    const endDateText = document.getElementById("dateFin");
    const dateError = document.getElementById("dateError");

    const hiddenStartDate = document.getElementById("selectedStartDate");
    const hiddenEndDate = document.getElementById("selectedEndDate");

    const frenchLocale = "fr-FR";

    /*
     * Transforme une date en format YYYY-MM-DD.
     * Ce format est utilisé dans les champs cachés.
     */
    function formatDateForInput(date) {
        if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
            return "";
        }

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    /*
     * Affichage français de la date.
     * Exemple : 10 septembre 2026
     */
    function formatDateForDisplay(date) {
        if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
            return "Non sélectionnée";
        }

        return new Intl.DateTimeFormat(frenchLocale, {
            day: "numeric",
            month: "long",
            year: "numeric"
        }).format(date);
    }

    /*
     * Crée une copie indépendante d'une date.
     */
    function cloneDate(date) {
        return new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate()
        );
    }

    /*
     * Supprime les heures, minutes et secondes.
     */
    function normalizeDate(date) {
        return new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate()
        );
    }

    /*
     * Retourne la date d'aujourd'hui sans l'heure.
     */
    function getToday() {
        return normalizeDate(new Date());
    }

    /*
     * Calcule la date minimale de fin :
     * la même date du mois suivant.
     *
     * Exemple :
     * 10 septembre → 10 octobre
     *
     * Pour le 31 janvier, si le mois suivant ne contient pas
     * 31 jours, la date devient le dernier jour de février.
     */
    function addOneCalendarMonth(date) {
        const originalDay = date.getDate();

        const targetYear =
            date.getMonth() === 11
                ? date.getFullYear() + 1
                : date.getFullYear();

        const targetMonth = (date.getMonth() + 1) % 12;

        const lastDayOfTargetMonth = new Date(
            targetYear,
            targetMonth + 1,
            0
        ).getDate();

        const targetDay = Math.min(
            originalDay,
            lastDayOfTargetMonth
        );

        return new Date(
            targetYear,
            targetMonth,
            targetDay
        );
    }

    /*
     * FullCalendar considère la date de fin comme exclusive.
     * On ajoute donc un jour pour inclure visuellement
     * la date de fin sélectionnée.
     */
    function addOneDay(date) {
        const result = cloneDate(date);
        result.setDate(result.getDate() + 1);

        return result;
    }

    /*
     * Affiche un message d'erreur sous le calendrier.
     */
    function showDateError(message) {
        if (dateError) {
            dateError.textContent = message;
        }
    }

    /*
     * Efface le message d'erreur.
     */
    function clearDateError() {
        if (dateError) {
            dateError.textContent = "";
        }
    }

    /*
     * Met à jour les informations visibles et cachées.
     */
    function updateDateDisplay() {
        if (startDateText) {
            startDateText.textContent = startDate
                ? formatDateForDisplay(startDate)
                : "Non sélectionnée";
        }

        if (endDateText) {
            endDateText.textContent = endDate
                ? formatDateForDisplay(endDate)
                : "Non sélectionnée";
        }

        if (hiddenStartDate) {
            hiddenStartDate.value = startDate
                ? formatDateForInput(startDate)
                : "";
        }

        if (hiddenEndDate) {
            hiddenEndDate.value = endDate
                ? formatDateForInput(endDate)
                : "";
        }

        window.kareboxReservation.startDate = startDate
            ? cloneDate(startDate)
            : null;

        window.kareboxReservation.endDate = endDate
            ? cloneDate(endDate)
            : null;

        window.kareboxReservation.minimumEndDate = startDate
            ? addOneCalendarMonth(startDate)
            : null;

        /*
         * Cet événement permet à reservation.js
         * de mettre immédiatement le récapitulatif à jour.
         */
        document.dispatchEvent(
            new CustomEvent("kareboxDatesChanged", {
                detail: {
                    startDate: startDate
                        ? cloneDate(startDate)
                        : null,

                    endDate: endDate
                        ? cloneDate(endDate)
                        : null,

                    minimumEndDate: startDate
                        ? addOneCalendarMonth(startDate)
                        : null
                }
            })
        );
    }

    /*
     * Retire l'ancienne période sélectionnée du calendrier.
     */
    function removeSelectionEvent() {
        if (selectionEvent) {
            selectionEvent.remove();
            selectionEvent = null;
        }
    }

    /*
     * Dessine la période choisie dans le calendrier.
     */
    function displaySelectedPeriod() {
        removeSelectionEvent();

        if (!startDate) {
            return;
        }

        const eventEndDate = endDate
            ? addOneDay(endDate)
            : addOneDay(startDate);

        selectionEvent = calendar.addEvent({
            id: "selected-reservation-period",
            title: endDate
                ? "Période souhaitée"
                : "Date de début",

            start: formatDateForInput(startDate),
            end: formatDateForInput(eventEndDate),

            allDay: true,
            display: "background",
            backgroundColor: "rgba(167, 131, 69, 0.28)",
            borderColor: "transparent"
        });
    }

    /*
     * Réinitialise totalement la sélection.
     */
    function resetDates() {
        startDate = null;
        endDate = null;

        removeSelectionEvent();
        clearDateError();
        updateDateDisplay();
    }

    /*
     * Commence une nouvelle sélection.
     */
    function selectStartDate(clickedDate) {
        startDate = cloneDate(clickedDate);
        endDate = null;

        const minimumEndDate = addOneCalendarMonth(startDate);

        clearDateError();

        displaySelectedPeriod();
        updateDateDisplay();

        showDateError(
            `Choisissez maintenant une date de fin à partir du ${
                formatDateForDisplay(minimumEndDate)
            }.`
        );
    }

    /*
     * Tente de choisir la date de fin.
     */
    function selectEndDate(clickedDate) {
        if (!startDate) {
            selectStartDate(clickedDate);
            return;
        }

        const selectedDate = cloneDate(clickedDate);
        const minimumEndDate = addOneCalendarMonth(startDate);

        /*
         * Cliquer sur une date antérieure recommence une nouvelle sélection.
         */
        if (selectedDate < startDate) {
            selectStartDate(selectedDate);

            showDateError(
                "La date de début a été remplacée. Choisissez maintenant la date de fin."
            );

            return;
        }

        /*
         * Vérification de la durée minimale d'un mois.
         */
        if (selectedDate < minimumEndDate) {
            showDateError(
                `La location doit durer au minimum un mois. ` +
                `Choisissez une date de fin à partir du ${
                    formatDateForDisplay(minimumEndDate)
                }.`
            );

            return;
        }

        endDate = selectedDate;

        clearDateError();
        displaySelectedPeriod();
        updateDateDisplay();
    }

    /*
     * Gestion d'un clic sur une journée.
     */
    function handleDateClick(info) {
        const clickedDate = normalizeDate(info.date);
        const today = getToday();

        if (clickedDate < today) {
            showDateError(
                "Vous ne pouvez pas sélectionner une date passée."
            );

            return;
        }

        /*
         * Si une période complète existe déjà,
         * le prochain clic démarre une nouvelle sélection.
         */
        if (startDate && endDate) {
            selectStartDate(clickedDate);
            return;
        }

        if (!startDate) {
            selectStartDate(clickedDate);
            return;
        }

        selectEndDate(clickedDate);
    }

    /*
     * Création du calendrier.
     */
    const calendar = new FullCalendar.Calendar(calendarElement, {
        initialView: "dayGridMonth",

        locale: "fr",

        firstDay: 1,

        height: "auto",

        fixedWeekCount: false,

        showNonCurrentDates: true,

        selectable: false,

        editable: false,

        eventStartEditable: false,

        eventDurationEditable: false,

        dayMaxEvents: false,

        headerToolbar: {
            left: "prev",
            center: "title",
            right: "next today"
        },

        buttonText: {
            today: "Aujourd’hui"
        },

        validRange: function () {
            return {
                start: formatDateForInput(getToday())
            };
        },

        dateClick: handleDateClick,

        dayCellClassNames: function (argument) {
            const cellDate = normalizeDate(argument.date);
            const today = getToday();

            if (cellDate < today) {
                return ["calendar-past-date"];
            }

            if (
                startDate &&
                !endDate &&
                cellDate < addOneCalendarMonth(startDate)
            ) {
                return ["calendar-minimum-duration"];
            }

            return [];
        },

        datesSet: function () {
            /*
             * FullCalendar recrée parfois les cellules lors du changement de mois.
             * Cette fonction force le recalcul visuel.
             */
            calendar.updateSize();
        }
    });

    calendar.render();

    updateDateDisplay();

    /*
     * Fonctions accessibles aux autres fichiers JavaScript.
     */
    window.kareboxCalendar = {
        resetDates: resetDates,

        getStartDate: function () {
            return startDate
                ? cloneDate(startDate)
                : null;
        },

        getEndDate: function () {
            return endDate
                ? cloneDate(endDate)
                : null;
        },

        getMinimumEndDate: function () {
            return startDate
                ? addOneCalendarMonth(startDate)
                : null;
        },

        formatDateForDisplay: formatDateForDisplay,

        formatDateForInput: formatDateForInput
    };
});
