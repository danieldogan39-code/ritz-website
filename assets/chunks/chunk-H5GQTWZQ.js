import{c as e,t as l,u as p}from"./chunk-ZMUSUAK5.js";function q(s,a,i=""){let{t}=s,n=a.role?.[s.lang]||a.role?.en||a.role?.de||"";return`<article class="person">
  ${i?`<span class="person__kind">${e(i)}</span>`:""}
  <h3>${e(a.name)}</h3>
  ${n?`<p class="role">${e(n)}</p>`:""}
  <div class="lines">
    ${a.phone?`<a href="tel:${e(a.phone.replace(/[^\d+]/g,""))}">${l("phone")}<span>${p(a.phone)}</span></a>`:""}
    ${a.email?`<span class="line-mail"><a href="mailto:${e(a.email)}">${l("mail")}<span>${e(a.email)}</span></a><button class="copy" type="button" data-copy="${e(a.email)}" aria-label="${e(t.ui.copy)}: ${e(a.email)}">${l("copy",'width="15" height="15"')}</button></span>`:""}
  </div>
</article>`}function x(s,a){let{t:i,lang:t}=s,n=a.title[t]||a.title[s.dl]||a.title.de||a.title.en||a.file,r={de:"DE",en:"EN","de+en":"DE/EN",fr:"FR",es:"ES",hu:"HU"}[a.lang]||"",c=a.title.de===n&&a.title.en===n?/^(de|en|fr|es|hu)$/.test(a.lang||"")?a.lang:t:a.title.de===n?"de":a.title.en===n?"en":t,d=a.size?s.fmtBytes(a.size):"",o=!!s.docHref(a),$=i.downloads.req;return`<a class="doc${o?"":" doc--req"}" ${s.docAttrs(a)} data-doc-id="${a.id}">
  <span class="doc__icon" aria-hidden="true">${e((a.ext||"pdf").toUpperCase())}</span>
  <span><span class="doc__title"${c!==t?` lang="${c}"`:""}>${e(n)}</span><span class="doc__meta"><span>${e(i.lbl.docTypeOne[a.type]||"")}</span>${o?d?`<span>${e(d)}</span>`:"":`<span>${e($.onRequest)}</span>`}</span></span>
  ${r?`<span class="doc__lang" title="${e(r)}">${e(r)}</span>`:"<span></span>"}
  <span class="doc__go">${o?`${l("download")}<span class="vh">${e(i.ui.download)}</span>`:`${l("mail")}<span class="doc__req">${e($.doc)}</span>`}</span>
</a>`}export{q as a,x as b};
