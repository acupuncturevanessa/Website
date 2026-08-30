/* ==========================================================================
   MAIN JS - CABINET D'ACUPUNCTURE VANESSA FEUILLERE
   Handles: Navigation, menu mobile, horaires dynamiques (fiche Google),
            formulaire de RDV (backend Apps Script), animations GSAP.
   ========================================================================== */

/* --------------------------------------------------------------------------
   CONFIGURATION BACKEND
   Coller ici l'URL du déploiement Google Apps Script (voir INSTALLATION.md).
   Exemple : "https://script.google.com/macros/s/AKfycbx.../exec"
   Tant que l'URL est vide : horaires statiques + formulaire en mode dégradé.
   -------------------------------------------------------------------------- */
const BACKEND_URL = "https://script.google.com/macros/s/AKfycbzfqI_ihj1chHz87B8VMh6vqdu1DoAGlFfsHnBo39DFGCAa6sALLszI4xQObbE8B5Nf/exec";

document.addEventListener("DOMContentLoaded", () => {
  // 1. Sticky Navigation Effect
  const header = document.querySelector("header");
  const handleScroll = () => {
    if (window.scrollY > 50) {
      header.classList.add("scrolled");
    } else {
      header.classList.remove("scrolled");
    }
  };
  window.addEventListener("scroll", handleScroll);
  handleScroll();

  // 2. Mobile Navigation Toggle
  const menuToggle = document.getElementById("menuToggle");
  const mainNav = document.getElementById("mainNav");
  const navLinks = document.querySelectorAll("nav ul li a");

  if (menuToggle && mainNav) {
    menuToggle.addEventListener("click", () => {
      menuToggle.classList.toggle("active");
      mainNav.classList.toggle("active");
    });
    navLinks.forEach(link => {
      link.addEventListener("click", () => {
        menuToggle.classList.remove("active");
        mainNav.classList.remove("active");
      });
    });
  }

  // 3. Horaires dynamiques depuis la fiche Google (via Apps Script)
  //    En cas d'échec ou d'URL non configurée : les horaires statiques du HTML restent affichés.
  const hoursTable = document.getElementById("hoursTable");
  if (BACKEND_URL && hoursTable) {
    fetch(BACKEND_URL + "?action=horaires")
      .then(r => r.json())
      .then(data => {
        if (!data.ok || !Array.isArray(data.jours) || data.jours.length === 0) return;
        hoursTable.replaceChildren();
        data.jours.forEach(j => {
          const ligne = document.createElement("tr");
          const jour = document.createElement("td");
          const horaires = document.createElement("td");
          jour.textContent = j.jour;
          horaires.textContent = j.horaires;
          ligne.appendChild(jour);
          ligne.appendChild(horaires);
          hoursTable.appendChild(ligne);
        });
        const note = document.getElementById("hoursNote");
        if (note) note.textContent = "Horaires synchronisés avec la fiche Google du cabinet.";
      })
      .catch(() => { /* silencieux : horaires statiques conservés */ });
  }

  // 3b. Avis Google (via le backend Apps Script)
  //     Construction en DOM pur (pas d'innerHTML) : le contenu des avis est externe.
  const reviewsGrid = document.getElementById("reviewsGrid");
  const approachRating = document.getElementById("approachRating");
  const approachReviewCount = document.getElementById("approachReviewCount");
  const ratingSpans = document.querySelectorAll(".js-rating");
  const countSpans = document.querySelectorAll(".js-review-count");
  const hasReviewTarget = reviewsGrid || approachRating || ratingSpans.length || countSpans.length;
  if (BACKEND_URL && hasReviewTarget) {
    fetch(BACKEND_URL + "?action=avis")
      .then(r => r.json())
      .then(data => {
        if (!data.ok) return;

        const resume = document.getElementById("reviewsSummary");
        if (resume && data.note) {
          resume.innerHTML = "";
          const b = document.createElement("strong");
          b.textContent = data.note.toFixed(1) + " / 5";
          resume.appendChild(b);
          resume.appendChild(document.createTextNode(" — " + data.total + " avis sur la fiche Google du cabinet."));
        }
        if (data.note && approachRating) approachRating.textContent = data.note.toFixed(1);
        if (Number.isFinite(data.total) && approachReviewCount) approachReviewCount.textContent = data.total;

        // Note et nombre d'avis repris dans les pieds de page de toutes les pages
        if (Number.isFinite(data.note)) {
          ratingSpans.forEach(el => { el.textContent = data.note.toFixed(1); });
        }
        if (Number.isFinite(data.total)) {
          countSpans.forEach(el => { el.textContent = data.total; });
        }

        const lien = document.getElementById("reviewsLink");
        if (lien && data.lien) lien.href = data.lien;

        if (!reviewsGrid) return;
        if (!Array.isArray(data.avis) || data.avis.length === 0) return;

        reviewsGrid.innerHTML = "";
        data.avis.slice(0, 3).forEach(avis => {
          const carte = document.createElement("article");
          carte.className = "review-card";

          const etoiles = document.createElement("div");
          etoiles.className = "review-stars";
          const n = Math.max(0, Math.min(5, Math.round(avis.note)));
          etoiles.textContent = "★".repeat(n) + "☆".repeat(5 - n);
          etoiles.setAttribute("aria-label", n + " étoiles sur 5");

          const texte = document.createElement("p");
          texte.className = "review-text";
          texte.textContent = "« " + avis.texte + " »";

          const meta = document.createElement("div");
          meta.className = "review-meta";
          const auteur = document.createElement("span");
          auteur.className = "review-author";
          auteur.textContent = avis.auteur;
          const date = document.createElement("span");
          date.className = "review-date";
          date.textContent = avis.date;
          meta.appendChild(auteur);
          meta.appendChild(date);

          carte.appendChild(etoiles);
          carte.appendChild(texte);
          carte.appendChild(meta);
          reviewsGrid.appendChild(carte);
        });
      })
      .catch(() => { /* silencieux : le résumé statique reste affiché */ });
  }

  // 4. Formulaire de demande de rendez-vous
  const contactForm = document.getElementById("bookingForm");
  const formMessage = document.getElementById("formMessage");

  const dateInput = document.getElementById("formDate");
  const timeSelect = document.getElementById("formTime");
  const timeHint = document.getElementById("timeHint");
  const serviceSelect = document.getElementById("formService");
  const massageTypeGroup = document.getElementById("massageTypeGroup");
  const massageTypeSelect = document.getElementById("formMassageType");

  // Date minimum = aujourd'hui. La date maximum est posée dès que le backend
  // a répondu une première fois (fenêtre de réservation calculée côté serveur).
  if (dateInput) {
    dateInput.min = new Date().toISOString().split("T")[0];
  }

  function optionServiceActive() {
    return serviceSelect && serviceSelect.selectedIndex > 0
      ? serviceSelect.options[serviceSelect.selectedIndex]
      : null;
  }

  function dureeChoisie() {
    const opt = optionServiceActive();
    return opt && opt.dataset.duree === "90" ? 90 : 60;
  }

  // 4a. Disponibilités réelles (agenda Google, filtré et mis en cache côté
  //     serveur — le navigateur ne parle jamais à Google directement).
  //     Une seule requête par durée couvre toute la fenêtre de réservation :
  //     changer de date ne redéclenche donc aucun appel réseau supplémentaire.
  const disponibilitesParDuree = {};

  function chargerDisponibilites(duree) {
    if (disponibilitesParDuree[duree]) return Promise.resolve(disponibilitesParDuree[duree]);
    if (!BACKEND_URL) return Promise.resolve(null);
    return fetch(BACKEND_URL + "?action=disponibilites&duree=" + duree)
      .then(r => r.json())
      .then(data => {
        if (!data.ok) return null;
        disponibilitesParDuree[duree] = data;
        return data;
      })
      .catch(() => null);
  }

  function invaliderDisponibilites() {
    Object.keys(disponibilitesParDuree).forEach(k => delete disponibilitesParDuree[k]);
  }

  // 4b. Affiche les créneaux réellement libres pour la date choisie, à partir
  //     des disponibilités déjà chargées (ou les charge si besoin).
  function majCreneaux() {
    if (!dateInput || !timeSelect) return;
    timeSelect.innerHTML = "";
    if (timeHint) timeHint.textContent = "";

    if (!dateInput.value) {
      timeSelect.disabled = true;
      timeSelect.appendChild(new Option("Choisissez d'abord une date...", "", true, true));
      timeSelect.options[0].disabled = true;
      return;
    }

    const duree = dureeChoisie();
    const dateChoisie = dateInput.value;
    timeSelect.disabled = true;
    timeSelect.appendChild(new Option("Chargement des créneaux...", "", true, true));
    timeSelect.options[0].disabled = true;

    chargerDisponibilites(duree).then(data => {
      // La date ou la durée a pu changer pendant le chargement : on revalide.
      if (dateInput.value !== dateChoisie || dureeChoisie() !== duree) return;
      afficherCreneaux(data, dateChoisie);
    });
  }

  function afficherCreneaux(data, dateStr) {
    timeSelect.innerHTML = "";
    if (timeHint) timeHint.textContent = "";

    if (!data) {
      timeSelect.disabled = true;
      timeSelect.appendChild(new Option("Créneaux indisponibles pour le moment", "", true, true));
      timeSelect.options[0].disabled = true;
      if (timeHint) timeHint.textContent = "Impossible de charger les disponibilités. Merci de réessayer ou d'appeler le 06 15 95 14 82.";
      return;
    }

    if (data.finFenetre && dateStr > data.finFenetre) {
      timeSelect.disabled = true;
      timeSelect.appendChild(new Option("Date trop éloignée", "", true, true));
      timeSelect.options[0].disabled = true;
      if (timeHint) timeHint.textContent = "Merci de choisir une date plus proche, ou d'appeler le cabinet pour une date plus lointaine.";
      return;
    }

    const creneaux = (data.creneaux && data.creneaux[dateStr]) || [];

    if (creneaux.length === 0) {
      timeSelect.disabled = true;
      timeSelect.appendChild(new Option("Aucun créneau disponible ce jour-là", "", true, true));
      timeSelect.options[0].disabled = true;
      if (timeHint) timeHint.textContent = "Le cabinet est fermé ou déjà complet ce jour-là : merci de choisir une autre date.";
      return;
    }

    timeSelect.disabled = false;
    const placeholder = new Option("Choisissez un créneau...", "", true, true);
    placeholder.disabled = true;
    timeSelect.appendChild(placeholder);
    creneaux.forEach(c => timeSelect.appendChild(new Option(c, c)));
    if (timeHint) timeHint.textContent = "Créneaux réellement libres dans l'agenda du cabinet.";
  }

  // Premier chargement : fixe la date maximum sélectionnable (fenêtre de
  // réservation) sans attendre que le client interagisse avec le formulaire.
  if (BACKEND_URL && dateInput) {
    chargerDisponibilites(60).then(data => {
      if (data && data.finFenetre) dateInput.max = data.finFenetre;
    });
  }

  // 4c. Affiche le choix du type de massage si nécessaire
  function majTypeMassage() {
    if (!massageTypeGroup || !massageTypeSelect) return;
    const opt = optionServiceActive();
    const estMassage = !!(opt && opt.dataset.massage);
    massageTypeGroup.style.display = estMassage ? "" : "none";
    massageTypeSelect.required = estMassage;
    if (!estMassage) massageTypeSelect.selectedIndex = 0;
  }

  if (dateInput) dateInput.addEventListener("change", majCreneaux);
  if (serviceSelect) {
    serviceSelect.addEventListener("change", () => {
      majTypeMassage();
      majCreneaux(); // la durée (1h / 1h30) influe sur les créneaux possibles
    });
  }

  if (contactForm && formMessage) {
    contactForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const optService = optionServiceActive();
      const typeMassage = massageTypeSelect ? massageTypeSelect.value : "";
      const estMassage = !!(optService && optService.dataset.massage);

      const donnees = {
        nom: document.getElementById("formName").value.trim(),
        email: document.getElementById("formEmail").value.trim(),
        telephone: document.getElementById("formPhone").value.trim(),
        prestation: optService
          ? optService.value + (estMassage && typeMassage ? " — " + typeMassage : "")
          : "",
        duree: dureeChoisie(),
        date: dateInput ? dateInput.value : "",
        heure: timeSelect ? timeSelect.value : "",
        message: document.getElementById("formMessageText").value.trim(),
        website: document.getElementById("formWebsite").value // honeypot anti-spam
      };

      if (!donnees.nom || !donnees.email || !donnees.telephone || !donnees.prestation || !donnees.date || !donnees.heure) {
        showFormMessage("Veuillez remplir tous les champs obligatoires (*).", "error");
        return;
      }
      if (estMassage && !typeMassage) {
        showFormMessage("Veuillez choisir le type de massage souhaité.", "error");
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(donnees.email)) {
        showFormMessage("Veuillez entrer une adresse e-mail valide.", "error");
        return;
      }
      if (donnees.telephone.replace(/[\s\-\.]/g, "").length < 10) {
        showFormMessage("Veuillez entrer un numéro de téléphone valide.", "error");
        return;
      }

      if (!BACKEND_URL) {
        showFormMessage(
          "L'envoi en ligne n'est pas encore activé. Merci de contacter directement le cabinet au 06 15 95 14 82.",
          "error"
        );
        return;
      }

      const submitBtn = contactForm.querySelector("button[type='submit']");
      const originalBtnText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = "Envoi en cours...";

      // POST sans en-tête Content-Type personnalisé → pas de préflight CORS,
      // compatible avec les Web Apps Google Apps Script.
      fetch(BACKEND_URL, { method: "POST", body: JSON.stringify(donnees) })
        .then(r => r.json())
        .then(reponse => {
          if (reponse.ok) {
            showFormMessage(
              `Merci ${donnees.nom} ! Votre demande de rendez-vous a bien été transmise. ` +
              `Vanessa Feuillère vous recontactera rapidement au ${donnees.telephone} pour confirmer le créneau.`,
              "success"
            );
            contactForm.reset();
            majTypeMassage();
            // Le créneau réservé n'est plus libre : on invalide le cache local
            // pour refléter immédiatement le changement si le client reprend une demande.
            invaliderDisponibilites();
            majCreneaux();
          } else {
            showFormMessage(reponse.error || "Une erreur est survenue. Merci de réessayer ou d'appeler le 06 15 95 14 82.", "error");
            if (reponse.creneauIndisponible) {
              // Quelqu'un d'autre vient de prendre ce créneau : on rafraîchit
              // la liste pour proposer immédiatement une alternative réelle.
              delete disponibilitesParDuree[donnees.duree];
              majCreneaux();
            }
          }
        })
        .catch(() => {
          showFormMessage("Impossible d'envoyer la demande. Vérifiez votre connexion ou appelez le 06 15 95 14 82.", "error");
        })
        .finally(() => {
          submitBtn.disabled = false;
          submitBtn.textContent = originalBtnText;
          formMessage.scrollIntoView({ behavior: "smooth", block: "center" });
        });
    });
  }

  function showFormMessage(text, type) {
    formMessage.textContent = text;
    formMessage.className = `form-message ${type}`;
    formMessage.style.display = "block";
  }

  // 5. Animation d'entrée du hero (GSAP, facultatif : le site reste
  //    parfaitement lisible si le CDN ne charge pas)
  if (typeof gsap !== "undefined") {
    gsap.timeline()
      .from("#hero .hero-tag", { opacity: 0, y: -20, duration: 0.6, ease: "power2.out" })
      .from("#hero h1", { opacity: 0, y: 30, duration: 0.8, ease: "power3.out" }, "-=0.4")
      .from("#hero .hero-text p", { opacity: 0, y: 20, duration: 0.8, ease: "power3.out" }, "-=0.6")
      .from("#hero .hero-actions", { opacity: 0, y: 20, duration: 0.6, ease: "power2.out" }, "-=0.5")
      .from("#hero .hero-visual", { opacity: 0, scale: 0.95, duration: 1, ease: "power2.out" }, "-=1");
  }

  // 6. Révélation des sections au scroll — IntersectionObserver natif.
  //    Les éléments ne sont masqués (classe .reveal) qu'une fois l'observation
  //    en place : le contenu est donc toujours visible en dernier recours.
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduceMotion && "IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("active");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });

    const elementsToReveal = document.querySelectorAll(
      "section:not(#hero) h2, .prestation-card, .info-card, .info-photo, .gallery-item, .contact-form-wrapper, .approach-visual"
    );
    elementsToReveal.forEach(el => {
      el.classList.add("reveal");
      revealObserver.observe(el);
    });
  }
});
