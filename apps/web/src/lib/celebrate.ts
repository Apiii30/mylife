/** Event sederhana untuk memicu confetti dari mana saja (mis. setelah goal tercapai). */
type Listener = (colors: string[]) => void;
const listeners = new Set<Listener>();

export function celebrate(colors: string[] = []) {
  listeners.forEach((listener) => listener(colors));
}

export function onCelebrate(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
