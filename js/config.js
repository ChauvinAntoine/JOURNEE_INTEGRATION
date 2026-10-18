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
  "EQUIPE1": "test",
  "EQUIPE2": "test",
  "EQUIPE3": "test",
  "EQUIPE4": "test"
};

// Équipes et leurs couleurs (utilisées dans le chat et l'affichage).
const TEAMS = {
  "EQUIPE1": { color: "#d32f2f" }, // rouge
  "EQUIPE2": { color: "#2e7d32" }, // vert
  "EQUIPE3": { color: "#1565c0" }, // bleu
  "EQUIPE4": { color: "#f9a825" }, // jaune
  "admin":   { color: "#ef6c00" }  // orange
};
