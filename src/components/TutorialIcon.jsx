// Icône du tutoriel, en dessin vectoriel (21/11/2026) : remplace l'image tutoriel-icon.png
// (1,3 Mo), redessinée d'après elle au pixel près (cadre, deux ouvertures, mot, trait).
// Elle prend la couleur du texte du thème. Les classes ti-* servent à l'animation
// d'entrée dans le tutoriel (TutorialLaunch) : le contour s'efface « en serpent »
// depuis l'ouverture du haut jusqu'à celle du bas (pathLength 100 sur chaque moitié).
export default function TutorialIcon() {
  return (
    <svg
      viewBox="0 0 1024 1024"
      width="100%"
      height="100%"
      fill="none"
      stroke="currentColor"
      strokeWidth="10"
      strokeLinecap="round"
      aria-hidden="true"
      style={{ display: 'block', overflow: 'visible' }}
    >
      <path className="ti-trace ti-trace-a" pathLength="100" d="M635 237.5 H374.5 A100 100 0 0 0 274.5 337.5 V644.5 A100 100 0 0 0 374.5 744.5 H380" />
      <path className="ti-trace ti-trace-b" pathLength="100" d="M412 744.5 H671.5 A100 100 0 0 0 771.5 644.5 V337.5 A100 100 0 0 0 671.5 237.5 H670" />
      <text
        className="ti-mot"
        x="518"
        y="505"
        textAnchor="middle"
        fontFamily="var(--font-logo, Roboto), sans-serif"
        fontSize="62"
        fontWeight="500"
        letterSpacing="15"
        fill="currentColor"
        stroke="none"
      >
        TUTORIEL
      </text>
      <path className="ti-barre" d="M456.5 580 H574.5" strokeWidth="9" />
    </svg>
  )
}
