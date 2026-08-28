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
  let currentExoIndex = 0;
  
  window.genererApercuCallisthenie = function() {
      const dureeObjectif = parseInt(document.getElementById("selectDuree").value);
      modeCircuit = dureeObjectif <= 25;
      
      const tempsBaseBilateral = modeCircuit ? 2.5 : 3.5;
      const tempsBaseUnilateral = modeCircuit ? 4.5 : 6.0;
  
      // Filtrer les exos dispo
      const exosDispos = catalogueExercices.filter(exo => {
          const profilFamille = userProgress[exo.famille] || { id_actuel: exo.famille + "_1" };
          return exo.id === profilFamille.id_actuel;
      });
  
      const dernierFocus = userProgress._lastFocus || "deltoïdes"; 
      let indexDernier = ORDRE_FOCUS.indexOf(dernierFocus);
      if (indexDernier === -1) indexDernier = 0;
      const focusDuJour = ORDRE_FOCUS[(indexDernier + 1) % ORDRE_FOCUS.length];
  
      seanceEnCours = [];
      let tempsCumule = 0;
      let musclesTravailles = new Set();
  
      // Ajout exo focus
      let exosFocus = exosDispos.filter(e => e.muscles_principaux.includes(focusDuJour));
      if (exosFocus.length > 0) {
          let exoChoisi = exosFocus[Math.floor(Math.random() * exosFocus.length)];
          seanceEnCours.push(exoChoisi);
          exoChoisi.muscles_principaux.forEach(m => musclesTravailles.add(m));
          tempsCumule += exoChoisi.unilateral ? tempsBaseUnilateral : tempsBaseBilateral;
      }
  
      // Full body loop
      for (let muscle of GROUPES_MAJEURS) {
          if (tempsCumule >= dureeObjectif - 3) break;
          if (musclesTravailles.has(muscle)) continue;
          let exosPourMuscle = exosDispos.filter(e => e.muscles_principaux.includes(muscle) && !seanceEnCours.includes(e));
          if (exosPourMuscle.length > 0) {
              let exoChoisi = exosPourMuscle[Math.floor(Math.random() * exosPourMuscle.length)];
              seanceEnCours.push(exoChoisi);
              exoChoisi.muscles_principaux.forEach(m => musclesTravailles.add(m));
              tempsCumule += exoChoisi.unilateral ? tempsBaseUnilateral : tempsBaseBilateral;
          }
      }
  
      userProgress._lastFocus = focusDuJour;
      notesSeance = {};
  
      // Affichage de l'aperçu
      const focusAffiche = focusDuJour.charAt(0).toUpperCase() + focusDuJour.slice(1);
      document.getElementById("workoutFormat").innerHTML = `
          <span class="badge" style="background:var(--primary); color:white; font-size:14px; margin-bottom:8px; display:inline-block;">
              🎯 Focus : ${focusAffiche}
          </span><br>
          <span style="font-weight:600; color:var(--text-main);">Durée estimée : ~${Math.round(tempsCumule)} min</span><br><br>
          ${modeCircuit 
              ? "⚡ Circuit : Enchaîne 1 série de chaque sans pause. Fais 4 tours !" 
              : "💪 Standard : Finis toutes les séries de l'exercice avant de passer au suivant."}
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
                  <div style="font-size: 13px; color: var(--text-soft);">${exo.variante} • ${volumeTxt}</div>
              </div>
          `;
      });
  
      showScreen("calisthenicsPreviewScreen");
  };
  
  window.lancerSeanceCallisthenie = function() {
      currentExoIndex = 0;
      afficherExerciceActuel();
      showScreen("calisthenicsActiveScreen");
  };
  
  function afficherExerciceActuel() {
      const exo = seanceEnCours[currentExoIndex];
      const total = seanceEnCours.length;
      
      document.getElementById("caliProgressBadge").innerText = `Exo ${currentExoIndex + 1} / ${total}`;
      document.getElementById("caliExoMuscle").innerText = exo.muscles_principaux.join(" & ");
      document.getElementById("caliExoName").innerText = exo.nom;
      document.getElementById("caliExoVariant").innerText = exo.variante;
      
      const profil = userProgress[exo.famille] || { current_val: exo.base_min };
      const volumeTxt = exo.type_effort === "temps" ? `${profil.current_val} sec` : `${profil.current_val} reps`;
      const seriesTxt = modeCircuit ? "1 série (Circuit)" : "3 séries";
      const unilateralTxt = exo.unilateral ? " / côté" : "";
  
      document.getElementById("caliExoTarget").innerText = `${seriesTxt} x ${volumeTxt}${unilateralTxt}`;
  }
  
  window.validerExerciceActuel = function(difficulte) {
      const exo = seanceEnCours[currentExoIndex];
      notesSeance[exo.nom] = difficulte;
  
      currentExoIndex++;
  
      if (currentExoIndex < seanceEnCours.length) {
          afficherExerciceActuel();
      } else {
          alert("🎉 Bravo, séance terminée ! Tes résultats sont enregistrés.");
          calculerProgressionFirebase();
      }
  };
  
  window.quitterEntrainement = function() {
      if(confirm("Veux-tu vraiment abandonner la séance en cours ?")) {
          showScreen("homeScreen");
      }
  };
  
  async function calculerProgressionFirebase() {
      let messageLevelUp = "";
  
      seanceEnCours.forEach(exo => {
          let note = notesSeance[exo.nom] || "bien";
          let state = userProgress[exo.famille] || { 
              id_actuel: exo.id, 
              current_val: exo.base_min, 
              streak: 0 
          };
          
          if (note === "facile") {
              state.streak += 1;
              state.current_val += (exo.type_effort === "temps" ? 5 : 2);
              
              // LEVEL UP: S'il a atteint le volume max ET validé 5 séances d'affilée en "facile"
              if (state.current_val >= exo.base_max && state.streak >= 5) {
                  const exoSup = catalogueExercices.find(e => e.prerequis.includes(exo.id));
                  if (exoSup) {
                      state.id_actuel = exoSup.id;
                      state.current_val = exoSup.base_min;
                      state.streak = 0;
                      messageLevelUp += `\n- ${exoSup.nom} (${exoSup.variante})`;
                  } else {
                      state.current_val = exo.base_max; 
                  }
              }
          } else if (note === "difficile") {
              state.streak = 0;
              state.current_val = Math.max(exo.base_min, state.current_val - (exo.type_effort === "temps" ? 5 : 2));
          } else {
              state.streak = 0; // "bien" remet le streak de facilité à 0, maintient le volume
          }
          
          userProgress[exo.famille] = state;
      });
  
      if (messageLevelUp !== "") {
          alert("🚀 LEVEL UP ! Pour la prochaine séance, tu as débloqué :" + messageLevelUp);
      }
  
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
      const previewList = document.getElementById("boxingPreviewList");
      
      previewList.innerHTML = `
        <div class="card" style="border-left: 4px solid var(--danger);">
            <p style="font-weight:bold; color:var(--text-main);">🥊 ${boxeState.roundsTotal} Rounds de 5 minutes</p>
            <p style="font-size:14px; color:var(--text-soft); margin-top:8px;">Les combos sont générés dynamiquement et dictés à voix haute. Prépare tes gants !</p>
        </div>`;
      
      showScreen("boxingPreviewScreen");
  };
  
  window.lancerTimerBoxe = function() {
      boxeState.currentRound = 1;
      boxeState.isPaused = false;
      preparerNouveauRound();
      showScreen("boxingTimerScreen");
  };
  
  function preparerNouveauRound() {
      boxeState.exercicesDuRound = genererExercicesDuRound();
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