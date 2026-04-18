// Blog Editor Tool Logic

document.addEventListener('DOMContentLoaded', () => {
  JoogadTools.renderHeader('../../');

  // DOM Elements
  const elTitle = document.getElementById('post-title');
  const elSlug = document.getElementById('post-slug');
  const elDesc = document.getElementById('post-desc');
  const elImage = document.getElementById('post-image');
  const elDate = document.getElementById('post-date');
  const elAuthor = document.getElementById('post-author');
  const elTags = document.getElementById('post-tags');
  const elContent = document.getElementById('post-content');
  const elPreview = document.getElementById('preview-output');

  // Set default date to today
  elDate.valueAsDate = new Date();

  // Tab switching
  const tabs = document.querySelectorAll('.tab-btn');
  const contents = document.querySelectorAll('.tab-content');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      contents.forEach(c => c.classList.remove('active'));
      
      tab.classList.add('active');
      document.getElementById('tab-' + tab.dataset.tab).classList.add('active');

      if(tab.dataset.tab === 'preview') {
        updatePreview();
      }
    });
  });

  // Auto Slug Generator
  document.getElementById('btn-auto-slug').addEventListener('click', () => {
    const title = elTitle.value;
    if(!title) return;
    elSlug.value = title.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  });

  // Markdown live preview
  function updatePreview() {
    const md = elContent.value;
    if (md.trim() === '') {
      elPreview.innerHTML = '<p class="text-muted">Preview will appear here...</p>';
    } else {
      elPreview.innerHTML = marked.parse(md);
    }
  }

  elContent.addEventListener('input', JoogadTools.debounce(updatePreview, 300));

  // Generate HTML logic
  document.getElementById('btn-generate').addEventListener('click', async () => {
    // 1. Validate
    if(!elTitle.value || !elSlug.value || !elContent.value) {
      JoogadTools.showToast("Title, Slug, and Content are required!", "error");
      return;
    }

    const title = elTitle.value;
    const slug = elSlug.value;
    const desc = elDesc.value || title;
    const image = elImage.value || 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=1000';
    const date = elDate.value;
    const author = elAuthor.value || 'JoogadTools Team';
    const tagsArr = elTags.value.split(',').map(s => s.trim()).filter(Boolean);
    const parsedHTML = marked.parse(elContent.value);
    
    // Schema SEO JSON
    const schemaJSON = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "headline": title,
      "image": [image],
      "datePublished": new Date(date).toISOString(),
      "author": [{
          "@type": "Organization",
          "name": author,
          "url": "https://joogadtools.online/about.html"
      }]
    };

    // 2. Build template
    // NOTE: Generating file intended for `/blog/` thus paths are `../` relative.
    const fullHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | JoogadTools Blog</title>
  <meta name="description" content="${desc}">
  
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='20' fill='%236C63FF'/><text x='50' y='68' font-size='55' font-weight='bold' fill='white' text-anchor='middle' font-family='sans-serif'>J</text></svg>">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  
  <link rel="stylesheet" href="https://joogadtools.online/css/style.css">
  <link rel="canonical" href="https://joogadtools.online/blog/${slug}.html">

  <script type="application/ld+json">
${JSON.stringify(schemaJSON, null, 2)}
  </script>

  <style>
    .article-header { padding: calc(var(--header-height) + 2rem) 1rem 3rem; text-align: center; max-width: 800px; margin: 0 auto; }
    .article-meta { color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; font-size: 0.85rem; margin-bottom: 1rem; }
    .article-title { font-size: 2.5rem; line-height: 1.2; margin-bottom: 1.5rem; background: var(--gradient-accent); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .header-image { width: 100%; max-width: 1000px; height: 400px; object-fit: cover; border-radius: var(--radius-lg); margin: 0 auto 3rem; display: block; box-shadow: var(--shadow-lg); }
    .article-content { max-width: 750px; margin: 0 auto 4rem; color: var(--text-primary); line-height: 1.8; font-size: 1.1rem; }
    /* Generic MD Styles inside content */
    .article-content h2, .article-content h3 { color: white; margin-top: 2.5rem; margin-bottom: 1rem; }
    .article-content p { margin-bottom: 1.2rem; }
    .article-content img { max-width: 100%; border-radius: var(--radius-base); margin: 1.5rem 0; }
    .article-content a { color: var(--accent-tertiary); text-decoration: none; border-bottom: 1px solid transparent; transition: 0.2s; }
    .article-content a:hover { border-bottom-color: var(--accent-tertiary); }
    .article-content ul, .article-content ol { padding-left: 2rem; margin-bottom: 1.5rem; }
    .article-content li { margin-bottom: 0.5rem; }
    .article-content blockquote { border-left: 4px solid var(--accent-primary); padding-left: 1.5rem; margin: 2rem 0; color: var(--text-secondary); font-style: italic; background: rgba(255,255,255,0.03); padding: 1rem 1.5rem; border-radius: 0 var(--radius-sm) var(--radius-sm) 0;}
    .article-content pre { background: rgba(0,0,0,0.5); padding: 1rem; border-radius: var(--radius-sm); overflow-x: auto; margin: 1.5rem 0; border: 1px solid var(--surface-glass-border); }
    .article-content code { font-family: 'JetBrains Mono', monospace; font-size: 0.9em; background: rgba(255,255,255,0.1); padding: 0.2em 0.4em; border-radius: 4px; }
    .article-content pre code { background: transparent; padding: 0; }
  </style>
</head>
<body>
  <main role="main">
    
    <article class="container">
      <header class="article-header">
        <div class="article-meta">
          <span>By ${author}</span> | 
          <time datetime="${date}">${new Date(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric'})}</time>
        </div>
        <h1 class="article-title">${title}</h1>
      </header>

      <img src="${image}" alt="${title}" class="header-image">

      <!-- Monetag Ad top of article -->
      <div class="ad-slot container" id="ad-top"></div>

      <div class="article-content">
${parsedHTML}
      </div>
    </article>

    <!-- Monetag Bottom Ad -->
    <div class="ad-slot container" id="ad-bottom"></div>

  </main>

  <script src="https://joogadtools.online/js/common.js"></script>
  <script>
    JoogadTools.renderHeader('https://joogadtools.online/');
    JoogadTools.renderFooter('https://joogadtools.online/');
  </script>
</body>
</html>`;

    // 3. Native File System API Automation
    try {
      if(!window.showDirectoryPicker) throw new Error("File System Access API not supported");
      
      const dirHandle = await window.showDirectoryPicker({
         id: 'joogadtools-root',
         mode: 'readwrite'
      });

      // Write HTML File
      const blogDirHandle = await dirHandle.getDirectoryHandle('blog', { create: true });
      const htmlFileHandle = await blogDirHandle.getFileHandle(`${slug}.html`, { create: true });
      const htmlWritable = await htmlFileHandle.createWritable();
      await htmlWritable.write(fullHTML);
      await htmlWritable.close();

      // Read & Update blog-data.js
      const jsDirHandle = await dirHandle.getDirectoryHandle('js');
      const jsFileHandle = await jsDirHandle.getFileHandle('blog-data.js');
      const jsFile = await jsFileHandle.getFile();
      let jsContent = await jsFile.text();

      const jsonSnippet = `{
    title: "${title.replace(/"/g, '\\"')}",
    slug: "${slug}",
    description: "${desc.replace(/"/g, '\\"')}",
    date: "${date}",
    image: "${image}",
    tags: ${JSON.stringify(tagsArr)},
    author: "${author}"
  }`;

      if (jsContent.includes(jsonSnippet)) {
         JoogadTools.showToast("Post already exists in data!", "warning");
      } else {
         // Insert at the beginning of the array
         jsContent = jsContent.replace('const blogPosts = [', `const blogPosts = [\n  ${jsonSnippet},`);
         const jsWritable = await jsFileHandle.createWritable();
         await jsWritable.write(jsContent);
         await jsWritable.close();
      }

      JoogadTools.showToast(`Post saved successfully!`, "success");

    } catch (err) {
      console.warn("File System write failed or aborted. Falling back to manual download.", err);
      // Fallback: Download manually
      JoogadTools.downloadFile(fullHTML, `${slug}.html`, 'text/html');

      // Generate JSON Snippet for fallback modal
      const jsonSnippet = `{
  title: "${title.replace(/"/g, '\\"')}",
  slug: "${slug}",
  description: "${desc.replace(/"/g, '\\"')}",
  date: "${date}",
  image: "${image}",
  tags: ${JSON.stringify(tagsArr)},
  author: "${author}"
}`;
      document.getElementById('snippet-code').value = jsonSnippet;
      document.getElementById('snippet-modal').classList.remove('hidden');
    }

  });

  // Modal handlers
  document.getElementById('btn-close-modal').addEventListener('click', () => {
    document.getElementById('snippet-modal').classList.add('hidden');
  });

  document.getElementById('btn-copy-snippet').addEventListener('click', () => {
    const code = document.getElementById('snippet-code').value;
    JoogadTools.copyToClipboard(code);
  });

});
