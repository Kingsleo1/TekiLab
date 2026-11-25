import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchTestCatalogue, catalogueChangedEvent } from '../services/test-catalog';
import type { CatalogueActor, CatalogueScope, CatalogueSnapshot } from '../types/test-catalog';
export function useTestCatalogue(scope:CatalogueScope,actor:CatalogueActor|null) {
  const [snapshot,setSnapshot]=useState<CatalogueSnapshot|null>(null);
  const [error,setError]=useState('');const current=useRef<CatalogueSnapshot|null>(null);current.current=snapshot;
  const actorKey=JSON.stringify(actor&&{id:actor.id,role:actor.role,permissions:actor.permissions||[]});
  const key=scope.tenantId+'|'+scope.branchId+'|'+actorKey;
  const snapshotKey=useRef('');
  const generation=useRef(0);
  useEffect(()=>{generation.current++;current.current=null;setSnapshot(null);setError('');},[key]);
  const refresh=useCallback(async()=>{
    if(!actor?.id)return;
    const captured=generation.current;
    try{const data=await fetchTestCatalogue(scope,actor,current.current?.revision);if(captured!==generation.current)return;if(data){snapshotKey.current=key;current.current=data;setSnapshot(data);}setError('');}
    catch(error:any){if(captured===generation.current)setError(error.message);}
  },[key]);
  useEffect(()=>{
    let active=true;
    const update=(event:any)=>{if(active&&event.detail?.scope.tenantId===scope.tenantId&&event.detail?.scope.branchId===scope.branchId){snapshotKey.current=key;current.current=event.detail.data;setSnapshot(event.detail.data);setError('');}};
    const onFocus=()=>{if(active)refresh();};
    refresh();const timer=setInterval(()=>{if(!document.hidden)refresh();},15000);
    window.addEventListener(catalogueChangedEvent,update);window.addEventListener('focus',onFocus);
    return()=>{active=false;generation.current++;clearInterval(timer);window.removeEventListener(catalogueChangedEvent,update);window.removeEventListener('focus',onFocus);};
  },[refresh]);
  return useMemo(()=>({snapshot:snapshotKey.current===key?snapshot:null,error,refresh}),[snapshot,error,refresh]);
}
