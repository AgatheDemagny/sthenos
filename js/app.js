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
function showScreen(screenId) {
    document.getElementById("loadingScreen").classList.add("hidden");
    document.getElementById("loginScreen").classList.add("hidden");
    document.getElementById("homeScreen").classList.add("hidden");
    document.getElementById("workoutScreen").classList.add("hidden");
    document.getElementById("feedbackScreen").classList.add("hidden");
    document.getElementById(screenId).classList.remove("hidden");
    window.scrollTo(0,0);
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

function demarrerSeance() {
    const duree = parseInt(document.getElementById("selectDuree").value);
    modeCircuit = duree <= 25;
    
    // Filtrer les exos selon le niveau actuel du joueur
    const exosDispos = catalogueExercices.filter(exo => {
        const profilExo = userProgress[exo.nom] || { niveau: 1 };
        return exo.niveau === profilExo.niveau;
    });

    const categories = ["Jambes", "Fessiers", "Poussée", "Dos", "Core", "Épaules"];
    seanceEnCours = [];

    // Pioche 1 exo par catégorie
    categories.forEach(cat => {
        const exosCat = exosDispos.filter(e => e.categorie === cat);
        if (exosCat.length > 0) {
            seanceEnCours.push(exosCat[Math.floor(Math.random() * exosCat.length)]);
        }
    });

    // Si on a plus de 30 min, on rajoute 2 exos bonus
    if (duree > 30) {
        seanceEnCours.push(exosDispos.find(e => e.categorie === "Fessiers" && !seanceEnCours.includes(e)) || exosDispos[0]);
        seanceEnCours.push(exosDispos.find(e => e.categorie === "Core" && !seanceEnCours.includes(e)) || exosDispos[1]);
    }

    afficherSeance();
    showScreen("workoutScreen");
}

function afficherSeance() {
    const list = document.getElementById("workoutList");
    document.getElementById("workoutFormat").innerText = modeCircuit 
        ? "⚡ Format Circuit : Enchaîne 1 série de chaque sans pause. Fais 4 tours !" 
        : "💪 Format Standard : Finis toutes les séries d'un exercice avant de passer au suivant. (1m30 de repos)";
    
    list.innerHTML = "";
    
    seanceEnCours.forEach((exo, index) => {
        const profil = userProgress[exo.nom] || { current_val: exo.base_min };
        const volumeTxt = exo.type_effort === "temps" ? `${profil.current_val} secondes` : `${profil.current_val} reps`;
        const seriesTxt = modeCircuit ? "1 série par tour" : "3 séries";

        list.innerHTML += `
            <div class="card" style="border-left: 4px solid var(--primary);">
                <div style="display:flex; justify-content:space-between;">
                    <strong>${index + 1}. ${exo.nom}</strong>
                    <span class="badge">${exo.categorie}</span>
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
        let state = userProgress[exo.nom] || { niveau: 1, current_val: exo.base_min, streak: 0 };
        
        if (note === "facile") {
            state.streak += 1;
            state.current_val += (exo.type_effort === "temps" ? 5 : 2);
            
            // Level Up
            if (state.current_val >= exo.base_max && state.streak >= 2) {
                const exoSup = catalogueExercices.find(e => e.nom === exo.nom && e.niveau === exo.niveau + 1);
                if (exoSup) {
                    state.niveau += 1;
                    state.current_val = exoSup.base_min;
                    state.streak = 0;
                    alert(`🎉 Level UP ! Au prochain entraînement, tu passes au niveau supérieur sur : ${exo.nom} !`);
                } else {
                    state.current_val = exo.base_max; 
                }
            }
        } else if (note === "difficile") {
            state.streak = 0;
            state.current_val = Math.max(exo.base_min, state.current_val - (exo.type_effort === "temps" ? 5 : 2));
        } else {
            state.streak = 0;
        }
        
        userProgress[exo.nom] = state;
    });

    // SAUVEGARDE FIREBASE
    if (currentUser) {
        try {
            await db.collection("coach_users").doc(currentUser.uid).set({
                progress: userProgress,
                lastWorkout: Date.now()
            }, { merge: true });
        } catch(e) {
            console.error("Erreur sauvegarde cloud", e);
        }
    }
    
    showScreen("homeScreen");
}

let listeCombos = [];
let boxeState = { timer: null, rounds: 0, currentRound: 1, currentInterval: 1, timeLeft: 0, phase: "prep", isPaused: false };

// Charger les combos au démarrage
document.addEventListener("DOMContentLoaded", async () => {
    try {
        const res = await fetch('./data/combos.json');
        listeCombos = await res.json();
    } catch (e) { console.error("Erreur combos", e); }
});

// Synthèse Vocale
function parler(texte) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel(); // Coupe l'audio précédent si besoin
        const msg = new SpeechSynthesisUtterance(texte);
        msg.lang = 'fr-FR'; 
        msg.rate = 1.1; // Débit un peu plus rapide pour le sport
        window.speechSynthesis.speak(msg);
    }
}

// Bip sonore simple
function beep(frequence = 440, duree = 300) {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    osc.frequency.value = frequence;
    osc.connect(ctx.destination);
    osc.start(); setTimeout(() => osc.stop(), duree);
}

// Lancement
function preparerBoxe() {
    // Calcul factice pour l'instant (à lier avec Firebase plus tard)
    document.getElementById("badgeConseilBoxe").innerText = "Conseil : 8 Rounds";
    showScreen("boxingSetupScreen");
}

function demarrerBoxe() {
    boxeState.rounds = parseInt(document.getElementById("selectRoundsBoxe").value);
    boxeState.currentRound = 1;
    boxeState.currentInterval = 1;
    boxeState.isPaused = false;
    
    preparerNouveauRound();
    showScreen("boxingTimerScreen");
}

function preparerNouveauRound() {
    boxeState.phase = "prep";
    boxeState.timeLeft = 10; // 10 secondes avant le 1er coup
    document.getElementById("boxeRoundInfo").innerText = `Round ${boxeState.currentRound} / ${boxeState.rounds}`;
    updateBoxeUI();
    
    // Tire le premier combo
    boxeState.nextCombo = listeCombos[Math.floor(Math.random() * listeCombos.length)];
    document.getElementById("boxeCurrentCombo").innerText = "Dans 10s : " + boxeState.nextCombo;
    parler("Prépare toi. Prochain enchaînement : " + boxeState.nextCombo);
    
    clearInterval(boxeState.timer);
    boxeState.timer = setInterval(tickBoxe, 1000);
}

function tickBoxe() {
    if (boxeState.isPaused) return;
    boxeState.timeLeft--;

    if (boxeState.timeLeft <= 0) {
        changerPhaseBoxe();
    } else if (boxeState.timeLeft <= 3) {
        beep(800, 200); // 3 petits bips avant le changement
    }
    updateBoxeUI();
}

function changerPhaseBoxe() {
    if (boxeState.phase === "prep") {
        // Passe au travail (40s)
        boxeState.phase = "work";
        boxeState.timeLeft = 40;
        beep(1200, 500); // Bip long de départ
        document.getElementById("boxeCurrentCombo").innerText = boxeState.nextCombo;
        
    } else if (boxeState.phase === "work") {
        boxeState.currentInterval++;
        if (boxeState.currentInterval > 6) {
            // Fin du round, passe au repos long (60s)
            boxeState.phase = "rest";
            boxeState.timeLeft = 60;
            beep(600, 800);
            document.getElementById("boxeCurrentCombo").innerText = "Respire et bois de l'eau !";
            parler("Fin du round. Repos d'une minute.");
        } else {
            // Fin d'un intervalle, micro-pause 10s
            boxeState.phase = "prep";
            boxeState.timeLeft = 10;
            beep(600, 500);
            boxeState.nextCombo = listeCombos[Math.floor(Math.random() * listeCombos.length)];
            document.getElementById("boxeCurrentCombo").innerText = "Repos. Ensuite : " + boxeState.nextCombo;
            parler("Relâche. Prochain : " + boxeState.nextCombo);
        }
    } else if (boxeState.phase === "rest") {
        // Reprise après le repos d'1 minute
        boxeState.currentRound++;
        if (boxeState.currentRound > boxeState.rounds) {
            terminerBoxe();
        } else {
            boxeState.currentInterval = 1;
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
        badge.innerText = "⏱️ PRÉPARATION (" + boxeState.currentInterval + "/6)";
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
    // Ici, nous ajouterons plus tard la sauvegarde Firebase de la dépense calorique / rounds effectués
    showScreen("homeScreen");
}