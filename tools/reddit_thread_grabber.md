# Reddit Thread Grabber (bookmarklet)

Reddit blocks automated/server-side requests (HTTP 403), so the dev environment
**cannot** fetch threads directly. This bookmarklet runs in **your own logged-in
browser** instead — same origin as the Reddit page, so it uses your session and
isn't blocked. It scrapes the full thread (post + all nested comments) into clean
**Markdown**, downloads it as a `.md` file, and copies it to your clipboard.

## How to install

1. Make a new browser bookmark (any name, e.g. **"Grab Reddit"**).
2. Edit the bookmark's **URL** field and paste the whole `javascript:` line below
   (the minified one) as the address.
3. Save.

## How to use

1. Open the Reddit thread you want (the comments page) in your browser, logged in.
   Works on `www.reddit.com`, `old.reddit.com`, `new.reddit.com`.
2. Click the **Grab Reddit** bookmark.
3. It downloads `<threadid>.md` and copies the same text to your clipboard.
4. Hand it to me either way:
   - **Paste** the clipboard straight into chat (simplest), or
   - drop the downloaded `.md` into the repo (e.g. `research/`) and commit — then I
     read it directly.

## The bookmarklet (paste this as the bookmark URL)

```
javascript:(async()=>{try{var m=location.pathname.match(/\/comments\/[a-z0-9]+/i);if(!m){alert('Open a Reddit comment thread first.');return;}var u=location.origin+m[0]+'.json?limit=500&raw_json=1';var r=await fetch(u,{credentials:'include',headers:{Accept:'application/json'}});if(!r.ok){alert('Fetch failed: '+r.status);return;}var d=await r.json();var p=d[0].data.children[0].data;var md='# '+p.title+'\n\n**r/'+p.subreddit+'** · u/'+p.author+' · score '+p.score+' · '+new Date(p.created_utc*1000).toISOString().slice(0,10)+'\n\n<https://www.reddit.com'+p.permalink+'>\n\n';if(p.selftext)md+=p.selftext+'\n\n';md+='---\n\n## Comments\n\n';var walk=function(ch,dp){for(var i=0;i<ch.length;i++){var c=ch[i];if(c.kind!=='t1')continue;var x=c.data;var pad=Array(dp+1).join('  ');var body=(x.body||'').replace(/\n+/g,'\n'+pad+'  ');md+=pad+'- **u/'+x.author+'** ('+x.score+'): '+body+'\n';if(x.replies&&x.replies.data)walk(x.replies.data.children,dp+1);}};walk(d[1].data.children,0);var b=new Blob([md],{type:'text/markdown'});var a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=(p.id||'reddit')+'.md';a.click();try{await navigator.clipboard.writeText(md);}catch(e){}alert('Saved '+md.length+' chars. Downloaded + copied to clipboard.');}catch(e){alert('Error: '+e.message);}})();
```

## Readable source (same logic, for reference / editing)

```js
(async () => {
  try {
    const m = location.pathname.match(/\/comments\/[a-z0-9]+/i);
    if (!m) { alert('Open a Reddit comment thread first.'); return; }
    const url = location.origin + m[0] + '.json?limit=500&raw_json=1';
    const res = await fetch(url, { credentials: 'include', headers: { Accept: 'application/json' } });
    if (!res.ok) { alert('Fetch failed: ' + res.status); return; }
    const data = await res.json();
    const post = data[0].data.children[0].data;

    let md = `# ${post.title}\n\n`;
    md += `**r/${post.subreddit}** · u/${post.author} · score ${post.score} · ` +
          `${new Date(post.created_utc * 1000).toISOString().slice(0, 10)}\n\n`;
    md += `<https://www.reddit.com${post.permalink}>\n\n`;
    if (post.selftext) md += post.selftext + '\n\n';
    md += `---\n\n## Comments\n\n`;

    const walk = (children, depth) => {
      for (const c of children) {
        if (c.kind !== 't1') continue;            // skip "load more" stubs
        const d = c.data;
        const pad = '  '.repeat(depth);
        const body = (d.body || '').replace(/\n+/g, '\n' + pad + '  ');
        md += `${pad}- **u/${d.author}** (${d.score}): ${body}\n`;
        if (d.replies && d.replies.data) walk(d.replies.data.children, depth + 1);
      }
    };
    walk(data[1].data.children, 0);

    const blob = new Blob([md], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (post.id || 'reddit') + '.md';
    a.click();
    try { await navigator.clipboard.writeText(md); } catch (e) {}
    alert('Saved ' + md.length + ' chars. Downloaded + copied to clipboard.');
  } catch (e) { alert('Error: ' + e.message); }
})();
```

## Notes / limits

- Very large threads truncate at `limit=500` comments and Reddit's "load more"
  stubs are skipped (kind `more`). For the deep-dive threads you care about this
  is almost always enough; if you hit a giant thread, sort by **Top** first so the
  most useful comments are included.
- Markdown beats PDF here — it's clean text I read directly, no OCR, smaller, and
  preserves comment nesting. If you specifically need a PDF, just use the browser's
  **Print → Save as PDF** on the thread; but the `.md` from this tool is better for me.
- No API key, no OAuth, no Reddit app registration required — it rides your normal
  logged-in browser session.
