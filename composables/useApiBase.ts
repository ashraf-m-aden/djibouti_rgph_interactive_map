/**
 * Base URL de l'API, resolue selon le contexte d'execution.
 *
 * En production le frontend tourne en SSR dans un conteneur : le rendu
 * serveur et le navigateur ne joignent pas l'API par le meme chemin.
 *
 *   - navigateur  -> https://rgph.instad.dj/api   (nginx, domaine public)
 *   - SSR         -> http://map-backend:5000/api  (reseau Docker)
 *
 * Le domaine public n'est pas joignable depuis l'interieur de l'EC2 (le
 * trafic sortirait vers l'IP publique de l'instance pour y revenir), d'ou
 * l'URL interne cote serveur.
 *
 * En local NUXT_API_BASE_INTERNAL n'est pas defini : on retombe sur apiBase
 * et le comportement est inchange.
 */
export const useApiBase = (): string => {
  const config = useRuntimeConfig();

  if (import.meta.server && config.apiBaseInternal) {
    return config.apiBaseInternal as string;
  }

  return config.public.apiBase as string;
};
