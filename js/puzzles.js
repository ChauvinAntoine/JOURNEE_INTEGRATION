// ============================================================
// ENIGMES - JOURNEE D'INTEGRATION
// ============================================================
// Ajoutez vos énigmes ici. Chaque énigme est un objet :
//   id             : numéro unique
//   title          : titre affiché à l'équipe
//   description    : texte de l'énigme
//   answer         : réponse attendue (insensible à la casse et aux espaces)
//                    — c'est aussi le mot gagné (utilisé pour l'indice final)
//   arrivalMessage : message du bot quand l'équipe clique sur "J'y suis"
//   audio          : (optionnel) chemin du fichier audio, ex. "audio/enigme2.mp4"
//   image          : (optionnel) chemin de l'image, ex. "images/enigme3.jpg"
//   pdf            : (optionnel) chemin du fichier PDF, ex. "images/enigme4.pdf"
const PUZZLES = [
  {
    id: 1,
    title: "Bazar dans le dojo",
    arrivalMessage: "C'est le chaos dans le dojo. Et si vous rangiez vos affaires pour récupérer un premier indice ?",
    description: "Inscrivez le mot découvert pour avancer dans vos recherches.",
    answer: "TERRAIN"
  },
  {
    id: 2,
    title: "A la recherche des joueurs",
    arrivalMessage: "On a perdu Clément et Antoine... Mais où ont-ils pu passer ?",
    description: "Inscrivez le mot découvert pour avancer dans vos recherches.",
    audio: "audio/enigme2.mp4",
    answer: "SHOOTING"
  },
  {
    id: 3,
    title: "La vie de paparazzi",
    arrivalMessage: "On dirait qu'une séance photos a eu lieu récemment, difficile de s'y retrouver...",
    description: "Inscrivez le mot découvert pour avancer dans vos recherches.",
    answer: "FINALE"
  },
  {
    id: 4,
    title: "Mé-lignes-mélo",
    arrivalMessage: "MESSAGE_D_ARRIVEE",
    description: "DESCRIPTION",
    pdf: "images/enigme4.pdf",
    answer: "LAY-UP"
  },
  {
    id: 5,
    title: "Rébus dans les WC",
    arrivalMessage: "On dirait que les toilettes ont besoin d'un peu de nettoyage, il y a des papiers partout...",
    description: "Inscrivez le mot découvert pour avancer dans vos recherches.",
    answer: "INDIVIDUEL"
  },
  {
    id: 6,
    title: "Décryptage dans le hall",
    arrivalMessage: "Un hackeur est passé dans le coin, le texte est incompréhensible.",
    description: "Inscrivez le mot découvert pour avancer dans vos recherches.",
    answer: "MARQUEUR"
  },
  {
    id: 7,
    title: "Choix tactiques",
    arrivalMessage: "Temps mort : le coach souhaite mettre un système en place.",
    description: "Inscrivez le mot découvert pour avancer dans vos recherches.",
    answer: "FOULE"
  },
  {
    id: 8,
    title: "Le voleur de lettres",
    arrivalMessage: "MESSAGE_D_ARRIVEE",
    description: "DESCRIPTION",
    answer: "PANIER"
  }
];

// ============================================================
// PARCOURS - un ordre d'énigmes par équipe
// ============================================================
// Hypothèse : chaque énigme dure 5 minutes et toutes les équipes
// démarrent en même temps. Les parcours sont construits pour que,
// à chaque tranche de 5 minutes, les 4 équipes soient sur 4
// énigmes DIFFÉRENTES (jamais deux équipes sur la même énigme).
//
// Chaque équipe fait les 8 énigmes, dans un ordre différent.
// (admin suit l'ordre 1→8 pour les tests.)
const ROUTES = {
  "EQUIPE1": [1, 5, 7, 2, 4, 6, 3, 8],
  "EQUIPE2": [2, 8, 6, 3, 5, 1, 7, 4],
  "EQUIPE3": [6, 3, 4, 1, 7, 2, 8, 5],
  "EQUIPE4": [4, 7, 2, 5, 8, 3, 1, 6],
  "admin":   [1, 2, 3, 4, 5, 6, 7, 8]
};
