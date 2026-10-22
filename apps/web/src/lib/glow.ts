/** Gumpalan cahaya bertepi lembut dari gradien radial saja — pengganti filter blur yang mahal. */
export const softGlow = (color: string, reach = 66) =>
  `radial-gradient(circle at center, ${color} 0%, color-mix(in srgb, ${color} 62%, transparent) ${reach * 0.36}%, color-mix(in srgb, ${color} 22%, transparent) ${reach * 0.7}%, transparent ${reach}%)`;
