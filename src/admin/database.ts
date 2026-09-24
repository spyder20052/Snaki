import { supabase } from '../lib/supabase'
import { retryJwtRead } from '../lib/retryJwt'
import type { SnakiData } from './store'
import { loadSimulatedCustomers, loadSimulatedOrders, loadSimulatedPayments } from '../lib/localCommerce'

type Row = Record<string, any>
type Tables = Record<string, Row[]>
const names = ['media','categories','collections','products','product_images','product_collections','product_variant_groups','product_variant_options','customers','addresses','delivery_zones','opening_hours','closures','promotions','promotion_products','expenses','orders','order_items','order_status_history','payments','reviews','site_sections','site_content','settings','analytics_sessions','analytics_events','notifications','audit_logs','admin_users']
const camel = (s: string) => s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())
const decode = (r: Row): Row => Object.fromEntries(Object.entries(r).map(([k,v]) => [camel(k), v === null ? undefined : v]))
const links: Record<string,string> = { products:'products', categories:'categories', orders:'orders', payments:'payments', customers:'customers', promotions:'promotions', expenses:'expenses', zones:'delivery_zones', reviews:'reviews', media:'media', sections:'site_sections', events:'analytics_events', sessions:'analytics_sessions', users:'admin_users', logs:'audit_logs', notifications:'notifications' }

export async function loadDatabase(): Promise<SnakiData> {
  const tables: Tables = {}
  await Promise.all(names.map(async name => {
    const rows: Row[] = []
    for (let offset = 0; ; offset += 1000) {
      const key = name === 'opening_hours' ? 'day' : name === 'product_collections' ? 'product_id,collection_id' : name === 'promotion_products' ? 'promotion_id,product_id' : 'id'
      const { data, error } = await retryJwtRead(() => supabase.from(name).select('*').order(key).range(offset, offset + 999))
      if (error) {
        // Une table absente ne doit PAS bloquer tout le dashboard. Cela
        // arrive quand une migration SQL n'a pas encore ete executee : la
        // fonctionnalite correspondante s'affiche alors vide, et le reste
        // continue de fonctionner. Codes PostgREST : `42P01` = table
        // inconnue, `PGRST205` = absente du cache de schema.
        const missing = error.code === '42P01'
          || error.code === 'PGRST205'
          || /schema cache|does not exist/i.test(error.message)
        if (missing) {
          console.warn(
            `[snaki] Table « ${name} » absente : la migration SQL correspondante `
            + `n'a pas encore été exécutée. Cette section restera vide.`)
          break
        }
        throw new Error(name + ': ' + error.message)
      }
      rows.push(...data)
      if (data.length < 1000) break
    }
    tables[name] = rows
  }))
  const t = Object.fromEntries(Object.entries(tables).map(([k,v]) => [k,v.map(decode)]))
  const result: Row = {}
  for (const [key, table] of Object.entries(links)) result[key] = t[table] ?? []
  const image = (id: string) => t.media.find(m => m.id === id)?.url
  result.media = t.media.map(m => ({...m, usedIn: []}))
  result.products = t.products.sort((a,b)=>a.position-b.position).map(p => ({
    ...p, stock: p.stock ?? null, image: image(p.imageId), mobileImage: image(p.mobileImageId),
    collectionIds: t.product_collections.filter(x=>x.productId===p.id).map(x=>x.collectionId),
    gallery: t.product_images.filter(x=>x.productId===p.id).sort((a,b)=>a.position-b.position).map(x=>image(x.mediaId)).filter(Boolean),
    variantGroups: t.product_variant_groups.filter(g=>g.productId===p.id).sort((a,b)=>a.position-b.position).map(g=>({...g,type:g.kind,options:t.product_variant_options.filter(o=>o.groupId===g.id).sort((a,b)=>a.position-b.position)})),
  }))
  result.categories = t.categories.map(c=>({...c,image:image(c.imageId)}))
  result.customers = t.customers.map(c=>({...c,addresses:t.addresses.filter(a=>a.customerId===c.id).map(a=>a.line)}))
  result.orders = [...loadSimulatedOrders(), ...t.orders.map(o=>({...o,items:t.order_items.filter(i=>i.orderId===o.id),statusHistory:t.order_status_history.filter(h=>h.orderId===o.id).map(h=>({...h,by:h.actorName||'Équipe'}))}))]
  result.payments = [...loadSimulatedPayments(), ...t.payments.map(p=>{const o=t.orders.find(o=>o.id===p.orderId);return {...p,orderReference:o?.reference||'',customerName:o?.customerName||''}})]
  result.customers = [...loadSimulatedCustomers(), ...result.customers.filter((c: Row)=>!loadSimulatedCustomers().some(local=>local.phone===c.phone))]
  result.promotions = t.promotions.map(p=>({...p,productIds:t.promotion_products.filter(x=>x.promotionId===p.id).map(x=>x.productId)}))
  result.expenses = t.expenses ?? []
  result.sections = t.site_sections.sort((a,b)=>a.position-b.position).map(s=>({...s,fields:t.site_content.filter(f=>f.sectionId===s.id)}))
  result.logs = t.audit_logs.map(l=>({...l,id:String(l.id),actor:l.actorName||'Équipe'}))
  const s = t.settings[0]
  if (!s) throw new Error('La ligne settings est absente ou inaccessible.')
  result.settings = {...s,logo:image(s.logoId),favicon:image(s.faviconId),seo:{title:s.seoTitle||'',description:s.seoDescription||'',ogImage:image(s.seoOgImageId),noindex:s.seoNoindex},openingHours:t.opening_hours.map(h=>({...h,open:h.opens.slice(0,5),close:h.closes.slice(0,5)})),closures:t.closures.map(c=>({...c,from:c.startsOn,to:c.endsOn}))}
  return result as SnakiData
}

// Explicit writable columns: UI-only properties never reach PostgreSQL.
const columns: Record<string,string> = {
  products:'id name slug short_description description price compare_at_price category_id image_id mobile_image_id color status stock available position tags allergens ingredients nutrition prep_time is_new is_popular is_featured meta_title meta_description og_image_id noindex created_at updated_at',
  categories:'id name slug description image_id position visible archived created_at',
  media:'id name url size width height format created_at',
  delivery_zones:'id name area available fee min_order eta priority',
  promotions:'id code kind value starts_at ends_at max_uses used_count min_order once_per_customer active created_at',
  reviews:'id customer_name product_id rating comment status featured reply created_at',
  site_sections:'id key name page visible position locked',
  site_content:'id section_id key label kind value',
  orders:'id status cancel_reason cancelled_at updated_at',
  notifications:'id read',
  settings:'id brand_name logo_id favicon_id whatsapp phone email instagram tiktok address currency default_delivery_fee min_order accepting_orders orders_closed_message legal_terms privacy_policy seo_title seo_description seo_og_image_id seo_noindex',
  opening_hours:'day opens closes closed',
  closures:'id starts_on ends_on reason',
  expenses:'id label category amount spent_at supplier note receipt',
  product_variant_groups:'id product_id name kind required position',
  product_variant_options:'id group_id label price_delta available is_default position',
  product_images:'id product_id media_id position',
  product_collections:'product_id collection_id',
  promotion_products:'promotion_id product_id',
}

export async function saveDatabase(before: SnakiData, after: SnakiData) {
  const changes: Row[] = []
  // Les commandes, paiements et clients issus du checkout du site public
  // vivent dans `localStorage` et NON dans Supabase (voir `localCommerce`).
  // Les envoyer a `admin_apply_changes` provoquerait un `UPDATE` sans ligne
  // correspondante, donc l'erreur « Modification refusée ou ligne
  // supprimée ». On les ecarte du lot : ils sont deja persistes localement
  // par le store.
  const localOnly = new Set<string>([
    ...loadSimulatedOrders().map(o => o.id),
    ...loadSimulatedPayments().map(p => p.id),
    ...loadSimulatedCustomers().map(c => c.id),
  ])
  const append = (table: string, oldRows: Row[], newRows: Row[]) => {
    const cols=columns[table].split(' ')
    const encode=(r:Row)=>Object.fromEntries(cols.filter(k=>camel(k) in r || k in r).map(k=>[k,r[camel(k)] ?? r[k] ?? null]))
    const keys=table==='opening_hours'?['day']:table==='product_collections'?['product_id','collection_id']:table==='promotion_products'?['promotion_id','product_id']:['id']
    const identity=(r:Row)=>JSON.stringify(keys.map(k=>r[k]))
    // Ecarte les lignes purement locales avant de comparer.
    const isLocal=(r:Row)=>typeof r.id==='string' && localOnly.has(r.id)
    const old=oldRows.filter(r=>!isLocal(r)).map(encode)
    const next=newRows.filter(r=>!isLocal(r)).map(encode)
    for(const r of old) if(!next.some(n=>identity(n)===identity(r))) changes.push({table,op:'delete',row:r})
    for(const r of next) {
      const prev=old.find(o=>identity(o)===identity(r))
      if(JSON.stringify(prev)!==JSON.stringify(r)) {
        const payload = prev ? {...Object.fromEntries(Object.keys(prev).map(k=>[k,null])),...r} : r
        changes.push({table,op:prev?'update':'insert',row:payload})
      }
    }
  }
  for(const [key,table] of Object.entries(links)) {
    if(!columns[table]) continue
    const old=before[key as keyof SnakiData] as unknown as Row[], next=after[key as keyof SnakiData] as unknown as Row[]
    if(JSON.stringify(old)===JSON.stringify(next)) continue
    const withImages=(r:Row)=>{
      const x={...r}
      for(const [field,col] of [['image','imageId'],['mobileImage','mobileImageId']] ) {
        if(field in r) {
          x[col]=after.media.find(m=>m.url===r[field])?.id ?? null
          if(r[field] && !x[col]) throw new Error('Importez cette image dans la médiathèque avant de la sélectionner.')
        }
      }
      return x
    }
    append(table,old.map(withImages),next.map(withImages))
  }
  const variants=(d:SnakiData)=>({
    groups:d.products.flatMap(p=>p.variantGroups.map((g,i)=>({...g,productId:p.id,kind:g.type,position:i}))),
    options:d.products.flatMap(p=>p.variantGroups.flatMap(g=>g.options.map((o,i)=>({...o,isDefault:o.isDefault??false,groupId:g.id,position:i})))),
    collections:d.products.flatMap(p=>p.collectionIds.map(collectionId=>({productId:p.id,collectionId}))),
    promotions:d.promotions.flatMap(p=>p.productIds.map(productId=>({promotionId:p.id,productId}))),
    fields:d.sections.flatMap(s=>s.fields.map(f=>({...f,id:(f as Row).id || crypto.randomUUID(),sectionId:s.id}))),
  })
  const a=variants(before),b=variants(after)
  append('product_variant_groups',a.groups,b.groups)
  append('product_variant_options',a.options,b.options)
  append('product_collections',a.collections,b.collections)
  append('promotion_products',a.promotions,b.promotions)
  append('site_content',a.fields,b.fields)
  const settings=(s:SnakiData['settings'])=>({...s,id:true,seoTitle:s.seo.title,seoDescription:s.seo.description,seoNoindex:s.seo.noindex,logoId:after.media.find(m=>m.url===s.logo)?.id??null,faviconId:after.media.find(m=>m.url===s.favicon)?.id??null,seoOgImageId:after.media.find(m=>m.url===s.seo.ogImage)?.id??null})
  append('settings',[settings(before.settings)],[settings(after.settings)])
  append('opening_hours',before.settings.openingHours.map(h=>({...h,opens:h.open,closes:h.close})),after.settings.openingHours.map(h=>({...h,opens:h.open,closes:h.close})))
  append('closures',before.settings.closures.map(c=>({...c,startsOn:c.from,endsOn:c.to})),after.settings.closures.map(c=>({...c,startsOn:c.from,endsOn:c.to})))
  if(!changes.length) return
  // One PostgreSQL transaction; permissions are evaluated with the signed-in user.
  const {error}=await supabase.rpc('admin_apply_changes',{changes})
  if(error) throw new Error(error.message)
}
