const inputBox = document.getElementById("input-box");
const listContainer = document.getElementById("list-container");

const chatbotButton = document.getElementById("chatbot-button");
const chatbotWindow = document.getElementById("chatbot-window");
const messagesDiv = document.getElementById("chatbot-messages");
const inputField = document.getElementById("chatbot-input");
const sendButton = document.getElementById("chatbot-send");

function addTask() {
    if (inputBox.value === '') {
        alert("⚡Oops! Add a task before hitting the button.");
    }
    else {
        let li = document.createElement("li");
        li.innerHTML = inputBox.value;
        listContainer.appendChild(li);
        let span = document.createElement("span");
        span.innerHTML = "\u00d7";
        li.appendChild(span);
    }
    inputBox.value = "";
    saveData();
}

listContainer.addEventListener("click", function (e) {
    if (e.target.tagName === "LI") {
        e.target.classList.toggle("checked");
        saveData();
    }
    else if (e.target.tagName === "SPAN") {
        e.target.parentElement.remove();
        saveData();
    }
}, false);

function saveData() {
    localStorage.setItem("data", listContainer.innerHTML);
}

function showTask() {
    listContainer.innerHTML = localStorage.getItem("data");
}

showTask();

// Toggle chatbot window
chatbotButton.addEventListener("click", () => {
    chatbotWindow.style.display =
        chatbotWindow.style.display === "flex" ? "none" : "flex";
});

// Send message
sendButton.addEventListener("click", async () => {
    const userMessage = inputField.value.trim();
    if (!userMessage) return;

    addMessage("You: " + userMessage);

    // Call backend to get AI response
    const res = await fetch("http://localhost:3000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
    });
    const data = await res.json();

    addMessage("AI: " + data.reply);
    inputField.value = "";
});

function addMessage(text) {
    const msg = document.createElement("div");
    msg.textContent = text;
    messagesDiv.appendChild(msg);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}
