/* ── CHAPITRE FLOTTANT (objet unique, deux états) ── */
.story-reader__chapter-float {
  position: absolute;
  left: 0;
  right: 0;
  z-index: 10;
  text-align: center;
  pointer-events: none;
  /* Transition douce entre focused et sticky */
  transition:
    top 0.6s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.6s cubic-bezier(0.16, 1, 0.3, 1),
    font-size 0.6s cubic-bezier(0.16, 1, 0.3, 1),
    opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

/* État : chapitre actif → centré, légèrement au-dessus du milieu */
.story-reader__chapter-float[data-mode="focused"] {
  top: 37%;
  transform: translateY(-50%);
  padding: 0 24px;
}

.story-reader__chapter-float[data-mode="focused"] .story-reader__chapter-float-text {
  font-size: 1.4rem;
  font-weight: 700;
  opacity: 1;
  color: var(--color-text-focus, #fff);
}

.story-reader__chapter-float[data-mode="focused"] .story-reader__chapter-float-line {
  opacity: 0;
  margin-top: 0;
}

/* État : sticky → en haut, petit */
.story-reader__chapter-float[data-mode="sticky"] {
  top: 0;
  transform: translateY(0);
  padding: 14px 24px 12px;
}

.story-reader__chapter-float[data-mode="sticky"] .story-reader__chapter-float-text {
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  opacity: 0.75;
  color: var(--color-text-focus, #fff);
}

.story-reader__chapter-float[data-mode="sticky"] .story-reader__chapter-float-line {
  opacity: 0.4;
  margin-top: 0;
}

/* Le trait */
.story-reader__chapter-float-text {
  display: block;
  transition:
    font-size 0.6s cubic-bezier(0.16, 1, 0.3, 1),
    opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

.story-reader__chapter-float-line {
  position: absolute;
  bottom: 0;
  left: 24px;
  right: 24px;
  height: 1px;
  background: var(--color-text-focus, #fff);
  transition: opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

/* ── SPACER : réserve la hauteur sticky dans le flow ── */
.story-reader__chapter-spacer {
  flex-shrink: 0;
  transition: height 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

.story-reader__chapter-spacer[data-mode="focused"],
.story-reader__chapter-spacer[data-mode="sticky"] {
  height: 56px; /* = padding top+bottom du sticky (14+12) + ligne + texte ~14px */
}

.story-reader__chapter-spacer[data-mode="gone"] {
  height: 0;
}

/* ── TRACK caché quand chapitre actif ── */
.story-reader__track--hidden {
  visibility: hidden;
  pointer-events: none;
}