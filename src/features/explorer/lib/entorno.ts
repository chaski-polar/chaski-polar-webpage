/* Características del dispositivo que cambian el comportamiento del explorador */

export const menosMovimiento = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
export const punteroFino = typeof matchMedia === "function" && matchMedia("(pointer: fine)").matches;
export const esAngosto = (): boolean => innerWidth <= 900;
