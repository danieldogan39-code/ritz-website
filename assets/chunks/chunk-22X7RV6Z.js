import{a as e,j as r,k as d}from"./chunk-JRCZNLSK.js";function y(n,a,t=""){let{t:i}=n,s=a.role?.[n.lang]||a.role?.en||a.role?.de||"";return`<article class="person">
  ${t?`<span class="person__kind">${e(t)}</span>`:""}
  <h3>${e(a.name)}</h3>
  ${s?`<p class="role">${e(s)}</p>`:""}
  <div class="lines">
    ${a.phone?`<a href="tel:${e(a.phone.replace(/[^\d+]/g,""))}">${r("phone")}<span>${d(a.phone)}</span></a>`:""}
    ${a.email?`<span class="line-mail"><a href="mailto:${e(a.email)}">${r("mail")}<span>${e(a.email)}</span></a><button class="copy" type="button" data-copy="${e(a.email)}" aria-label="${e(i.ui.copy)}: ${e(a.email)}">${r("copy",'width="15" height="15"')}</button></span>`:""}
  </div>
</article>`}function k(n,a){let{t,lang:i}=n,s=a.title[i]||a.title[n.dl]||a.title.de||a.title.en||a.file,l={de:"DE",en:"EN","de+en":"DE/EN",fr:"FR",es:"ES",hu:"HU"}[a.lang]||"",o=a.title.de===s&&a.title.en===s?/^(de|en|fr|es|hu)$/.test(a.lang||"")?a.lang:i:a.title.de===s?"de":a.title.en===s?"en":i,c=a.size?n.fmtBytes(a.size):"";return`<a class="doc" href="${n.docHref(a)}" target="_blank" rel="noopener" data-doc-id="${a.id}">
  <span class="doc__icon" aria-hidden="true">${e((a.ext||"pdf").toUpperCase())}</span>
  <span><span class="doc__title"${o!==i?` lang="${o}"`:""}>${e(s)}</span><span class="doc__meta"><span>${e(t.lbl.docTypeOne[a.type]||"")}</span>${c?`<span>${e(c)}</span>`:""}</span></span>
  ${l?`<span class="doc__lang" title="${e(l)}">${e(l)}</span>`:"<span></span>"}
  <span class="doc__go">${r("download")}<span class="vh">${e(t.ui.download)}</span></span>
</a>`}export{y as a,k as b};
