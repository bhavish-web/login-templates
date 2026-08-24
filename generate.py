\
# -*- coding: utf-8 -*-
"""
Generates 50 self-contained login form HTML files:
10 layout concepts x 5 palette/type systems.
Each file is fully standalone (inline CSS + tiny JS), no external deps
besides Google Fonts.
"""
import json, os
from string import Template

OUT = "forms"
os.makedirs(OUT, exist_ok=True)

# ---------------------------------------------------------------
# PALETTES  (each is a full visual system: color + type + radius)
# ---------------------------------------------------------------
PALETTES = {
    "amber-terminal": dict(
        label="Terminal Amber",
        bg="#0a0d0f", surface="#10151a", surface2="#151b21", border="#1f2830",
        text="#d7dde2", textDim="#6b7680", accent="#e8a33d", accentDim="#8a6a35",
        accentInk="#1a1206", radius="3px",
        fontDisplay="'IBM Plex Mono', monospace", fontBody="'Inter', sans-serif",
        gfonts="IBM+Plex+Mono:wght@400;500;600;700&family=Inter:wght@400;500;600",
    ),
    "cloud-indigo": dict(
        label="Cloud Indigo",
        bg="#ffffff", surface="#f7f8fb", surface2="#eef0f7", border="#e2e5ee",
        text="#20242c", textDim="#7a8091", accent="#4f5fea", accentDim="#c3c8f7",
        accentInk="#ffffff", radius="12px",
        fontDisplay="'Sora', sans-serif", fontBody="'Inter', sans-serif",
        gfonts="Sora:wght@500;600;700&family=Inter:wght@400;500;600",
    ),
    "glass-violet": dict(
        label="Glass Violet",
        bg="#160f26", surface="rgba(255,255,255,0.06)", surface2="rgba(255,255,255,0.03)",
        border="rgba(255,255,255,0.14)",
        text="#ede9fb", textDim="#a89fc9", accent="#7ce7c4", accentDim="#4a7f6c",
        accentInk="#0c1f19", radius="18px",
        fontDisplay="'Space Grotesk', sans-serif", fontBody="'Inter', sans-serif",
        gfonts="Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600",
    ),
    "blush-editorial": dict(
        label="Blush Editorial",
        bg="#f7eeea", surface="#fffdfc", surface2="#f1e4de", border="#e4d2c9",
        text="#2b2320", textDim="#8a7a72", accent="#c1512f", accentDim="#e3c3b6",
        accentInk="#fff8f5", radius="2px",
        fontDisplay="'Fraunces', serif", fontBody="'Inter', sans-serif",
        gfonts="Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500;600",
    ),
    "brutalist-yellow": dict(
        label="Brutalist Yellow",
        bg="#fff8dc", surface="#ffffff", surface2="#ffe94d", border="#111111",
        text="#111111", textDim="#4a4a4a", accent="#111111", accentDim="#ffe94d",
        accentInk="#ffe94d", radius="0px",
        fontDisplay="'Archivo Black', sans-serif", fontBody="'IBM Plex Mono', monospace",
        gfonts="Archivo+Black&family=IBM+Plex+Mono:wght@400;500;600",
    ),
}

# ---------------------------------------------------------------
# BASE CSS KIT — shared reset + form-field styling, driven by
# CSS custom properties so every layout/palette combo reuses it.
# ---------------------------------------------------------------
BASE_CSS = Template("""
:root{
  --bg:$bg; --surface:$surface; --surface2:$surface2; --border:$border;
  --text:$text; --text-dim:$textDim; --accent:$accent; --accent-dim:$accentDim;
  --accent-ink:$accentInk; --radius:$radius;
  --font-display:$fontDisplay; --font-body:$fontBody;
}
*{box-sizing:border-box;margin:0;padding:0;}
html,body{min-height:100%;}
body{
  background:var(--bg); color:var(--text); font-family:var(--font-body);
  -webkit-font-smoothing:antialiased;
}
a{color:inherit;}
.field{margin-bottom:18px;}
.field label{
  display:flex;justify-content:space-between;align-items:baseline;
  font-family:var(--font-display); font-size:11.5px; letter-spacing:.06em;
  color:var(--text-dim); margin-bottom:8px; text-transform:uppercase;
}
.field label .req{color:var(--accent);}
.field input{
  width:100%; background:var(--surface2); border:1.5px solid var(--border);
  color:var(--text); font-family:var(--font-body); font-size:14.5px;
  padding:12px 14px; border-radius:var(--radius); outline:none;
  transition:border-color .15s ease, box-shadow .15s ease, background .15s ease;
}
.field input::placeholder{color:var(--text-dim); opacity:.6;}
.field input:focus{border-color:var(--accent); box-shadow:0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent);}
.row-between{
  display:flex;justify-content:space-between;align-items:center;
  font-size:12.5px;color:var(--text-dim); margin:-4px 0 24px;
}
.row-between a{border-bottom:1px dotted var(--text-dim); text-decoration:none;}
.row-between a:hover{color:var(--accent); border-color:var(--accent);}
.checkbox{display:flex;align-items:center;gap:8px;}
.checkbox input{accent-color:var(--accent); width:14px;height:14px;}
button.submit{
  width:100%; background:var(--accent); color:var(--accent-ink); border:1.5px solid var(--accent);
  font-family:var(--font-display); font-weight:600; font-size:13.5px; letter-spacing:.03em;
  padding:13px; border-radius:var(--radius); cursor:pointer;
  display:flex; align-items:center; justify-content:center; gap:8px;
  transition:filter .15s ease, transform .1s ease;
  text-transform:uppercase;
}
button.submit:hover{filter:brightness(1.08);}
button.submit:active{transform:scale(.99);}
button.submit svg{width:14px;height:14px;flex:none;}
button.ghost{
  width:100%; background:transparent; color:var(--text); border:1.5px solid var(--border);
  font-family:var(--font-body); font-weight:500; font-size:13.5px;
  padding:12px; border-radius:var(--radius); cursor:pointer; margin-top:10px;
}
button.ghost:hover{border-color:var(--accent); color:var(--accent);}
.divider{
  display:flex;align-items:center;gap:14px;margin:24px 0;
  color:var(--text-dim); font-family:var(--font-display); font-size:10.5px; letter-spacing:.1em;
}
.divider::before,.divider::after{content:"";flex:1;height:1px;background:var(--border);}
.footer-note{text-align:center;font-size:12.5px;color:var(--text-dim);}
.footer-note a{color:var(--accent);text-decoration:none;font-weight:600;}
.footer-note a:hover{text-decoration:underline;}
:focus-visible{outline:2px solid var(--accent); outline-offset:2px;}
""")

ARROW_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'

def form_standard(cta="Sign In", email_label="EMAIL", pass_label="PASSWORD"):
    return f"""
    <form onsubmit="return false;">
      <div class="field"><label>{email_label} <span class="req">*</span></label>
        <input type="email" placeholder="you@company.com" required /></div>
      <div class="field"><label>{pass_label} <span class="req">*</span></label>
        <input type="password" placeholder="••••••••••••" required /></div>
      <div class="row-between">
        <label class="checkbox"><input type="checkbox" /> Remember me</label>
        <a href="#">Forgot password?</a>
      </div>
      <button class="submit" type="submit">{cta} {ARROW_ICON}</button>
      <div class="divider">OR CONTINUE WITH</div>
      <button class="ghost" type="button">Continue with Google</button>
    </form>
    <p class="footer-note" style="margin-top:20px;">New here? <a href="#">Create an account</a></p>
    """

def form_floating(cta="Sign In"):
    return f"""
    <form onsubmit="return false;">
      <div class="field" style="position:relative;">
        <label style="position:absolute; top:-8px; left:12px; background:var(--surface); padding:0 6px;">EMAIL</label>
        <input type="email" placeholder="you@company.com" required style="margin-top:6px;" /></div>
      <div class="field" style="position:relative;">
        <label style="position:absolute; top:-8px; left:12px; background:var(--surface); padding:0 6px;">PASSWORD</label>
        <input type="password" placeholder="••••••••••••" required style="margin-top:6px;" /></div>
      <div class="row-between">
        <label class="checkbox"><input type="checkbox" /> Remember me</label>
        <a href="#">Forgot password?</a>
      </div>
      <button class="submit" type="submit">{cta} {ARROW_ICON}</button>
    </form>
    <p class="footer-note" style="margin-top:20px;">New here? <a href="#">Create an account</a></p>
    """

def form_underline(cta="Sign In"):
    return f"""
    <form onsubmit="return false;">
      <div class="field"><label>EMAIL</label>
        <input type="email" placeholder="you@company.com" required
          style="background:transparent;border:none;border-bottom:1.5px solid var(--border);border-radius:0;padding-left:0;"/></div>
      <div class="field"><label>PASSWORD</label>
        <input type="password" placeholder="••••••••••••" required
          style="background:transparent;border:none;border-bottom:1.5px solid var(--border);border-radius:0;padding-left:0;"/></div>
      <div class="row-between">
        <label class="checkbox"><input type="checkbox" /> Remember me</label>
        <a href="#">Forgot password?</a>
      </div>
      <button class="submit" type="submit" style="border-radius:0;">{cta} {ARROW_ICON}</button>
    </form>
    <p class="footer-note" style="margin-top:20px;">New here? <a href="#">Create an account</a></p>
    """

# ---------------------------------------------------------------
# LAYOUTS — each returns (extra_css, body_html, title, blurb)
# ---------------------------------------------------------------
def layout_split_console(p, form):
    css = """
    body{display:grid; grid-template-columns:1.05fr 1fr; min-height:100vh;}
    .console{background:var(--surface); border-right:1px solid var(--border);
      padding:44px 46px; display:flex; flex-direction:column; justify-content:space-between;}
    .brand{font-family:var(--font-display); font-size:12.5px; letter-spacing:.14em; color:var(--accent);
      display:flex; align-items:center; gap:9px;}
    .brand .dot{width:7px;height:7px;border-radius:50%;background:var(--accent);box-shadow:0 0 8px var(--accent);}
    .log{font-family:var(--font-display); font-size:13px; line-height:1.9; color:var(--text-dim); max-width:440px;}
    .log .ok{color:#6fae7e;} .log .warn{color:var(--accent);}
    .cursor{display:inline-block;width:7px;height:14px;background:var(--accent);margin-left:2px;vertical-align:-2px;animation:blink 1s steps(1) infinite;}
    @keyframes blink{50%{opacity:0;}}
    .status-row{font-family:var(--font-display); font-size:11px; color:var(--text-dim); letter-spacing:.05em;
      display:flex; justify-content:space-between; border-top:1px solid var(--border); padding-top:16px;}
    .status-row b{color:var(--text); font-weight:500;}
    .form-side{display:flex;align-items:center;justify-content:center;padding:40px;}
    .panel{width:100%;max-width:380px;}
    .panel h1{font-family:var(--font-display); font-size:20px; font-weight:600; margin-bottom:6px;}
    .panel .sub{font-size:13.5px; color:var(--text-dim); margin-bottom:30px;}
    @media(max-width:820px){body{grid-template-columns:1fr;} .console{display:none;}}
    """
    body = """
    <div class="console">
      <div class="brand"><span class="dot"></span>NODE // ACCESS</div>
      <div class="log" id="log"></div>
      <div class="status-row"><span>REGION <b>ap-south-1</b></span><span>LATENCY <b>18ms</b></span><span>TLS <b>1.3</b></span></div>
    </div>
    <div class="form-side"><div class="panel">
      <h1>Sign in to continue</h1><div class="sub">Authenticate to access your workspace.</div>
      @@FORM@@
    </div></div>
    <script>
    const lines=[["> initializing secure channel","ok"],["> resolving node cluster",null],["  cluster-07.internal",null],["> handshake accepted","ok"],["> awaiting credentials","warn"]];
    const el=document.getElementById('log'); let li=0;
    function typeLine(){ if(li>=lines.length){const c=document.createElement('div');c.innerHTML='<span class="cursor"></span>';el.appendChild(c);return;}
      const [t,cls]=lines[li]; const d=document.createElement('div'); el.appendChild(d); let ci=0;
      (function tc(){ if(ci<=t.length){ d.textContent=t.slice(0,ci); if(cls)d.className=cls; ci++; setTimeout(tc,14);} else { li++; setTimeout(typeLine,150);} })();
    }
    typeLine();
    </script>
    """.replace("@@FORM@@", form)
    return css, body, "Console Split", "Boot-log animation authenticates you into a dev node."

def layout_minimal_centered(p, form):
    css = """
    body{display:flex; align-items:center; justify-content:center; min-height:100vh; padding:40px;}
    .card{width:100%; max-width:380px; border:1.5px solid var(--border); border-radius:var(--radius); padding:44px 38px; background:var(--surface);}
    .mark{width:34px;height:34px;border-radius:8px;background:var(--accent);margin-bottom:22px;}
    h1{font-family:var(--font-display); font-size:22px; margin-bottom:6px;}
    .sub{font-size:13.5px; color:var(--text-dim); margin-bottom:30px;}
    """
    body = f"""
    <div class="card">
      <div class="mark"></div>
      <h1>Welcome back</h1><div class="sub">Enter your details to sign in.</div>
      {form}
    </div>
    """
    return css, body, "Minimal Centered", "Quiet, restrained card with generous whitespace."

def layout_glass_gradient(p, form):
    css = """
    body{
      min-height:100vh; display:flex; align-items:center; justify-content:center; padding:40px;
      background:
        radial-gradient(circle at 15% 20%, rgba(124,231,196,0.25), transparent 40%),
        radial-gradient(circle at 85% 80%, rgba(124,120,231,0.28), transparent 45%),
        var(--bg);
    }
    .card{
      width:100%; max-width:400px; padding:42px 36px; border-radius:var(--radius);
      background:var(--surface); border:1px solid var(--border);
      backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px);
      box-shadow:0 20px 60px rgba(0,0,0,0.35);
    }
    h1{font-family:var(--font-display); font-size:23px; margin-bottom:6px;}
    .sub{font-size:13.5px; color:var(--text-dim); margin-bottom:30px;}
    """
    body = f"""
    <div class="card">
      <h1>Sign in</h1><div class="sub">Your session floats free — glass, not walls.</div>
      {form}
    </div>
    """
    return css, body, "Glass Gradient", "Frosted card afloat on a soft gradient mesh."

def layout_split_illustration(p, form):
    css = """
    body{display:grid; grid-template-columns:1fr 1fr; min-height:100vh;}
    .illus{background:var(--surface2); position:relative; overflow:hidden; display:flex; align-items:center; justify-content:center;}
    .illus svg{width:70%; max-width:380px;}
    .form-side{display:flex; align-items:center; justify-content:center; padding:40px;}
    .panel{width:100%; max-width:380px;}
    h1{font-family:var(--font-display); font-size:23px; margin-bottom:6px;}
    .sub{font-size:13.5px; color:var(--text-dim); margin-bottom:30px;}
    @media(max-width:820px){body{grid-template-columns:1fr;} .illus{display:none;}}
    """
    body = f"""
    <div class="illus">
      <svg viewBox="0 0 200 200"><circle cx="100" cy="80" r="60" fill="var(--accent)" opacity="0.85"/>
      <rect x="40" y="120" width="120" height="60" rx="14" fill="var(--accent-dim)" opacity="0.6"/></svg>
    </div>
    <div class="form-side"><div class="panel">
      <h1>Good to see you</h1><div class="sub">Sign in to pick up where you left off.</div>
      {form}
    </div></div>
    """
    return css, body, "Split Illustration", "Abstract shape composition balances the form."

def layout_neumorphic(p, form):
    css = """
    body{display:flex; align-items:center; justify-content:center; min-height:100vh; padding:40px; background:var(--bg);}
    .card{
      width:100%; max-width:380px; padding:44px 38px; border-radius:24px; background:var(--surface);
      box-shadow: 10px 10px 24px rgba(0,0,0,0.06), -10px -10px 24px rgba(255,255,255,0.65);
    }
    h1{font-family:var(--font-display); font-size:22px; margin-bottom:6px;}
    .sub{font-size:13.5px; color:var(--text-dim); margin-bottom:30px;}
    .field input{box-shadow:inset 4px 4px 10px rgba(0,0,0,0.05), inset -4px -4px 10px rgba(255,255,255,0.7); border:none;}
    button.submit{box-shadow:5px 5px 14px rgba(0,0,0,0.12);}
    """
    body = f"""
    <div class="card"><h1>Welcome back</h1><div class="sub">Soft edges, softer landing.</div>{form}</div>
    """
    return css, body, "Neumorphic Soft", "Pressed and embossed surfaces instead of hard borders."

def layout_sidebar_quote(p, form):
    css = """
    body{display:grid; grid-template-columns:0.9fr 1fr; min-height:100vh;}
    .quote-panel{background:var(--accent); color:var(--accent-ink); padding:50px; display:flex; flex-direction:column; justify-content:space-between;}
    .quote-panel .brand{font-family:var(--font-display); font-weight:700; letter-spacing:.04em;}
    .quote-panel blockquote{font-family:var(--font-display); font-size:22px; line-height:1.5; max-width:360px;}
    .quote-panel cite{display:block; margin-top:16px; font-size:12.5px; font-style:normal; opacity:.75;}
    .form-side{display:flex; align-items:center; justify-content:center; padding:40px;}
    .panel{width:100%; max-width:380px;}
    h1{font-family:var(--font-display); font-size:23px; margin-bottom:6px;}
    .sub{font-size:13.5px; color:var(--text-dim); margin-bottom:30px;}
    @media(max-width:820px){body{grid-template-columns:1fr;} .quote-panel{display:none;}}
    """
    body = f"""
    <div class="quote-panel">
      <div class="brand">◆ WORKSPACE</div>
      <div><blockquote>"Cut the time it takes to find what you need in half."</blockquote><cite>— a team lead, three weeks in</cite></div>
      <div></div>
    </div>
    <div class="form-side"><div class="panel">
      <h1>Sign in</h1><div class="sub">Pick up your work where you left it.</div>
      {form}
    </div></div>
    """
    return css, body, "Sidebar Quote", "Testimonial panel gives the form social proof up front."

def layout_borderless_gradient(p, form):
    css = """
    body{
      min-height:100vh; display:flex; align-items:center; justify-content:center; padding:40px;
      background:linear-gradient(135deg, var(--accent), var(--surface2) 60%, var(--bg));
    }
    .card{width:100%; max-width:380px;}
    h1{font-family:var(--font-display); font-size:26px; margin-bottom:6px; color:var(--accent-ink);}
    .sub{font-size:13.5px; color:var(--accent-ink); opacity:.75; margin-bottom:30px;}
    .field input, button.submit{border-radius:999px;}
    """
    body = f"""
    <div class="card"><h1>Sign in</h1><div class="sub">No card, no border — the gradient carries it.</div>{form}</div>
    """
    return css, body, "Borderless Gradient", "Form floats directly on a full-bleed gradient, pill inputs."

def layout_editorial(p, form):
    css = """
    body{min-height:100vh; display:flex; align-items:center; justify-content:center; padding:40px;}
    .card{width:100%; max-width:400px;}
    .eyebrow{font-family:var(--font-body); font-size:11px; letter-spacing:.16em; text-transform:uppercase; color:var(--text-dim); margin-bottom:14px;}
    h1{font-family:var(--font-display); font-size:34px; line-height:1.1; margin-bottom:20px; font-weight:600;}
    hr{border:none; border-top:1px solid var(--border); margin:26px 0;}
    """
    body = f"""
    <div class="card">
      <div class="eyebrow">Member sign in</div>
      <h1>The account desk.</h1>
      <hr/>
      {form}
    </div>
    """
    return css, body, "Editorial Newspaper", "Serif headline and hairline rules, no rounded corners."

def layout_banner_top(p, form):
    css = """
    body{display:flex; align-items:center; justify-content:center; min-height:100vh; padding:40px;}
    .card{width:100%; max-width:380px; border-radius:var(--radius); overflow:hidden; border:1px solid var(--border);}
    .banner{background:var(--accent); color:var(--accent-ink); padding:34px 36px 46px; position:relative;}
    .banner h1{font-family:var(--font-display); font-size:22px;}
    .banner .sub{font-size:13px; opacity:.8; margin-top:6px;}
    .icon{width:44px;height:44px;border-radius:12px;background:var(--accent-ink); opacity:.15; position:absolute; top:30px; right:34px;}
    .body-pad{background:var(--surface); padding:36px;}
    """
    body = f"""
    <div class="card">
      <div class="banner"><div class="icon"></div><h1>Account access</h1><div class="sub">Members only, one form away.</div></div>
      <div class="body-pad">{form}</div>
    </div>
    """
    return css, body, "Top Banner", "Colored header band separates identity from the form itself."

def layout_brutalist(p, form):
    css = """
    body{display:flex; align-items:center; justify-content:center; min-height:100vh; padding:40px;}
    .card{width:100%; max-width:380px; background:var(--surface); border:3px solid var(--border); padding:38px 34px;
      box-shadow:10px 10px 0 var(--border);}
    h1{font-family:var(--font-display); font-size:26px; margin-bottom:8px; text-transform:uppercase;}
    .sub{font-size:13px; color:var(--text-dim); margin-bottom:28px; font-family:var(--font-body);}
    .field input{border-radius:0; border-width:3px;}
    button.submit{border-radius:0; border-width:3px; box-shadow:5px 5px 0 var(--border);}
    """
    body = f"""
    <div class="card"><h1>Log In</h1><div class="sub">No gradients. No mercy. Just fields.</div>{form}</div>
    """
    return css, body, "Brutalist Block", "Thick borders and hard offset shadows, zero decoration."

LAYOUTS = [
    ("split-console", layout_split_console, form_standard()),
    ("minimal-centered", layout_minimal_centered, form_standard()),
    ("glass-gradient", layout_glass_gradient, form_floating()),
    ("split-illustration", layout_split_illustration, form_standard()),
    ("neumorphic", layout_neumorphic, form_standard()),
    ("sidebar-quote", layout_sidebar_quote, form_standard()),
    ("borderless-gradient", layout_borderless_gradient, form_floating()),
    ("editorial", layout_editorial, form_underline()),
    ("banner-top", layout_banner_top, form_standard()),
    ("brutalist", layout_brutalist, form_standard()),
]

PAGE = Template("""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>$title</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=$gfonts&display=swap" rel="stylesheet">
<style>
$base_css
$extra_css
</style>
</head>
<body>
$body_html
</body>
</html>
""")

manifest = []
count = 0
for pal_key, pal in PALETTES.items():
    for layout_key, layout_fn, form_html in LAYOUTS:
        count += 1
        extra_css, body_html, layout_label, blurb = layout_fn(pal, form_html)
        base_css = BASE_CSS.substitute(**pal)
        fid = f"{layout_key}--{pal_key}"
        title = f"{layout_label} / {pal['label']}"
        html = PAGE.substitute(
            title=title, gfonts=pal["gfonts"], base_css=base_css,
            extra_css=extra_css, body_html=body_html,
        )
        fname = f"{fid}.html"
        with open(os.path.join(OUT, fname), "w") as f:
            f.write(html)
        manifest.append(dict(
            id=fid, file=f"forms/{fname}", title=title,
            layout=layout_label, layout_key=layout_key,
            palette=pal["label"], palette_key=pal_key,
            blurb=blurb, n=count,
        ))

with open("manifest.json", "w") as f:
    json.dump(manifest, f, indent=2)

# Also embed full source of every form + manifest into a JS file so the
# gallery works when opened directly as a local file (no fetch/CORS issues).
data_for_js = []
for m in manifest:
    with open(m["file"]) as f:
        code = f.read()
    entry = dict(m)
    entry["code"] = code
    data_for_js.append(entry)

with open("app-data.js", "w") as f:
    f.write("window.FORMS = ")
    json.dump(data_for_js, f)
    f.write(";\n")

print(f"Generated {count} forms.")
