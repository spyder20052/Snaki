import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import './loader.css'
import cup from './assets/buble te/gobelet.png'
import lid from './assets/buble te/couvercle.png'
import straw from './assets/buble te/pipette.png'
import pearl from './assets/buble te/boule noir.png'
import ice from './assets/glace.png'
import logo from './assets/snaki-logo-transparent.png'

const pearls = [[91,338],[116,343],[140,342],[165,337],[102,321],[128,323],[153,319],[116,302],[141,300]]

export function BubbleTeaLoader({ onComplete }: { onComplete: () => void }) {
  const root = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState('Préparation de ton Snaki')

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    let cancelled = false
    const ctx = gsap.context(() => {}, root)
    // The PNGs have different transparent margins; placement below uses
    // their visible outlines, not the dimensions of their image canvases.
    const images = [cup, lid, straw, pearl, ice, logo].map(src => {
      const image = new Image()
      image.src = src
      return image.decode().catch(() => undefined)
    })
    const timeout = window.setTimeout(start, 1800)
    let started = false
    function start() {
      if (cancelled || started) return
      started = true
      window.clearTimeout(timeout)
      ctx.add(() => {
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        if (reduce) {
          gsap.set('.assembly-part', { opacity: 1 })
          gsap.to(root.current, { opacity: 0, delay: .35, duration: .2, onComplete })
          return
        }
        const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })
        gsap.set('.assembly-part', { opacity: 0 })
        gsap.set('.assembly-liquid', { scaleY: 0, svgOrigin: '128 353' })
        gsap.set('.assembly-progress span', { scaleX: 0 })
        tl.fromTo('.assembly-cup', { y: -380, rotation: -5 }, { y: 0, rotation: 0, opacity: 1, duration: .48, ease: 'power2.in' }, .08)
          .to('.assembly-logo', { opacity: 1, duration: .2 }, .58)
          .fromTo('.assembly-shadow', { scale: .5, opacity: 0 }, { scale: 1, opacity: .2, duration: .45 }, .1)
          .to('.assembly-product', { y: 4, duration: .08 }, .56)
          .to('.assembly-product', { y: 0, duration: .18 }, .64)
          .call(() => setStatus('Les perles, une à une'), [], .55)
        pearls.forEach((_, i) => {
          const at = .58 + i * .055
          tl.fromTo(`.assembly-pearl-${i}`, { y: -330, opacity: 0 }, { y: 0, opacity: 1, duration: .36, ease: 'power2.in' }, at)
            .to(`.assembly-pearl-${i}`, { y: -7, duration: .09 }, at + .36)
            .to(`.assembly-pearl-${i}`, { y: 0, duration: .13, ease: 'power2.in' }, at + .45)
        })
        tl.call(() => setStatus('Le thé, tout en douceur'), [], 1.25)
          .to('.assembly-liquid', { opacity: 1, scaleY: 1, duration: .68, ease: 'sine.inOut' }, 1.25)
          .call(() => setStatus('Quelques glaçons pour la fraîcheur'), [], 1.7)
          .fromTo('.assembly-ice', { y: -200 }, { y: 0, opacity: 1, duration: .34, stagger: .09, ease: 'power2.in' }, 1.7)
          .to('.assembly-ice', { y: -4, duration: .14, stagger: .09, ease: 'sine.out' }, 2.04)
          .call(() => setStatus('On ferme, on sirote'), [], 2.3)
          .fromTo('.assembly-lid', { y: -290, rotation: -4 }, { y: 0, rotation: 0, opacity: 1, duration: .4, ease: 'power2.in' }, 2.3)
          .to('.assembly-product', { y: 3, duration: .07 }, 2.7)
          .to('.assembly-product', { y: 0, duration: .18 }, 2.77)
          .fromTo('.assembly-straw', { y: -220 }, { y: 0, opacity: 1, duration: .45, ease: 'power2.inOut' }, 2.8)
          .to('.assembly-progress span', { scaleX: 1, duration: 3.25, ease: 'none' }, 0)
          .call(() => setStatus('Ton Snaki est prêt !'), [], 3.25)
          .to('.assembly-product', { y: -12, rotation: -2, duration: .2 }, 3.3)
          .to('.assembly-product', { y: 0, rotation: 0, duration: .26, ease: 'sine.inOut' }, 3.5)
          .to('.assembly-copy', { opacity: 0, y: 12, duration: .25 }, 3.75)
          .to('.assembly-product', { y: -window.innerHeight, duration: .65, ease: 'power2.in' }, 3.85)
          .to('.assembly-shadow', { opacity: 0, scale: .4, duration: .3 }, 3.85)
          .to('.assembly-curtain', { yPercent: -105, duration: .8, stagger: .09, ease: 'power3.inOut' }, 4.05)
          .to(root.current, { opacity: 0, duration: .15, onComplete }, 4.85)
      })
    }
    void Promise.all(images).then(start)
    return () => {
      cancelled = true
      window.clearTimeout(timeout)
      ctx.revert()
      document.body.style.overflow = previousOverflow
    }
  }, [onComplete])

  return <div className="assembly-loader" ref={root} aria-label="Chargement de Snaki">
    <div className="assembly-curtain assembly-curtain-front" />
    <div className="assembly-curtain assembly-curtain-back" />
    <div className="assembly-stage">
      <div className="assembly-shadow" />
      <svg className="assembly-product" viewBox="0 -80 260 470" aria-hidden="true">
        <defs>
          <clipPath id="assembly-glass"><path d="M43 127 Q128 149 214 127 L188 333 Q184 354 128 354 Q72 354 69 333Z" /></clipPath>
          <clipPath id="assembly-straw-above"><rect x="0" y="-100" width="260" height="177" /></clipPath>
          <linearGradient id="assembly-tea" x1="0" x2="1"><stop stopColor="#9d623f"/><stop offset=".45" stopColor="#edc59c"/><stop offset="1" stopColor="#b97a4b"/></linearGradient>
        </defs>
        <image className="assembly-part assembly-cup" href={cup} x="-50" y="40" width="360" height="360" />
        <g clipPath="url(#assembly-glass)">
          <g className="assembly-part assembly-liquid" style={{ mixBlendMode: 'multiply' }}><path d="M35 155 Q80 147 128 155 T220 155V355H35Z" fill="url(#assembly-tea)"/><ellipse cx="128" cy="155" rx="85" ry="8" fill="#f3d6b4"/></g>
          <g opacity=".5"><image className="assembly-part assembly-straw" href={straw} x="25" y="-35" width="210" height="300" preserveAspectRatio="none" /></g>
          {[[68,165,-12],[115,150,9],[155,178,17]].map(([x,y,angle], i) => <g key={i} transform={`rotate(${angle} ${x+22} ${y+22})`}>
            <image className="assembly-part assembly-ice" href={ice} x={x} y={y} width="45" height="45" />
          </g>)}
          {pearls.map(([cx, cy], i) => <g className={`assembly-part assembly-pearl-${i}`} key={i}>
            <svg x={cx - 10} y={cy - 10} width="20" height="20" viewBox="1030 1780 1020 1020"><image href={pearl} width="3200" height="4800" /></svg>
          </g>)}
        </g>
        <g opacity=".18"><image className="assembly-part assembly-cup" href={cup} x="-50" y="40" width="360" height="360" /></g>
        <image className="assembly-part assembly-logo" href={logo} x="73" y="224" width="110" height="65" preserveAspectRatio="xMidYMid meet" />
        <image className="assembly-part assembly-lid" href={lid} x="-2" y="12" width="267" height="145" preserveAspectRatio="none" />
        <g clipPath="url(#assembly-straw-above)"><image className="assembly-part assembly-straw" href={straw} x="25" y="-35" width="210" height="300" preserveAspectRatio="none" /></g>
      </svg>
      <div className="assembly-copy"><p role="status" aria-live="polite">{status}</p><div className="assembly-progress" aria-hidden="true"><span /></div></div>
    </div>
  </div>
}
