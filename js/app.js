// ============================================================
// JOURNEE D'INTEGRATION - Escape game (chatbot)
// ============================================================

const state = {
  team: null,
  solved: {},           // puzzleId -> true
  words: [],            // mots gagnés, dans l'ordre
  attempts: {},         // puzzleId -> nombre de mauvaises réponses
  answers: {},          // puzzleId -> réponse saisie par l'équipe
  currentIndex: 0,      // index de l'énigme en cours
  presented: {},        // puzzleId -> true si l'énigme a été présentée (après "J'y suis")
  puzzleStartedAt: {},  // puzzleId -> horodatage de début de l'épreuve
  nudged: {}            // puzzleId -> true si le message "Trop dur ?" a déjà été envoyé
};

const NUDGE_DELAY_MS = 5 * 60 * 1000; // 5 minutes

// ---------- Persistance (par équipe) ----------

function storageKey(team) {
  return "jinteg_" + team.trim().toLowerCase();
}

function save() {
  if (!state.team) return;
  localStorage.setItem(storageKey(state.team), JSON.stringify({
    solved: state.solved,
    words: state.words,
    attempts: state.attempts,
    answers: state.answers,
    currentIndex: state.currentIndex,
    presented: state.presented,
    puzzleStartedAt: state.puzzleStartedAt,
    nudged: state.nudged
  }));
}

function load(team) {
  state.solved = {};
  state.words = [];
  state.attempts = {};
  state.answers = {};
  state.currentIndex = 0;
  state.presented = {};
  state.puzzleStartedAt = {};
  state.nudged = {};
  try {
    const raw = localStorage.getItem(storageKey(team));
    if (raw) {
      const data = JSON.parse(raw);
      state.solved = data.solved || {};
      state.words = data.words || [];
      state.attempts = data.attempts || {};
      state.answers = data.answers || {};
      state.currentIndex = data.currentIndex || 0;
      state.presented = data.presented || {};
      state.puzzleStartedAt = data.puzzleStartedAt || {};
      state.nudged = data.nudged || {};
    }
  } catch (e) {
    // stockage illisible : on repart de zéro
  }
}

function resetState() {
  state.solved = {};
  state.words = [];
  state.attempts = {};
  state.answers = {};
  state.currentIndex = 0;
  state.presented = {};
  state.puzzleStartedAt = {};
  state.nudged = {};
}

// ---------- Vues ----------

const views = {
  login: document.getElementById("view-login"),
  game: document.getElementById("view-game")
};

function showView(name) {
  Object.values(views).forEach(v => { v.hidden = true; });
  views[name].hidden = false;
}

// ---------- Chat ----------

const chatMessages = document.getElementById("chat-messages");

// Tableaux normalisés (insensibles à la casse)
const TEAM_PASSWORD_MAP = {};
Object.keys(TEAM_PASSWORDS).forEach(k => {
  TEAM_PASSWORD_MAP[k.toUpperCase()] = TEAM_PASSWORDS[k];
});

const TEAM_MAP = {};
Object.keys(TEAMS).forEach(k => {
  TEAM_MAP[k.toUpperCase()] = TEAMS[k];
});

function teamColor(team) {
  const t = TEAM_MAP[team];
  return t ? t.color : null;
}

function addMessage(text, who) {
  const div = document.createElement("div");
  div.className = "msg " + who;
  div.textContent = text;
  if (who === "team") {
    const color = teamColor(state.team);
    if (color) {
      div.style.background = color;
      div.style.color = "#fff";
    }
  }
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return div;
}

function addBotMessage(text) { return addMessage(text, "bot"); }
function addTeamMessage(text) { return addMessage(text, "team"); }

// ---------- Parcours (ordre des énigmes par équipe) ----------

// Récupère le parcours (liste d'ids d'énigmes) d'une équipe.
function getRoute(team) {
  return ROUTES[team] || PUZZLES.map(p => p.id);
}

// Énigme en cours pour l'équipe connectée.
function currentPuzzle() {
  const route = getRoute(state.team);
  const id = route[state.currentIndex];
  return PUZZLES.find(p => p.id === id) || null;
}

// Marque une énigme comme présentée (démarre le chrono) sans l'afficher.
function markPresented(puzzle) {
  state.presented[puzzle.id] = true;
  markPuzzleStarted();
  save();
}

// Affiche une énigme : titre, message d'arrivée, audio/image/pdf (optionnels), description
function showPuzzle(puzzle) {
  addBotMessage(puzzle.title);
  addBotMessage(puzzle.arrivalMessage);
  if (puzzle.audio) {
    addAudioMessage(puzzle.audio);
  }
  if (puzzle.image) {
    addImageMessage(puzzle.image);
  }
  if (puzzle.pdf) {
    addPdfMessage(puzzle.pdf);
  }
  addBotMessage(puzzle.description);
}

// Ajoute une bulle avec un lecteur audio
function addAudioMessage(src) {
  const div = document.createElement("div");
  div.className = "msg bot audio-msg";
  const audio = document.createElement("audio");
  audio.controls = true;
  audio.src = src;
  div.appendChild(audio);
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return div;
}

// Ajoute une bulle avec une image
function addImageMessage(src) {
  const div = document.createElement("div");
  div.className = "msg bot image-msg";
  const img = document.createElement("img");
  img.src = src;
  img.alt = "Image de l'énigme";
  div.appendChild(img);
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return div;
}

// Ajoute une bulle avec un document PDF
function addPdfMessage(src) {
  const div = document.createElement("div");
  div.className = "msg bot pdf-msg";
  const iframe = document.createElement("iframe");
  iframe.src = src;
  iframe.title = "Document de l'énigme";
  div.appendChild(iframe);
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return div;
}

function renderChat() {
  chatMessages.innerHTML = "";
  addBotMessage("Bienvenue, " + state.team + " ! Résolvez les énigmes pour gagner des mots. À la fin, tous les mots vous aideront à ouvrir le local à ballons. Bonne chance !");
  addBotMessage("RDV au plan d'évacuation.");

  if (PUZZLES.length === 0) {
    addBotMessage("Les énigmes arrivent bientôt… Revenez plus tard !");
    return;
  }

  // Historique des énigmes déjà résolues
  PUZZLES.forEach((puzzle) => {
    if (state.solved[puzzle.id]) {
      showPuzzle(puzzle);
      addTeamMessage(state.answers[puzzle.id] || puzzle.answer);
      addBotMessage("Bravo ! Vous avez gagné le mot : " + puzzle.answer);
    }
  });

  // Énigme en cours (affichée après "J'y suis", ou automatiquement si autoPresent)
  const current = currentPuzzle();
  if (current) {
    if (current.autoPresent && !state.presented[current.id]) {
      markPresented(current);
    }
    if (state.presented[current.id]) {
      showPuzzle(current);
      if (state.nudged[current.id]) {
        addBotMessage("Trop dur ? Demandez un indice aux game masters");
      }
    }
  } else {
    addBotMessage("Toutes les énigmes sont résolues, bravo ! Il est temps de retrouver les game masters.");
  }
}

function renderWords() {
  const list = document.getElementById("words-list");
  list.innerHTML = "";
  if (state.words.length === 0) {
    const empty = document.createElement("span");
    empty.className = "words-empty";
    empty.textContent = "Aucun mot gagné pour l'instant.";
    list.appendChild(empty);
    return;
  }
  const color = teamColor(state.team);
  state.words.forEach(word => {
    const chip = document.createElement("span");
    chip.className = "word-chip";
    chip.textContent = word;
    if (color) {
      chip.style.background = color;
      chip.style.color = "#fff";
    }
    list.appendChild(chip);
  });
}

function renderGame() {
  const label = document.getElementById("team-label");
  label.textContent = "Équipe : " + state.team;
  const color = teamColor(state.team);
  if (color) label.style.color = color;
  renderWords();
  renderChat();
  updateHintBubble();
}

// ---------- Info-bulle indice ----------
// L'indice n'est JAMAIS affiché dans le chat : il est disponible
// uniquement auprès des game masters. La bulle est toujours visible
// pour informer l'équipe qu'elle peut en demander un.

function updateHintBubble() {
  const bubble = document.getElementById("hint-bubble");
  bubble.hidden = !state.team;
}

// Clic sur la bulle : affiche / masque le message
document.getElementById("hint-btn").addEventListener("click", () => {
  const tooltip = document.getElementById("hint-tooltip");
  tooltip.hidden = !tooltip.hidden;
});

// ---------- Relance après 5 minutes ----------
// Quand une équipe reste bloquée plus de 5 minutes sur une énigme,
// le bot envoie un message pour l'orienter vers les game masters.

function markPuzzleStarted() {
  const current = currentPuzzle();
  if (current && !state.puzzleStartedAt[current.id]) {
    state.puzzleStartedAt[current.id] = Date.now();
    save();
  }
}

function checkNudge() {
  if (!state.team) return;
  const current = currentPuzzle();
  if (!current || state.solved[current.id] || state.nudged[current.id]) return;
  const startedAt = state.puzzleStartedAt[current.id];
  if (startedAt && Date.now() - startedAt >= NUDGE_DELAY_MS) {
    state.nudged[current.id] = true;
    save();
    addBotMessage("Trop dur ? Demandez un indice aux game masters");
  }
}

setInterval(checkNudge, 10000);

// ---------- Connexion ----------

const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");

function showLoginError(msg) {
  loginError.textContent = msg;
  loginError.hidden = false;
}

loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const rawTeam = document.getElementById("team-name").value.trim();
  const pass = document.getElementById("team-pass").value;

  if (!rawTeam) {
    showLoginError("Veuillez saisir le nom de votre équipe.");
    return;
  }

  // Nom d'équipe normalisé (insensible à la casse)
  const team = rawTeam.toUpperCase();

  const expected = (TEAM_PASSWORD_MAP[team] !== undefined)
    ? TEAM_PASSWORD_MAP[team]
    : GLOBAL_PASSWORD;

  if (pass !== expected) {
    showLoginError("Mot de passe incorrect. Réessayez.");
    return;
  }

  state.team = team;
  load(team);
  loginError.hidden = true;
  loginForm.reset();
  renderGame();
  showView("game");
});

// ---------- Réinitialisation ----------

document.getElementById("reset-btn").addEventListener("click", () => {
  if (!state.team) return;
  if (!confirm("Réinitialiser la progression de l'équipe " + state.team + " ?")) return;
  resetState();
  localStorage.removeItem(storageKey(state.team));
  document.getElementById("hint-tooltip").hidden = true;
  renderGame();
});

// ---------- Déconnexion ----------

document.getElementById("logout-btn").addEventListener("click", () => {
  state.team = null;
  resetState();
  document.getElementById("hint-tooltip").hidden = true;
  showView("login");
});

// ---------- Envoi de message ----------

const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");

function sendAnswer(answer) {
  const current = currentPuzzle();

  addTeamMessage(answer);

  if (!current) {
    // Aucune énigme en cours
    if (PUZZLES.length === 0) {
      addBotMessage("Les énigmes arrivent bientôt… Revenez plus tard !");
    } else {
      addBotMessage("Toutes les énigmes sont résolues, bravo ! Il est temps de retrouver les game masters.");
    }
    return;
  }

  // L'énigme n'a pas encore été présentée (l'équipe n'a pas dit "J'y suis")
  if (!state.presented[current.id]) {
    if (current.autoPresent) {
      markPresented(current);
      showPuzzle(current);
    } else {
      addBotMessage("D'abord, rendez-vous sur place et cliquez sur « J'y suis ».");
      return;
    }
  }

  if (answer.toLowerCase() === current.answer.toLowerCase()) {
    state.solved[current.id] = true;
    state.answers[current.id] = answer;
    if (!state.words.includes(current.answer)) {
      state.words.push(current.answer);
    }
    state.currentIndex++;
    save();
    renderWords();
    updateHintBubble();

    addBotMessage("Bravo ! Vous avez gagné le mot : " + current.answer);

    // Après l'incrément, l'énigme suivante est la nouvelle énigme en cours
    const next = currentPuzzle();
    if (next) {
      if (next.autoPresent) {
        // Énigme affichée automatiquement, sans déplacement
        markPresented(next);
        showPuzzle(next);
      } else {
        addBotMessage("Nouvelle étape : rendez-vous à " + next.location + ". Cliquez sur « J'y suis » quand vous êtes arrivé.");
      }
    } else {
      addBotMessage("Toutes les énigmes sont résolues, bravo ! Il est temps de retrouver les game masters.");
    }
  } else {
    state.attempts[current.id] = (state.attempts[current.id] || 0) + 1;
    save();
    addBotMessage("Aïe... il va falloir réfléchir un peu plus visiblement.");
    updateHintBubble();
  }
}

chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const answer = chatInput.value.trim();
  if (!answer) return;
  chatInput.value = "";
  sendAnswer(answer);
});

// Réponses rapides pré-définies (statut, pas des réponses d'énigme)
function sendQuickReply(msg) {
  addTeamMessage(msg);
  if (msg === "J'y suis") {
    const current = currentPuzzle();
    if (current && !state.solved[current.id] && !state.presented[current.id]) {
      state.presented[current.id] = true;
      markPuzzleStarted();
      save();
      showPuzzle(current);
    } else {
      addBotMessage("Parfait ! Restez sur place.");
    }
  } else if (msg === "J'ai un problème") {
    addBotMessage("Les game masters sont disponibles sur le terrain.");
  }
}

document.querySelectorAll(".quick-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    sendQuickReply(btn.dataset.msg);
  });
});

// ---------- Version ordinateur / téléphone ----------

const versionDesktopBtn = document.getElementById("version-desktop");
const versionMobileBtn = document.getElementById("version-mobile");

function applyVersion(mobile) {
  document.body.classList.toggle("mobile", mobile);
  versionDesktopBtn.classList.toggle("active", !mobile);
  versionMobileBtn.classList.toggle("active", mobile);
}

versionDesktopBtn.addEventListener("click", () => {
  applyVersion(false);
  localStorage.setItem("jinteg_version", "desktop");
});

versionMobileBtn.addEventListener("click", () => {
  applyVersion(true);
  localStorage.setItem("jinteg_version", "mobile");
});

// ---------- Démarrage ----------

applyVersion(localStorage.getItem("jinteg_version") === "mobile");
showView("login");
