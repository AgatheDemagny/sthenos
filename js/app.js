// --- CONFIGURATION FIREBASE STHENOS ---
const firebaseConfig = {
    apiKey: "AIzaSyCAdPfNQlH-OLwINXB36iR0X2F30PwEWCE",
    authDomain: "sthenos-fa586.firebaseapp.com",
    projectId: "sthenos-fa586",
    storageBucket: "sthenos-fa586.firebasestorage.app",
    messagingSenderId: "638193152102",
    appId: "1:638193152102:web:ee20f612920fe4aad27da7"
  };
  
  // Initialisation
  firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  const db = firebase.firestore();
  
  let catalogueExercices = [];
  let userProgress = {}; 
  let seanceEnCours = [];
  let modeCircuit = false;
  let currentUser = null;
  let notesSeance = {};
  
  // --- GESTION DES ÉCRANS ---
  function showScreen(screenId) {
      const screens = document.querySelectorAll("section");
      screens.forEach(screen => screen.classList.add("hidden"));
      
      const targetScreen = document.getElementById(screenId);
      if (targetScreen) {
          targetScreen.classList.remove("hidden");
      }
      window.scrollTo(0, 0);
  }
  
  // Initialisation au chargement
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
          const doc = await db.collection("sthenos_users").doc(user.uid).get();
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
  
  // =========================================
// --- MODULE CALLISTHÉNIE ---
// =========================================
const GROUPES_MAJEURS = ["quadriceps", "fessiers", "grand dorsal", "pectoraux", "deltoïdes", "abdominaux", "triceps", "biceps"];
const ORDRE_FOCUS = ["fessiers", "grand dorsal", "quadriceps", "pectoraux", "abdominaux", "deltoïdes"];

let caliState = { currentExoIndex: 0, currentSet: 1, timer: null };

window.genererApercuCallisthenie = function() {
    const dureeObjectif = parseInt(document.getElementById("selectDuree").value);
    const nombreExosObjectif = Math.floor(dureeObjectif / 3); // 1 exo = 3 min

    // Filtrer les exos débloqués
    const exosDispos = catalogueExercices.filter(exo => {
        const profilFamille = userProgress[exo.famille] || { id_actuel: exo.famille + "_1" };
        return exo.id === profilFamille.id_actuel;
    });

    const dernierFocus = userProgress._lastFocus || "deltoïdes"; 
    let indexDernier = ORDRE_FOCUS.indexOf(dernierFocus);
    if (indexDernier === -1) indexDernier = 0;
    const focusDuJour = ORDRE_FOCUS[(indexDernier + 1) % ORDRE_FOCUS.length];

    seanceEnCours = [];
    let musclesTravailles = new Set();
    let exosRestants = [...exosDispos];

    // 1. Équilibrer au maximum (1 exo par grand muscle)
    let groupesMelanges = [...GROUPES_MAJEURS].sort(() => Math.random() - 0.5);
    for (let muscle of groupesMelanges) {
        if (seanceEnCours.length >= nombreExosObjectif) break;
        let exosPourMuscle = exosRestants.filter(e => e.muscles_principaux.includes(muscle) && !seanceEnCours.includes(e));
        if (exosPourMuscle.length > 0) {
            let choisi = exosPourMuscle[Math.floor(Math.random() * exosPourMuscle.length)];
            seanceEnCours.push(choisi);
            choisi.muscles_principaux.forEach(m => musclesTravailles.add(m));
        }
    }

    // 2. Combler avec le Focus du jour si on n'a pas atteint le nombre
    let securite = 0;
    while (seanceEnCours.length < nombreExosObjectif && securite < 20) {
        securite++;
        let exosFocus = exosRestants.filter(e => e.muscles_principaux.includes(focusDuJour) && !seanceEnCours.includes(e));
        if (exosFocus.length > 0) {
            seanceEnCours.push(exosFocus[Math.floor(Math.random() * exosFocus.length)]);
        } else {
            // S'il n'y a plus de focus, on prend au hasard
            let autres = exosRestants.filter(e => !seanceEnCours.includes(e));
            if (autres.length > 0) seanceEnCours.push(autres[Math.floor(Math.random() * autres.length)]);
            else break;
        }
    }

    userProgress._lastFocus = focusDuJour;
    notesSeance = {};

    // Affichage
    const focusAffiche = focusDuJour.charAt(0).toUpperCase() + focusDuJour.slice(1);
    document.getElementById("workoutFormat").innerHTML = `
        <span class="badge" style="background:var(--primary); color:white; font-size:14px; margin-bottom:8px; display:inline-block;">🎯 Focus : ${focusAffiche}</span><br>
        <span style="font-weight:600; color:var(--text-main);">Volume : ${seanceEnCours.length} exercices (3 séries chacun)</span>
    `;
    
    const listPreview = document.getElementById("workoutListPreview");
    listPreview.innerHTML = "";
    
    seanceEnCours.forEach((exo, index) => {
        const profil = userProgress[exo.famille] || { current_val: exo.base_min };
        const volumeTxt = exo.type_effort === "temps" ? `${profil.current_val}s` : `${profil.current_val} reps`;
        const isFocus = exo.muscles_principaux.includes(focusDuJour);
        const borderColor = isFocus ? "var(--danger)" : "var(--primary)";

        listPreview.innerHTML += `
            <div class="card" style="border-left: 4px solid ${borderColor}; padding: 16px; margin-bottom: 8px;">
                <div style="font-weight: bold; color: var(--text-main);">${index + 1}. ${exo.nom}</div>
                <div style="font-size: 13px; color: var(--text-soft);">${exo.variante} • 3 x ${volumeTxt}</div>
            </div>
        `;
    });

    showScreen("calisthenicsPreviewScreen");
};

window.lancerSeanceCallisthenie = function() {
    caliState.currentExoIndex = 0;
    caliState.currentSet = 1;
    afficherExerciceActuel();
    showScreen("calisthenicsActiveScreen");
};

function afficherExerciceActuel() {
    clearInterval(caliState.timer);
    document.getElementById("caliTimerDisplay").classList.add("hidden");
    document.getElementById("caliMainInfo").classList.remove("hidden");
    document.getElementById("caliActionButtons").classList.remove("hidden");

    const exo = seanceEnCours[caliState.currentExoIndex];
    
    document.getElementById("caliProgressBadge").innerText = `Exo ${caliState.currentExoIndex + 1} / ${seanceEnCours.length} - Série ${caliState.currentSet} / 3`;
    document.getElementById("caliExoMuscle").innerText = exo.muscles_principaux.join(" & ");
    document.getElementById("caliExoName").innerText = exo.nom;
    document.getElementById("caliExoVariant").innerText = exo.variante;
    
    const profil = userProgress[exo.famille] || { current_val: exo.base_min };
    const volumeTxt = exo.type_effort === "temps" ? `${profil.current_val} sec` : `${profil.current_val} reps`;
    document.getElementById("caliExoTarget").innerText = volumeTxt;

    const container = document.getElementById("caliActionButtons");
    if (caliState.currentSet < 3) {
        container.innerHTML = `<button class="primary" onclick="validerSerie()">Terminer Série ${caliState.currentSet} (Repos 10s)</button>`;
    } else {
        container.innerHTML = `
            <h4 style="text-align:center; margin-top:10px; color:var(--text-soft);">Dernière série ! Comment c'était ?</h4>
            <div style="display:flex; gap:10px; margin-top:10px;">
                <button class="ghost" style="color:var(--danger); border-color:var(--danger);" onclick="validerExerciceActuel('difficile')">Dur</button>
                <button class="ghost" style="color:var(--text-main); border-color:var(--text-soft);" onclick="validerExerciceActuel('bien')">Bien</button>
                <button class="ghost" style="color:var(--success); border-color:var(--success);" onclick="validerExerciceActuel('facile')">Facile</button>
            </div>
        `;
    }
}

window.validerSerie = function() {
    caliState.currentSet++;
    lancerReposCali(10, false);
};

window.validerExerciceActuel = function(difficulte) {
    const exo = seanceEnCours[caliState.currentExoIndex];
    notesSeance[exo.nom] = difficulte;

    caliState.currentExoIndex++;
    if (caliState.currentExoIndex < seanceEnCours.length) {
        caliState.currentSet = 1;
        lancerReposCali(30, true);
    } else {
        alert("🎉 Bravo, séance terminée ! Tes résultats sont enregistrés.");
        calculerProgressionFirebase();
    }
};

function lancerReposCali(duree, isTransition) {
    document.getElementById("caliActionButtons").classList.add("hidden");
    const timerDiv = document.getElementById("caliTimerDisplay");
    timerDiv.classList.remove("hidden");

    if (isTransition) {
        const nextExo = seanceEnCours[caliState.currentExoIndex];
        document.getElementById("caliExoMuscle").innerText = "PRÉPARATION";
        document.getElementById("caliExoName").innerText = "Prochain : " + nextExo.nom;
        document.getElementById("caliExoVariant").innerText = nextExo.variante;
        document.getElementById("caliExoTarget").innerText = "Respire !";
    } else {
        document.getElementById("caliExoTarget").innerText = "Repos";
    }

    let tl = duree;
    timerDiv.innerText = tl + "s";
    caliState.timer = setInterval(() => {
        tl--;
        timerDiv.innerText = tl + "s";
        if (tl <= 0) {
            clearInterval(caliState.timer);
            beep(800, 300);
            afficherExerciceActuel();
        } else if (tl <= 3) {
            beep(440, 150);
        }
    }, 1000);
}

window.quitterEntrainement = function() {
    if(confirm("Veux-tu abandonner ?")) { clearInterval(caliState.timer); showScreen("homeScreen"); }
};

async function calculerProgressionFirebase() {
    let messageLevelUp = "";
    seanceEnCours.forEach(exo => {
        let note = notesSeance[exo.nom] || "bien";
        let state = userProgress[exo.famille] || { id_actuel: exo.id, current_val: exo.base_min, streak: 0 };
        if (note === "facile") {
            state.streak += 1;
            state.current_val += (exo.type_effort === "temps" ? 5 : 2);
            if (state.current_val >= exo.base_max && state.streak >= 5) {
                const exoSup = catalogueExercices.find(e => e.prerequis.includes(exo.id));
                if (exoSup) { state.id_actuel = exoSup.id; state.current_val = exoSup.base_min; state.streak = 0; messageLevelUp += `\n- ${exoSup.nom}`; } 
                else state.current_val = exo.base_max; 
            }
        } else if (note === "difficile") { state.streak = 0; state.current_val = Math.max(exo.base_min, state.current_val - (exo.type_effort === "temps" ? 5 : 2)); } 
        else state.streak = 0;
        userProgress[exo.famille] = state;
    });

    if (messageLevelUp !== "") alert("🚀 LEVEL UP ! Débloqué :" + messageLevelUp);
    if (currentUser) {
        try { await db.collection("sthenos_users").doc(currentUser.uid).set({ progress: userProgress, lastWorkout: Date.now() }, { merge: true }); } 
        catch(e) {}
    }
    showScreen("homeScreen");
}
  
  // =========================================
  // --- MODULE BOXE ---
  // =========================================
  const MOUVEMENTS_BOXE = { J: "Jab", C: "Cross", CA: "Crochet avant", CR: "Crochet arrière", UA: "Uppercut avant", UR: "Uppercut arrière" };
  const BURNOUTS_BOXE = [ "1-2 Non-stop 🔥", "Uppercuts continus 🔥", "Crochets continus 🔥" ];
  
  let boxeState = { timer: null, roundsTotal: 0, currentRound: 1, exercicesDuRound: [], currentExoIndex: 0, timeLeft: 0, phase: "prep", isPaused: false };
  
  function parler(texte) {
      if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel(); 
          let textePhonetique = texte.replace(/Jab/g, "Djab").replace(/Cross/g, "Crosse").replace(/1-2/g, "Un, Deux");
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
  
  function genererExercicesDuRound() {
      let tempsRestant = 300; 
      let exercices = [];
      const basesPossibles = [["J"], ["C"], ["J", "C"], ["CA"], ["UA"]];
      let comboEnCours = [...basesPossibles[Math.floor(Math.random() * basesPossibles.length)]];
      
      let tempsBurnout = Math.random() > 0.5 ? 30 : 15;
      let tempsACombler = tempsRestant - tempsBurnout;
  
      while (tempsACombler > 0) {
          let dureesPossibles = [15, 30, 45, 60].filter(d => d <= tempsACombler);
          let dureePhase = 60;
          if (dureesPossibles.length > 0) {
               dureePhase = dureesPossibles[Math.floor(Math.random() * dureesPossibles.length)];
               if (tempsACombler > 120 && dureePhase < 45) dureePhase = 60; 
          }
  
          exercices.push({ combo: comboEnCours.map(m => MOUVEMENTS_BOXE[m]).join(" + "), duree: dureePhase });
          tempsACombler -= dureePhase;
  
          let lastMove = comboEnCours[comboEnCours.length - 1];
          let isAvant = ["J", "CA", "UA"].includes(lastMove);
          let poolAjout = isAvant ? ["C", "CR", "UR"] : ["J", "CA", "UA"];
          let coupSuivant = poolAjout[Math.floor(Math.random() * poolAjout.length)];
          if (Math.random() > 0.6) coupSuivant = isAvant ? "C" : "J"; 
  
          comboEnCours.push(coupSuivant);
      }
      
      exercices.push({ combo: BURNOUTS_BOXE[Math.floor(Math.random() * BURNOUTS_BOXE.length)], duree: tempsBurnout });
      return exercices;
  }
  
  window.preparerBoxeSetup = function() {
      showScreen("boxingSetupScreen");
  };
  
window.genererApercuBoxe = function() {
    boxeState.roundsTotal = parseInt(document.getElementById("selectRoundsBoxe").value);
    
    // On génère TOUS les rounds à l'avance pour pouvoir les afficher
    boxeState.roundsData = [];
    for (let i = 0; i < boxeState.roundsTotal; i++) {
        boxeState.roundsData.push(genererExercicesDuRound());
    }

    const previewList = document.getElementById("boxingPreviewList");
    previewList.innerHTML = "";
    
    // On boucle sur chaque round généré pour créer son HTML
    boxeState.roundsData.forEach((round, index) => {
        let html = `<div class="card" style="border-left: 4px solid var(--danger); padding: 16px; margin-bottom: 12px;">`;
        html += `<h4 style="color:var(--danger); margin-bottom: 12px; font-weight:bold;">🥊 Round ${index + 1}</h4>`;
        
        round.forEach(exo => {
            html += `
            <div style="display:flex; justify-content:space-between; margin-bottom: 8px; border-bottom: 1px dashed var(--divider); padding-bottom: 4px;">
                <span style="font-size:14px; color:var(--text-main); font-weight:600;">${exo.combo}</span>
                <span style="font-size:12px; color:var(--text-soft);">${exo.duree}s</span>
            </div>`;
        });
        html += `</div>`;
        previewList.innerHTML += html;
    });
    
    showScreen("boxingPreviewScreen");
};
  
window.lancerTimerBoxe = function() {
    boxeState.currentRound = 1;
    boxeState.isPaused = false;
    preparerNouveauRound();
    showScreen("boxingTimerScreen");
};
  
function preparerNouveauRound() {
    // Au lieu de regénérer, on récupère le round pré-généré
    boxeState.exercicesDuRound = boxeState.roundsData[boxeState.currentRound - 1];
    boxeState.currentExoIndex = 0;
    boxeState.phase = "prep";
    boxeState.timeLeft = 10; 
    
    document.getElementById("boxeRoundInfo").innerText = `Round ${boxeState.currentRound} / ${boxeState.roundsTotal}`;
    let exoSuivant = boxeState.exercicesDuRound[0].combo;
    document.getElementById("boxeCurrentCombo").innerText = `Dans 10s : ${exoSuivant} (${boxeState.exercicesDuRound[0].duree}s)`;
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
          badge.style.background = "var(--primary)";
      } else {
          badge.innerText = "💧 REPOS COMPLET";
          badge.style.background = "var(--success)";
      }
  }
  
  window.togglePauseBoxe = function() {
      boxeState.isPaused = !boxeState.isPaused;
      document.getElementById("btnPauseBoxe").innerText = boxeState.isPaused ? "▶️ Reprendre" : "⏸️ Pause";
  };
  
  window.quitterBoxe = function() {
      if (confirm("Voulez-vous vraiment arrêter la séance de boxe ?")) {
          terminerBoxe(false);
      }
  };
  
  function terminerBoxe(completed = true) {
      clearInterval(boxeState.timer);
      window.speechSynthesis.cancel();
      if (completed) alert("🎉 Séance de boxe terminée ! Bien joué !");
      showScreen("homeScreen");
  }