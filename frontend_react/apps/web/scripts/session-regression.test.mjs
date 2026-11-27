import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import ts from 'typescript';
const root = new URL('../../../', import.meta.url);
const apiRequire=createRequire(new URL('packages/api/package.json',root));
const storeRequire=createRequire(new URL('packages/store/package.json',root));
const axios=apiRequire('axios');
const middleware=storeRequire('zustand/middleware');
function compile(path, dependencies, globals={}) {
 const source=fs.readFileSync(new URL(path,root),'utf8');
 const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const exports={};vm.runInNewContext(output,{exports,require:name=>dependencies[name],atob,...globals});return exports;
}
function fixture(saved) {
 const map=new Map(saved?[['eventmind-auth',JSON.stringify({state:saved,version:0})]]:[]);
 const storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
 const store=compile('packages/store/src/auth-store.ts',{'zustand':storeRequire('zustand'),'zustand/middleware':{persist:(fn,opts)=>middleware.persist(fn,{...opts,storage:middleware.createJSONStorage(()=>storage)})}}).useAuthStore;
 const api=compile('packages/api/src/client.ts',{axios},{window:{},localStorage:storage});
 compile('apps/web/src/lib/api-config.ts',{'@eventmind/api':api,'@eventmind/store':{useAuthStore:store}},{process:{env:{NEXT_PUBLIC_API_URL:'/api'}}});
 return {store,api,storage};
}
const token=(exp=Date.now()/1000+3600)=>'header.'+Buffer.from(JSON.stringify({sub:'test-user',exp})).toString('base64url')+'.signature';
const saved=t=>({userEmail:'tester@example.org',tokens:{access_token:t,refresh_token:'test-refresh',token_type:'bearer'},isAuthenticated:true});
function reject(status) {return config=>Promise.reject(new axios.AxiosError('test rejection','ERR_BAD_RESPONSE',config,{}, {status,data:{detail:'Valid access token required'},headers:{},config}));}
test('expired persisted session is cleared before protected pages hydrate',()=>{const {store}=fixture(saved(token(1)));assert.equal(store.getState().isAuthenticated,false);assert.equal(store.getState().sessionExpired,true);assert.equal(store.getState()._hasHydrated,true);});
test('valid persisted session survives reload',()=>{const {store}=fixture(saved(token()));assert.equal(store.getState().isAuthenticated,true);assert.equal(store.getState().sessionExpired,false);});
test('malformed token fails closed',()=>{const {store}=fixture(saved('broken'));assert.equal(store.getState().isAuthenticated,false);});
test('persisted signed-in flag without tokens cannot open protected pages',()=>{const {store}=fixture({...saved(null),tokens:null});assert.equal(store.getState().isAuthenticated,false);});
test('protected 401 clears the rejected session and keeps an expiry explanation',async()=>{const {store,api}=fixture(saved(token()));api.apiClient.defaults.adapter=reject(401);await assert.rejects(api.apiClient.get('/user/test-user/organizer'));assert.equal(store.getState().tokens,null);assert.equal(store.getState().sessionExpired,true);});
test('normal wrong-password response does not invalidate an existing session',async()=>{const {store,api}=fixture(saved(token()));api.apiClient.defaults.adapter=reject(401);await assert.rejects(api.apiClient.post('/auth/login',{}));assert.equal(store.getState().isAuthenticated,true);});
test('provider completion errors do not invalidate an existing session',async()=>{const {store,api}=fixture(saved(token()));api.apiClient.defaults.adapter=reject(401);await assert.rejects(api.apiClient.post('/auth/oauth/google/complete',{}));assert.equal(store.getState().isAuthenticated,true);});
test('permission denied (403) does not log the user out',async()=>{const {store,api}=fixture(saved(token()));api.apiClient.defaults.adapter=reject(403);await assert.rejects(api.apiClient.get('/user/another-user'));assert.equal(store.getState().isAuthenticated,true);});
test('a late old-session 401 cannot clear a newer sign-in',async()=>{const {store,api}=fixture(saved(token()));let rejectRequest;api.apiClient.defaults.adapter=config=>new Promise((resolve,reject)=>{rejectRequest=()=>reject(new axios.AxiosError('old request','ERR_BAD_RESPONSE',config,{}, {status:401,headers:{},config,data:{}}));});const request=api.apiClient.get('/auth/me');await new Promise(r=>setImmediate(r));const newer=token(Date.now()/1000+7200);store.getState().setAuth('new@example.org',{access_token:newer,refresh_token:'new-refresh',token_type:'bearer'});rejectRequest();await assert.rejects(request);assert.equal(store.getState().tokens.access_token,newer);});
test('damaged storage does not crash public API requests',async()=>{const {api,storage}=fixture();storage.setItem('eventmind-auth','not JSON');api.apiClient.defaults.adapter=config=>Promise.resolve({status:200,data:[],headers:{},config});assert.equal((await api.apiClient.get('/event/search')).status,200);});
test('successful sign-in removes the expiry explanation',()=>{const {store}=fixture(saved(token(1)));store.getState().setAuth('test@example.org',{access_token:token(),refresh_token:'refresh',token_type:'bearer'});assert.equal(store.getState().sessionExpired,false);assert.equal(store.getState().isAuthenticated,true);});
