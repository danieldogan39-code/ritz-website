import{c as _}from"./chunk-5ATBSFFJ.js";import{d as a,u as i,v as m}from"./chunk-SGEVFZTX.js";var l=(n,e="0 0 30 20")=>`<svg class="flag" viewBox="${e}" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">${n}</svg>`,f={de:l('<path fill="#000" d="M0 0h30v6.7H0z"/><path fill="#dd0000" d="M0 6.7h30v6.6H0z"/><path fill="#ffce00" d="M0 13.3h30V20H0z"/>'),en:l('<path fill="#012169" d="M0 0h60v30H0z"/><path stroke="#fff" stroke-width="6" d="m0 0 60 30m0-30L0 30"/><path stroke="#c8102e" stroke-width="2" d="m0 0 60 30m0-30L0 30"/><path stroke="#fff" stroke-width="10" d="M30 0v30M0 15h60"/><path stroke="#c8102e" stroke-width="6" d="M30 0v30M0 15h60"/>',"0 0 60 30"),fr:l('<path fill="#0055a4" d="M0 0h10v20H0z"/><path fill="#fff" d="M10 0h10v20H10z"/><path fill="#ef4135" d="M20 0h10v20H20z"/>'),hu:l('<path fill="#cd2a3e" d="M0 0h30v6.7H0z"/><path fill="#fff" d="M0 6.7h30v6.6H0z"/><path fill="#436f4d" d="M0 13.3h30V20H0z"/>'),es:l('<path fill="#aa151b" d="M0 0h30v20H0z"/><path fill="#f1bf00" d="M0 5h30v10H0z"/>')};function q(n,e,r=""){let{t}=n,s=e.role?.[n.lang]||e.role?.en||e.role?.de||"";return`<article class="person">
  ${r?`<span class="person__kind">${a(r)}</span>`:""}
  <h3>${a(e.name)}</h3>
  ${s?`<p class="role">${a(s)}</p>`:""}
  <div class="lines">
    ${e.phone?`<a href="tel:${a(e.phone.replace(/[^\d+]/g,""))}">${i("phone")}<span>${m(e.phone)}</span></a>`:""}
    ${e.email?`<span class="line-mail"><a href="mailto:${a(e.email)}">${i("mail")}<span>${a(e.email)}</span></a><button class="copy" type="button" data-copy="${a(e.email)}" aria-label="${a(t.ui.copy)}: ${a(e.email)}">${i("copy",'width="15" height="15"')}</button></span>`:""}
  </div>
</article>`}function Z(n,e){let{t:r,lang:t}=n,s=_(e,t,n.dl),o={de:"DE",en:"EN","de+en":"DE/EN",fr:"FR",es:"ES",hu:"HU"}[e.lang]||"",c=e.tl&&e.tl[t]?t:e.title.de===s&&e.title.en===s?/^(de|en|fr|es|hu)$/.test(e.lang||"")?e.lang:t:e.title.de===s?"de":e.title.en===s?"en":t,p=e.size?n.fmtBytes(e.size):"",d=!!n.docHref(e),u=r.downloads.req;return`<a class="doc${d?"":" doc--req"}" ${n.docAttrs(e)} data-doc-id="${e.id}">
  <span class="doc__icon" aria-hidden="true">${a((e.ext||"pdf").toUpperCase())}</span>
  <span><span class="doc__title"${c!==t?` lang="${c}"`:""}>${a(s)}</span><span class="doc__meta"><span>${a(r.lbl.docTypeOne[e.type]||"")}</span>${d?p?`<span>${a(p)}</span>`:"":`<span>${a(u.onRequest)}</span>`}</span></span>
  ${o?`<span class="doc__lang" title="${a(o)}">${a(o)}</span>`:"<span></span>"}
  <span class="doc__go">${d?`${i("download")}<span class="vh">${a(r.ui.download)}</span>`:`${i("mail")}<span class="doc__req">${a(u.doc)}</span>`}</span>
</a>`}export{q as a,Z as b};
