// Configuration Firebase (Issue de Dart Quest)
// --- CONFIGURATION FIREBASE STHENOS ---
const firebaseConfig = {
  apiKey: "AIzaSyCAdPfNQlH-OLwINXB36iR0X2F30PwEWCE",
  authDomain: "sthenos-fa586.firebaseapp.com",
  projectId: "sthenos-fa586",
  storageBucket: "sthenos-fa586.firebasestorage.app",
  messagingSenderId: "638193152102",
  appId: "1:638193152102:web:ee20f612920fe4aad27da7"
};

// Initialisation (Version Compat)
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let catalogueExercices = [];
let userProgress = {}; 
let seanceEnCours = [];
let modeCircuit = false;
let currentUser = null;

// Gestion des écrans
// Gestion universelle des écrans
function showScreen(screenId) {
    // 1. On masque absolument toutes les <section> de la page
    const screens = document.querySelectorAll("section");
    screens.forEach(screen => screen.classList.add("hidden"));
    
    // 2. On affiche uniquement celle demandée
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.remove("hidden");
    }
    
    window.scrollTo(0, 0);
}

// Initialisation au chargement de la page
document.addEventListener("DOMContentLoaded", async () => {
    try {
        const res = await fetch('./data/exercices.json');
        catalogueExercices = await res.json();
    } catch (e) {
        console.error("Erreur de chargement du catalogue", e);
    }
});

// Écouteur Firebase Auth
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        // Charger la progression depuis Firestore
        const doc = await db.collection("coach_users").doc(user.uid).get();
        if (doc.exists && doc.data().progress) {
            userProgress = doc.data().progress;
        } else {
            userProgress = {}; 
        }
        showScreen("homeScreen");
    } else {
        currentUser = null;
        showScreen("loginScreen");
    }
});

// Connexion / Inscription
document.getElementById("btnLogin").onclick = async () => {
    const email = document.getElementById("authEmail").value.trim();
    const pass = document.getElementById("authPassword").value.trim();
    if(!email || !pass) return alert("Remplis tous les champs");
    try { await auth.signInWithEmailAndPassword(email, pass); } 
    catch(e) { alert("Erreur : " + e.message); }
};

document.getElementById("btnSignup").onclick = async () => {
    const email = document.getElementById("authEmail").value.trim();
    const pass = document.getElementById("authPassword").value.trim();
    if(!email || !pass) return alert("Remplis tous les champs");
    try { await auth.createUserWithEmailAndPassword(email, pass); } 
    catch(e) { alert("Erreur : " + e.message); }
};

window.deconnexion = () => { auth.signOut(); };

// --- LOGIQUE SPORTIVE ---
// --- LE NOUVEAU CERVEAU DU COACH (Basé sur les Muscles) ---

// On définit les grands groupes musculaires pour garantir le "Full Body"
const GROUPES_MAJEURS = ["quadriceps", "fessiers", "grand dorsal", "pectoraux", "deltoïdes", "abdominaux", "triceps", "biceps"];
// L'ordre de rotation pour le Focus
const ORDRE_FOCUS = ["fessiers", "grand dorsal", "quadriceps", "pectoraux", "abdominaux", "deltoïdes"];

function demarrerSeance() {
    const dureeObjectif = parseInt(document.getElementById("selectDuree").value);
    modeCircuit = dureeObjectif <= 25;
    
    const tempsBaseBilateral = modeCircuit ? 2.5 : 3.5;
    const tempsBaseUnilateral = modeCircuit ? 4.5 : 6.0;

    // 1. Filtrer pour ne garder que l'exercice ACTUEL de chaque famille
    // (Celui que l'utilisateur a débloqué via la surcharge progressive)
    const exosDispos = catalogueExercices.filter(exo => {
        const profilFamille = userProgress[exo.famille] || { id_actuel: exo.famille + "_1" }; // Par défaut, niveau 1
        return exo.id === profilFamille.id_actuel;
    });

    // 2. Déterminer le Focus du jour
    const dernierFocus = userProgress._lastFocus || "deltoïdes"; 
    let indexDernier = ORDRE_FOCUS.indexOf(dernierFocus);
    if (indexDernier === -1) indexDernier = 0;
    const focusDuJour = ORDRE_FOCUS[(indexDernier + 1) % ORDRE_FOCUS.length];

    seanceEnCours = [];
    let tempsCumule = 0;
    let musclesTravailles = new Set(); // Pour mémoriser ce qu'on a déjà fait

    // 3. PRIORITÉ : Ajouter un exercice du Focus du jour
    let exosFocus = exosDispos.filter(e => e.muscles_principaux.includes(focusDuJour));
    if (exosFocus.length > 0) {
        let exoChoisi = exosFocus[Math.floor(Math.random() * exosFocus.length)];
        seanceEnCours.push(exoChoisi);
        exoChoisi.muscles_principaux.forEach(m => musclesTravailles.add(m));
        tempsCumule += exoChoisi.unilateral ? tempsBaseUnilateral : tempsBaseBilateral;
    }

    // 4. CONSTRUCTION FULL BODY : Varier les autres groupes musculaires
    for (let muscle of GROUPES_MAJEURS) {
        if (tempsCumule >= dureeObjectif - 3) break; // Chrono plein
        if (musclesTravailles.has(muscle)) continue; // Déjà travaillé

        let exosPourMuscle = exosDispos.filter(e => e.muscles_principaux.includes(muscle) && !seanceEnCours.includes(e));
        if (exosPourMuscle.length > 0) {
            let exoChoisi = exosPourMuscle[Math.floor(Math.random() * exosPourMuscle.length)];
            seanceEnCours.push(exoChoisi);
            exoChoisi.muscles_principaux.forEach(m => musclesTravailles.add(m));
            tempsCumule += exoChoisi.unilateral ? tempsBaseUnilateral : tempsBaseBilateral;
        }
    }

    // 5. REMPLISSAGE (Séances longues) : Blinder le Focus et combler
    let securite = 0;
    while (tempsCumule < dureeObjectif - 3 && securite < 50) {
        securite++;
        
        let exoAajouter = null;
        // On essaie d'ajouter un AUTRE exercice du focus
        let exosFocusBonus = exosDispos.filter(e => e.muscles_principaux.includes(focusDuJour) && !seanceEnCours.includes(e));
        
        if (exosFocusBonus.length > 0) {
            exoAajouter = exosFocusBonus[Math.floor(Math.random() * exosFocusBonus.length)];
        } else {
            // Sinon on prend un exercice au hasard pas encore fait
            let exosAlea = exosDispos.filter(e => !seanceEnCours.includes(e));
            if (exosAlea.length > 0) {
                exoAajouter = exosAlea[Math.floor(Math.random() * exosAlea.length)];
            }
        }

        if (exoAajouter) {
            const coutTemps = exoAajouter.unilateral ? tempsBaseUnilateral : tempsBaseBilateral;
            if (tempsCumule + coutTemps <= dureeObjectif + 2) { 
                seanceEnCours.push(exoAajouter);
                tempsCumule += coutTemps;
            } else {
                break;
            }
        }
    }

    userProgress._lastFocus = focusDuJour;
    afficherSeance(focusDuJour, tempsCumule);
    showScreen("workoutScreen");
}

function afficherSeance(focusDuJour, tempsEstime) {
    const list = document.getElementById("workoutList");
    
    // Capitaliser le nom du focus pour l'affichage
    const focusAffiche = focusDuJour.charAt(0).toUpperCase() + focusDuJour.slice(1);

    document.getElementById("workoutFormat").innerHTML = `
        <span class="badge" style="background:var(--primary); color:white; font-size:14px; margin-bottom:8px; display:inline-block;">
            🎯 Focus : ${focusAffiche}
        </span><br>
        <span style="font-weight:600; color:var(--text-main);">Durée estimée : ~${Math.round(tempsEstime)} min</span><br><br>
        ${modeCircuit 
            ? "⚡ Circuit : Enchaîne 1 série de chaque sans pause. Fais 4 tours !" 
            : "💪 Standard : Finis toutes les séries de l'exercice avant de passer au suivant. (1m30 de repos)"}
    `;
    
    list.innerHTML = "";
    
    seanceEnCours.forEach((exo, index) => {
        // Lecture du volume enregistré dans le profil
        const profil = userProgress[exo.famille] || { current_val: exo.base_min };
        const volumeTxt = exo.type_effort === "temps" ? `${profil.current_val} secondes` : `${profil.current_val} reps`;
        
        const unilateralTxt = exo.unilateral ? "<span style='color:var(--danger);'>/ côté</span>" : "";
        const seriesTxt = modeCircuit ? "1 série par tour" : "3 séries";

        const isFocus = exo.muscles_principaux.includes(focusDuJour);
        const borderStyle = isFocus ? "border-left: 4px solid var(--danger);" : "border-left: 4px solid var(--primary);";
        const muscleAffiche = exo.muscles_principaux.join(" & ");

        list.innerHTML += `
            <div class="card" style="${borderStyle}">
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <strong>${index + 1}. ${exo.nom}</strong>
                    <span class="badge" style="${isFocus ? 'background:var(--danger); color:white;' : ''}">${muscleAffiche}</span>
                </div>
                <div style="font-size:13px; margin-top:4px;">${exo.variante}</div>
                <div style="font-weight:bold; color:var(--accent); margin-top:8px;">
                    🎯 ${seriesTxt} x ${volumeTxt} ${unilateralTxt}
                </div>
            </div>
        `;
    });
}

// Mise à jour de l'affichage pour t'indiquer le Focus
function afficherSeance(focusDuJour) {
    const list = document.getElementById("workoutList");
    
    document.getElementById("workoutFormat").innerHTML = `
        <span class="badge" style="background:var(--primary); color:white; font-size:14px; margin-bottom:8px; display:inline-block;">
            🎯 Focus du jour : ${focusDuJour}
        </span><br>
        ${modeCircuit 
            ? "⚡ Circuit : Enchaîne 1 série de chaque sans pause. Fais 4 tours !" 
            : "💪 Standard : Finis toutes les séries d'un exercice avant de passer au suivant. (1m30 de repos)"}
    `;
    
    list.innerHTML = "";
    
    seanceEnCours.forEach((exo, index) => {
        const profil = userProgress[exo.nom] || { current_val: exo.base_min };
        const volumeTxt = exo.type_effort === "temps" ? `${profil.current_val} secondes` : `${profil.current_val} reps`;
        const seriesTxt = modeCircuit ? "1 série par tour" : "3 séries";

        // Mettre en surbrillance l'exercice s'il correspond au focus du jour
        const isFocus = exo.categorie === focusDuJour;
        const borderStyle = isFocus ? "border-left: 4px solid var(--danger);" : "border-left: 4px solid var(--primary);";

        list.innerHTML += `
            <div class="card" style="${borderStyle}">
                <div style="display:flex; justify-content:space-between;">
                    <strong>${index + 1}. ${exo.nom}</strong>
                    <span class="badge" style="${isFocus ? 'background:var(--danger); color:white;' : ''}">${exo.categorie}</span>
                </div>
                <div style="font-size:13px; margin-top:4px;">${exo.variante}</div>
                <div style="font-weight:bold; color:var(--accent); margin-top:8px;">
                    🎯 ${seriesTxt} x ${volumeTxt}
                </div>
            </div>
        `;
    });
}

function terminerSeance() {
    const list = document.getElementById("feedbackList");
    list.innerHTML = "";

    seanceEnCours.forEach(exo => {
        list.innerHTML += `
            <div class="card">
                <strong>${exo.nom}</strong>
                <div style="display:flex; gap:8px; margin-top:8px;">
                    <button class="ghost" style="color:var(--danger); border-color:var(--danger)" onclick="noter('${exo.nom}', 'difficile', this)">Dur</button>
                    <button class="ghost" style="color:var(--text-soft); border-color:var(--divider)" onclick="noter('${exo.nom}', 'bien', this)">Bien</button>
                    <button class="ghost" style="color:var(--success); border-color:var(--success)" onclick="noter('${exo.nom}', 'facile', this)">Facile</button>
                </div>
            </div>
        `;
    });
    showScreen("feedbackScreen");
}

const notesSeance = {};
window.noter = function(nomExo, note, btn) {
    notesSeance[nomExo] = note;
    Array.from(btn.parentElement.children).forEach(b => b.style.background = "transparent");
    btn.style.background = "rgba(0,0,0,0.05)";
}

// Surcharge Progressive & Sauvegarde Firebase
window.validerFeedback = async function() {
    seanceEnCours.forEach(exo => {
        let note = notesSeance[exo.nom] || "bien";
        
        // On sauvegarde l'état de la FAMILLE d'exercices
        let state = userProgress[exo.famille] || { 
            id_actuel: exo.id, // L'exercice en cours de cette famille
            current_val: exo.base_min, 
            streak: 0 
        };
        
        if (note === "facile") {
            state.streak += 1;
            state.current_val += (exo.type_effort === "temps" ? 5 : 2);
            
            // Si on dépasse le maximum ET qu'on l'a fait 2 fois facilement -> LEVEL UP
            if (state.current_val >= exo.base_max && state.streak >= 2) {
                
                // On cherche si un exercice demande l'exercice actuel en prérequis !
                const exoSup = catalogueExercices.find(e => e.prerequis.includes(exo.id));
                
                if (exoSup) {
                    state.id_actuel = exoSup.id; // On passe à l'exercice supérieur
                    state.current_val = exoSup.base_min; // On redescend au volume mini
                    state.streak = 0;
                    alert(`🎉 Level UP ! Au prochain entraînement, tu débloques : ${exoSup.nom} (${exoSup.variante}) !`);
                } else {
                    state.current_val = exo.base_max; // Bloqué au maximum (Fin de l'arbre)
                }
            }
        } else if (note === "difficile") {
            state.streak = 0;
            state.current_val = Math.max(exo.base_min, state.current_val - (exo.type_effort === "temps" ? 5 : 2));
        } else {
            state.streak = 0;
        }
        
        userProgress[exo.famille] = state;
    });

    // SAUVEGARDE FIREBASE
    if (currentUser) {
        try {
            await db.collection("sthenos_users").doc(currentUser.uid).set({
                progress: userProgress,
                lastWorkout: Date.now()
            }, { merge: true });
        } catch(e) {
            console.error("Erreur sauvegarde cloud", e);
        }
    }
    
    showScreen("homeScreen");
}

// ==========================================
// --- MODULE BOXE (GÉNÉRATION DYNAMIQUE) ---
// ==========================================

const MOUVEMENTS_BOXE = {
    J: "Jab",
    C: "Cross",
    CA: "Crochet avant",
    CR: "Crochet arrière",
    UA: "Uppercut avant",
    UR: "Uppercut arrière"
};

const BURNOUTS_BOXE = [
    "1-2 Non-stop 🔥",
    "Uppercuts continus 🔥",
    "Crochets continus 🔥",
];

let boxeState = { 
    timer: null, 
    roundsTotal: 0, 
    currentRound: 1, 
    exercicesDuRound: [],
    currentExoIndex: 0, 
    timeLeft: 0, 
    phase: "prep", 
    isPaused: false 
};

// Synthèse Vocale (avec correction phonétique pour l'accent français)
function parler(texte) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel(); 
        
        let textePhonetique = texte
            .replace(/Jab/g, "Djab")
            .replace(/Cross/g, "Crosse")
            .replace(/1-2/g, "Un, Deux");

        const msg = new SpeechSynthesisUtterance(textePhonetique);
        msg.lang = 'fr-FR'; 
        msg.rate = 1.1; 
        window.speechSynthesis.speak(msg);
    }
}

function beep(frequence = 440, duree = 300) {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    osc.frequency.value = frequence;
    osc.connect(ctx.destination);
    osc.start(); setTimeout(() => osc.stop(), duree);
}

// Générateur de round dynamique (Garantit 300s de travail avec progression)
function genererExercicesDuRound() {
    let tempsRestant = 300; // 5 minutes pile
    let exercices = [];
    
    // 1. Définir le point de départ du round (le combo de base)
    const basesPossibles = [
        ["J"], 
        ["C"], 
        ["J", "C"], 
        ["CA"], 
        ["UA"]
    ];
    let comboEnCours = [...basesPossibles[Math.floor(Math.random() * basesPossibles.length)]];
    
    // Le "Burnout" final prendra entre 15s et 30s
    let tempsBurnout = Math.random() > 0.5 ? 30 : 15;
    let tempsACombler = tempsRestant - tempsBurnout;

    // 2. Boucle pour combler le temps avec des exercices de 15, 30, 45 ou 60s
    while (tempsACombler > 0) {
        // Déterminer la durée de la phase (max 60s, ne doit pas dépasser le temps restant)
        let dureesPossibles = [15, 30, 45, 60].filter(d => d <= tempsACombler);
        
        // On force les phases plus longues (45-60) au début/milieu du round
        let dureePhase = 60;
        if (dureesPossibles.length > 0) {
             dureePhase = dureesPossibles[Math.floor(Math.random() * dureesPossibles.length)];
             if (tempsACombler > 120 && dureePhase < 45) dureePhase = 60; // Pousser vers 60s au début
        }

        // Ajouter l'exercice à la liste
        exercices.push({
            combo: comboEnCours.map(m => MOUVEMENTS_BOXE[m]).join(" + "),
            duree: dureePhase
        });
        
        tempsACombler -= dureePhase;

        // 3. ÉVOLUTION DU COMBO (Ajouter un coup pour la phase suivante)
        let lastMove = comboEnCours[comboEnCours.length - 1];
        let isAvant = ["J", "CA", "UA"].includes(lastMove);
        
        // Choisir un coup de l'autre bras pour garder l'équilibre
        let poolAjout = isAvant ? ["C", "CR", "UR"] : ["J", "CA", "UA"];
        
        // On donne plus de chance aux coups basiques (Cross/Jab) qu'aux Uppercuts
        let coupSuivant = poolAjout[Math.floor(Math.random() * poolAjout.length)];
        if (Math.random() > 0.6) coupSuivant = isAvant ? "C" : "J"; 

        comboEnCours.push(coupSuivant);
    }
    
    // 4. Ajouter le BURNOUT (Finisher) à la fin
    exercices.push({
        combo: BURNOUTS_BOXE[Math.floor(Math.random() * BURNOUTS_BOXE.length)],
        duree: tempsBurnout
    });
    
    return exercices;
}

function preparerBoxe() {
    document.getElementById("badgeConseilBoxe").innerText = "Conseil : 8 Rounds";
    showScreen("boxingSetupScreen");
}

function demarrerBoxe() {
    boxeState.roundsTotal = parseInt(document.getElementById("selectRoundsBoxe").value);
    boxeState.currentRound = 1;
    boxeState.isPaused = false;
    
    preparerNouveauRound();
    showScreen("boxingTimerScreen");
}

function preparerNouveauRound() {
    boxeState.exercicesDuRound = genererExercicesDuRound();
    boxeState.currentExoIndex = 0;
    boxeState.phase = "prep";
    boxeState.timeLeft = 10; 
    
    document.getElementById("boxeRoundInfo").innerText = `Round ${boxeState.currentRound} / ${boxeState.roundsTotal}`;
    
    let exoSuivant = boxeState.exercicesDuRound[0].combo;
    let textAffichage = `Dans 10s : ${exoSuivant} (${boxeState.exercicesDuRound[0].duree}s)`;
    
    document.getElementById("boxeCurrentCombo").innerText = textAffichage;
    parler("Prépare toi. Prochain enchaînement : " + exoSuivant);
    
    updateBoxeUI();
    clearInterval(boxeState.timer);
    boxeState.timer = setInterval(tickBoxe, 1000);
}

function tickBoxe() {
    if (boxeState.isPaused) return;
    boxeState.timeLeft--;

    if (boxeState.timeLeft <= 0) {
        changerPhaseBoxe();
    } else if (boxeState.timeLeft <= 3) {
        beep(800, 200); 
    }
    updateBoxeUI();
}

function changerPhaseBoxe() {
    if (boxeState.phase === "prep") {
        boxeState.phase = "work";
        let exoEnCours = boxeState.exercicesDuRound[boxeState.currentExoIndex];
        boxeState.timeLeft = exoEnCours.duree;
        beep(1200, 500);
        
        document.getElementById("boxeCurrentCombo").innerText = exoEnCours.combo;
        
    } else if (boxeState.phase === "work") {
        boxeState.currentExoIndex++;
        
        if (boxeState.currentExoIndex >= boxeState.exercicesDuRound.length) {
            boxeState.phase = "rest";
            boxeState.timeLeft = 60;
            beep(600, 800);
            document.getElementById("boxeCurrentCombo").innerText = "Respire et bois de l'eau !";
            parler("Fin du round. Repos d'une minute.");
        } else {
            boxeState.phase = "prep";
            boxeState.timeLeft = 10;
            beep(600, 500);
            
            let exoSuivant = boxeState.exercicesDuRound[boxeState.currentExoIndex];
            document.getElementById("boxeCurrentCombo").innerText = `Repos. Ensuite : ${exoSuivant.combo} (${exoSuivant.duree}s)`;
            parler("Relâche. Prochain : " + exoSuivant.combo);
        }
        
    } else if (boxeState.phase === "rest") {
        boxeState.currentRound++;
        if (boxeState.currentRound > boxeState.roundsTotal) {
            terminerBoxe(true);
        } else {
            preparerNouveauRound();
        }
    }
}

function updateBoxeUI() {
    const m = String(Math.floor(boxeState.timeLeft / 60)).padStart(2, '0');
    const s = String(boxeState.timeLeft % 60).padStart(2, '0');
    document.getElementById("boxeTimerDisplay").innerText = `${m}:${s}`;
    
    const badge = document.getElementById("boxePhaseIndicator");
    if (boxeState.phase === "work") {
        badge.innerText = "🥊 FRAPPE !";
        badge.style.background = "var(--danger)";
    } else if (boxeState.phase === "prep") {
        let totalExos = boxeState.exercicesDuRound.length;
        badge.innerText = `⏱️ PRÉPARATION (${boxeState.currentExoIndex + 1}/${totalExos})`;
        badge.style.background = "var(--accent)";
    } else {
        badge.innerText = "💧 REPOS COMPLET";
        badge.style.background = "var(--success)";
    }
}

function togglePauseBoxe() {
    boxeState.isPaused = !boxeState.isPaused;
    document.getElementById("btnPauseBoxe").innerText = boxeState.isPaused ? "▶️ Reprendre" : "⏸️ Pause";
}

function quitterBoxe() {
    if (confirm("Voulez-vous vraiment arrêter la séance de boxe en cours ?")) {
        terminerBoxe(false);
    }
}

function terminerBoxe(completed = true) {
    clearInterval(boxeState.timer);
    window.speechSynthesis.cancel();
    if (completed) alert("🎉 Séance de boxe terminée ! Bien joué !");
    showScreen("homeScreen");
}