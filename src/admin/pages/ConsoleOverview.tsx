import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../Icon'
import { currentAdminId, formatAmount, ORDER_STATUS_LABELS, useData } from '../store'
import { Badge } from '../ui'

export function OverviewPage() {
  const d=useData()
  const [days,setDays]=useState(7)
  const now=new Date()
  const start=new Date(now.getFullYear(),now.getMonth(),now.getDate()-days+1)
  const orders=d.orders.filter(o=>new Date(o.createdAt)>=start&&new Date(o.createdAt)<=now)
  const valid=orders.filter(o=>!['cancelled','refunded'].includes(o.status))
  const revenue=valid.reduce((a,o)=>a+o.total,0)
  const pending=d.orders.filter(o=>['new','pending','confirmed','preparing'].includes(o.status))
  const recent=[...d.orders].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,5)
  const products=d.products.filter(p=>p.status==='active')
  const outOfStock=products.filter(p=>!p.available||p.stock===0)
  const lowStock=products.filter(p=>p.available&&p.stock!==null&&p.stock>0&&p.stock<=5)
  const reviews=d.reviews.filter(r=>r.status==='pending')
  const me=d.users.find(u=>u.id===currentAdminId)
  const buckets=Array.from({length:days},(_,i)=>{const date=new Date(start);date.setDate(date.getDate()+i);return {date,total:valid.filter(o=>new Date(o.createdAt).toDateString()===date.toDateString()).reduce((a,o)=>a+o.total,0)}})
  const max=Math.max(1,...buckets.map(b=>b.total))
  const points=buckets.map((b,i)=>`${i/(days-1)*600},${150-b.total/max*125}`).join(' ')
  const metrics=[{label:'Chiffre d’affaires',value:formatAmount(revenue),icon:'payments',hint:'Hors annulations et remboursements',color:'peach'},{label:'Commandes',value:orders.length,icon:'orders',hint:`${pending.length} à traiter, toutes périodes`,color:'cream'},{label:'Panier moyen',value:formatAmount(valid.length?Math.round(revenue/valid.length):0),icon:'products',hint:'Sur les commandes retenues',color:'white'},{label:'Nouveaux clients',value:d.customers.filter(c=>new Date(c.createdAt)>=start&&new Date(c.createdAt)<=now).length,icon:'customers',hint:`${d.customers.length} clients au total`,color:'sand'}]
  return <>
    <header className="dashboard-heading"><div><p className="dashboard-eyebrow">VOTRE ACTIVITÉ</p><h1>Vue d’ensemble<span>.</span></h1><p>Bonjour {me?.name||'l’équipe'}, voici où en est votre boutique.</p></div><div className="dashboard-period"><Icon name="analytics" size={17}/><select aria-label="Période des statistiques" value={days} onChange={e=>setDays(Number(e.target.value))}><option value={7}>7 derniers jours</option><option value={30}>30 derniers jours</option></select></div></header>
    <section className="dashboard-metrics" aria-label="Indicateurs de la période">{metrics.map(m=><article className={'dashboard-metric '+m.color} key={m.label}><div><span>{m.label}</span><Icon name={m.icon}/></div><strong>{m.value}</strong><small>{m.hint}</small></article>)}</section>
    <div className="dashboard-middle">
      <section className="dashboard-panel dashboard-revenue"><header><div><h2>Évolution des ventes</h2><p>{start.toLocaleDateString('fr-FR',{day:'numeric',month:'short'})} — {now.toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'})}</p></div><span className="dashboard-legend"><i/>Chiffre d’affaires</span></header><div className="dashboard-chart"><div className="dashboard-y-axis"><span>{formatAmount(max===1?0:max)}</span><span>{formatAmount(max===1?0:Math.round(max/2))}</span><span>0 F</span></div><div className="dashboard-plot"><svg viewBox="0 0 600 165" preserveAspectRatio="none" role="img" aria-label={`Chiffre d’affaires sur ${days} jours : ${formatAmount(revenue)}`}><path d="M0 25H600 M0 88H600 M0 150H600" stroke="#d8cbb9" strokeDasharray="4 5" fill="none"/>{revenue>0&&<polygon points={`0,150 ${points} 600,150`} fill="#eb58211c"/>}<polyline points={points} stroke="#c64a20" strokeWidth="2.5" fill="none" vectorEffect="non-scaling-stroke"/></svg>{!valid.length&&<div className="dashboard-chart-empty"><Icon name="analytics"/><strong>Aucune vente sur cette période</strong><span>Le graphique évoluera avec vos commandes.</span></div>}<div className="dashboard-x-axis">{buckets.filter((_,i)=>i===0||i===Math.floor(days/2)||i===days-1).map(b=><span key={b.date.toISOString()}>{b.date.toLocaleDateString('fr-FR',{day:'numeric',month:'short'})}</span>)}</div></div></div></section>
      <section className="dashboard-panel dashboard-priorities"><header><div><h2>À suivre aujourd’hui</h2><p>Les points qui méritent votre attention.</p></div><span className="dashboard-stamp"><Icon name="activity" size={23}/></span></header>{[{count:pending.length,label:'Commandes à traiter',to:'orders',detail:'Préparation et confirmation'},{count:outOfStock.length,label:'Boissons indisponibles',to:'products',detail:'Vérifier les disponibilités'},{count:reviews.length,label:'Avis à modérer',to:'reviews',detail:'Les retours de vos clients'}].map((x,i)=><Link className="dashboard-priority" key={x.to} to={'/admin/'+x.to}><span className="dashboard-priority-number">{String(i+1).padStart(2,'0')}</span><span><strong>{x.label}</strong><small>{x.detail}</small></span><b>{x.count}</b><Icon name="arrow" size={15}/></Link>)}</section>
    </div>
    <div className="dashboard-bottom">
      <section className="dashboard-panel dashboard-orders"><header><div><h2>Dernières commandes</h2><p>Les dernières demandes de votre boutique.</p></div><Link to="/admin/orders" className="dashboard-link">Tout voir <Icon name="arrow" size={15}/></Link></header><div className="dashboard-table-scroll"><table><thead><tr><th>Commande</th><th>Client</th><th>Statut</th><th>Total</th></tr></thead><tbody>{recent.map(o=><tr key={o.id}><td><Link to="/admin/orders">{o.reference}</Link><small>{new Date(o.createdAt).toLocaleDateString('fr-FR',{day:'numeric',month:'short'})}</small></td><td>{o.customerName}</td><td><Badge tone={['completed','delivered'].includes(o.status)?'success':o.status==='cancelled'?'danger':'neutral'}>{ORDER_STATUS_LABELS[o.status]}</Badge></td><td>{formatAmount(o.total)}</td></tr>)}</tbody></table></div>{!recent.length&&<div className="dashboard-empty"><span><Icon name="orders" size={25}/></span><h3>Vos premières commandes, juste ici.</h3><p>Retrouvez leur statut et leur montant dès leur enregistrement.</p><Link to="/admin/products">Vérifier le catalogue <Icon name="arrow" size={15}/></Link></div>}</section>
      <section className="dashboard-panel dashboard-catalog"><header><div><h2>Votre catalogue</h2><p>Prêt pour les prochaines commandes.</p></div><Icon name="products" size={25}/></header><strong className="dashboard-catalog-count">{products.length}<span>boissons actives</span></strong><div className="dashboard-catalog-line"><span>Catégories visibles</span><b>{d.categories.filter(c=>c.visible&&!c.archived).length}</b></div><div className="dashboard-catalog-line"><span>Stock faible (5 ou moins)</span><b>{lowStock.length}</b></div><Link className="dashboard-solid-link" to="/admin/products">Gérer les boissons <Icon name="arrow" size={17}/></Link></section>
    </div>
    <section className="dashboard-quick-links" aria-label="Accès rapides">{[{to:'content',title:'Contenu du site',text:'Textes et sections',icon:'content'},{to:'zones',title:'Zones de livraison',text:'Tarifs et disponibilités',icon:'zones'},{to:'settings',title:'Paramètres',text:'Horaires et coordonnées',icon:'settings'}].map(x=><Link key={x.to} to={'/admin/'+x.to}><span className="dashboard-quick-icon"><Icon name={x.icon}/></span><span><strong>{x.title}</strong><small>{x.text}</small></span><Icon name="arrow" size={16}/></Link>)}</section>
  </>
}
