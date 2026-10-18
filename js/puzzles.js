// ============================================================
// ENIGMES - JOURNEE D'INTEGRATION
// ============================================================
// Ajoutez vos énigmes ici. Chaque énigme est un objet :
//   id             : numéro unique
//   title          : titre affiché à l'équipe
//   description    : texte de l'énigme
//   answer         : réponse attendue (insensible à la casse et aux espaces)
//   rewardWord     : mot gagné (utilisé pour l'indice final)
//   arrivalMessage : message du bot quand l'équipe clique sur "J'y suis"
//   hint           : indice optionnel, à donner UNIQUEMENT par les game masters
//                    (jamais affiché dans l'application)
const PUZZLES = [
  {
    id: 1,
    title: "Bazar dans le dojo",
    arrivalMessage: "C'est le chaos dans le dojo. Et si vous rangiez vos affaires pour récupérer un premier indice ?",
    description: "Inscrivez le mot découvert pour avancer dans vos recherches.",
    answer: "TERRAIN",
    rewardWord: "TERRAIN",
    hint: ""
  }
];
