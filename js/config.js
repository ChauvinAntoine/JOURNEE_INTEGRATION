// ============================================================
// CONFIGURATION - JOURNEE D'INTEGRATION
// ============================================================

// Mot de passe global : le même pour toutes les équipes.
const GLOBAL_PASSWORD = "integration2026";

// Mots de passe par équipe (optionnel).
// Si une équipe est listée ici, seul SON mot de passe est accepté.
// Sinon, le mot de passe global ci-dessus est utilisé.
const TEAM_PASSWORDS = {
  "admin": "admin",
  // "Nom de l'équipe": "motdepasse",
};

// Indice final affiché quand toutes les énigmes sont résolues.
// Le placeholder {MOTS} est remplacé par les mots gagnés, dans l'ordre.
const FINAL_CLUE = "Les mots gagnés forment votre indice final : {MOTS}";
