import { useEffect, useMemo, useState } from 'react';
import { buildWebsiteHtml } from './site.js';
import {
  ArrowUpRight, Sparkles, WandSparkles, LayoutTemplate, FolderOpen, Settings2,
  Plus, ChevronDown, Monitor, Tablet, Smartphone, RefreshCw, Globe2, Code2,
  MessageSquareText, Layers3, Zap, Check, Menu, X, Copy, ExternalLink
} from 'lucide-react';

const templates = [
  { id: 'business', name: 'Business', type: 'COMPANY WEBSITE', color: 'violet', title: 'Make your next move matter.', desc: 'A clear vision. A sharper strategy. A business built for what comes next.', action: 'Let’s talk' },
  { id: 'portfolio', name: 'Portfolio', type: 'CREATIVE PORTFOLIO', color: 'orange', title: 'Ideas made visible.', desc: 'A curated collection of work, experiments, and things worth sharing.', action: 'Explore work' },
  { id: 'restaurant', name: 'Restaurant', type: 'DINING EXPERIENCE', color: 'rose', title: 'A seat at something special.', desc: 'Seasonal ingredients, thoughtful plates, and evenings to remember.', action: 'View menu' },
  { id: 'saas', name: 'SaaS product', type: 'SOFTWARE PLATFORM', color: 'blue', title: 'Work smarter. Move faster.', desc: 'Everything your team needs to turn ambitious plans into real progress.', action: 'Get started' },
  { id: 'store', name: 'Online store', type: 'CURATED COLLECTION', color: 'mint', title: 'Find your everyday essential.', desc: 'Considered design, quality materials, and details that make a difference.', action: 'Shop collection' },
];

function makeSite(prompt, selected) {
  const lower = prompt.toLowerCase();
  let chosen = selected;
  if (/restaurant|cafe|coffee|food|menu/.test(lower)) chosen = 'restaurant';
  else if (/portfolio|photographer|designer|artist/.test(lower)) chosen = 'portfolio';
  else if (/shop|store|product|ecommerce/.test(lower)) chosen = 'store';
  else if (/saas|software|app|platform/.test(lower)) chosen = 'saas';
  return templates.find(t => t.id === chosen) || templates[0];
}

function PreviewSite({ site }) { return <div className="site-preview"><iframe title="Generated website preview" sandbox="allow-scripts allow-forms" srcDoc={buildWebsiteHtml(site)} /></div>; }

export default function App() {
  const [prompt, setPrompt] = useState('');
  const [activeTemplate, setActiveTemplate] = useState('business');
  const [generated, setGenerated] = useState(false);
  const [generatedSite, setGeneratedSite] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState('');
  const [site, setSite] = useState(templates[0]);
  const [device, setDevice] = useState('desktop');
  const [activeTab, setActiveTab] = useState('preview');
  const [mobileMenu, setMobileMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [projectName, setProjectName] = useState('Untitled project');
  const [editPrompt, setEditPrompt] = useState('');
  const [projects, setProjects] = useState([]);
  const [lastSaved, setLastSaved] = useState('Not saved yet');
  const html = useMemo(() => generatedSite ? buildWebsiteHtml(generatedSite) : '', [generatedSite]);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('website-genius-projects') || '[]');
      if (Array.isArray(saved)) setProjects(saved.slice(0, 12));
    } catch { setProjects([]); }
  }, []);

  const canGenerate = prompt.trim().length > 0;
  const generate = async (mode = 'generate') => {
    const instruction = mode === 'edit' ? editPrompt.trim() : prompt.trim();
    if (!instruction || isGenerating) return;
    setIsGenerating(true);
    setGenerationError('');
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: instruction, template: activeTemplate, mode, existingWebsite: mode === 'edit' ? generatedSite : undefined })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Website generation failed. Please try again.');
      if (!data.website?.headline || !Array.isArray(data.website.sections)) throw new Error('AI returned an incomplete website. Please try a clearer instruction.');
      setGeneratedSite(data.website);
      setSite(makeSite(prompt, activeTemplate));
      if (mode === 'generate') setProjectName((data.website.siteName || prompt).trim().slice(0, 28));
      setGenerated(true);
      setActiveTab('preview');
      setLastSaved('Unsaved changes');
      if (mode === 'edit') setEditPrompt('');
    } catch (error) {
      setGenerationError(error.message || 'Something went wrong. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };
  const downloadHtml = () => {
    if (!html) return;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = (projectName || 'website').toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.html';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };
  const saveProject = () => {
    if (!generatedSite) return;
    const entry = { id: Date.now(), name: projectName, prompt, template: activeTemplate, site: generatedSite };
    const next = [entry, ...projects.filter(project => project.name !== projectName)].slice(0, 12);
    setProjects(next);
    try { localStorage.setItem('website-genius-projects', JSON.stringify(next)); } catch {}
    setLastSaved('Saved locally');
  };
  const openProject = project => {
    setGeneratedSite(project.site);
    setPrompt(project.prompt || '');
    setActiveTemplate(project.template || 'business');
    setProjectName(project.name);
    setGenerated(true);
    setLastSaved('Loaded from this browser');
    setActiveTab('preview');
    setMobileMenu(false);
  };
  const examples = ['A modern architecture studio', 'A landing page for a fitness app', 'A minimal coffee shop website'];

  return <div className="app-shell">
    <aside className={`sidebar ${mobileMenu ? 'sidebar-open' : ''}`}>
      <div className="brand-lockup"><div className="brand-symbol"><Sparkles size={18}/></div><span>website<span className="brand-light">genius</span></span><button className="mobile-close" onClick={() => setMobileMenu(false)}><X size={18}/></button></div>
      <button className="new-project" onClick={() => {setPrompt('');setGenerated(false);setGeneratedSite(null);setGenerationError('');setProjectName('Untitled project');setMobileMenu(false);}}><Plus size={16}/> New project <span>⌘ K</span></button>
      <div className="side-label">WORKSPACE</div>
      <button className="side-link active"><Layers3 size={16}/> Website builder</button>
      <button className="side-link" onClick={() => document.getElementById("recent-projects")?.scrollIntoView({behavior:"smooth"})}><FolderOpen size={16}/> My projects <span className="side-count">{projects.length}</span></button>
      <button className="side-link" onClick={() => document.getElementById("template-library")?.scrollIntoView({behavior:"smooth"})}><LayoutTemplate size={16}/> Templates</button>
      <div className="side-label recent-label" id="recent-projects">RECENT PROJECTS</div>
      {projects.length ? projects.slice(0,5).map(project => <button className="recent-project" key={project.id} onClick={() => openProject(project)}><span className="recent-dot"></span><span>{project.name}</span></button>) : <div className="no-projects">Saved projects will appear here.</div>}
      <div className="sidebar-bottom"><div className="plan-card"><div className="plan-icon"><Zap size={15}/></div><div><strong>Free workspace</strong><span>Gemini AI builder</span></div></div><button className="side-link" onClick={() => alert("Settings: Gemini API key is configured in Vercel. Projects are stored in this browser.")}><Settings2 size={16}/> Settings</button><div className="profile-row"><div className="avatar">U</div><div><strong>Umer</strong><span>Personal workspace</span></div><ChevronDown size={15}/></div></div>
    </aside>

    <main className="main-area">
      <header className="topbar"><div className="top-left"><button className="hamburger" onClick={() => setMobileMenu(!mobileMenu)}><Menu size={19}/></button><span className="crumb-muted">Workspace</span><span className="crumb-slash">/</span><span className="crumb-current">Website builder</span><span className="beta-pill">BETA</span></div><div className="top-right"><span className="saved-state"><span></span> All changes saved</span><button className="help-btn" onClick={() => alert("Describe your website, choose a template, then click Generate website. Refine it with AI and export HTML.")}>Help center <ArrowUpRight size={13}/></button><div className="avatar top-avatar">U</div></div></header>
      <div className="workspace">
        <section className="builder-panel">
          <div className="welcome-block"><div className="eyebrow"><span className="eyebrow-line"></span> YOUR CREATIVE WORKSPACE</div><h1>Your idea.<br/><span>A complete website.</span></h1><p>Describe what you imagine. Watch it take shape. No code, no complicated setup — just your next big idea.</p></div>
          <div className="prompt-card"><div className="prompt-top"><div className="prompt-label"><WandSparkles size={15}/> WHAT ARE WE CREATING TODAY?</div><span className="prompt-shortcut">AI BUILDER</span></div><textarea maxLength={50000} value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Describe the website you want to build...&#10;&#10;Example: A premium portfolio website for a photographer with a dark editorial style." rows={4}/><div className="prompt-footer"><span className="prompt-hint"><Sparkles size={13}/> Be as detailed as you like · {prompt.length.toLocaleString()} / 50,000</span><button className="generate-btn" disabled={!canGenerate || isGenerating} onClick={() => generate('generate')}>{isGenerating ? 'Creating your website…' : 'Generate website'} <ArrowUpRight size={16}/></button></div></div>
          {generationError && <div className="generation-error" role="alert">{generationError}</div>}
          <div className="examples-row"><span>TRY AN IDEA</span>{examples.map(x => <button key={x} onClick={() => setPrompt(x)}>{x}</button>)}</div>
          <div className="template-heading" id="template-library"><div><span className="section-kicker">A HEAD START</span><h2>Start with a direction</h2></div><button className="view-all" onClick={() => document.getElementById("template-library")?.scrollIntoView({behavior:"smooth"})}>Explore all <ArrowUpRight size={14}/></button></div>
          <div className="template-grid">{templates.map((t,i) => <button key={t.id} className={`template-card ${activeTemplate===t.id?'selected':''}`} onClick={() => setActiveTemplate(t.id)}><div className={`template-art art-${t.color}`}><div className="art-window"><div className="art-topline"><i></i><i></i><i></i></div><div className="art-lines"><b></b><b></b><b></b></div><div className="art-shape"></div></div><span className="template-number">0{i+1}</span></div><div className="template-meta"><strong>{t.name}</strong>{activeTemplate===t.id?<span className="selected-check"><Check size={12}/></span>:<ArrowUpRight size={13}/>}</div></button>)}</div>
          <div className="bottom-note"><span className="note-spark">✳</span> Your workspace is ready when inspiration strikes.</div>
        </section>

        <section className="preview-panel">
          <div className="preview-header"><div><span className="section-kicker">LIVE CANVAS</span><div className="preview-title">{generated ? projectName : 'Your preview'} <span className="unsaved-dot"></span></div></div><div className="preview-actions"><button className={device==='desktop'?'device-active':''} onClick={() => setDevice('desktop')} title="Desktop"><Monitor size={15}/></button><button className={device==='tablet'?'device-active':''} onClick={() => setDevice('tablet')} title="Tablet"><Tablet size={15}/></button><button className={device==='mobile'?'device-active':''} onClick={() => setDevice('mobile')} title="Mobile"><Smartphone size={15}/></button><span className="action-divider"></span><button title="Refresh preview" onClick={() => setActiveTab('preview')}><RefreshCw size={14}/></button></div></div>
          <div className="preview-toolbar"><div className="preview-tabs"><button className={activeTab==='preview'?'tab-active':''} onClick={() => setActiveTab('preview')}><Globe2 size={13}/> Preview</button><button className={activeTab==='code'?'tab-active':''} onClick={() => setActiveTab('code')}><Code2 size={13}/> Code</button></div><div className="preview-url"><span className="url-lock">⌑</span> preview.websitegenius.app <Copy size={12}/></div><button className="open-preview" title="Open generated website" disabled={!generatedSite} onClick={() => { if (html) { const url = URL.createObjectURL(new Blob([html], {type:"text/html"})); window.open(url, "_blank", "noopener,noreferrer"); setTimeout(() => URL.revokeObjectURL(url), 60000); } }}><ExternalLink size={14}/></button></div>
          <div className="canvas-wrap"><div className={`canvas-device device-${device}`}>{activeTab==='preview' ? (generated ? <PreviewSite site={generatedSite}/> : <div className="empty-preview"><div className="empty-visual"><div className="empty-window"><div className="empty-window-top"><i></i><i></i><i></i></div><div className="empty-window-content"><span></span><b></b><b></b><div></div></div></div><div className="empty-spark spark-a">✳</div><div className="empty-spark spark-b">✧</div></div><h3>Your canvas is waiting.</h3><p>Describe your idea and hit <strong>Generate website</strong><br/>to bring your first concept to life.</p><span className="empty-tag"><span></span> READY TO CREATE</span></div>) : <div className="code-placeholder"><Code2 size={28}/><h3>Code view</h3><p>{generatedSite ? 'AI-generated site structure' : 'Generate a website to see its structure here.'}</p><pre>{generatedSite ? html : '<Generate a website to see HTML here />'}</pre></div>}</div></div>
          <div className="preview-footer"><span><span className="footer-live"></span> {generatedSite?'AI GENERATED · HTML PREVIEW':'AWAITING INPUT'}</span><span>{device.toUpperCase()} VIEW <span className="footer-sep">·</span> RESPONSIVE</span></div>{generatedSite && <div className="save-export-row"><button onClick={saveProject}>Save project</button><button onClick={downloadHtml}>Download HTML</button></div>}
        </section>
      </div>
      <footer className="app-footer"><span>© 2026 WEBSITE GENIUS</span><span>BUILT FOR THE BOLD <span className="footer-star">✳</span></span><span className="demo-disclaimer">Gemini-powered generation · API key required</span></footer>
    </main>
    {mobileMenu && <button className="sidebar-backdrop" onClick={() => setMobileMenu(false)} aria-label="Close menu"/>}
  </div>;
}