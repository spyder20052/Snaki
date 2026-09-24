import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { Droplets } from './canvasui/Droplets'
import gsap from 'gsap'
import { BubbleTeaLoader } from './BubbleTeaLoader'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { MotionPathPlugin } from 'gsap/MotionPathPlugin'
import Matter from 'matter-js'
import snakiLogo from './assets/snaki-logo-transparent.png'
import mascotDrink from './assets/snaki-mascot-drink-transparent.png'
import expDrink from './assets/snaki-exp-drink.png'
import heroProduct from './assets/snaki-hero-drink.png'
import ingBoule from './assets/boule.png'
import ingGlace from './assets/glace.png'
import ingChantilly from './assets/chantilly.png'
import papier from './assets/papier.png'
import ingBobaRose from './assets/boba-rose.png'
import ingChocolat from './assets/chocolat.png'
import ingLait from './assets/lait.png'
import ingOreo from './assets/oreo.png'
import bobaPageHero from './assets/bobapage.jpg'
import bobaPageHeroDesktop from './assets/boba-pc.png'
import handLeft from './assets/gauche.png'
import handRight from './assets/droite.png'
import { loadCheckoutProfile, loadStoredCart, saveStoredCart } from './lib/localCommerce'
import { placeOrder } from './lib/checkout'
import type { Fulfillment, PaymentMethod } from './admin/types'
import nowPhoto from './assets/now.png'
import nowPhotoTall from './assets/nowi.png'
import stickerLaugh from './assets/sticker-laugh.png'
import stickerCool from './assets/sticker-cool.png'
import stickerShy from './assets/sticker-shy.png'
import stickerHeart from './assets/sticker-heart.png'
import cup2a from './assets/cup-2a.png'
import cup2b from './assets/cup-2b.png'
import cup3a from './assets/cup-3a.png'
import cup3b from './assets/cup-3b.png'
import cup4a from './assets/cup-4a.png'
import cup4b from './assets/cup-4b.png'
import cup5a from './assets/cup-5a.png'
import cup5b from './assets/cup-5b.png'
import bobaGrape from './assets/bobagrape.webp'
import bobaGirl from './assets/bobagirl.webp'
import bobaHand from './assets/bobahand.webp'

// Servis depuis public/ : references par chemin absolu, pas par import.
const ingBoba = '/boba.png'
const drinkShot = '/drink.png'
import './design/tokens.css'
import './design/components.css'
import './App.css'
import { CustomerAccount } from './customer/CustomerAccount'
import { DesignShowcase } from './design/Showcase'
import { PushOptIn } from './PushOptIn'
import { AdminApp } from './admin/AdminApp'
import { ToastProvider } from './admin/ui'

gsap.registerPlugin(ScrollTrigger, MotionPathPlugin)

const cursorIngredients = [
  { label: 'Perle de tapioca', content: '●', className: 'cursor-pearl' },
  { label: 'Fraise', content: '🍓', className: '' },
  { label: 'Feuille de thé', content: '🌿', className: '' },
  { label: 'Glaçon', content: '◇', className: 'cursor-ice' },
]

// --- Coordination des animations d'entree --------------------------------
// isPageReady = loader termine ET rideau de transition retire. Les sections
// attendent ce signal pour jouer leur timeline, sinon elles s'animeraient
// derriere un ecran couvert.
type AnimationState = {
  isPageReady: boolean
  setLoaderFinished: (value: boolean) => void
  setTransitionFinished: (value: boolean) => void
}

const AnimationContext = createContext<AnimationState>({
  isPageReady: false,
  setLoaderFinished: () => {},
  setTransitionFinished: () => {},
})

const useAnimation = () => useContext(AnimationContext)

function AnimationProvider({ children }: { children: React.ReactNode }) {
  const [loaderFinished, setLoaderFinished] = useState(false)
  const [transitionFinished, setTransitionFinished] = useState(true)
  const isPageReady = loaderFinished && transitionFinished

  const value = useMemo(
    () => ({ isPageReady, setLoaderFinished, setTransitionFinished }),
    [isPageReady])

  return <AnimationContext.Provider value={value}>{children}</AnimationContext.Provider>
}

// Rideau de transition : trois nappes SVG plein ecran dont le point de
// controle de la courbe bouge plus vite que les bords, d'ou le renflement
// qui se resorbe. Sortie puis entree, avec un decalage par couche.
const CURTAIN_COLORS = ['#f5e4cd', '#cf6f42', '#eb5821']
const COVER_D = 'M -1 101 L 101 101 L 101 101 Q 50 101 -1 101 Z'
const CLEAR_D = 'M -1 -1 L 101 -1 L 101 101 Q 50 101 -1 101 Z'

type TransitionHandle = { play: (to: string) => void }

function PageTransition({ handleRef }: { handleRef: { current: TransitionHandle | null } }) {
  const navigate = useNavigate()
  const { setTransitionFinished } = useAnimation()
  const paths = useRef<(SVGPathElement | null)[]>([])
  const label = useRef<HTMLDivElement>(null)
  const pulse = useRef<gsap.core.Timeline | null>(null)
  const busy = useRef(false)

  // Anime les trois nappes ; `d` construit la courbe a partir des 3 valeurs.
  const sweep = useCallback((tl: gsap.core.Timeline, opening: boolean) => {
    const base = opening ? 'M -1 -1 L 101 -1' : 'M -1 101 L 101 101'
    // A la sortie les couches montent dans l'ordre, a l'entree elles se
    // retirent dans l'ordre inverse.
    const order = opening ? [2, 1, 0] : [0, 1, 2]

    order.forEach((layerIndex, step) => {
      const node = paths.current[layerIndex]
      if (!node) return
      const state = { yLeft: 101, yRight: 101, yCenter: 101 }
      const draw = () => node.setAttribute(
        'd', `${base} L 101 ${state.yRight} Q 50 ${state.yCenter} -1 ${state.yLeft} Z`)
      const at = step * 0.1

      if (opening) {
        // Les bords partent en premier, le centre traine : la nappe pend.
        tl.to(state, { yLeft: -1, yRight: -1, duration: 0.75, ease: 'power2.inOut', onUpdate: draw }, at)
          .to(state, { yCenter: -1, duration: 1.05, ease: 'power4.inOut', onUpdate: draw }, at)
      } else {
        // Le centre monte en premier : la nappe se bombe puis s'aplatit.
        tl.to(state, { yCenter: -1, duration: 0.65, ease: 'power2.out', onUpdate: draw }, at)
          .to(state, { yLeft: -1, yRight: -1, duration: 0.85, ease: 'power3.inOut', onUpdate: draw }, at)
      }
    })
  }, [])

  useEffect(() => {
    handleRef.current = {
      play: (to: string) => {
        if (busy.current) return
        busy.current = true
        setTransitionFinished(false)

        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        if (reduce) {
          navigate(to)
          setTransitionFinished(true)
          busy.current = false
          return
        }

        gsap.set(paths.current.filter(Boolean), { attr: { d: COVER_D } })

        const leave = gsap.timeline({
          onComplete: () => {
            navigate(to)
            // L'entree demarre une fois la nouvelle page montee.
            gsap.set(paths.current.filter(Boolean), { attr: { d: CLEAR_D } })
            const enter = gsap.timeline({
              onComplete: () => {
                setTransitionFinished(true)
                busy.current = false
              },
            })
            sweep(enter, true)
            enter.to(label.current, {
              scale: 1.3, opacity: 0, duration: 0.4, ease: 'power2.in',
              onStart: () => { pulse.current?.kill() },
            }, 0)
          },
        })

        sweep(leave, false)
        leave.fromTo(label.current,
          { scale: 0.7, opacity: 0, y: 30 },
          {
            scale: 1, opacity: 1, y: 0, duration: 0.5, ease: 'back.out(2)',
            onComplete: () => {
              pulse.current = gsap.timeline({ repeat: -1 })
                .to(label.current, { opacity: 0.3, duration: 0.4, yoyo: true, repeat: 1, ease: 'sine.inOut' })
            },
          }, '-=0.4')
      },
    }
    return () => { handleRef.current = null }
  }, [handleRef, navigate, setTransitionFinished, sweep])

  useEffect(() => () => { pulse.current?.kill() }, [])

  return <div className="page-transition" aria-hidden="true">
    {CURTAIN_COLORS.map((fill, index) => <svg key={fill} viewBox="0 0 100 100" preserveAspectRatio="none">
      <path ref={node => { paths.current[index] = node }} fill={fill} d={COVER_D} />
    </svg>)}
    <div className="page-transition-label" ref={label}><span>MIAM…</span></div>
  </div>
}

// Lien qui declenche le rideau au lieu de naviguer directement.
function TransitionLink({ to, children, ...rest }: {
  to: string
  children: React.ReactNode
} & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  const { pathname } = useLocation()
  const handle = useContext(TransitionHandleContext)

  return <a
    {...rest}
    href={to}
    onClick={event => {
      event.preventDefault()
      if (to === pathname) return
      handle?.current?.play(to)
    }}
  >{children}</a>
}

const TransitionHandleContext = createContext<{ current: TransitionHandle | null } | null>(null)

function BubbleCursor() {
  const [isTouch] = useState(() =>
    typeof window !== 'undefined' && !window.matchMedia('(pointer: fine)').matches)
  const wrap = useRef<HTMLDivElement>(null)
  const path = useRef<SVGPathElement>(null)
  const items = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const finePointer = window.matchMedia('(pointer: fine)')
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (!finePointer.matches || reduceMotion.matches) return

    const points = Array.from({ length: 10 }, () => ({ x: -100, y: -100 }))
    const mouse = { x: -100, y: -100 }
    let started = false
    let frame = 0
    let idleTimer = 0
    let ropeLength = 9

    const move = (event: MouseEvent) => {
      mouse.x = event.clientX
      mouse.y = event.clientY
      if (!started) {
        points.forEach(point => { point.x = mouse.x; point.y = mouse.y })
        started = true
        if (wrap.current) wrap.current.style.opacity = '1'
      }
      ropeLength = 9
      window.clearTimeout(idleTimer)
      idleTimer = window.setTimeout(() => { ropeLength = 0 }, 70)

      const hovered = document.elementFromPoint(mouse.x, mouse.y)
      const shouldHide = Boolean(hovered?.closest('[data-cursor-hide]'))
      if (wrap.current) {
        wrap.current.style.opacity = shouldHide ? '0' : '1'
        wrap.current.classList.toggle('is-clicking', event.buttons > 0)
      }
    }

    const tick = () => {
      if (started) {
        points[0].x += (mouse.x - points[0].x) * 0.72
        points[0].y += (mouse.y - points[0].y) * 0.72
        for (let index = 1; index < points.length; index++) {
          const previous = points[index - 1]
          const current = points[index]
          const dx = previous.x - current.x
          const dy = previous.y - current.y
          const distance = Math.hypot(dx, dy) || 1
          const targetX = previous.x - (dx / distance) * ropeLength
          const targetY = previous.y - (dy / distance) * ropeLength
          const ease = 0.58 - index * 0.018
          current.x += (targetX - current.x) * ease
          current.y += (targetY - current.y) * ease
        }

        let d = `M ${points[0].x} ${points[0].y}`
        for (let index = 1; index < points.length - 1; index++) {
          const midX = (points[index].x + points[index + 1].x) / 2
          const midY = (points[index].y + points[index + 1].y) / 2
          d += ` Q ${points[index].x} ${points[index].y} ${midX} ${midY}`
        }
        path.current?.setAttribute('d', d)

        ;[1, 3, 6, 9].forEach((pointIndex, itemIndex) => {
          const item = items.current[itemIndex]
          const point = points[pointIndex]
          const before = points[Math.max(0, pointIndex - 1)]
          if (item) {
            const angle = Math.atan2(point.y - before.y, point.x - before.x) * 180 / Math.PI
            item.style.transform = `translate3d(${point.x}px, ${point.y}px, 0) translate(-50%, -50%) rotate(${angle}deg)`
          }
        })
      }
      frame = requestAnimationFrame(tick)
    }

    window.addEventListener('mousemove', move, { passive: true })
    frame = requestAnimationFrame(tick)
    return () => {
      window.removeEventListener('mousemove', move)
      window.clearTimeout(idleTimer)
      cancelAnimationFrame(frame)
    }
  }, [])

  // Rien n'est rendu sur ecran tactile : le curseur personnalise n'y a pas
  // de sens, et le conteneur restait dans le DOM (masque en CSS) avec ses
  // pastilles d'ingredients.
  if (isTouch) return null

  return <div className="bubble-cursor" ref={wrap} aria-hidden="true">
    <svg><path ref={path} /></svg>
    {cursorIngredients.map((ingredient, index) => <div
      className={`cursor-ingredient ${ingredient.className}`}
      ref={node => { items.current[index] = node }}
      title={ingredient.label}
      key={ingredient.label}
    ><span>{ingredient.content}</span></div>)}
  </div>
}

// Revele un texte mot par mot (ou lettre par lettre) : chaque fragment
// arrive d'une position et d'un angle aleatoires puis se remet en place.
function PopText({ children, as: Tag = 'span', className = '', innerClassName = '', split = 'words', delay = 0, stagger = 0.055, duration = 0.72, ease = 'back.out(2.35)', play = true }: {
  children: string
  as?: 'h1' | 'h2' | 'p' | 'span' | 'div'
  className?: string
  innerClassName?: string
  split?: 'words' | 'chars'
  delay?: number
  stagger?: number
  duration?: number
  ease?: string
  play?: boolean
}) {
  const host = useRef<HTMLElement>(null)
  const [revealed, setRevealed] = useState(false)
  const pieces = split === 'chars' ? [...children] : children.split(/(\s+)/).filter(Boolean)

  useEffect(() => {
    const node = host.current
    if (!node || !play) return
    const parts = node.querySelectorAll('[data-pop]')
    if (!parts.length) return
    const ctx = gsap.context(() => {
      setRevealed(true)
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        gsap.fromTo(parts, { opacity: 0 }, { opacity: 1, duration: 0.4, delay, ease: 'power1.out', stagger: 0.02 })
        return
      }
      gsap.set(parts, { transformOrigin: '50% 90%', force3D: true })
      gsap.fromTo(parts,
        { opacity: 0, scale: 0, y: () => gsap.utils.random(18, 40), rotation: () => gsap.utils.random(-16, 16) },
        { opacity: 1, scale: 1, y: 0, rotation: 0, delay, duration, ease, stagger, overwrite: 'auto' })
    }, node)
    return () => ctx.revert()
  }, [play, delay, duration, ease, stagger])

  return <Tag ref={host as never} className={className}>
    <span className="sr-only">{children}</span>
    <span aria-hidden="true" className={innerClassName} style={{ visibility: revealed ? 'visible' : 'hidden' }}>
      {pieces.map((piece, index) => /^\s+$/.test(piece)
        ? (piece.includes('\n')
          ? <br key={`${index}-br`} />
          : <span key={`${index}-ws`} className="pop-space">{'\u00A0'}</span>)
        : <span data-pop key={`${index}-${piece}`} className="pop-piece">{piece}</span>)}
    </span>
  </Tag>
}

function Hero({ ready }: { ready: boolean }) {
  const root = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!ready) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const ctx = gsap.context(() => {
      if (reduce) {
        gsap.to('.hero-fade', { opacity: 1, duration: 0.4, stagger: 0.06, ease: 'power1.out' })
        return
      }
      const tl = gsap.timeline()
      // La navbar descend en premier, puis les elements de l'affiche
      // arrivent en cascade : scribbles, stickers, signature, textes.
      tl.fromTo('.poster-nav', { y: -70, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: 'power3.out' })
        .fromTo('.poster-scribbles i',
          { opacity: 0, scale: 0.4, rotate: (i: number) => [-25, -20, 175][i] ?? 0 },
          { opacity: 1, scale: 1, rotate: (i: number) => [20, 15, 145][i] ?? 0, duration: 0.65, stagger: 0.09, ease: 'back.out(1.7)' }, 0.15)
        .fromTo('.sticker-left',
          { opacity: 0, scale: 0.3, rotate: -30, y: 30 },
          { opacity: 1, scale: 1, rotate: 8, y: 0, duration: 0.8, ease: 'back.out(2)' }, 0.5)
        .fromTo('.sticker-right',
          { opacity: 0, scale: 0.3, rotate: 30, y: 30 },
          { opacity: 1, scale: 1, rotate: -8, y: 0, duration: 0.8, ease: 'back.out(2)' }, 0.62)
        .fromTo('.poster-brand',
          { opacity: 0, y: 90, scale: 0.75, rotate: -8 },
          { opacity: 1, y: 0, scale: 1, rotate: -1, duration: 1.1, ease: 'back.out(1.5)' }, 0.72)
        .fromTo('.poster-copy',
          { opacity: 0, y: 28 },
          { opacity: 1, y: 0, duration: 0.7, stagger: 0.12, ease: 'power2.out' }, 0.95)

        .fromTo('.poster-product',
          { opacity: 0, scale: 0.55, y: 90, rotate: -6 },
          { opacity: 1, scale: 1, y: 0, rotate: 0, duration: 1.3, ease: 'back.out(1.5)' }, 0.3)

      // Seul le produit flotte en continu ; stickers et signature restent fixes.
      gsap.to('.poster-product', { y: '-=15', duration: 2.5, ease: 'sine.inOut', repeat: -1, yoyo: true, delay: 2 })
    }, root)
    return () => ctx.revert()
  }, [ready])

  // Le gobelet suit la souris : il se decale et s'incline vers le cote ou
  // l'on pointe. On anime le WRAPPER en x/rotation et non en `y`, qui est
  // deja pris par le flottement continu -- sinon les deux animations se
  // marcheraient dessus. Desactive sur ecran tactile et en mouvement reduit.
  useEffect(() => {
    const section = root.current
    if (!section) return
    if (!window.matchMedia('(hover:hover) and (pointer:fine)').matches) return
    if (window.matchMedia('(prefers-reduced-motion:reduce)').matches) return
    const product = section.querySelector('.poster-product')
    if (!product) return

    const onMove = (event: MouseEvent) => {
      const rect = section.getBoundingClientRect()
      // -1 a 1 depuis le centre de la section
      const nx = (event.clientX - rect.left) / rect.width * 2 - 1
      const ny = (event.clientY - rect.top) / rect.height * 2 - 1
      gsap.to(product, {
        x: nx * 42,
        rotation: nx * 7,
        yPercent: ny * 3.5,
        duration: 0.9,
        ease: 'power3.out',
        overwrite: 'auto',
      })
    }
    const onLeave = () => {
      gsap.to(product, { x: 0, rotation: 0, yPercent: 0, duration: 1.2, ease: 'elastic.out(1,0.5)', overwrite: 'auto' })
    }
    // Ecouteur pose sur la SECTION et non sur window : sinon le gobelet
    // continuait de suivre la souris alors qu'elle parcourait le reste de
    // la page, bien apres que le hero soit sorti de l'ecran.
    section.addEventListener('mousemove', onMove)
    section.addEventListener('mouseleave', onLeave)
    return () => {
      section.removeEventListener('mousemove', onMove)
      section.removeEventListener('mouseleave', onLeave)
    }
  }, [ready])

  return <section className="hero-section hero-poster" id="top" ref={root}>
    <PopText as="h1" className="poster-title" split="chars" play={ready} delay={0.1} stagger={0.045} duration={0.8}>BUBBLE TEA</PopText>
    <div className="poster-scribbles hero-fade" aria-hidden="true"><i /><i /><i /></div>
    <div className="poster-sticker sticker-left hero-fade">SHAKEN<br />FRESH</div>
    <div className="poster-sticker sticker-right hero-fade">BIG<br />FLAVOUR</div>
    <div className="poster-product"><img src={heroProduct} alt="Bubble tea Snaki" /></div>
    <div className="poster-brand hero-fade" aria-hidden="true">SNAKI</div>
    <div className="poster-copy-wrap">
      <p className="poster-copy copy-left hero-fade">Du thé fraîchement infusé, secoué minute avec des fruits et une généreuse dose de perles.</p>
      <p className="poster-copy copy-right hero-fade">Crémeux, glacé et plein de caractère. Une explosion de goût dans chaque gorgée.</p>
    </div>
  </section>
}

// Section "A propos" : eyebrow + titre revele mot par mot, puis une rangee
// de visuels inclines qui reagissent au passage de la souris (inertie).
function AboutSection() {
  const root = useRef<HTMLElement>(null)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    const node = root.current
    if (!node) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const ctx = gsap.context(() => {}, node)
    setPlaying(false)

    // Declenche l'entree quand la section arrive a l'ecran. IntersectionObserver
    // plutot que ScrollTrigger : pas de dependance a la mesure du scroller.
    const run = () => {
      setPlaying(true)
      ctx.add(() => {
        if (reduce) {
          gsap.to('.about-eyebrow, .about-intro, .about-cta, .media-item', { opacity: 1, duration: 0.4, stagger: 0.05 })
          return
        }
        // En mobile l'eyebrow reste droit ; l'inclinaison est reservee au desktop.
        const mobile = window.matchMedia('(max-width: 760px)').matches
        const tl = gsap.timeline()
        tl.fromTo('.about-eyebrow',
          { opacity: 0, scale: 0.5, rotate: mobile ? 0 : -18 },
          { opacity: 1, scale: 1, rotate: mobile ? 0 : -5, duration: 0.7, ease: 'back.out(2)' })
          .fromTo('.about-intro',
            { opacity: 0, y: 24 },
            { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out' }, 0.45)
          .fromTo('.about-cta',
            { opacity: 0, scale: 0.7, y: 20 },
            { opacity: 1, scale: 1, y: 0, duration: 0.75, ease: 'back.out(2)',
              // Le bouton ne respire qu'une fois son entree terminee, sinon
              // les deux tweens se disputent la meme propriete.
              onComplete: () => {
                gsap.to('.about-cta', { scale: 1.045, duration: 1.5, ease: 'sine.inOut', repeat: -1, yoyo: true })
              } }, 0.6)
          .fromTo('.media-item',
            { opacity: 0, y: 70, scale: 0.86 },
            { opacity: 1, y: 0, scale: 1, duration: 0.85, stagger: 0.12, ease: 'back.out(1.5)' }, 0.75)
      })
    }

    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        observer.disconnect()
        run()
      }
    }, { threshold: 0, rootMargin: '0px 0px -25% 0px' })
    observer.observe(node)

    const cleanupsRef: (() => void)[] = []
    const cta = node.querySelector<HTMLElement>('.about-cta')
    if (cta && !reduce) {
      const over = () => gsap.to(cta, { scale: 1.12, rotate: -2, duration: 0.35, ease: 'back.out(3)', overwrite: 'auto' })
      const out = () => gsap.to(cta, { scale: 1, rotate: 0, duration: 0.45, ease: 'elastic.out(1, 0.5)', overwrite: 'auto' })
      cta.addEventListener('mouseenter', over)
      cta.addEventListener('mouseleave', out)
      cleanupsRef.push(() => { cta.removeEventListener('mouseenter', over); cta.removeEventListener('mouseleave', out) })
    }

    // Inertie a la souris : chaque visuel se decale puis revient a son angle.
    const cleanups = cleanupsRef
    if (!reduce) {
      node.querySelectorAll<HTMLElement>('.media-item').forEach(item => {
        let lastX = 0, lastY = 0, dx = 0, dy = 0
        const base = parseFloat(item.dataset.rotate ?? '0')
        const onMove = (e: MouseEvent) => {
          dx = e.clientX - lastX; dy = e.clientY - lastY
          lastX = e.clientX; lastY = e.clientY
          gsap.to(item, { x: dx * 2.4, y: dy * 2.4, rotate: base + dx * 0.35, duration: 0.6, ease: 'power2.out', overwrite: 'auto' })
        }
        const onEnter = (e: MouseEvent) => { dx = 0; dy = 0; lastX = e.clientX; lastY = e.clientY }
        const onLeave = () => {
          gsap.to(item, { x: 0, y: 0, rotate: base, duration: 1.1, ease: 'elastic.out(1, 0.45)', overwrite: 'auto' })
        }
        item.addEventListener('mousemove', onMove)
        item.addEventListener('mouseenter', onEnter)
        item.addEventListener('mouseleave', onLeave)
        cleanups.push(() => {
          item.removeEventListener('mousemove', onMove)
          item.removeEventListener('mouseenter', onEnter)
          item.removeEventListener('mouseleave', onLeave)
        })
      })
    }

    return () => { observer.disconnect(); ctx.revert(); cleanups.forEach(fn => fn()) }
  }, [])

  return <section className="about" id="about" ref={root}>
    <p className="about-eyebrow">TOP BOBA</p>
    <PopText as="h2" className="about-title" split="words" play={playing} stagger={0.06} duration={0.8}>
      CRÉMEUX FRUITÉ
    </PopText>
    <PopText as="h2" className="about-title about-title-2" split="words" play={playing} delay={0.18} stagger={0.06} duration={0.8}>
      PLEIN DE PERLES
    </PopText>
    <p className="about-intro">
      Snaki secoue le bubble tea minute&nbsp;: thé infusé à froid, fruits frais et perles
      moelleuses.<br />Une recette généreuse, glacée et pleine de caractère.
    </p>
    <a data-cursor-hide className="about-cta" href="#travel">ORDER NOW</a>
    <div className="about-media">
      <div className="media-item" data-rotate="-5" style={{ transform: 'rotate(-5deg)' }}>
        <img src={bobaGrape} alt="Bubble tea raisin tenu à la fenêtre d'une voiture au coucher du soleil" loading="lazy" decoding="async" />
      </div>
      <div className="media-item" data-rotate="4" style={{ transform: 'rotate(4deg)' }}>
        <img src={bobaGirl} alt="Deux amies en selfie derrière leurs bubble teas au lait" loading="lazy" decoding="async" />
      </div>
      <div className="media-item" data-rotate="-7" style={{ transform: 'rotate(-7deg)' }}>
        <img src={bobaHand} alt="Bubble tea bleu citron vert posé sur un sac à main" loading="lazy" decoding="async" />
      </div>
    </div>

    {/* Raccord ondulant avec la section suivante (orange) : la vague ferme
        le bas de cette section au lieu d'ouvrir la suivante. */}
    <Wave fill="#eb5821" flip />
  </section>
}

// Section "Experience" : fond colore, gros titre, deux yeux dont les pupilles
// suivent le curseur, et deux blocs d'arguments de part et d'autre du produit.
// Vague de separation : le trace n'est pas fige, ses points de controle sont
// animes en boucle yoyo, ce qui fait onduler la bordure en continu.
type Pts = { v: number; s1c: number; s1e: number; s2c: number; s2e: number; s3c: number; s3e: number }

function Wave({ fill, flip = false }: { fill: string; flip?: boolean }) {
  const path = useRef<SVGPathElement>(null)

  useEffect(() => {
    const node = path.current
    if (!node) return
    const pts = flip
      ? { v: 175, s1c: 285, s1e: 120, s2c: 235, s2e: 180, s3c: 215, s3e: 205 }
      : { v: 125, s1c: 15, s1e: 180, s2c: 65, s2e: 120, s3c: 85, s3e: 95 }

    const build = (p: typeof pts) => flip
      ? `M1536,300 H-1 V${300 - p.v} S184.32,${300 - p.s1c} 460.8,${300 - p.s1e} S860.16,${300 - p.s2c} 1121.28,${300 - p.s2e} S1413.12,${300 - p.s3c} 1536,${300 - p.s3e} V300`
      : `M1536,0 H-1 V${p.v} S184.32,${p.s1c} 460.8,${p.s1e} S860.16,${p.s2c} 1121.28,${p.s2e} S1413.12,${p.s3c} 1536,${p.s3e} V0`

    node.setAttribute('d', build(pts))
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const draw = () => node.setAttribute('d', build(pts))
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ repeat: -1, yoyo: true })
      if (flip) {
        tl.to(pts, { v: 120, s1c: 195, s1e: 200, duration: 1.4, ease: 'sine.inOut', onUpdate: draw }, 0)
          .to(pts, { s2c: 145, s2e: 115, duration: 2.4, ease: 'sine.inOut', onUpdate: draw }, 0.3)
          .to(pts, { s3c: 135, s3e: 145, duration: 2.1, ease: 'sine.inOut', onUpdate: draw }, 0.6)
      } else {
        tl.to(pts, { v: 185, s1c: 105, s1e: 105, duration: 1.4, ease: 'sine.inOut', onUpdate: draw }, 0)
          .to(pts, { s2c: 155, s2e: 190, duration: 2.4, ease: 'sine.inOut', onUpdate: draw }, 0.3)
          .to(pts, { s3c: 220, s3e: 55, duration: 2.1, ease: 'sine.inOut', onUpdate: draw }, 0.6)
      }
    })
    return () => ctx.revert()
  }, [flip])

  return <div className={`wave ${flip ? 'wave--bottom' : 'wave--top'}`} aria-hidden="true">
    <svg viewBox="0 0 1536 300" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
      <path ref={path} fill={fill} />
    </svg>
  </div>
}

// Bandeau photo dont les bords haut et bas sont decoupes par la meme vague
// animee : l'image elle-meme prend la forme de la vague.
function WavePhoto({ src, alt }: { src: string; alt: string }) {
  const top = useRef<SVGPathElement>(null)
  const bottom = useRef<SVGPathElement>(null)

  useEffect(() => {
    const build = (p: Pts, flip: boolean) => flip
      ? `M1536,300 H-1 V${300 - p.v} S184.32,${300 - p.s1c} 460.8,${300 - p.s1e} S860.16,${300 - p.s2c} 1121.28,${300 - p.s2e} S1413.12,${300 - p.s3c} 1536,${300 - p.s3e} V300`
      : `M1536,0 H-1 V${p.v} S184.32,${p.s1c} 460.8,${p.s1e} S860.16,${p.s2c} 1121.28,${p.s2e} S1413.12,${p.s3c} 1536,${p.s3e} V0`

    const setup = (node: SVGPathElement | null, flip: boolean) => {
      if (!node) return null
      const pts: Pts = flip
        ? { v: 165, s1c: 235, s1e: 145, s2c: 195, s2e: 163, s3c: 195, s3e: 195 }
        : { v: 135, s1c: 65, s1e: 155, s2c: 105, s2e: 137, s3c: 105, s3e: 105 }
      node.setAttribute('d', build(pts, flip))
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return null
      const draw = () => node.setAttribute('d', build(pts, flip))
      const tl = gsap.timeline({ repeat: -1, yoyo: true })
      if (flip) {
        tl.to(pts, { v: 145, s1c: 215, s1e: 155, duration: 1, ease: 'sine.inOut', onUpdate: draw }, 0)
          .to(pts, { s2c: 175, s2e: 140, duration: 2, ease: 'sine.inOut', onUpdate: draw }, 0.3)
          .to(pts, { s3c: 170, s3e: 200, duration: 1.8, ease: 'sine.inOut', onUpdate: draw }, 0.6)
      } else {
        tl.to(pts, { v: 155, s1c: 45, s1e: 175, duration: 1, ease: 'sine.inOut', onUpdate: draw }, 0)
          .to(pts, { s2c: 85, s2e: 160, duration: 2, ease: 'sine.inOut', onUpdate: draw }, 0.3)
          .to(pts, { s3c: 130, s3e: 80, duration: 1.8, ease: 'sine.inOut', onUpdate: draw }, 0.6)
      }
      return tl
    }

    const ctx = gsap.context(() => { setup(top.current, false); setup(bottom.current, true) })
    return () => ctx.revert()
  }, [])

  return <div className="wave-photo">
    <img src={src} alt={alt} />
    <div className="wave-photo-cut wave-photo-cut--top" aria-hidden="true">
      <svg viewBox="0 0 1536 300" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        <path ref={top} fill="#eb5821" />
      </svg>
    </div>
    <div className="wave-photo-cut wave-photo-cut--bottom" aria-hidden="true">
      <svg viewBox="0 0 1536 300" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        <path ref={bottom} fill="#eb5821" />
      </svg>
    </div>
  </div>
}

function ExperienceSection() {
  const root = useRef<HTMLElement>(null)
  const pupilLeft = useRef<HTMLDivElement>(null)
  const pupilRight = useRef<HTMLDivElement>(null)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    const node = root.current
    if (!node) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const ctx = gsap.context(() => {}, node)
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(e => e.isIntersecting)) return
      observer.disconnect()
      setPlaying(true)
      ctx.add(() => {
        if (reduce) {
          gsap.to('.exp-fade', { opacity: 1, duration: 0.4, stagger: 0.06 })
          return
        }
        gsap.timeline()
          .fromTo('.exp-eyebrow', { opacity: 0, scale: 0.6 }, { opacity: 0.8, scale: 1, duration: 0.6, ease: 'back.out(2)' })
          .fromTo('.exp-face', { opacity: 0, y: 40, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: 'back.out(1.6)' }, 0.35)
          .fromTo('.exp-stat', { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.14, ease: 'power2.out' }, 0.55)
          .fromTo('.exp-badge', { opacity: 0, scale: 0.4, rotate: 0 }, { opacity: 1, scale: 1, rotate: 15, duration: 0.7, ease: 'back.out(2.2)' }, 0.8)
      })
    }, { threshold: 0, rootMargin: '0px 0px -20% 0px' })
    observer.observe(node)

    // Les pupilles pivotent vers le curseur (quickSetter = ecriture directe,
    // sans creer un tween a chaque mouvement de souris).
    let onMove: ((e: MouseEvent) => void) | null = null
    // Regard autonome : sur un ecran tactile il n'y a pas de pointeur a
    // suivre, les yeux resteraient donc figes. On les fait alors regarder
    // autour d'eux tout seuls.
    let idleGaze: gsap.core.Timeline | null = null

    if (!reduce && pupilLeft.current && pupilRight.current) {
      const setL = gsap.quickSetter(pupilLeft.current, 'rotation', 'deg')
      const setR = gsap.quickSetter(pupilRight.current, 'rotation', 'deg')

      if (window.matchMedia('(pointer: fine)').matches) {
        onMove = (event: MouseEvent) => {
          const dx = event.clientX - window.innerWidth / 2
          const dy = event.clientY - window.innerHeight / 2
          const angle = Math.atan2(dy, dx) * 180 / Math.PI - 180
          setL(angle)
          setR(angle)
        }
        window.addEventListener('mousemove', onMove, { passive: true })
      } else {
        // Suite d'angles avec des pauses : le regard se pose, s'attarde,
        // puis repart. Un simple aller-retour continu ferait mecanique.
        const gaze = { a: -180 }
        const apply = () => { setL(gaze.a); setR(gaze.a) }
        idleGaze = gsap.timeline({ repeat: -1 })
        const stops = [-120, -215, -180, -95, -250, -160]
        stops.forEach((a, i) => {
          idleGaze!
            .to(gaze, {
              a, duration: .9, ease: 'power2.inOut', onUpdate: apply,
            })
            // Temps d'arret variable : le regard n'est pas metronomique.
            .to({}, { duration: i % 2 ? 1.5 : .8 })
        })
      }
    }

    return () => {
      observer.disconnect()
      ctx.revert()
      if (onMove) window.removeEventListener('mousemove', onMove)
      idleGaze?.kill()
    }
  }, [])

  const eye = (ref: React.RefObject<HTMLDivElement | null>, flip: boolean) => (
    <div className={`exp-eye ${flip ? 'is-right' : ''}`}>
      <svg className="exp-brow" viewBox="0 0 182 80" fill="none" aria-hidden="true">
        <path d="M7.2666 74.5742C7.2666 74.5742 45.7896 11.0167 85.7666 8.57418C128.957 5.93536 174.767 74.5742 174.767 74.5742" stroke="#fff" strokeWidth="17" />
      </svg>
      <div className="exp-eyeball">
        <div className="exp-eye-inner">
          <div className="exp-pupil-arm" ref={ref}><i /></div>
        </div>
      </div>
    </div>
  )

  return <Droplets
    className="experience-droplets"
    intensity={0.45}
    refraction={0.18}
    scale={0.45}
    fallSpeed={0.9}
    vignette={0.12}
    interactive
  >
    <section className="experience" id="experience" ref={root}>
    <p className="exp-eyebrow">EXPERIENCE</p>
    <PopText as="h2" className="exp-title" split="words" play={playing} stagger={0.06} duration={0.8}>
      DRINK GOOD
    </PopText>
    <PopText as="h2" className="exp-title exp-title-2" split="words" play={playing} delay={0.18} stagger={0.06} duration={0.8}>
      FEEL GOOD
    </PopText>

    <div className="exp-row">
      <p className="exp-stat exp-fade">Thé infusé à froid<br />Perles maison<br />Fruits frais</p>

      <div className="exp-face">
        {eye(pupilLeft, false)}
        {eye(pupilRight, true)}
        <img className="exp-product" src={expDrink} alt="Grand bubble tea Snaki aux perles de tapioca" />
        <p className="exp-badge">BIG FLAVOUR</p>
      </div>

      <p className="exp-stat exp-fade exp-stat-right">100% naturel<br />Zéro colorant<br />Vrai goût</p>
    </div>
    </section>
  </Droplets>
}

// Bande "drink" : encadree de deux vagues, le visuel arrive en fondu-glisse
// et derive doucement au scroll.
function DrinkBand() {
  const root = useRef<HTMLElement>(null)

  useEffect(() => {
    const node = root.current
    if (!node) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const ctx = gsap.context(() => {}, node)

    const observer = new IntersectionObserver(entries => {
      if (!entries.some(e => e.isIntersecting)) return
      observer.disconnect()
      ctx.add(() => {
        if (reduce) {
          gsap.set('.wave-photo img', { opacity: 1, scale: 1 })
          return
        }
        // Leger zoom arriere a l'apparition, la photo se pose dans la vague.
        gsap.fromTo('.wave-photo img',
          { opacity: 0, scale: 1.12 },
          { opacity: 1, scale: 1, duration: 1.2, ease: 'power2.out' })
      })
    }, { threshold: 0, rootMargin: '0px 0px -20% 0px' })
    observer.observe(node)

    return () => { observer.disconnect(); ctx.revert() }
  }, [])

  return <section className="drink-band" id="drink" ref={root}>
    <WavePhoto src={drinkShot} alt="Bubble tea Snaki fraichement prepare" />
  </section>
}

const travelSpots = [
  { src: '/travel/cotonou-esplanade.jpg', city: 'COTONOU', className: 'spot-1', alt: 'Lever de soleil sur l’esplanade de l’Amazone à Cotonou', author: 'Fawaz.tairou', file: 'Lever de soleil sur l\'Esplanade de l\'amazone à Cotonou.jpg', license: 'CC BY-SA 4.0' },
  { src: '/travel/fidjrosse-cocotiers.jpg', city: 'FIDJROSSÈ', className: 'spot-2', alt: 'Cocotiers et sable doré sur la plage de Fidjrossè', author: 'Belsun', file: 'Plage de fidjrossè.jpg', license: 'CC BY 3.0' },
  { src: '/travel/godomey-echangeur.jpg', city: 'GODOMEY', className: 'spot-3', alt: 'Coucher de soleil sur l’échangeur de Godomey et les motos qui le longent', author: 'Rachad sanoussi', file: 'L\'échangeur de Godomey au Bénin.jpg', license: 'CC BY-SA 4.0' },
  { src: '/travel/calavi.jpg', city: 'CALAVI', className: 'spot-4', alt: 'Vue urbaine d’Abomey-Calavi', author: 'Élisée.Adad', file: 'Abomey-Calavi vue.jpg', license: 'CC BY-SA 4.0' },
  { src: '/travel/hevie-arrondissement.jpg', city: 'HÊVIÉ', className: 'spot-5', alt: 'Maisons sur pilotis du village lacustre de Ganvié, commune d’Abomey-Calavi', author: 'Dan Sloan', file: '20170319-2017 A630455 (33565390982).jpg', license: 'CC BY-SA 2.0' },
]

// Section "voyage" : un gobelet suit un trace en pointilles au scroll pendant
// que les cartes de villes apparaissent une a une.
function TravelSection() {
  const root = useRef<HTMLElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const flyer = useRef<HTMLDivElement>(null)
  const pathRef = useRef<SVGPathElement>(null)
  const cards = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const node = root.current
    if (!node || !track.current) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const ctx = gsap.context(() => {
      if (reduce) {
        gsap.set(cards.current.filter(Boolean), { opacity: 1, scale: 1 })
        return
      }

      const trigger = { trigger: track.current, start: '-10% top', end: '75%', scrub: 1, invalidateOnRefresh: true }
      const marks = [0.04, 0.24, 0.46, 0.66, 0.88]
      const nodes = cards.current.filter(Boolean) as HTMLDivElement[]
      gsap.set(nodes, { opacity: 0, scale: 0.8, rotate: 0 })

      // Chaque carte apparait quand le scroll franchit son seuil, et repart
      // si l'on remonte : d'ou le tableau d'etats.
      const shown = new Array(nodes.length).fill(false)
      ScrollTrigger.create({
        ...trigger,
        onUpdate: self => {
          marks.forEach((mark, index) => {
            const card = nodes[index]
            if (!card) return
            if (self.progress >= mark && !shown[index]) {
              gsap.fromTo(card,
                { opacity: 0, scale: 0.8, rotate: -15 + 30 * Math.random() },
                { opacity: 1, scale: 1.05, rotate: 5 - 10 * Math.random(), duration: 0.45, ease: 'back.out(2.2)', overwrite: 'auto' })
              shown[index] = true
            } else if (self.progress < mark && shown[index]) {
              gsap.to(card, { opacity: 0, scale: 0.8, duration: 0.28, ease: 'back.in(1.2)', overwrite: 'auto' })
              shown[index] = false
            }
          })
        },
      })

      if (flyer.current && pathRef.current) {
        gsap.set(flyer.current, { xPercent: -50, yPercent: -50 })
        gsap.to(flyer.current, {
          motionPath: { path: pathRef.current, align: pathRef.current, alignOrigin: [0.5, 0.5], autoRotate: -90 },
          ease: 'none',
          scrollTrigger: trigger,
        })
      }

      const refresh = setTimeout(() => ScrollTrigger.refresh(), 1000)
      return () => clearTimeout(refresh)
    }, node)

    return () => ctx.revert()
  }, [])

  return <section className="travel" id="travel" ref={root}>

    <div className="travel-flyer" ref={flyer} aria-hidden="true">
      <img src={ingBoba} alt="" draggable={false} />
    </div>

    <div className="travel-track" ref={track}>
      <svg className="travel-path" viewBox="0 0 1728 2176" fill="none" preserveAspectRatio="none" aria-hidden="true">
        <path ref={pathRef}
          d="M500 -60C700 -60 1500 320 1610 520C1720 900 -160 640 -11 980C110 1420 1470 900 1474 1300C1478 1760 60 1280 -11 1660C-100 2120 1928 1900 1928 1900"
          stroke="#ffffff" strokeOpacity="0.75" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="42 42" />
      </svg>

      <div className="travel-copy">
        <p className="travel-eyebrow">TAKE AWAY</p>
        <h2 className="travel-title">UN BOBA QUI<br />VOYAGE AVEC TOI</h2>
        <p className="travel-text">
          Secoué minute, scellé à la commande. Nos perles restent moelleuses et
          le thé bien glacé, de notre comptoir jusqu'où tu vas.
        </p>
      </div>

      {travelSpots.map((spot, index) => <div
        className={`travel-spot ${spot.className}`}
        key={spot.city}
        ref={node => { cards.current[index] = node }}
      >
        <p className="travel-city">{spot.city}</p>
        <div className="travel-shot"><img src={spot.src} alt={spot.alt} loading="lazy" decoding="async" draggable={false} /></div>
      </div>)}
    </div>
    {/* Plus de raccord ondulant ici : la section suivante est la photo
        plein cadre, qui commence net. Une vague jaune y peignait la couleur
        de l'ancienne section et restait visible comme une bande parasite. */}
  </section>
}

// Section "Next stop" : gros titre plein ecran facon affiche, nuages plats
// et mascotte ancree en bas, juste avant le footer.
export function NextStopSection() {
  const root = useRef<HTMLElement>(null)

  useEffect(() => {
    const node = root.current
    if (!node) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const ctx = gsap.context(() => {
      if (reduce) {
        gsap.set('.next-stop-rise, .next-stop-mascot', { opacity: 1, y: 0 })
        return
      }

      gsap.fromTo('.next-stop-rise',
        { opacity: 0, y: 46 },
        {
          opacity: 1, y: 0, duration: 0.7, ease: 'back.out(1.8)', stagger: 0.09,
          scrollTrigger: { trigger: node, start: 'top 72%' },
        })

      gsap.fromTo('.next-stop-mascot',
        { opacity: 0, y: 90 },
        {
          opacity: 1, y: 0, duration: 0.85, ease: 'back.out(1.6)',
          scrollTrigger: { trigger: node, start: 'top 60%' },
        })

      // Les nuages derivent doucement au scroll, chacun a sa vitesse.
      gsap.utils.toArray<HTMLElement>('.next-stop-cloud').forEach((cloud, index) => {
        gsap.to(cloud, {
          xPercent: index % 2 === 0 ? 16 : -14,
          ease: 'none',
          scrollTrigger: { trigger: node, start: 'top bottom', end: 'bottom top', scrub: 1 },
        })
      })
    }, node)

    return () => ctx.revert()
  }, [])

  return <section className="next-stop" id="next-stop" ref={root}>
    <div className="next-stop-clouds" aria-hidden="true">
      <span className="next-stop-cloud cloud-a" />
      <span className="next-stop-cloud cloud-b" />
      <span className="next-stop-cloud cloud-c" />
    </div>

    <p className="next-stop-kicker next-stop-rise">Next stop</p>

    <h2 className="next-stop-title next-stop-rise">PASSE<br />NOUS VOIR</h2>

    <a data-cursor-hide className="next-stop-cta next-stop-rise" href="#contact">
      Trouver le comptoir
    </a>

    <img className="next-stop-mascot" src={mascotDrink} alt="" draggable={false} />
  </section>
}

// Footer : titre newsletter et champ e-mail en haut, nav et reseaux a
// gauche, mascotte au centre entouree d'ingredients qui flottent.
const footerLinks = ['Accueil', 'Nos boissons', 'Le lieu', 'Contact']

// Chaque ingredient a sa position, sa taille et son rythme propres pour
// eviter tout effet de synchronisation.
const footerFloats = [
  { src: ingChocolat, x: 12, y: 20, size: 13, dur: 4.1, rise: 24 },
  { src: ingOreo, x: 30, y: 6, size: 9, dur: 3.5, rise: 20 },
  { src: ingLait, x: 4, y: 52, size: 8, dur: 4.7, rise: 16 },
  { src: ingChantilly, x: 47, y: 12, size: 10, dur: 3.9, rise: 26 },
  { src: ingBobaRose, x: 68, y: 4, size: 9, dur: 4.3, rise: 22 },
  { src: ingGlace, x: 84, y: 24, size: 8, dur: 3.2, rise: 18 },
  { src: ingBoule, x: 76, y: 52, size: 6, dur: 4.5, rise: 20 },
]

export function SiteFooter() {
  const root = useRef<HTMLElement>(null)
  const floats = useRef<(HTMLImageElement | null)[]>([])

  useEffect(() => {
    const node = root.current
    if (!node) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const ctx = gsap.context(() => {
      if (reduce) {
        gsap.set('.footer-rise', { opacity: 1, y: 0 })
        gsap.set('.footer-float', { opacity: 1 })
        return
      }

      gsap.fromTo('.footer-rise',
        { opacity: 0, y: 24 },
        {
          opacity: 1, y: 0, duration: 0.6, stagger: 0.06, ease: 'power2.out',
          scrollTrigger: { trigger: node, start: 'top 85%', once: true },
        })

      // Les ingredients flottent en boucle, chacun a son rythme.
      floats.current.filter(Boolean).forEach((item, index) => {
        const cfg = footerFloats[index]
        gsap.set(item, { opacity: 1 })
        gsap.to(item, {
          y: -cfg.rise, rotate: index % 2 ? 14 : -14,
          duration: cfg.dur, ease: 'sine.inOut', repeat: -1, yoyo: true,
        })
      })
    }, node)

    return () => ctx.revert()
  }, [])

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    // Pas de back-office pour l'instant : on evite juste le rechargement.
    event.preventDefault()
  }

  return <footer className="site-footer" id="contact" ref={root}>
    <div className="footer-top footer-rise">
      <h2 className="footer-title">ABONNE-TOI À<br />NOTRE NEWSLETTER</h2>
      <form className="footer-form" onSubmit={onSubmit}>
        <label className="sr-only" htmlFor="footer-email">Adresse e-mail</label>
        <input
          className="footer-input" id="footer-email" name="email" type="email"
          placeholder="Entre ton e-mail…" autoComplete="email" required
        />
        <button data-cursor-hide className="footer-send" type="submit">ENVOYER</button>
      </form>
    </div>

    <div className="footer-body">
      <div className="footer-side footer-rise">
        <nav className="footer-nav" aria-label="Pied de page">
          <ul className="footer-col">
            {footerLinks.map(label => <li key={label}>
              <a data-cursor-hide href="#top">{label}</a>
            </li>)}
          </ul>
        </nav>
        <div className="footer-socials">
          <a data-cursor-hide href="https://instagram.com" aria-label="Instagram">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="5" />
              <circle cx="12" cy="12" r="4.2" />
              <circle cx="17.2" cy="6.8" r="1.2" />
            </svg>
          </a>
          <a data-cursor-hide href="https://facebook.com" aria-label="Facebook">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M15 3h-2.5A4.5 4.5 0 0 0 8 7.5V10H6v3h2v8h3v-8h2.5l.5-3H11V7.5c0-.8.7-1.5 1.5-1.5H15z" />
            </svg>
          </a>
          <a data-cursor-hide href="https://tiktok.com" aria-label="TikTok">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M14 3v11.5a3.5 3.5 0 1 1-3-3.46" />
              <path d="M14 3c.4 2.6 2 4.2 5 4.5" />
            </svg>
          </a>
        </div>
      </div>

      <div className="footer-stage" aria-hidden="true">
        {footerFloats.map((item, index) => <img
          className="footer-float"
          key={index}
          ref={element => { floats.current[index] = element }}
          src={item.src}
          alt=""
          draggable={false}
          style={{ left: `${item.x}%`, top: `${item.y}%`, width: `${item.size}%` }}
        />)}
        <img className="footer-paper" src={papier} alt="" draggable={false} />
        <img className="footer-paper-logo" src={snakiLogo} alt="" draggable={false} />
        <img className="footer-hero" src={heroProduct} alt="" draggable={false} />
        <div className="footer-clouds" />
      </div>
    </div>

    <p className="footer-legal">
      © {new Date().getFullYear()} Snaki. Tous droits réservés.
      <span aria-hidden="true">•</span>
      <a data-cursor-hide href="mailto:contactsnaki@gmail.com">contactsnaki@gmail.com</a>
    </p>

  </footer>
}

// Section "Dance" : fond jaune sature, gros titre imbrique en deux couleurs
// et pluie d'ingredients qui monte du bas. Le titre se lit sur deux lignes
// decalees ou les mots se chevauchent, facon affiche.
// Stickers poses sur la photo. Ils apparaissent UN A UN au fil du scroll :
// chacun a son propre seuil de progression (`at`), sa position et son angle.
const danceStickers = [
  // Seuils bien etales : on voit chaque sticker se poser l'un apres l'autre
  // en scrollant dans la photo. Le dernier reste sous 50 % pour qu'il soit
  // vu avant que le footer ne commence a monter et le recouvre.
  { src: stickerCool, alt: '', at: .14, x: '6%', y: '14%', w: '15vw', rot: -12 },
  // Le 2e emplacement reprend le sticker qui etait en 5e position, et ce
  // dernier emplacement est supprime : on reste donc a quatre stickers.
  { src: stickerLaugh, alt: '', at: .30, x: '77%', y: '22%', w: '13.5vw', rot: 11 },
  { src: stickerHeart, alt: '', at: .46, x: '13%', y: '60%', w: '12.5vw', rot: 8 },
  { src: stickerShy, alt: '', at: .62, x: '71%', y: '64%', w: '12.5vw', rot: -9 },
]

// `behind` : couleur de la section qui precede. Elle sert au fond de cette
// section (visible dans les creux de la vague du haut) et au trace de cette
// vague, pour que le raccord prolonge la section precedente.
function DanceSection({ behind = '#eb5821' }: { behind?: string }) {
  const root = useRef<HTMLElement>(null)

  useEffect(() => {
    const node = root.current
    if (!node) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    // Ecouteurs et ticker poses a la main (hors gsap.context) : on les retire
    // nous-memes, `ctx.revert()` ne les connait pas.
    const cleanups: Array<() => void> = []
    const ctx = gsap.context(() => {
      if (reduce) {
        gsap.set('.dance-shot', { scale: 1, y: 0 })
        return
      }

      // La photo se rapproche lentement pendant la traversee de la section :
      // un leger zoom lie au scroll, plus un contre-deplacement vertical
      // (parallaxe) pour que l'image ne semble pas collee au cadre.
      //
      // `scale` part au-dessus de 1 : l'image doit toujours couvrir le
      // cadre, sinon un bord apparaitrait pendant la parallaxe.
      gsap.fromTo('.dance-shot',
        { scale: 1.16, yPercent: -3 },
        {
          scale: 1.02, yPercent: 3, ease: 'none',
          scrollTrigger: {
            trigger: node,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
            invalidateOnRefresh: true,
          },
        })

      // --- Stickers poses un a un -----------------------------------------
      // Chaque sticker a son seuil (`at`) sur la progression de la section.
      // On ne les enchaine pas dans une timeline `scrub` : un sticker doit se
      // POSER d'un coup (petit rebond, comme un autocollant qu'on applique),
      // pas grandir proportionnellement au scroll. On declenche donc un tween
      // court au franchissement du seuil, dans les deux sens.
      const stickerEls = Array.from(node.querySelectorAll<HTMLElement>('.dance-sticker'))
      gsap.set(stickerEls, { opacity: 0, scale: .4 })
      const placed = stickerEls.map(() => false)

      ScrollTrigger.create({
        trigger: node,
        start: 'top bottom',
        end: 'bottom top',
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          stickerEls.forEach((el, i) => {
            const shown = self.progress >= danceStickers[i].at
            if (shown === placed[i]) return
            placed[i] = shown
            if (shown) {
              // `back.out` donne le petit depassement de l'autocollant qu'on
              // presse sur la photo. L'inclinaison finale vient du CSS.
              gsap.fromTo(el,
                { opacity: 0, scale: .4 },
                { opacity: 1, scale: 1, duration: .5, ease: 'back.out(2.2)', overwrite: 'auto' })
            } else {
              gsap.to(el, { opacity: 0, scale: .5, duration: .25, ease: 'power2.in', overwrite: 'auto' })
            }
          })
        },
      })

    }, node)
    return () => {
      for (const fn of cleanups) fn()
      ctx.revert()
    }
  }, [])

  // La section est desormais une photo plein cadre. On garde la coquille
  // `.dance` : c'est elle qui est `sticky` et sur laquelle repose tout le
  // comportement de vague du footer (voir App.css et `paintWave`).
  return <section
    className="dance dance-photo"
    ref={root}
    style={{ '--dance-behind': behind } as CSSProperties}
  >
    {/* Photo plein cadre. `dance-shot` porte le leger zoom au scroll.
        Deux cadrages de la meme scene : la version verticale en mobile, la
        version large au-dela. `<picture>` fait le choix cote navigateur, qui
        ne telecharge donc QUE l'image retenue (contrairement a deux <img>
        masquees en CSS). */}
    {/* Le cadre `dance-frame` est ce qui CLIPPE : il fait exactement une
        hauteur d'ecran et ne bouge pas. L'image deborde et se deplace a
        l'interieur (parallaxe). Un `clip-path` pose sur l'image elle-meme ne
        marchait pas : GSAP la transforme, donc la decoupe se deplacait avec
        elle au lieu de rester une fenetre fixe — d'ou les fragments de photo
        qui reapparaissaient en haut et en bas sur mobile. */}
    <div className="dance-frame">
      <picture>
        <source media="(max-width:760px)" srcSet={nowPhotoTall} />
        <img
          className="dance-shot"
          src={nowPhoto}
          alt="Quatre amis rient au soleil, l'une tient un Snaki glacé"
          draggable={false}
        />
      </picture>
    </div>

    {/* Accroche posee sur la photo. */}
    <p className="dance-claim">Snaki, c’est vous</p>

    {/* Stickers : ils se posent un par un pendant la traversee. */}
    <div className="dance-stickers" aria-hidden="true">
      {danceStickers.map((st, i) => (
        <img
          className="dance-sticker"
          key={i}
          src={st.src}
          alt=""
          draggable={false}
          style={{
            left: st.x,
            top: st.y,
            width: st.w,
            '--rot': `${st.rot}deg`,
          } as CSSProperties}
        />
      ))}
    </div>

    {/* Vague orange posee sur le bord haut de l'image, comme la section
        photo entre « DRINK GOOD FEEL GOOD » et « TAKE AWAY » : le trace est
        peint PAR-DESSUS la photo et prolonge la bande ACCRA. Il est anime
        en boucle par le composant. */}
    <div className="dance-cut" aria-hidden="true">
      <Wave fill={behind} />
    </div>
  </section>
}

// Gobelets projetes au dernier scroll du footer. Les huit parfums sont
// repetes pour qu'il y en ait assez pour remplir le bas de l'ecran.
const cupArt = [cup2a, cup2b, cup3a, cup3b, cup4a, cup4b, cup5a, cup5b]
const physCups = Array.from({ length: 18 }, (_, i) => cupArt[i % cupArt.length])
// Tailles alternees : la pile gagne en profondeur si les gobelets n'ont pas
// tous le meme calibre.
const physCupSizes = ['3.1vw', '2.5vw', '3.7vw', '2.8vw', '3.4vw']

// Fin de page editoriale : revelation en profondeur pilotee par le scroll.
//
// Le principe (facon Slosh Seltzer) : au lieu de faire remonter tout le
// footer d'un bloc, chaque couche a sa propre course sur la meme barre de
// progression. Le rail `.editorial-reveal` fournit la distance, la scene
// `.editorial-stage` est `sticky` et se fige pendant qu'on le traverse.
//
//   0 ────────────────────────── 1   (progression du rail)
//   panneau  |███████████░░░░░░░░░|  monte de 100% -> 0
//   COMMANDE |█████████████████████|  contre-translate : ancre a l'ecran
//   SIROTE   |░░░░░░░░████████░░░░░|  se revele au milieu
//   mains    |░░░░░░░░░░░░░████████|  entrent en dernier, par-dessus
// `behind` : couleur de la section qui precede. La scene la reprend en fond
// pour que la zone pas encore couverte par le panneau prolonge cette
// section, sans laisser apparaitre le fond du body (aucun vide au raccord).
function EditorialFooter({ behind }: { behind: string }) {
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = root.current
    if (!node) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    // Ecouteurs poses a la main (hors gsap.context) : on les retire nous-memes.
    const cleanups: Array<() => void> = []
    const ctx = gsap.context(() => {
      if (reduce) {
        // Toutes les couches visibles, aucune transformation residuelle :
        // le CSS repasse le footer en bloc statique en fin de page.
        gsap.set('.editorial-footer', { y: 0 })
        gsap.set('.editorial-word', { opacity: 1, x: 0, y: 0, scale: 1, rotate: 0 })
        // Les lettres sont animees via leur enveloppe `-rise` : sans ce
        // reset, elles resteraient invisibles et hors cadre.
        gsap.set('.editorial-char-rise', { opacity: 1, yPercent: 0, rotate: 0 })
        // `visibility` explicite : c'est elle qui masque le bouton hors
        // mouvement reduit (voir `placeAnchor`), il faut donc la relacher.
        gsap.set('.editorial-bottom', { opacity: 1, y: 0, visibility: 'visible' })
        gsap.set('.editorial-hand', { xPercent: 0, yPercent: 0, x: 0, y: 0, rotate: 0 })
        // Pas de simulation physique en mouvement reduit : les pastilles
        // resteraient invisibles, ce qui est le comportement voulu.
        gsap.set('.phys-cup', { opacity: 0 })
        return
      }

      const stage = node.querySelector<HTMLElement>('.editorial-stage')
      const panel = node.querySelector<HTMLElement>('.editorial-footer')
      const bottom = node.querySelector<HTMLElement>('.editorial-bottom')
      if (!stage || !panel || !bottom) return

      // --- Etat de depart des couches -------------------------------------
      // Le panneau part decale vers le bas : seule la bande laissee visible
      // par le chevauchement CSS (--reveal-peek) depasse en bas de l'ecran.
      // C'est dans cette bande que « ON COMMANDE » est deja lisible.
      // Le panneau part entierement decale vers le bas (100 % de sa
      // hauteur) : rien de lui n'est visible tant que le rail n'a pas
      // commence. C'est le chevauchement CSS (--reveal-peek) qui remonte le
      // rail DANS la section precedente, si bien que le rail est deja
      // entame — donc le panneau deja un peu monte — quand on apercoit la
      // bande. Aucun vide ne peut apparaitre : le panneau colle au bas de
      // la scene et la scene colle au bas de la section precedente.
      // Le panneau fait 200 % de la hauteur de la scene (voir CSS) : on ne
      // peut donc pas l'animer en `yPercent` (ce serait 2 fois trop). On le
      // decale en pixels, d'exactement une hauteur d'ecran : son bord haut
      // part du bas du cadre, et son fond couvre tout ce qui est en dessous.
      const riseY = () => stage.offsetHeight

      gsap.set(panel, { y: riseY })
      // Les mots restent visibles : ce sont les lettres (`-rise`) et le
      // petit « ON » qui portent la revelation, pas le bloc entier. Sans ce
      // reset, `.editorial-word` garderait l'opacite 0 du CSS et le titre
      // ne s'afficherait jamais.
      gsap.set('.editorial-word', { opacity: 1 })
      gsap.set('.editorial-char-rise', { opacity: 1, yPercent: 0, rotate: 0 })

      // Une seule barre de progression pour toutes les couches : elles
      // restent synchronisees et rigoureusement liees au scroll reel.
      // La course commence quand le HAUT du rail atteint le BAS de l'ecran :
      // a cet instant la section precedente remplit encore tout le cadre, et
      // le panneau (qui part une hauteur d'ecran plus bas) commence a
      // pointer par le bas. Le raccord est donc continu — la bande de footer
      // apercue grandit depuis zero, sans vide ni saut.
      //
      // `start`/`end` en fonction : recalcules a chaque refresh (resize).
      const reveal = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: node,
          start: 'top bottom',
          end: 'bottom bottom',
          scrub: true,
          invalidateOnRefresh: true,
        },
      })

      // COUCHE 0 — le panneau se revele en remontant. Il termine sa course
      // aux deux tiers du rail : le dernier tiers sert aux couches hautes.
      reveal.fromTo(panel, { y: riseY }, { y: 0, duration: .62 }, 0)

      // COUCHE 1 — « ON COMMANDE » reste ancre dans le viewport.
      // Le panneau monte de RISE% de sa hauteur ; on applique au bouton
      // l'inverse EXACT dans l'autre sens, en pixels, pour qu'il ne bouge
      // pas d'un poil a l'ecran pendant la revelation.
      // `invalidateOnRefresh` + une fonction-valeur : la distance est
      // recalculee a chaque resize.
      // « ON COMMANDE » reste ancre dans le viewport.
      //
      // Le panneau monte : son bord haut est a `panelY = riseFrac * H` px de
      // l'ecran. Le bouton, place a `ctaTop` px du haut du panneau, se
      // retrouverait donc a `panelY + ctaTop`. Pour le figer a une position
      // d'ecran `target`, il suffit de lui appliquer :
      //
      //     y = target - (panelY + ctaTop)
      //
      // On l'ecrit comme un tween de 0 a 1 dont l'`onUpdate` recalcule la
      // valeur : la position depend de la hauteur de scene mesuree, et
      // reste donc juste apres un resize.
      // Le bouton ne bouge JAMAIS : il est pose a une position d'ecran fixe
      // (ANCHOR) et n'en part plus. C'est le fond beige qui monte derriere
      // lui. Il n'y a donc aucun suivi du bord du panneau — le bouton ne
      // « descend » pas avant de se figer, il est immobile des la premiere
      // frame ou on le voit.
      //
      // Le seul calcul est un changement de repere : la scene devient
      // `sticky` en cours de route, donc `stageTop` passe de positif a 0.
      // On soustrait cette valeur pour que la position d'ECRAN reste
      // constante quel que soit l'etat du sticky.
      // Position d'ecran du bouton, en fraction de hauteur. Remonte en
      // mobile : le tas de pastilles occupe le bas de l'ecran et noyait le
      // bouton, qui doit rester lisible au-dessus.
      // Ancrage plus bas en mobile qu'avant (.78 -> .88) : a .78 le bouton
      // tombait pile sur le bord ondule du creme, donc a moitie sur la photo
      // et a moitie sur le beige. Il faut qu'il soit franchement DANS la
      // zone creme quand celle-ci arrive.
      const ANCHOR = window.matchMedia('(max-width:760px)').matches ? .82 : .87
      // Position et masquage du bouton, recalcules a chaque frame.
      //
      // Deux pieges ici, tous deux corriges :
      //
      // 1. Le tremblement. Cette fonction etait appelee A LA FOIS par un
      //    ecouteur `scroll` et par un tween scrube. Les deux ecrivaient la
      //    meme propriete a des instants legerement differents, d'ou une
      //    oscillation de un ou deux pixels. Un seul pilote desormais : le
      //    ticker GSAP, synchronise avec le rendu.
      //
      // 2. Le bouton visible sur la photo. Le masquage se basait sur le bord
      //    du panneau, qui mesure 200 % de la scene : son bord haut passe
      //    l'ancrage bien avant que le creme n'atteigne l'ecran, si bien que
      //    le bouton se demasquait au-dessus de l'image. On se repere donc
      //    sur le bord VISIBLE du creme, c'est-a-dire la position du bord du
      //    panneau bornee au haut de la fenetre.
      const placeAnchor = () => {
        const h = stage.offsetHeight
        const stageTop = stage.getBoundingClientRect().top
        const bTop = h * ANCHOR
        gsap.set(bottom, { y: bTop - stageTop })

        // Masquage : on ne montre du bouton que la part deja recouverte par
        // le creme. `panelTop` et la cible du bouton sont tous deux mesures
        // dans le repere de l'ECRAN, la soustraction est donc directe — pas
        // de borne a 0 ici, sinon la comparaison perd son sens des que la
        // scene est collee (`stageTop` vaut alors 0) et le bouton
        // reapparaissait par-dessus la photo.
        // Affichage tout-ou-rien plutot qu'un `clip-path` partiel.
        //
        // Le decoupage partiel laissait un liseré noir d'un pixel sur les
        // ecrans a forte densite (le bord du clip tombe entre deux pixels
        // physiques, le navigateur l'arrondit et il reste une trace). Comme
        // le bouton doit de toute facon etre soit cache soit entierement
        // dans le creme, on le rend simplement invisible tant que le bord du
        // creme ne l'a pas franchi — plus aucun bord a arrondir.
        //
        // Le bord du creme ONDULE (une trentaine de pixels d'amplitude) :
        // la marge evite que le bouton reapparaisse dans un creux de vague.
        const panelTop = panel.getBoundingClientRect().top
        const WAVE_SLACK = 42
        const reached = panelTop + WAVE_SLACK <= bTop
        bottom.style.visibility = reached ? 'visible' : 'hidden'
      }
      gsap.ticker.add(placeAnchor)
      cleanups.push(() => gsap.ticker.remove(placeAnchor))
      placeAnchor()

      // COUCHE 2 — « SIROTE SNAKI » se revele au-dessus, une fois le
      // panneau bien engage. Les lettres montent de dessous en se
      // decalant : le mot se compose au lieu d'apparaitre d'un coup.
      // Le titre reste lisible pendant toute la montee du panneau.
      // Les interactions du curseur animent toujours les enveloppes internes.
      gsap.set('.editorial-char-rise', { opacity: 1, yPercent: 0, rotate: 0 })

      // COUCHE 3 — les mains, couche la plus haute. Elles n'arrivent pas en
      // fondu : elles montent depuis le bas hors-cadre en pivotant vers le
      // centre, comme deux bras qui se levent pour trinquer. Le leger
      // depassement d'echelle donne l'approche en profondeur.
      // Pas de `scale` ni d'`opacity` dans le mouvement : les deux rendaient
      // les mains floues pendant l'apparition. Le navigateur rasterise la
      // couche une fois puis la redimensionne (a cause de `will-change`),
      // donc une image mise a l'echelle ou en fondu perd sa nettete tout au
      // long du parcours. Les mains entrent donc nettes, uniquement par
      // translation + rotation, et c'est le cadre qui les revele.
      reveal.fromTo('.editorial-hand-left',
        { yPercent: 92, xPercent: -26, rotate: -19 },
        { yPercent: 0, xPercent: 0, rotate: 0, duration: .34 }, .6)
      reveal.fromTo('.editorial-hand-right',
        { yPercent: 92, xPercent: 26, rotate: 19 },
        { yPercent: 0, xPercent: 0, rotate: 0, duration: .34 }, .6)

      // --- Le cognement ---------------------------------------------------
      // Anime `x`/`y` (en pixels) et non `xPercent`/`yPercent`, deja occupes
      // par la revelation : les proprietes se cumulent sans se marcher
      // dessus. Joue a part (pas dans le scrub) : un rebond elastique
      // oscille dans le TEMPS, illisible si le temps devient une position.
      let clashDone = false
      const clash = gsap.timeline({ paused: true })
      clash
        // Depassement sec : les canettes se percutent.
        .to('.editorial-hand-left', { x: 26, duration: .1, ease: 'power2.in' }, 0)
        .to('.editorial-hand-right', { x: -26, duration: .1, ease: 'power2.in' }, 0)
        // Recul et oscillation amortie.
        .to('.editorial-hand-left', { x: 0, duration: 1.1, ease: 'elastic.out(1, .3)' }, .1)
        .to('.editorial-hand-right', { x: 0, duration: 1.1, ease: 'elastic.out(1, .3)' }, .1)
        // Les poignets encaissent le coup.
        .to('.editorial-hand', { y: -16, duration: .12, ease: 'power2.out' }, .04)
        .to('.editorial-hand', { y: 0, duration: 1, ease: 'elastic.out(1, .28)' }, .16)

      // --- Mots physiques -------------------------------------------------
      // Une nuee de mots est projetee quand on atteint le FOND du footer.
      // Chaque mot est simule par un rectangle aux dimensions exactes de sa
      // pastille (donc la forme du texte, pas un cercle) : les collisions se
      // lisent comme des mots qui se cognent.
      //
      // Ils sautent, rebondissent et retombent en vrac. Aucun rangement :
      // les positions finales sont celles que produit la simulation.
      const physLayer = node.querySelector<HTMLElement>('.editorial-physics')
      const cupEls = Array.from(node.querySelectorAll<HTMLElement>('.phys-cup'))
      let physCleanup: (() => void) | null = null
      // Etat de depart explicite : masques et sans transform residuel, sinon
      // un eclatement precedent (ou le rechargement a chaud) les laisserait
      // visibles avant le declenchement.
      gsap.set(cupEls, { opacity: 0, clearProps: 'transform' })

      const startPhysics = () => {
        if (!physLayer || cupEls.length === 0 || physCleanup) return
        const W = physLayer.clientWidth
        const H = physLayer.clientHeight
        if (W === 0 || H === 0) return

        const engine = Matter.Engine.create()
        engine.gravity.y = 1.25

        // Dimensions mesurees sur le DOM : le corps physique epouse la
        // pastille, donc un mot long est un rectangle long.
        const items = cupEls.map((el) => ({
          el,
          w: el.offsetWidth,
          h: el.offsetHeight,
        }))

        // Tout part du point de contact des gobelets.
        const originX = W / 2
        const originY = H * 0.52

        const bodies = items.map(({ w, h }) => Matter.Bodies.rectangle(
          originX + gsap.utils.random(-34, 34),
          originY + gsap.utils.random(-26, 26),
          w, h,
          {
            // Rebond franc : les mots doivent sauter avant de retomber.
            restitution: 0.66,
            friction: 0.05,
            frictionAir: 0.011,
            density: 0.0013,
            // Coins arrondis : la pastille est oblongue, pas un bloc net.
            chamfer: { radius: Math.min(h / 2, 18) },
          },
        ))

        // Parois : sol au ras du bas de l'ecran, murs sur les cotes et
        // plafond haut pour laisser la place au saut.
        const T = 240
        const walls = [
          Matter.Bodies.rectangle(W / 2, H + T / 2 - 2, W * 3, T, { isStatic: true }),
          Matter.Bodies.rectangle(-T / 2, H / 2, T, H * 4, { isStatic: true }),
          Matter.Bodies.rectangle(W + T / 2, H / 2, T, H * 4, { isStatic: true }),
          Matter.Bodies.rectangle(W / 2, -H * 1.4 - T / 2, W * 3, T, { isStatic: true }),
        ]

        Matter.Composite.add(engine.world, [...bodies, ...walls])

        // L'eclatement : chaque mot part vers le haut et sur un cote, avec
        // assez de vitesse pour monter puis retomber. La composante
        // horizontale s'etale pour couvrir toute la largeur.
        bodies.forEach((body) => {
          Matter.Body.setVelocity(body, {
            x: gsap.utils.random(-13, 13),
            y: gsap.utils.random(-25, -15),
          })
          Matter.Body.setAngularVelocity(body, gsap.utils.random(-.2, .2))
        })

        gsap.to(cupEls, { opacity: 1, duration: .14, ease: 'none' })

        // Boucle de rendu : un seul rAF pour toute la simulation. Le pas est
        // borne a 40 ms — apres un changement d'onglet, un delta de
        // plusieurs secondes propulserait les corps a travers les parois.
        let raf = 0
        let last = performance.now()
        const tick = (now: number) => {
          const dt = Math.min(now - last, 40)
          last = now
          Matter.Engine.update(engine, dt)
          for (let i = 0; i < bodies.length; i++) {
            const b = bodies[i]
            const { el, w, h } = items[i]
            el.style.transform =
              `translate3d(${b.position.x - w / 2}px,${b.position.y - h / 2}px,0) rotate(${b.angle}rad)`
          }
          raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)

        // Le curseur pousse le tas : il reste vivant apres la chute. On
        // applique une force plutot qu'une teleportation pour que la
        // simulation reste coherente.
        const PUSH = 190
        const onPhysMove = (e: PointerEvent) => {
          const box = physLayer.getBoundingClientRect()
          const px = e.clientX - box.left
          const py = e.clientY - box.top
          for (const b of bodies) {
            const dx = b.position.x - px
            const dy = b.position.y - py
            const d = Math.hypot(dx, dy)
            if (d > PUSH || d === 0) continue
            const f = (1 - d / PUSH) * 0.045
            Matter.Body.applyForce(b, b.position, { x: (dx / d) * f, y: (dy / d) * f })
          }
        }
        node.addEventListener('pointermove', onPhysMove)

        physCleanup = () => {
          cancelAnimationFrame(raf)
          node.removeEventListener('pointermove', onPhysMove)
          Matter.Composite.clear(engine.world, false)
          Matter.Engine.clear(engine)
          physCleanup = null
        }
        cleanups.push(() => physCleanup?.())
      }

      // En remontant, on remet les mots a l'etat cache pour que
      // l'eclatement rejoue au prochain passage.
      const resetPhysics = () => {
        physCleanup?.()
        gsap.set(cupEls, { opacity: 0 })
      }

      // --- Effet gazeux ---------------------------------------------------
      // Chaque bulle monte du bas vers le haut en derivant, a son propre
      // rythme. `repeat: -1` avec un delai initial negatif etale les
      // departs pour eviter un mouvement synchronise.
      const bubbles = Array.from(node.querySelectorAll<HTMLElement>('.fizz-bubble'))
      bubbles.forEach((el, i) => {
        // Fines gouttelettes : un semis discret, pas de grosses bulles.
        const size = gsap.utils.random(3, 11)
        const dur = gsap.utils.random(9, 20)
        gsap.set(el, {
          width: size,
          height: size,
          left: `${gsap.utils.random(2, 98)}%`,
          opacity: gsap.utils.random(.25, .6),
        })
        gsap.fromTo(el,
          { y: '12vh', x: 0 },
          {
            y: '-96vh',
            x: gsap.utils.random(-70, 70),
            duration: dur,
            ease: 'none',
            repeat: -1,
            delay: -(i / bubbles.length) * dur,
          })
        // Leger gonflement, comme une bulle qui se dilate en remontant.
        gsap.to(el, {
          scale: gsap.utils.random(1.05, 1.3),
          duration: dur / 2,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
        })
      })

      // --- Ondulation du bord haut du panneau ------------------------------
      // Le bord haut du panneau est decoupe en vague. Le rendu se fait avec
      // un `clip-path: path()` : contrairement a un masque en data-URI SVG
      // (premiere approche), il n'y a AUCUN reparsing d'image a chaque
      // frame — le chemin est interpole directement par le moteur de rendu.
      // La data-URI saccadait justement pour cette raison : le navigateur
      // redecodait une image entiere 60 fois par seconde.
      //
      // Le chemin est reconstruit dans un `gsap.ticker` (une seule fonction
      // pour toute la page, plutot qu'un onUpdate par tween) a partir de
      // trois phases qui avancent a des vitesses differentes : la somme de
      // sinusoides desynchronisees donne une surface de liquide credible.
      const WAVE_H = 88
      let waveW = panel.offsetWidth
      const onWaveResize = () => { waveW = panel.offsetWidth }
      window.addEventListener('resize', onWaveResize)
      cleanups.push(() => window.removeEventListener('resize', onWaveResize))

      const paintWave = (t: number) => {
        // La vague ne vit que PENDANT la montee. Des que le panneau atteint
        // le haut de l'ecran, il couvre toute la fenetre : il n'y a plus de
        // jaune a laisser voir, donc plus de raison de decouper. On aplatit
        // alors le bord, et le clip disparait completement.
        //
        // `fade` : 1 quand le panneau est encore bas (vague pleine), 0 quand
        // il est arrive (bord droit). Mesure sur la position reelle du
        // panneau, donc sans dependre d'un pourcentage de timeline.
        const panelTop = panel.getBoundingClientRect().top
        const fade = gsap.utils.clamp(0, 1, panelTop / (WAVE_H * 1.6))

        if (fade <= 0.001) {
          // Panneau arrive : aucun decoupage. On retire la propriete plutot
          // que de poser un chemin plat, pour ne rien couter au rendu.
          if (panel.style.clipPath) panel.style.clipPath = ''
          return
        }

        const N = 8
        const pts: Array<[number, number]> = []
        for (let i = 0; i <= N; i++) {
          const x = (waveW * i) / N
          const u = i / N
          // Une vague simple : une harmonique dominante et une seconde
          // discrete pour la desynchroniser. Amplitudes reduites — on veut
          // une ondulation normale, pas un profil tourmente.
          const y = WAVE_H * 0.5
            + (Math.sin(u * Math.PI * 2 + t * 0.75) * 13
              + Math.sin(u * Math.PI * 3.1 - t * 0.5) * 5) * fade
          pts.push([x, y])
        }
        // Courbe lissee : chaque segment passe par le milieu de deux points
        // successifs, ce qui evite les angles vifs d'une polyligne.
        let d = `M0 ${pts[0][1].toFixed(1)}`
        for (let i = 1; i < pts.length; i++) {
          const [px, py] = pts[i - 1]
          const [cx, cy] = pts[i]
          d += ` Q${px.toFixed(1)} ${py.toFixed(1)} ${((px + cx) / 2).toFixed(1)} ${((py + cy) / 2).toFixed(1)}`
        }
        // Referme sur tout le bas du panneau (qui fait 200 % de la scene).
        d += ` L${waveW} ${pts[N][1].toFixed(1)} L${waveW} 100000 L0 100000 Z`
        panel.style.clipPath = `path('${d}')`
      }

      let waveT = 0
      const waveTick = (_time: number, delta: number) => {
        waveT += delta / 1000
        paintWave(waveT)
      }
      paintWave(0)
      gsap.ticker.add(waveTick)
      cleanups.push(() => gsap.ticker.remove(waveTick))

      // --- Ondulation du titre --------------------------------------------
      // Les lettres suivent une sinusoide : le mot repose sur une surface
      // liquide au lieu d'une ligne droite. Le decalage vit dans `--wave`,
      // applique en CSS, pour laisser `x`/`y` libres a l'interaction.
      const waveChars = Array.from(node.querySelectorAll<HTMLElement>('.editorial-char'))
      waveChars.forEach((el, i) => {
        const t = waveChars.length > 1 ? i / (waveChars.length - 1) : 0
        // Une periode complete sur la largeur du titre, creux au centre.
        const offset = -Math.cos(t * Math.PI * 2) * 0.5 + 0.5
        el.style.setProperty('--wave', `${(offset * 0.16).toFixed(4)}em`)
      })

      // --- Titre reactif au curseur ---------------------------------------
      // Chaque lettre s'ecarte quand le pointeur l'approche, puis revient en
      // oscillant. Le calcul se fait sur une seule passe par mouvement.
      const chars = Array.from(node.querySelectorAll<HTMLElement>('.editorial-char-in'))
      const RADIUS = 190

      const onPointerMove = (e: PointerEvent) => {
        for (const el of chars) {
          const r = el.getBoundingClientRect()
          const dx = e.clientX - (r.left + r.width / 2)
          const dy = e.clientY - (r.top + r.height / 2)
          const dist = Math.hypot(dx, dy)
          if (dist > RADIUS) continue
          // Plus le pointeur est proche, plus la lettre est repoussee.
          const force = (1 - dist / RADIUS) ** 2
          gsap.to(el, {
            x: -dx * force * .45,
            y: -dy * force * .45,
            scale: 1 + force * .16,
            duration: .5,
            ease: 'power2.out',
            overwrite: 'auto',
          })
        }
      }

      // Retour au repos en oscillant, comme un liquide qui se restabilise.
      const onPointerLeave = () => {
        gsap.to(chars, {
          x: 0, y: 0, scale: 1,
          duration: 1.5,
          ease: 'elastic.out(1, .35)',
          stagger: { each: .012, from: 'center' },
          overwrite: 'auto',
        })
      }

      node.addEventListener('pointermove', onPointerMove)
      node.addEventListener('pointerleave', onPointerLeave)
      cleanups.push(() => {
        node.removeEventListener('pointermove', onPointerMove)
        node.removeEventListener('pointerleave', onPointerLeave)
      })

      // Le choc part quand les mains se rejoignent, tout a la fin du rail.
      // On mesure la progression plutot qu'un bord d'element : la scene
      // etant figee, aucune position d'element ne bouge plus.
      // Declenchement au DERNIER scroll du footer, dans les deux sens.
      // Un `ScrollTrigger` ne suffit pas ici : arrive en bas de page, il n'y
      // a plus de mouvement dans sa plage et son `onUpdate` cesse de se
      // declencher. On ecoute donc le scroll directement.
      const onBottomCheck = () => {
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight
        // Tolerance : les navigateurs arrondissent la position de scroll et
        // on n'atteint pas toujours le maximum a l'unite pres.
        const hit = maxScroll - window.scrollY <= 4
        if (hit && !clashDone) {
          clashDone = true
          clash.restart()
          // La nuee de mots s'eclate au meme instant que le choc.
          startPhysics()
        } else if (!hit && clashDone) {
          // En remontant, on rearme pour que tout rejoue au prochain
          // passage, et on efface le decalage laisse par le cognement.
          clashDone = false
          clash.pause(0)
          gsap.set('.editorial-hand', { x: 0, y: 0 })
          resetPhysics()
        }
      }
      window.addEventListener('scroll', onBottomCheck, { passive: true })
      window.addEventListener('resize', onBottomCheck)
      cleanups.push(() => {
        window.removeEventListener('scroll', onBottomCheck)
        window.removeEventListener('resize', onBottomCheck)
      })
      // Volontairement PAS d'appel immediat : si la page est rechargee alors
      // qu'on se trouve deja en bas, l'eclatement se jouerait avant meme
      // d'avoir vu la revelation. Il faut un vrai scroll pour l'armer.
    }, node)
    return () => {
      for (const fn of cleanups) fn()
      ctx.revert()
    }
  }, [])

  // Le rail donne la distance de scroll ; la scene se fige dedans.
  return <div
    className="editorial-reveal"
    ref={root}
    style={{ '--reveal-behind': behind } as CSSProperties}
  >
    <div className="editorial-stage">
      <footer className="editorial-footer" id="contact">
        {/* Le raccord ondulant n'est pas un SVG pose par-dessus (il peindrait
            du creme sur du creme, donc invisible) : c'est le bord HAUT du
            panneau lui-meme qui est decoupe en vague, via `mask-image` en
            CSS. La section precedente apparait dans les creux. */}
        {/* COUCHE 2 — « SIROTE SNAKI ». Chaque lettre a deux enveloppes :
            `-rise` recoit la revelation au scroll, `-in` la reaction au
            curseur. Sans cette separation, l'une ecraserait l'autre. */}
        <h2 className="editorial-headline" aria-label="Sirote Snaki">
          <span className="editorial-word">
            {'SIROTE'.split('').map((c, i) => (
              <span className="editorial-char" key={`s1-${i}`}>
                <span className="editorial-char-rise">
                  <span className="editorial-char-in">{c}</span>
                </span>
              </span>
            ))}
          </span>{' '}
          <span className="editorial-word">
            {'SNAKI'.split('').map((c, i) => (
              <span className="editorial-char" key={`s2-${i}`}>
                <span className="editorial-char-rise">
                  <span className="editorial-char-in">{c}</span>
                </span>
              </span>
            ))}
          </span>
        </h2>

        {/* Semis de fines gouttelettes gazeuses. */}
        <div className="editorial-fizz" aria-hidden="true">
          {Array.from({ length: 34 }, (_, i) => (
            <span className="fizz-bubble" key={`b-${i}`} />
          ))}
        </div>

        {/* Averse de gobelets au dernier scroll du footer : ils sautent, se
            cognent et retombent en vrac au fond (Matter.js). */}
        <div className="editorial-physics" aria-hidden="true">
          {physCups.map((src, i) => (
            <img
              className="phys-cup"
              key={i}
              src={src}
              alt=""
              draggable={false}
              style={{ '--cw': physCupSizes[i % physCupSizes.length] } as CSSProperties}
            />
          ))}
        </div>

        {/* COUCHE 3 — les mains, par-dessus tout le reste. */}
        <div className="editorial-hands" aria-label="Deux mains trinquent avec des bubble teas Snaki">
          <img className="editorial-hand editorial-hand-left" src={handLeft} alt="Main gauche tenant un bubble tea rose Snaki" draggable={false} />
          <img className="editorial-hand editorial-hand-right" src={handRight} alt="Main droite tenant un bubble tea Snaki" draggable={false} />
        </div>
      </footer>

      {/* COUCHE 1 — « ON COMMANDE ». Volontairement HORS du panneau (qui
          clippe son contenu) : le bouton doit rester visible dans la bande
          apercue avant le rail, puis ancre dans le viewport pendant que le
          panneau monte derriere lui. */}
      <div className="editorial-bottom">
        {/* `TransitionLink` et non un `<a href>` brut : celui-ci rechargeait
            la page entiere au lieu de naviguer cote client (et sautait donc
            la transition animee du site). */}
        <TransitionLink className="editorial-cta" data-cursor-hide to="/bobas">ON COMMANDE</TransitionLink>

        {/* Les photos des villes sont sous licence CC BY-SA : l'attribution
            est obligatoire. Elle reste donc sur la page, mais repliee tout en
            bas plutot qu'en plein milieu de la section voyage. */}
        <details className="footer-credits">
          <summary aria-label="Afficher les sources des photographies" />
          <ul>{travelSpots.map(spot => <li key={spot.city}>
            <a href={`https://commons.wikimedia.org/wiki/File:${encodeURIComponent(spot.file)}`} target="_blank" rel="noopener noreferrer">{spot.city} — {spot.author}</a>
            {' · '}<a href={spot.license === 'CC BY 3.0' ? 'https://creativecommons.org/licenses/by/3.0/' : spot.license === 'CC BY-SA 2.0' ? 'https://creativecommons.org/licenses/by-sa/2.0/' : 'https://creativecommons.org/licenses/by-sa/4.0/'} target="_blank" rel="noopener noreferrer">{spot.license}</a>
          </li>)}</ul>
        </details>
      </div>
    </div>
  </div>
}

// --- Page /bobas ---------------------------------------------------------
// Hero pleine page facon affiche : photo produit plein cadre assombrie,
// titre geant contoure par-dessus, pastille ronde et vague beige en bas
// qui raccorde a la section suivante.
function BobasHero({ ready }: { ready: boolean }) {
  const root = useRef<HTMLElement>(null)

  useEffect(() => {
    const node = root.current
    if (!node || !ready) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const ctx = gsap.context(() => {
      if (reduce) {
        gsap.set('.bobas-hero-title .pop-piece', { opacity: 1, y: 0, scale: 1 })
        return
      }

      const tl = gsap.timeline()
      tl.fromTo('.bobas-hero-photo',
        { scale: 1.14 },
        { scale: 1, duration: 1.5, ease: 'power3.out' }, 0)

      // La vague ondule doucement en continu.
      gsap.to('.bobas-hero-wave path', {
        attr: { d: 'M1536,300 H-1 V140 S184,262 461,150 S860,188 1121,168 S1413,226 1536,160 V300' },
        duration: 3.6, ease: 'sine.inOut', repeat: -1, yoyo: true,
      })
    }, node)

    return () => ctx.revert()
  }, [ready])

  return <section className="bobas-hero" id="top" ref={root}>
    <picture>
      <source media="(min-width: 761px)" srcSet={bobaPageHeroDesktop} />
      <img className="bobas-hero-photo" src={bobaPageHero} alt="Bubble tea Snaki au chocolat" draggable={false} />
    </picture>
    <div className="bobas-hero-scrim" aria-hidden="true" />

    <PopText as="h1" className="bobas-hero-title" split="words" play={ready} delay={0.5} stagger={0.07} duration={0.85}>
      {'BOIS COMME\nTU AIMES'}
    </PopText>

    <div className="bobas-hero-wave" aria-hidden="true">
      <svg viewBox="0 0 1536 300" preserveAspectRatio="none" fill="none">
        <path d="M1536,300 H-1 V120 S184,250 461,130 S860,205 1121,150 S1413,210 1536,178 V300" fill="#f5e4cd" />
      </svg>
    </div>
  </section>
}

// --- Menu de navigation ---------------------------------------------------
// Reprend la mecanique de la reference : le panneau jaillit du bouton
// (transform-origin en haut a droite), les liens montent en cascade, le
// burger se plie en croix. Les deux timelines sont construites une fois
// puis jouees / rembobinees, d'ou une fermeture qui deroule l'inverse.
const menuLinks = [
  { label: 'Accueil', to: '/' },
  { label: 'Nos bobas', to: '/bobas' },
  { label: 'Connexion', to: '/compte' },
  { label: 'Le lieu', to: '/#experience' },
  { label: 'Contact', to: '/#contact' },
]

function NavMenu() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const handle = useContext(TransitionHandleContext)
  const panel = useRef<HTMLDivElement>(null)
  const backdrop = useRef<HTMLDivElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const topBar = useRef<HTMLElement>(null)
  const midBar = useRef<HTMLElement>(null)
  const lowBar = useRef<HTMLElement>(null)
  const panelTl = useRef<gsap.core.Timeline | null>(null)
  const barsTl = useRef<gsap.core.Timeline | null>(null)

  // Panneau + backdrop : timeline construite une seule fois.
  useEffect(() => {
    const panelNode = panel.current
    const backdropNode = backdrop.current
    if (!panelNode || !backdropNode) return

    if (!panelTl.current) {
      gsap.set(backdropNode, { opacity: 0, pointerEvents: 'none' })
      gsap.set(panelNode, { opacity: 0, scale: 0.3, transformOrigin: 'top right' })

      const tl = gsap.timeline({ paused: true, defaults: { overwrite: 'auto' } })
      tl.add(() => gsap.set(backdropNode, { pointerEvents: 'auto' }), 0)
        .to(backdropNode, { opacity: 1, duration: 0.28, ease: 'power2.out' }, 0)
        .to(panelNode, { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(2.5)' }, 0.3)
        .fromTo(() => list.current?.children || [],
          { y: 18, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.38, stagger: 0.06, ease: 'power3.out' }, 0.14)
      tl.eventCallback('onReverseComplete', () => {
        gsap.set(backdropNode, { pointerEvents: 'none' })
      })
      panelTl.current = tl
    }

    if (open) panelTl.current.play()
    else panelTl.current.reverse()
  }, [open])

  // Burger -> croix. Rebati au redimensionnement car les barres sont en vw.
  useEffect(() => {
    const top = topBar.current
    const mid = midBar.current
    const low = lowBar.current
    if (!top || !mid || !low) return

    const build = () => {
      barsTl.current?.kill()
      gsap.set([top, mid, low], { clearProps: 'transform,top,bottom,opacity,scaleX' })
      gsap.set(top, { top: 0, bottom: 'auto' })
      gsap.set(mid, { opacity: 1, scaleX: 1 })
      gsap.set(low, { top: 'auto', bottom: 0 })

      const tl = gsap.timeline({ paused: true, defaults: { duration: 0.35, ease: 'power3.inOut' } })
      tl.to(top, { top: '50%', yPercent: -50, rotation: 45, transformOrigin: '50% 50%' }, 0)
        .to(low, { top: '50%', bottom: 'auto', yPercent: -50, rotation: -45, transformOrigin: '50% 50%' }, 0)
        .to(mid, { opacity: 0, scaleX: 0, transformOrigin: '50% 50%' }, 0)
      return tl
    }

    barsTl.current = build()

    let timer = 0
    const onResize = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        const progress = barsTl.current?.progress() ?? 0
        barsTl.current = build()
        barsTl.current.progress(progress)
      }, 120)
    }
    window.addEventListener('resize', onResize)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('resize', onResize)
      barsTl.current?.kill()
      barsTl.current = null
    }
  }, [])

  useEffect(() => {
    if (!barsTl.current) return
    if (open) barsTl.current.play()
    else barsTl.current.reverse()
  }, [open])

  // Clic exterieur.
  useEffect(() => {
    if (!open) return
    const onClick = (event: MouseEvent) => {
      const target = event.target as Element
      if (!panel.current?.contains(target) && !target?.closest?.('.nav-menu')) setOpen(false)
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [open])

  // Echap ferme, et on bloque le scroll pendant l'ouverture.
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open])

  const go = (to: string) => {
    setOpen(false)
    const [path, hash] = to.split('#')
    const target = path || '/'
    if (target === pathname) {
      if (hash) document.querySelector(`#${hash}`)?.scrollIntoView({ behavior: 'smooth' })
      return
    }
    handle?.current?.play(target)
  }

  return <>
    {createPortal(
      <div className="nav-menu-backdrop" ref={backdrop} aria-hidden="true" onClick={() => setOpen(false)} />,
      document.body)}

    <div className="nav-menu-wrap">
      <button
        data-cursor-hide
        className={`nav-menu${open ? ' is-open' : ''}`}
        type="button"
        onClick={event => { event.stopPropagation(); setOpen(value => !value) }}
        aria-expanded={open}
        aria-controls="main-menu"
      >
        <b>{open ? 'FERMER' : 'MENU'}</b>
        <span>
          <i ref={topBar as never} />
          <i ref={midBar as never} />
          <i ref={lowBar as never} />
        </span>
      </button>

      <div className="nav-menu-panel" id="main-menu" role="menu" ref={panel}>
        <div className="nav-menu-links" ref={list}>
          {menuLinks.map(link => <a
            data-cursor-hide
            role="menuitem"
            key={link.label}
            href={link.to}
            onClick={event => { event.preventDefault(); go(link.to) }}
          >{link.label}</a>)}
        </div>
        <p className="nav-menu-note">Snaki — Cotonou</p>
      </div>
    </div>
  </>
}

// --- Panier ---------------------------------------------------------------
// Etat local uniquement (pas de back-office) : suffisant pour la maquette.
type CartLine = { name: string; price: string; qty: number }

type CartState = {
  lines: CartLine[]
  count: number
  add: (item: { name: string; price: string }) => void
  remove: (name: string) => void
  clear: () => void
}

const CartContext = createContext<CartState>({
  lines: [], count: 0, add: () => {}, remove: () => {}, clear: () => {},
})

const useCart = () => useContext(CartContext)

function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(loadStoredCart)

  useEffect(() => { saveStoredCart(lines) }, [lines])

  const add = useCallback((item: { name: string; price: string }) => {
    setLines(prev => {
      const found = prev.find(line => line.name === item.name)
      if (found) {
        return prev.map(line => line.name === item.name ? { ...line, qty: line.qty + 1 } : line)
      }
      return [...prev, { ...item, qty: 1 }]
    })
  }, [])

  const remove = useCallback((name: string) => {
    setLines(prev => prev.flatMap(line => {
      if (line.name !== name) return [line]
      return line.qty > 1 ? [{ ...line, qty: line.qty - 1 }] : []
    }))
  }, [])
  const clear = useCallback(() => setLines([]), [])

  const count = lines.reduce((total, line) => total + line.qty, 0)
  const value = useMemo(() => ({ lines, count, add, remove, clear }), [lines, count, add, remove, clear])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

// Les prix sont des chaines "2 500 F" : on isole les chiffres pour le total.
const priceValue = (price: string) => Number(price.replace(/[^\d]/g, '')) || 0

const formatPrice = (total: number) =>
  `${total.toLocaleString('fr-FR').replace(/\u202f|\u00a0/g, ' ')} F`

function CartWidget() {
  const { lines, count, add, remove, clear } = useCart()
  const [open, setOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [checkoutStep, setCheckoutStep] = useState<'summary'|'payment'|'success'>('summary')
  const [customer, setCustomer] = useState(loadCheckoutProfile)
  const [method, setMethod] = useState<PaymentMethod>('momo')
  // Livraison a domicile, ou retrait sur place au comptoir. Le retrait
  // supprime les frais et n'a besoin ni de zone ni d'adresse.
  const [fulfillment, setFulfillment] = useState<Fulfillment>('delivery')
  const [checkoutError, setCheckoutError] = useState('')
  // Envoi en cours : verrouille le bouton pour eviter les doublons.
  const [placing, setPlacing] = useState(false)
  // Message affiche quand la commande n'a pu etre enregistree que
  // localement (reseau coupe) : le client doit le savoir.
  const [offlineNotice, setOfflineNotice] = useState('')
  const [confirmedReference, setConfirmedReference] = useState('')
  const panel = useRef<HTMLDivElement>(null)
  const badge = useRef<HTMLSpanElement>(null)
  const first = useRef(true)

  const total = lines.reduce((sum, line) => sum + priceValue(line.price) * line.qty, 0)
  const deliveryZones = [
    { name: 'Cotonou', fee: 500 }, { name: 'Fidjrossè', fee: 500 },
    { name: 'Godomey', fee: 1000 }, { name: 'Calavi', fee: 1000 }, { name: 'Hêvié', fee: 1500 },
  ]
  const pickup = fulfillment === 'pickup'
  const selectedZone = deliveryZones.find(zone => zone.name.toLocaleLowerCase('fr') === customer.zone.trim().toLocaleLowerCase('fr'))
  // Aucun frais quand le client vient chercher sa commande.
  const deliveryFee = pickup ? 0 : (selectedZone?.fee ?? 0)
  const checkoutTotal = total + deliveryFee

  // Ouverture / fermeture du panneau.
  useEffect(() => {
    const node = panel.current
    if (!node) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.set(node, { autoAlpha: open ? 1 : 0, y: 0, scale: 1 })
      return
    }
    gsap.to(node, {
      autoAlpha: open ? 1 : 0,
      y: open ? 0 : 12,
      scale: open ? 1 : 0.94,
      duration: open ? 0.42 : 0.26,
      ease: open ? 'back.out(1.8)' : 'power2.in',
      overwrite: 'auto',
    })
  }, [open])

  useEffect(() => {
    if (!checkoutOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setCheckoutOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [checkoutOpen])

  // Le badge tressaute a chaque ajout.
  useEffect(() => {
    if (first.current) { first.current = false; return }
    if (!badge.current) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    gsap.fromTo(badge.current,
      { scale: 0.5 },
      { scale: 1, duration: 0.5, ease: 'back.out(3)', overwrite: 'auto' })
  }, [count])

  // Clic exterieur : on referme.
  useEffect(() => {
    if (!open) return
    const onClick = (event: MouseEvent) => {
      const target = event.target as Node
      if (!panel.current?.contains(target) && !(target as Element)?.closest?.('.cart-button')) {
        setOpen(false)
      }
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [open])

  return <div className="cart">
    <div className="cart-panel" ref={panel} role="dialog" aria-label="Panier">
      <div className="cart-panel-head">
        <p>Ton panier <b>{count}</b></p>
        <p>Total : {formatPrice(total)}</p>
      </div>

      {lines.length === 0
        ? <p className="cart-empty">Une petite soif ? Ajoute une boisson pour commencer.</p>
        : <ul className="cart-lines">
          {lines.map(line => <li key={line.name}>
            <span className="cart-line-name">{line.name}</span>
            <span className="cart-line-qty">
              <button data-cursor-hide type="button" onClick={() => remove(line.name)} aria-label={`Retirer un ${line.name}`}>−</button>
              <b>{line.qty}</b>
              <button data-cursor-hide type="button" onClick={() => add(line)} aria-label={`Ajouter un ${line.name}`}>+</button>
            </span>
            <span className="cart-line-price">{formatPrice(priceValue(line.price) * line.qty)}</span>
          </li>)}
        </ul>}

      <button
        data-cursor-hide
        className="cart-checkout"
        type="button"
        disabled={!count}
        onClick={() => { setOpen(false); setCheckoutStep('summary'); setCheckoutOpen(true) }}
      >
        Commander
      </button>
    </div>

    <button
      data-cursor-hide
      className="cart-button"
      type="button"
      onClick={() => setOpen(value => !value)}
      aria-expanded={open}
      aria-label={`Panier, ${count} article${count > 1 ? 's' : ''}`}
    >
      <span className="cart-badge" ref={badge}>{count}</span>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 6h15l-1.5 9h-11z" />
        <path d="M6 6l-2-2" />
        <path d="M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" />
        <path d="M18 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" />
        <path d="M8.5 10.5h10" />
      </svg>
    </button>

    {checkoutOpen && createPortal(
      <div className="checkout-overlay" role="presentation" onMouseDown={() => setCheckoutOpen(false)}>
        <section
          className={`checkout-modal checkout-modal--${checkoutStep}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="checkout-title"
          onMouseDown={event => event.stopPropagation()}
        >
          <button
            data-cursor-hide
            className="checkout-close"
            type="button"
            onClick={() => setCheckoutOpen(false)}
            aria-label="Fermer"
          >×</button>
          <p className="checkout-kicker">{checkoutStep === 'success' ? 'Commande confirmée' : 'Ta commande'}</p>
          <h2 id="checkout-title">{checkoutStep === 'summary' ? 'Récapitulatif' : checkoutStep === 'payment' ? 'Paiement' : 'Merci !'}</h2>
          {checkoutStep === 'summary' && <>
            <p className="checkout-copy">Ton panier contient {count} article{count > 1 ? 's' : ''}. Vérifie le total avant de continuer.</p>
            <span className="checkout-divider">Total à régler</span>
            <div className="checkout-brand">{formatPrice(total)}</div>
            <button data-cursor-hide className="checkout-acknowledge" type="button" onClick={() => setCheckoutStep('payment')}>Continuer vers le paiement</button>
          </>}
          {checkoutStep === 'payment' && <form className="checkout-form" onSubmit={async event => {
            event.preventDefault(); setCheckoutError('')
            if (!customer.name.trim() || !customer.phone.trim()) { setCheckoutError('Remplis ton nom et ton téléphone.'); return }
            // Adresse et zone n'ont de sens que pour une livraison.
            if (!pickup && !customer.address.trim()) { setCheckoutError('Indique ton adresse de livraison.'); return }
            if (!pickup && !selectedZone) { setCheckoutError('Choisis une zone de livraison proposée pour calculer les frais.'); return }
            // Empeche le double envoi : sans ce verrou, un double-clic cree
            // deux commandes identiques.
            if (placing) return
            setPlacing(true)
            try {
              const order = await placeOrder({ lines, subtotal: total, deliveryFee, ...customer, method, fulfillment })
              setConfirmedReference(order.reference)
              // Si l'enregistrement en base a echoue, on le dit plutot que
              // de laisser croire a une commande transmise a l'equipe.
              setOfflineNotice(order.storage === 'local' ? (order.message ?? '') : '')
              clear(); setCheckoutStep('success')
            } finally {
              setPlacing(false)
            }
          }}>
            <label>Nom complet<input required autoFocus autoComplete="name" value={customer.name} onChange={e=>setCustomer({...customer,name:e.target.value})}/></label>
            <label>Téléphone<input required type="tel" inputMode="tel" autoComplete="tel" placeholder="Ex. 01 97 00 00 00" value={customer.phone} onChange={e=>setCustomer({...customer,phone:e.target.value})}/></label>
            {/* Le mode de remise vient AVANT l'adresse : il decide des
                champs a remplir. Un client qui vient chercher sa commande
                n'a ni zone ni adresse a saisir, et ne paie aucun frais. */}
            <fieldset><legend>Comment récupérer ta commande</legend><div className="checkout-methods">
              {([['delivery','Livraison'],['pickup','Je viens chercher']] as [Fulfillment,string][]).map(([value,label])=>
                <label key={value}><input type="radio" name="fulfillment" value={value} checked={fulfillment===value} onChange={()=>setFulfillment(value)}/><span>{label}</span></label>)}
            </div></fieldset>
            {!pickup && <>
              <label className="checkout-zone">Zone de livraison<input required list="snaki-delivery-zones" autoComplete="address-level2" placeholder="Rechercher une zone…" value={customer.zone} onChange={e=>setCustomer({...customer,zone:e.target.value})}/><datalist id="snaki-delivery-zones">{deliveryZones.map(zone=><option key={zone.name} value={zone.name}>{formatPrice(zone.fee)}</option>)}</datalist></label>
              <label>Adresse de livraison<input required autoComplete="street-address" placeholder="Quartier, rue, repère…" value={customer.address} onChange={e=>setCustomer({...customer,address:e.target.value})}/></label>
            </>}
            {pickup && <p className="checkout-pickup-note">Tu récupères ta commande sur place. Nous te prévenons dès qu'elle est prête.</p>}
            <label>E-mail (facultatif)<input type="email" autoComplete="email" value={customer.email} onChange={e=>setCustomer({...customer,email:e.target.value})}/></label>
            <fieldset><legend>Moyen de paiement</legend><div className="checkout-methods">
              {([['momo','MTN MoMo'],['moov','Moov Money'],['celtiis','Celtiis Cash'],['cash','Espèces']] as [PaymentMethod,string][]).map(([value,label])=><label key={value}><input type="radio" name="payment" value={value} checked={method===value} onChange={()=>setMethod(value)}/><span>{label}</span></label>)}
            </div></fieldset>
            {checkoutError && <p className="checkout-error" role="alert">{checkoutError}</p>}
            <div className="checkout-price-summary"><span>Panier <b>{formatPrice(total)}</b></span><span>{pickup ? <>Retrait <b>Gratuit</b></> : <>Livraison <b>{selectedZone ? formatPrice(deliveryFee) : 'À calculer'}</b></>}</span></div>
            <div className="checkout-total-line"><span>Total</span><strong>{formatPrice(checkoutTotal)}</strong></div>
            <button data-cursor-hide className="checkout-acknowledge" type="submit" disabled={placing}>
              {placing ? 'Envoi en cours…' : 'Confirmer la commande'}
            </button>
          </form>}
          {checkoutStep === 'success' && <div className="checkout-success">
            <div className="checkout-success-visual">
              <span className="checkout-success-burst" aria-hidden="true">MERCI</span>
              <img src={stickerHeart} alt="La mascotte Snaki avec un cœur" />
            </div>
            <div className="checkout-success-copy">
              <span>Commande confirmée</span>
              <strong>{confirmedReference}</strong>
              <p>C’est parti ! Ta commande est bien enregistrée et l’équipe Snaki peut maintenant la préparer.</p>
              {offlineNotice && (
                <p className="checkout-offline" role="alert">
                  Connexion instable : ta commande est enregistrée sur cet
                  appareil mais n’a pas encore atteint l’équipe. Contacte-nous
                  pour la confirmer.
                </p>
              )}
              {/* Proposition d'activer les notifications : posee ici parce
                  que le client vient de commander, il a donc une raison
                  concrete d'accepter. */}
              <PushOptIn phone={customer.phone} />
            </div>
            <button data-cursor-hide className="checkout-acknowledge" type="button" onClick={() => setCheckoutOpen(false)}>Retour aux bobas <span aria-hidden="true">→</span></button>
          </div>}
        </section>
      </div>,
      document.body,
    )}
  </div>
}

// Grille des boissons : en-tete decale facon affiche, puis cartes blanches
// avec damier qui glisse au survol et produit qui grossit.
// Chaque boisson montre le GOBELET qui lui correspond, et non plus une photo
// d'ingredient isole (une plaque de chocolat pour le Choco Cremeux, un Oreo
// pour l'Oreo Boba) : la carte se lisait comme un rayon d'epicerie au lieu
// d'une carte de bubble teas. Les visuels sont ceux de la pluie de gobelets
// du bas de page, choisis sur la couleur reelle du contenu.
// Toutes les boissons partagent les MEMES perles noires : le topping n'est
// donc pas un critere de choix, c'est le sirop qui distingue les recettes.
// `bun` porte le sirop et precise s'il est monte au lait ou a l'eau.
const bobaPicks = [
  { name: 'Classique Perles', price: '2 500 F', src: cup5b, bun: 'Sirop caramel + lait', patty: 'Perles noires', spice: 'Doux', kcal: '210', prep: '3–4 min' },
  { name: 'Fraise Givrée', price: '3 000 F', src: cup2a, bun: 'Sirop fraise, sans lait', patty: 'Perles noires', spice: 'Frais', kcal: '240', prep: '3–5 min' },
  { name: 'Bleu Lagon', price: '3 200 F', src: cup5a, bun: 'Sirop citron vert, sans lait', patty: 'Perles noires', spice: 'Vif', kcal: '190', prep: '4–5 min' },
  { name: 'Matcha Nuage', price: '3 500 F', src: cup4a, bun: 'Sirop matcha + lait', patty: 'Perles noires', spice: 'Doux', kcal: '260', prep: '4 min' },
  { name: 'Raisin Perlé', price: '3 400 F', src: cup3a, bun: 'Sirop raisin + lait', patty: 'Perles noires', spice: 'Gourmand', kcal: '300', prep: '4–6 min' },
  { name: 'Mangue Soleil', price: '3 100 F', src: cup3b, bun: 'Sirop mangue, sans lait', patty: 'Perles noires', spice: 'Fruité', kcal: '230', prep: '3–4 min' },
]

function BobasPicks() {
  const root = useRef<HTMLElement>(null)
  const { add } = useCart()
  // Le lait est une option de preparation, pas une recette a part : on retient
  // le choix par boisson. `true` = avec lait, la version servie par defaut.
  const [withMilk, setWithMilk] = useState<Record<string, boolean>>({})

  const addWithAnimation = (event: React.MouseEvent<HTMLButtonElement>, pick: typeof bobaPicks[number]) => {
    add({ name: `${pick.name} · ${(withMilk[pick.name] ?? true) ? 'avec lait' : 'sans lait'}`, price: pick.price })
    const card = event.currentTarget.closest('.pick-card')
    if (!card || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const shot = card.querySelector('.pick-shot')
    const text = card.querySelectorAll('.pick-name, .pick-price')
    const button = event.currentTarget
    const timeline = gsap.timeline()
    timeline
      .to(card, { scale: 1.025, boxShadow: '0 0 0 6px #eb5821, 0 20px 45px rgba(98,50,30,.22)', duration: .18, ease: 'power2.out' })
      .to(shot, { y: -18, rotation: -4, scale: 1.1, duration: .28, ease: 'back.out(2.5)' }, 0)
      .fromTo(text, { opacity: .25, y: 12 }, { opacity: 1, y: 0, stagger: .07, duration: .34, ease: 'back.out(2)' }, .05)
      .to(button, { rotation: 180, scale: 1.18, duration: .3, ease: 'back.out(2.5)' }, 0)
      .to(card, { scale: 1, boxShadow: '0 0 0 0px #eb5821, 0 0 0 rgba(98,50,30,0)', duration: .35, ease: 'power2.out' })
      .to(shot, { y: 0, rotation: 0, scale: 1, duration: .4, ease: 'power2.out' }, '<')
      .to(button, { rotation: 0, scale: 1, duration: .3, ease: 'power2.out' }, '<')
  }

  // Ouverture des details au tap. Le survol ne existe pas sur mobile : on
  // bascule une classe sur la carte touchee (et on referme les autres, pour
  // qu'une seule soit ouverte a la fois).
  //
  // Actif uniquement en pointeur grossier : en desktop le `:hover` du CSS
  // suffit, et un clic ne doit pas figer le cadre ouvert.
  const onCardTap = (event: React.MouseEvent<HTMLElement>) => {
    if (window.matchMedia('(pointer: fine)').matches) return
    const card = event.currentTarget
    // Un tap sur le bouton « + » ajoute au panier : on ne touche a rien.
    if ((event.target as HTMLElement).closest('.pick-add')) return
    const open = card.classList.contains('is-open')
    // `forEach` et non `for..of` : la cible TS du projet n'active pas les
    // iterables DOM, une NodeList n'y est donc pas iterable.
    document.querySelectorAll('.pick-card.is-open')
      .forEach(el => el.classList.remove('is-open'))
    if (!open) card.classList.add('is-open')
  }

  useEffect(() => {
    const node = root.current
    if (!node) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const ctx = gsap.context(() => {
      if (reduce) {
        gsap.set('.picks-eyebrow, .picks-count, .pick-card', { opacity: 1, y: 0, rotate: 0 })
        return
      }

      gsap.fromTo('.picks-eyebrow',
        { opacity: 0, scale: 0.4, rotate: -22 },
        {
          opacity: 1, scale: 1, rotate: -7, duration: 0.7, ease: 'back.out(2.2)',
          scrollTrigger: { trigger: node, start: 'top 78%' },
        })

      gsap.fromTo('.picks-count',
        { opacity: 0, y: 16 },
        {
          opacity: 1, y: 0, duration: 0.5, ease: 'power2.out',
          scrollTrigger: { trigger: node, start: 'top 78%' },
        })

      gsap.fromTo('.picks-title [data-pop]',
        { opacity: 0, y: 42, scale: 0.55, rotation: () => gsap.utils.random(-8, 8) },
        {
          opacity: 1, y: 0, scale: 1, rotation: 0, duration: 0.75, stagger: 0.12,
          ease: 'back.out(2)', scrollTrigger: { trigger: '.picks-head', start: 'top 80%' },
        })

      // Les cartes montent en cascade quand la grille entre dans l'ecran.
      gsap.fromTo('.pick-card',
        { opacity: 0, y: 60 },
        {
          opacity: 1, y: 0, duration: 0.7, stagger: 0.09, ease: 'power3.out',
          scrollTrigger: { trigger: '.picks-grid', start: 'top 82%' },
        })
    }, node)

    return () => ctx.revert()
  }, [])

  return <section className="picks" id="picks" ref={root}>
    <header className="picks-head">
      <div className="picks-titles">
        <p className="picks-eyebrow">Les meilleurs</p>
        <PopText as="h2" className="picks-title" split="words" stagger={0.06} duration={0.8}>
          {'NOS BOBAS\nSIGNATURE'}
        </PopText>
      </div>
      <p className="picks-count">{bobaPicks.length} boissons</p>
    </header>

    <div className="picks-grid">
      {bobaPicks.map(pick => <article
        className="pick-card"
        key={pick.name}
        onClick={onCardTap}
      >
        <div className="pick-checker" aria-hidden="true">
          {[0, 1].map(row => <div className="pick-checker-row" key={row}>
            {Array.from({ length: 12 }, (_, i) => <i key={i} className={(i + row) % 2 ? 'is-light' : 'is-dark'} />)}
          </div>)}
        </div>

        <div className="pick-body">
          <button
            data-cursor-hide
            className="pick-add"
            type="button"
            onClick={event => addWithAnimation(event, pick)}
            aria-label={`Ajouter ${pick.name} au panier`}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>

          <div className="pick-shot">
            <img src={pick.src} alt={pick.name} draggable={false} />
          </div>

          <div className="pick-details">
            <div className="pick-details-top">
              <span>Détails</span>
              <span>{pick.prep}</span>
            </div>
            <div className="pick-details-grid">
              <div><span>Base</span><b>{pick.bun}</b></div>
              <div><span>Topping</span><b>{pick.patty}</b></div>
              <div><span>Profil</span><b>{pick.spice}</b></div>
            </div>
            <div className="pick-details-tags">
              <span>{pick.kcal} kcal</span>
              {/* Choix de preparation, pose a cote des kcal. Le panneau parent
                  est en aria-hidden et ne s'ouvre qu'au survol : on le rend
                  cliquable ici, sinon les boutons seraient inertes. */}
              <span className="pick-milk">
                {([['Avec lait', true], ['Sans lait', false]] as const).map(([label, value]) => (
                  <button
                    key={label}
                    type="button"
                    data-cursor-hide
                    className={`pick-milk-btn${(withMilk[pick.name] ?? true) === value ? ' is-on' : ''}`}
                    aria-pressed={(withMilk[pick.name] ?? true) === value}
                    onClick={() => setWithMilk(prev => ({ ...prev, [pick.name]: value }))}
                  >{label}</button>
                ))}
              </span>
            </div>
          </div>

          <div className="pick-foot">
            <p className="pick-name">{pick.name}</p>
            <p className="pick-price">{pick.price}</p>
          </div>
        </div>
      </article>)}
    </div>
  </section>
}

function BobasPage({ ready }: { ready: boolean }) {
  // Marque la route pour que la nav passe le logo en blanc.
  useEffect(() => {
    document.body.dataset.route = 'bobas'
    return () => { delete document.body.dataset.route }
  }, [])

  return <>
    <BobasHero ready={ready} />
    <BobasPicks />
    <CartWidget />
    {/* Meme section photo qu'en accueil. `behind` : la section qui la
        precede ici est `.picks` (creme), d'ou une vague creme et non
        orange — sinon le raccord ferait apparaitre une bande de couleur. */}
    <DanceSection behind="#f5e4cd" />
    <EditorialFooter behind="#f5e4cd" />
  </>
}

function HomePage({ ready }: { ready: boolean }) {
  return <>
    <Hero ready={ready} />
    <AboutSection />
    <ExperienceSection />
    <DrinkBand />
    <TravelSection />
    <DanceSection behind="#eb5821" />
    <EditorialFooter behind="#eb5821" />
  </>
}

// Remet le scroll en haut a chaque changement de route.
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

function AppShell() {
  const [loading, setLoading] = useState(true)
  const { isPageReady, setLoaderFinished } = useAnimation()
  const handleRef = useRef<TransitionHandle | null>(null)

  const finishLoading = useCallback(() => {
    setLoading(false)
    setLoaderFinished(true)
  }, [setLoaderFinished])

  return <CartProvider><TransitionHandleContext.Provider value={handleRef}>
    <ScrollToTop />
    <main>
      <BubbleCursor />
      {loading && <BubbleTeaLoader onComplete={finishLoading} />}
      <nav className="poster-nav">
        <TransitionLink data-cursor-hide className="logo logo-image" to="/">
          <img src={snakiLogo} alt="Snaki" />
        </TransitionLink>
        <div className="poster-nav-actions">
          <TransitionLink data-cursor-hide className="nav-flavours" to="/bobas">BOBAS</TransitionLink>
          <NavMenu />
        </div>
      </nav>
      <Routes>
        <Route path="/" element={<HomePage ready={isPageReady} />} />
        <Route path="/bobas" element={<BobasPage ready={isPageReady} />} />
      </Routes>
      <PageTransition handleRef={handleRef} />
    </main>
  </TransitionHandleContext.Provider></CartProvider>
}

function App() {
  return <BrowserRouter>
    <ToastProvider>
      <Routes>
        {/* Le dashboard et la vitrine du Design System vivent HORS de
            `AppShell` : ils n'ont ni loader, ni curseur personnalise, ni
            navigation d'affiche. Ce sont des applications distinctes qui
            partagent seulement les tokens de design. */}
        <Route path="/admin/*" element={<AdminApp />} />
        <Route path="/design" element={<DesignShowcase />} />
        <Route path="/compte" element={<CustomerAccount />} />
        <Route path="/*" element={
          <AnimationProvider>
            <AppShell />
          </AnimationProvider>
        } />
      </Routes>
    </ToastProvider>
  </BrowserRouter>
}

export default App
