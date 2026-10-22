import{c as u}from"./chunk-5ATBSFFJ.js";import{c as a,t as i,u as m}from"./chunk-HJ76BR4N.js";function G(n,e,r=""){let{t:s}=n,t=e.role?.[n.lang]||e.role?.en||e.role?.de||"";return`<article class="person">
  ${r?`<span class="person__kind">${a(r)}</span>`:""}
  <h3>${a(e.name)}</h3>
  ${t?`<p class="role">${a(t)}</p>`:""}
  <div class="lines">
    ${e.phone?`<a href="tel:${a(e.phone.replace(/[^\d+]/g,""))}">${i("phone")}<span>${m(e.phone)}</span></a>`:""}
    ${e.email?`<span class="line-mail"><a href="mailto:${a(e.email)}">${i("mail")}<span>${a(e.email)}</span></a><button class="copy" type="button" data-copy="${a(e.email)}" aria-label="${a(s.ui.copy)}: ${a(e.email)}">${i("copy",'width="15" height="15"')}</button></span>`:""}
  </div>
</article>`}function M(n,e){let{t:r,lang:s}=n,t=u(e,s,n.dl),l={de:"DE",en:"EN","de+en":"DE/EN",fr:"FR",es:"ES",hu:"HU"}[e.lang]||"",d=e.tl&&e.tl[s]?s:e.title.de===t&&e.title.en===t?/^(de|en|fr|es|hu)$/.test(e.lang||"")?e.lang:s:e.title.de===t?"de":e.title.en===t?"en":s,c=e.size?n.fmtBytes(e.size):"",o=!!n.docHref(e),p=r.downloads.req;return`<a class="doc${o?"":" doc--req"}" ${n.docAttrs(e)} data-doc-id="${e.id}">
  <span class="doc__icon" aria-hidden="true">${a((e.ext||"pdf").toUpperCase())}</span>
  <span><span class="doc__title"${d!==s?` lang="${d}"`:""}>${a(t)}</span><span class="doc__meta"><span>${a(r.lbl.docTypeOne[e.type]||"")}</span>${o?c?`<span>${a(c)}</span>`:"":`<span>${a(p.onRequest)}</span>`}</span></span>
  ${l?`<span class="doc__lang" title="${a(l)}">${a(l)}</span>`:"<span></span>"}
  <span class="doc__go">${o?`${i("download")}<span class="vh">${a(r.ui.download)}</span>`:`${i("mail")}<span class="doc__req">${a(p.doc)}</span>`}</span>
</a>`}export{G as a,M as b};
