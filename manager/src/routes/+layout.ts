// CK Manager is a browser-only SPA (uses localStorage for session). No
// SSR, no prerender — Vite serves it raw in dev, in prod it's static
// assets behind CK Core's reverse-proxy at /manager.
export const ssr = false;
export const prerender = false;
