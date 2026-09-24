/**
 * Met en cache getBoundingClientRect() d'un element.
 *
 * Le composant Droplets convertit chaque mouvement de pointeur en
 * coordonnees locales : sans cache, il appellerait getBoundingClientRect()
 * a chaque evenement, ce qui force le navigateur a recalculer la mise en
 * page (layout thrashing). Ici la mesure n'est refaite que lorsque
 * l'element change de taille ou que la page defile.
 *
 * Fourni par le registre canvasui sous forme d'import interne, mais absent
 * du paquet public : reimplemente a l'identique cote fonctionnalite.
 */
export interface RectCache {
  readonly current: DOMRect
  destroy(): void
}

export function createRectCache(element: Element): RectCache {
  let rect = element.getBoundingClientRect()

  const measure = () => { rect = element.getBoundingClientRect() }

  // ResizeObserver couvre les changements de taille de l'element lui-meme ;
  // scroll et resize couvrent les deplacements dans la page.
  const observer = new ResizeObserver(measure)
  observer.observe(element)
  window.addEventListener('scroll', measure, { passive: true, capture: true })
  window.addEventListener('resize', measure, { passive: true })

  return {
    get current() { return rect },
    destroy() {
      observer.disconnect()
      window.removeEventListener('scroll', measure, { capture: true })
      window.removeEventListener('resize', measure)
    },
  }
}
