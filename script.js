// script.js (replace your current contents with this file)

// ---------- To-Do app DOM refs ----------
const inputBox = document.getElementById("input-box");
const listContainer = document.getElementById("list-container");

// Chatbot DOM refs (keep names from your code)
const chatbotButton = document.getElementById("chatbot-button");
const chatbotWindow = document.getElementById("chatbot-window");
const messagesDiv = document.getElementById("chatbot-messages");
const inputField = document.getElementById("chatbot-input");
const sendButton = document.getElementById("chatbot-send");

// ---------- To-Do functions ----------
// create list item from given text and append; saves data
function addTaskText(text) {
  if (!text || !text.toString().trim()) return;
  const li = document.createElement("li");
  li.innerHTML = sanitizeText(String(text));
  // add close button
  const span = document.createElement("span");
  span.innerHTML = "\u00d7";
  li.appendChild(span);
  listContainer.appendChild(li);
  saveData();
}

// old addTask uses the input box (keeps UX for the Add button)
function addTask() {
  if (!inputBox.value.trim()) {
    alert("⚡Oops! Add a task before hitting the button.");
    return;
  }
  addTaskText(inputBox.value);
  inputBox.value = "";
}

// helper to avoid accidental HTML injection (basic)
function sanitizeText(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

// list click handling (toggle checked or remove)
listContainer.addEventListener(
  "click",
  function (e) {
    if (e.target.tagName === "LI") {
      e.target.classList.toggle("checked");
      saveData();
    } else if (e.target.tagName === "SPAN") {
      e.target.parentElement.remove();
      saveData();
    }
  },
  false
);

function saveData() {
  localStorage.setItem("data", listContainer.innerHTML);
}

function showTask() {
  const saved = localStorage.getItem("data");
  listContainer.innerHTML = saved ? saved : "";
}
showTask();

// ---------- Chatbot UI toggle ----------
chatbotButton.addEventListener("click", () => {
  chatbotWindow.style.display = chatbotWindow.style.display === "flex" ? "none" : "flex";
  // focus input when opening
  if (chatbotWindow.style.display === "flex") inputField.focus();
});

// Close button inside header (if you have one)
const chatbotClose = document.getElementById("chatbot-close");
if (chatbotClose) chatbotClose.addEventListener("click", () => (chatbotWindow.style.display = "none"));

// ---------- Chat messaging helpers ----------
function addMessageUser(text) {
  const msg = document.createElement("div");
  msg.className = "chat-msg user";
  msg.textContent = text;
  messagesDiv.appendChild(msg);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function addMessageBot(text) {
  const msg = document.createElement("div");
  msg.className = "chat-msg bot";
  msg.textContent = text;
  messagesDiv.appendChild(msg);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// optional: typing indicator bubble
function addTypingIndicator() {
  const el = document.createElement("div");
  el.className = "chat-msg bot typing";
  el.textContent = "typing...";
  messagesDiv.appendChild(el);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
  return el;
}

// ---------- Local rule-based reply logic (fast fallback) ----------
function localReplyFor(input) {
  const t = String(input || "").trim();
  const lower = t.toLowerCase();
  if (!t) return "Say something 😊";

  if (/(^hi$|^hello$|^hey\b)/i.test(lower)) {
    return "Hey! I can add tasks (type 'add buy milk') or show 'help'.";
  }
  if (lower === "help") {
    return "Commands:\n• add <task> — add task\n• help — show this\n• thanks — you're welcome!";
  }
  if (lower.startsWith("add ")) {
    const task = t.slice(4).trim();
    if (!task) return "Tell me what to add, e.g. 'add buy milk'.";
    // Add task to list
    addTaskText(task);
    // also emit an event (in case other code listens)
    document.dispatchEvent(new CustomEvent("chatbot-add-task", { detail: { text: task } }));
    return `Added: "${task}" — check your list!`;
  }
  if (lower.includes("thank")) {
    return "Anytime! 🙌";
  }
  return "I don't get that yet. Type 'help' for commands.";
}

// ---------- Server call (placeholder server at http://localhost:3000) ----------
async function callServerChat(userText, timeoutMs = 6000) {
  const backendUrl = "http://localhost:3000/chat"; // change if your server runs elsewhere

  // Abortable fetch with timeout
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const resp = await fetch(backendUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: userText }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!resp.ok) {
      // don't throw; return null to indicate fallback
      console.warn("chat server non-OK:", resp.status);
      return null;
    }
    const data = await resp.json();
    // data might be { status: "unavailable", reply: "..." }
    return data?.reply ?? null;
  } catch (err) {
    clearTimeout(timer);
    console.warn("callServerChat error:", err?.message ?? err);
    return null; // indicate server not available
  }
}

// ---------- Main send handler ----------
let sendInProgress = false;
sendButton.addEventListener("click", onSendClicked);
inputField.addEventListener("keydown", (e) => {
  if (e.key === "Enter") onSendClicked();
});

async function onSendClicked() {
  if (sendInProgress) return;
  const userText = inputField.value.trim();
  if (!userText) return;

  // show user message in UI
  addMessageUser(userText);
  inputField.value = "";

  // First try server (preferred). If server fails or returns null, fallback to local reply.
  sendInProgress = true;
  const typingEl = addTypingIndicator();

  // Try server call
  const serverReply = await callServerChat(userText);

  // remove typing indicator
  if (typingEl && typingEl.parentElement) typingEl.remove();

  if (serverReply) {
    // If server returned reply text, append it.
    addMessageBot(serverReply);
    // If server returned an 'unavailable' placeholder that contains an 'add ' request,
    // we still want to support add commands locally. We'll also attempt to parse the user message below.
  } else {
    // fallback to local rule-based reply
    const local = localReplyFor(userText);
    addMessageBot(local);
  }

  // Additional: If the user typed 'add <task>' and server was used or not,
  // ensure the task is created locally too (in case server didn't create it).
  // The localReplyFor already adds task when 'add ...' and serverReply won't add it automatically,
  // so we ensure idempotency: attempt to parse add command and add if missing.
  const lower = userText.toLowerCase();
  if (lower.startsWith("add ")) {
    const task = userText.slice(4).trim();
    // Check if task text already exists in list (simple check)
    const exists = Array.from(listContainer.children).some(li => li.textContent && li.textContent.includes(task));
    if (!exists && task) {
      // add task locally
      addTaskText(task);
    }
  }

  sendInProgress = false;
}

// ---------- Listen for chatbot-add-task events from other modules (safety) ----------
document.addEventListener("chatbot-add-task", (e) => {
  const text = e?.detail?.text;
  if (text && String(text).trim()) addTaskText(text);
});

// ---------- Small UX: greet once when user opens widget ----------
(function greetOnce() {
  // show a single short bot message if none present
  if (!messagesDiv.querySelector(".chat-msg")) {
    addMessageBot("Hey! I'm your helper — type 'help' or 'add milk'.");
  }
})();

