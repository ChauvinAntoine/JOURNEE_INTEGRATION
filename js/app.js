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
  confirmed: {},        // puzzleId -> true si la question de confirmation a reçu "Oui"
  puzzleStartedAt: {},  // puzzleId -> horodatage de début de l'épreuve
  nudged: {},           // puzzleId -> true si le message "Trop dur ?" a déjà été envoyé
  penaltyUntil: 0       // horodatage de fin de pénalité (saisie bloquée)
};

const NUDGE_DELAY_MS = 5 * 60 * 1000; // 5 minutes
const PENALTY_MS = 2 * 60 * 1000;     // 2 minutes de pénalité après une erreur

// ---------- Persistance (par équipe) ----------

function storageKey(team) {
  return "jinteg_" + team.trim().toLowerCase();
}

// La progression n'est plus sauvegardée : elle repart de zéro à chaque
// lancement de l'application (voir load).
function save() {}

function load(team) {
  state.solved = {};
  state.words = [];
  state.attempts = {};
  state.answers = {};
  state.currentIndex = 0;
  state.presented = {};
  state.confirmed = {};
  state.puzzleStartedAt = {};
  state.nudged = {};
  state.penaltyUntil = 0;
  // A chaque lancement de l'application, l'avancée repart de zéro :
  // on efface toute progression sauvegardée pour cette équipe.
  localStorage.removeItem(storageKey(team));
}

function resetState() {
  state.solved = {};
  state.words = [];
  state.attempts = {};
  state.answers = {};
  state.currentIndex = 0;
  state.presented = {};
  state.confirmed = {};
  state.puzzleStartedAt = {};
  state.nudged = {};
  state.penaltyUntil = 0;
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

// Affiche une énigme : titre (+ note), puis après confirmation éventuelle :
// message d'arrivée, audio/image/pdf (optionnels), description
function showPuzzle(puzzle) {
  let title = puzzle.title;
  if (puzzle.note) title += "\n" + puzzle.note;
  addBotMessage(title);
  if (puzzle.confirmQuestion && !state.solved[puzzle.id] && !state.confirmed[puzzle.id]) {
    addBotMessage(puzzle.confirmQuestion);
    return;
  }
  showPuzzleBody(puzzle);
}

function showPuzzleBody(puzzle) {
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
  // view=Fit : la page entière est visible sans faire défiler
  iframe.src = src + "#toolbar=0&navpanes=0&view=Fit";
  iframe.title = "Document de l'énigme";
  div.appendChild(iframe);
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return div;
}

function renderChat() {
  chatMessages.innerHTML = "";
  addBotMessage("Bienvenue, " + state.team + " ! Résolvez les énigmes pour gagner des mots. À la fin, tous les mots vous aideront à ouvrir le local à ballons. Bonne chance !");
  addBotMessage("Vous laisserez le matériel comme vous l'avez trouvé en arrivant sur les lieux.");
  addBotMessage("Merci de respecter les consignes données au cours de la partie.");
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

  if (wordsVisible && state.words.length > 0) {
    addWordsMessage();
  }
}

// Les mots gagnés (indices pour la finale) sont masqués par défaut,
// révélés uniquement via le bouton "Afficher les indices".

let wordsVisible = false;

function renderWords() {
  const toggle = document.getElementById("words-toggle");

  // Le bouton n'apparait que lorsque toutes les énigmes sont résolues,
  // et disparait une fois les indices affichés (action définitive).
  if (state.words.length === 0 || currentPuzzle() !== null) {
    toggle.hidden = true;
    return;
  }

  toggle.hidden = wordsVisible;
}

// Bulle affichée dans le chat avec les mots gagnés,
// un par ligne au format « nom de l'activité : indice »
function addWordsMessage() {
  const div = document.createElement("div");
  div.className = "msg bot words-msg";
  state.words.forEach(word => {
    const puzzle = PUZZLES.find(p => p.answer === word);
    const line = document.createElement("div");
    line.className = "word-line";
    line.textContent = (puzzle ? puzzle.title : "") + " : ";
    const value = document.createElement("span");
    value.className = "word-value";
    value.textContent = word;
    line.appendChild(value);
    div.appendChild(line);
  });
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

document.getElementById("words-toggle").addEventListener("click", () => {
  if (wordsVisible) return;
  // Les indices deviennent un message permanent du chat
  wordsVisible = true;
  renderWords();
  addWordsMessage();
});

function renderGame() {
  const label = document.getElementById("team-label");
  label.textContent = "Équipe : " + state.team;
  const color = teamColor(state.team);
  if (color) label.style.color = color;
  renderWords();
  renderChat();
  updateHintBubble();
  updatePenaltyUI();
}

// ---------- Pénalité après une erreur ----------
// Après une mauvaise réponse, la saisie est bloquée pendant 2 minutes.

function penaltyRemaining() {
  return Math.max(0, (state.penaltyUntil || 0) - Date.now());
}

function updatePenaltyUI() {
  const remaining = penaltyRemaining();
  const locked = remaining > 0 && !!state.team;
  chatInput.disabled = locked;
  const sendBtn = chatForm.querySelector("button");
  if (sendBtn) sendBtn.disabled = locked;
  if (locked) {
    const total = Math.ceil(remaining / 1000);
    const min = Math.floor(total / 60);
    const sec = total % 60;
    chatInput.placeholder = "Pénalité : saisie bloquée " + min + ":" + String(sec).padStart(2, "0");
  } else {
    chatInput.placeholder = "Écrivez votre réponse…";
  }
}

setInterval(() => {
  const wasLocked = chatInput.disabled;
  updatePenaltyUI();
  if (wasLocked && !chatInput.disabled && state.team) {
    addBotMessage("La pénalité est terminée, vous pouvez répondre à nouveau !");
  }
}, 1000);

// ---------- Info-bulle indice ----------
// L'indice n'est JAMAIS affiché dans le chat : il est disponible
// uniquement auprès des game masters. La bulle est toujours visible
// pour informer l'équipe qu'elle peut en demander un.

function updateHintBubble() {
  document.getElementById("hint-bubble").hidden = !state.team;
  document.getElementById("logout-area").hidden = !state.team;
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
  loginAt = Date.now();
  renderGame();
  scheduleStartButton();
  showView("game");
});

// ---------- Réinitialisation ----------

// ---------- Déconnexion ----------

document.getElementById("logout-btn").addEventListener("click", () => {
  state.team = null;
  resetState();
  document.getElementById("hint-tooltip").hidden = true;
  wordsVisible = false;
  updateHintBubble();
  scheduleStartButton();
  showView("login");
});

// ---------- Envoi de message ----------

const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");

function sendAnswer(answer) {
  const current = currentPuzzle();

  // Pénalité en cours : la saisie est bloquée
  if (penaltyRemaining() > 0) {
    addTeamMessage(answer);
    const secs = Math.ceil(penaltyRemaining() / 1000);
    addBotMessage("Patientez jusqu'à la fin de la pénalité (" + secs + " secondes restantes) !");
    return;
  }

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

  // Question de confirmation en attente (ex. chaussures) : aucune réponse
  // d'énigme n'est acceptée tant que l'équipe n'a pas répondu « Oui ».
  if (current.confirmQuestion && !state.solved[current.id] && !state.confirmed[current.id]) {
    if (answer.toLowerCase().startsWith("oui")) {
      state.confirmed[current.id] = true;
      save();
      addBotMessage("Parfait !");
      showPuzzleBody(current);
    } else {
      addBotMessage("Merci de répondre « Oui » pour commencer cette énigme.");
    }
    return;
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
        addBotMessage("Nouvelle étape : rendez-vous " + next.location + ". Cliquez sur «J'y suis» quand vous êtes arrivé.");
      }
    } else {
      addBotMessage("Toutes les énigmes sont résolues, bravo ! Il est temps de retrouver les game masters.");
      addBotMessage("Gardez en tête que le collectif prime toujours sur l'individualité...");
    }
  } else {
    state.attempts[current.id] = (state.attempts[current.id] || 0) + 1;
    state.penaltyUntil = Date.now() + PENALTY_MS;
    save();
    addBotMessage("Aïe... il va falloir penser à réfléchir un jour. Pour la peine, deux minutes de pénalité.");
    updateHintBubble();
    updatePenaltyUI();
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
  }
}

document.querySelectorAll(".quick-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    sendQuickReply(btn.dataset.msg);
  });
});

// ---------- Délai d'affichage de « J'y suis » ----------
// Après la connexion, l'équipe doit se rendre au plan d'évacuation :
// le bouton « J'y suis » n'apparait qu'au bout de 2 minutes.

const START_DELAY_MS = 2 * 60 * 1000;
let loginAt = 0;
let startTimer = null;
let startMsgSent = false;

// Le compte à rebours est basé sur l'heure réelle (loginAt) et vérifié par
// intervalle : si le téléphone se met en veille, les minuteurs sont gelés
// mais le temps écoulé est rattrapé au réveil.
function checkStartButton() {
  const btn = document.getElementById("present-btn");
  if (!state.team) {
    btn.hidden = true;
    return;
  }
  // Le compte admin saute l'attente de 2 minutes
  if (state.team.toLowerCase() === "admin") {
    btn.hidden = false;
    return;
  }
  if (Date.now() - loginAt >= START_DELAY_MS) {
    btn.hidden = false;
    if (!startMsgSent) {
      startMsgSent = true;
      addBotMessage("Une fois rendu sur les lieux de votre première mission, cliquez sur « J'y suis ».");
    }
    clearInterval(startTimer);
    startTimer = null;
  } else {
    btn.hidden = true;
  }
}

function scheduleStartButton() {
  clearInterval(startTimer);
  startMsgSent = false;
  checkStartButton();
  if (state.team && state.team.toLowerCase() !== "admin") {
    startTimer = setInterval(checkStartButton, 2000);
    // Vérifier immédiatement au retour de veille / retour dans l'onglet
    document.addEventListener("visibilitychange", checkStartButton);
    window.addEventListener("focus", checkStartButton);
  }
}

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
