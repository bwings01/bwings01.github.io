/*
 * AI Self-Assessment Quiz
 * Handles the quiz timer, grading, results display, and reset.
 */

// Quiz settings
const TIME_LIMIT_SECONDS = 10 * 60;
const POINTS_PER_QUESTION = 10;
const PASSING_SCORE = 70;

/*
 * Answer key. Each entry matches a question's "name" attribute in quiz.html.
 *   type "text"     - fill in the blank; any value in "answers" is accepted (case-insensitive)
 *   type "radio"    - multiple choice with one correct value
 *   type "select"   - multiple choice drop-down with one correct value
 *   type "checkbox" - multi-select; every correct value and no incorrect value must be chosen
 */
const answerKey = [
    { name: "q1",  type: "text",     answers: ["alan turing", "turing"], display: "Alan Turing" },
    { name: "q2",  type: "text",     answers: ["1956"],                  display: "1956" },
    { name: "q3",  type: "text",     answers: ["deep blue", "ibm deep blue"], display: "Deep Blue" },
    { name: "q4",  type: "radio",    answers: ["b"] },
    { name: "q5",  type: "radio",    answers: ["c"] },
    { name: "q6",  type: "radio",    answers: ["d"] },
    { name: "q7",  type: "radio",    answers: ["a"] },
    { name: "q8",  type: "select",   answers: ["b"] },
    { name: "q9",  type: "checkbox", answers: ["a", "b", "d", "e"] },
    { name: "q10", type: "checkbox", answers: ["a", "b", "d"] }
];

// Page elements
const introSection = document.getElementById("quiz-intro");
const resultsSection = document.getElementById("quiz-results");
const quizForm = document.getElementById("quiz-form");
const timerDisplay = document.getElementById("timer");
const timerBar = document.getElementById("timer-bar");
const resultsBody = document.querySelector("#results-table tbody");

// Timer state
let timerId = null;
let startTime = 0;

// Button event handlers
document.getElementById("start-btn").addEventListener("click", startQuiz);
document.getElementById("retake-btn").addEventListener("click", resetQuiz);
document.getElementById("reset-btn").addEventListener("click", function () {
    if (confirm("Reset the quiz? All of your answers will be cleared and the timer will restart.")) {
        resetQuiz();
    }
});

quizForm.addEventListener("submit", function (event) {
    // Stop the browser from reloading the page
    event.preventDefault();

    const unanswered = answerKey.filter(function (question) {
        return getUserValues(question).length === 0;
    }).length;

    if (unanswered > 0 &&
        !confirm("You have " + unanswered + " unanswered question(s). Submit anyway?")) {
        return;
    }
    submitQuiz(false);
});

/* Shows the form and starts the 10-minute countdown. */
function startQuiz() {
    introSection.hidden = true;
    quizForm.hidden = false;
    startTime = Date.now();
    updateTimer();
    timerId = setInterval(updateTimer, 1000);
}

/* Updates the countdown display and auto-submits when time runs out. */
function updateTimer() {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const remaining = Math.max(TIME_LIMIT_SECONDS - elapsed, 0);

    timerDisplay.textContent = formatTime(remaining);

    // Turn the timer red during the last minute
    timerBar.classList.toggle("timer-warning", remaining <= 60);

    if (remaining === 0) {
        submitQuiz(true);
    }
}

/* Converts a number of seconds to "m:ss" format. */
function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return minutes + ":" + String(seconds).padStart(2, "0");
}

/* Returns the user's answer(s) for a question as an array of values. */
function getUserValues(question) {
    if (question.type === "text") {
        const value = quizForm.elements[question.name].value.trim();
        return value === "" ? [] : [value];
    }
    if (question.type === "select") {
        const value = quizForm.elements[question.name].value;
        return value === "" ? [] : [value];
    }
    // Radio buttons and checkboxes: collect every checked value
    const checked = quizForm.querySelectorAll('input[name="' + question.name + '"]:checked');
    return Array.from(checked).map(function (input) {
        return input.value;
    });
}

/* Checks the user's answer(s) against the answer key. */
function isCorrect(question, userValues) {
    if (question.type === "text") {
        return userValues.length === 1 &&
            question.answers.includes(userValues[0].toLowerCase());
    }
    // For radio, select, and checkbox, the chosen set must match the key exactly
    return userValues.length === question.answers.length &&
        question.answers.every(function (answer) {
            return userValues.includes(answer);
        });
}

/* Turns option values into the readable text shown to the user. */
function describeValues(question, values) {
    if (values.length === 0) {
        return "(no answer)";
    }
    if (question.type === "text") {
        return values[0];
    }
    if (question.type === "select") {
        const select = quizForm.elements[question.name];
        return select.querySelector('option[value="' + values[0] + '"]').textContent;
    }
    return values.map(function (value) {
        const input = quizForm.querySelector('input[name="' + question.name + '"][value="' + value + '"]');
        return input.parentElement.textContent.trim();
    }).join(", ");
}

/* Grades the quiz and displays the results. */
function submitQuiz(timeExpired) {
    clearInterval(timerId);
    const secondsSpent = Math.min(Math.round((Date.now() - startTime) / 1000), TIME_LIMIT_SECONDS);

    let totalScore = 0;
    resultsBody.innerHTML = "";

    answerKey.forEach(function (question, index) {
        const userValues = getUserValues(question);
        const correct = isCorrect(question, userValues);
        const points = correct ? POINTS_PER_QUESTION : 0;
        totalScore += points;

        // Mark the question card green or red
        const card = document.getElementById(question.name + "-card");
        card.classList.add(correct ? "correct" : "incorrect");

        // Build a row for the results table
        const correctText = question.type === "text"
            ? question.display
            : describeValues(question, question.answers);

        const row = document.createElement("tr");
        row.className = correct ? "correct" : "incorrect";
        addCell(row, index + 1);
        addCell(row, correct ? "Correct" : "Incorrect");
        addCell(row, points + " / " + POINTS_PER_QUESTION);
        addCell(row, describeValues(question, userValues));
        addCell(row, correctText);
        resultsBody.appendChild(row);
    });

    // Summary: pass/fail, total score, and time spent
    const passed = totalScore >= PASSING_SCORE;
    const status = document.getElementById("result-status");
    status.textContent = passed ? "PASS" : "FAIL";
    status.className = "summary-value " + (passed ? "pass" : "fail");

    const score = document.getElementById("result-score");
    score.textContent = totalScore + " / " + (answerKey.length * POINTS_PER_QUESTION);
    score.className = "summary-value " + (passed ? "pass" : "fail");

    document.getElementById("result-time").textContent =
        formatTime(secondsSpent) + (timeExpired ? " (time expired)" : "");

    // Lock the answers so they can be reviewed but not changed
    quizForm.querySelectorAll("fieldset").forEach(function (fieldset) {
        fieldset.disabled = true;
    });
    quizForm.classList.add("submitted");

    resultsSection.hidden = false;
    resultsSection.scrollIntoView({ behavior: "smooth" });
}

/* Appends a table cell with the given text to a row. */
function addCell(row, text) {
    const cell = document.createElement("td");
    cell.textContent = text;
    row.appendChild(cell);
}

/* Clears all answers and results and returns to the start screen. */
function resetQuiz() {
    clearInterval(timerId);
    quizForm.reset();

    quizForm.querySelectorAll("fieldset").forEach(function (fieldset) {
        fieldset.disabled = false;
        fieldset.classList.remove("correct", "incorrect");
    });
    quizForm.classList.remove("submitted");
    timerBar.classList.remove("timer-warning");
    timerDisplay.textContent = formatTime(TIME_LIMIT_SECONDS);

    resultsBody.innerHTML = "";
    resultsSection.hidden = true;
    quizForm.hidden = true;
    introSection.hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
}
