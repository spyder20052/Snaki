import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import snakiLogo from '../assets/snaki-logo-transparent.png'
import { connectAdmin, disconnectAdmin } from './store'
import { Button, Input, useAdminArea } from './ui'

export function AuthGate({children}:{children:ReactNode}) {
  useAdminArea()
  const [ready,setReady]=useState(false)
  const [busy,setBusy]=useState(true)
  const [error,setError]=useState('')
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  useEffect(()=>{
    let active=true
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{
      if(!active)return
      if(!session){disconnectAdmin();setReady(false);setBusy(false);return}
      if(_event==='TOKEN_REFRESHED')return
      setBusy(true)
      setTimeout(()=>{
        if(!active)return
        void connectAdmin(session.user.id).then(()=>{
          if(active){setReady(true);setError('')}
        }).catch(e=>{
          if(active){setReady(false);setError(e.message.includes('JWT issued at future')
            ? 'Supabase refuse temporairement la session à cause d’un décalage d’horloge. Patientez quelques secondes puis cliquez sur Réessayer.'
            : e.message)}
        }).finally(()=>{if(active)setBusy(false)})
      },0)
    })
    return ()=>{active=false;subscription.unsubscribe()}
  },[])
  if(ready)return <>{children}</>
  return <div className="sk-root sk-shell" style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:24}}>
    <form className="sk-card" style={{width:'100%',maxWidth:420,padding:32}} onSubmit={async e=>{
      e.preventDefault();setBusy(true);setError('')
      const {error}=await supabase.auth.signInWithPassword({email,password})
      if(error){setError(error.message);setBusy(false)}
    }}>
      {/* Le vrai logo, comme dans la sidebar et sur le site public. */}
      <img src={snakiLogo} alt="Snaki" style={{height:34,width:'auto',display:'block',marginBottom:20}} />
      <p style={{color:'#df511e',fontWeight:700,fontSize:11,letterSpacing:'1.4px',marginBottom:14}}>ESPACE DE GESTION</p>
      <h1 style={{fontSize:26,marginBottom:10}}>Bienvenue dans votre espace</h1>
      <p style={{fontSize:13,color:'#626c79',marginBottom:24}}>Connectez-vous pour gérer votre boutique.</p>
      <label htmlFor="admin-email">Adresse e-mail</label>
      <Input id="admin-email" type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)} />
      <label htmlFor="admin-password" style={{display:'block',marginTop:18}}>Mot de passe</label>
      <Input id="admin-password" type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} />
      {error && <p role="alert" style={{color:'#b42318',fontSize:13,marginTop:16}}>{error}</p>}
      {error && <Button type="button" disabled={busy} variant="outline" style={{marginTop:16}} onClick={async ()=>{
        setBusy(true)
        try {
          const {data:{session}}=await supabase.auth.getSession()
          if(!session) {setError('Renseignez vos identifiants pour vous connecter.');return}
          await connectAdmin(session.user.id)
          setError('');setReady(true)
        } catch(e) {
          setError(e instanceof Error && e.message.includes('JWT issued at future')
            ? 'Le problème d’horloge Supabase persiste. Réessayez plus tard ou contactez le support Supabase.'
            : e instanceof Error ? e.message : 'La connexion a échoué.')
        } finally {setBusy(false)}
      }}>Réessayer</Button>}
      <Button type="submit" disabled={busy} style={{width:'100%',marginTop:24}}>{busy?'Connexion en cours…':'Se connecter'}</Button>
      {error && <Button type="button" variant="ghost" onClick={()=>void supabase.auth.signOut()}>Utiliser un autre compte</Button>}
    </form>
  </div>
}
