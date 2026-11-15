// composables/useMobileNav.ts
//
// Etat partage (singleton) pour le menu mobile : le bouton hamburger est
// dans AppHeader.vue, le volet qu'il ouvre est AppSidebar.vue. Un simple
// ref de module suffit, pas besoin d'un store Pinia pour un seul booleen.
const isOpen = ref(false);

export const useMobileNav = () => {
  const toggle = () => {
    isOpen.value = !isOpen.value;
  };

  const close = () => {
    isOpen.value = false;
  };

  return { isOpen, toggle, close };
};
