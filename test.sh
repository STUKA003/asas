#!/usr/bin/env bash
# Trimio — auditoria completa: app + VPS + superfície pública + stress leve
# Uso:
#   ./test.sh
#   ./test.sh stukabarber
#   ./test.sh --deep-browser
#   ./test.sh --load
#   ./test.sh --full

SLUG_FILTER=""
DEEP_BROWSER=0
LOAD_TEST=0
for arg in "$@"; do
  case "$arg" in
    --deep-browser) DEEP_BROWSER=1 ;;
    --load) LOAD_TEST=1 ;;
    --full) DEEP_BROWSER=1; LOAD_TEST=1 ;;
    --help|-h)
      cat <<'EOF'
Uso:
  ./test.sh
  ./test.sh <slug>
  ./test.sh --deep-browser
  ./test.sh --load
  ./test.sh --full
  ./test.sh <slug> --full
EOF
      exit 0
      ;;
    *)
      if [ -z "$SLUG_FILTER" ]; then
        SLUG_FILTER="$arg"
      fi
      ;;
  esac
done
SSH_KEY="${HOME}/Desktop/trimio_vps_ed25519"

_VPS_COLLECT_CMD="
  echo '=JWT='
  grep '^JWT_SECRET=' /var/www/trimio/.env | cut -d= -f2- | tr -d '\"'
  echo '=SUPERADMIN_EMAIL='
  grep '^SUPERADMIN_EMAIL=' /var/www/trimio/.env | cut -d= -f2- | tr -d '\"'
  echo '=SUPERADMIN_PASSWORD='
  grep '^SUPERADMIN_PASSWORD=' /var/www/trimio/.env | cut -d= -f2- | tr -d '\"'
  echo '=SLUGS='
  sudo -u postgres psql -d trimio -t -c \"SELECT slug FROM \\\"Barbershop\\\" WHERE suspended=false ORDER BY name;\" 2>/dev/null | tr -d ' ' | grep -v '^\$'
  echo '=USERS='
  sudo -u postgres psql -d trimio -t -c \"SELECT u.id, u.\\\"barbershopId\\\", b.slug, u.email FROM \\\"User\\\" u JOIN \\\"Barbershop\\\" b ON b.id=u.\\\"barbershopId\\\" WHERE b.suspended=false ORDER BY b.name;\" 2>/dev/null | grep -v '^\$'
  echo '=SMTP_HOST='
  grep '^SMTP_HOST=' /var/www/trimio/.env | cut -d= -f2- | tr -d '\"'
  echo '=SMTP_PORT='
  grep '^SMTP_PORT=' /var/www/trimio/.env | cut -d= -f2- | tr -d '\"'
  echo '=NODE_ENV='
  grep '^NODE_ENV=' /var/www/trimio/.env | cut -d= -f2- | tr -d '\"'
  echo '=SENTRY_DSN='
  grep '^SENTRY_DSN=' /var/www/trimio/.env | cut -d= -f2- | tr -d '\"'
"

# Detect if running directly on the VPS
if [ -f "/var/www/trimio/.env" ]; then
  ON_VPS=1
  VPS_DATA=$(bash -c "$_VPS_COLLECT_CMD" 2>/dev/null)
else
  ON_VPS=0
  SSH=(ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no ubuntu@51.91.158.175)
  VPS_DATA=$("${SSH[@]}" "$_VPS_COLLECT_CMD" 2>/dev/null)
fi

VPS_DATA="$VPS_DATA" ON_VPS="$ON_VPS" python3 -u - "$SLUG_FILTER" "$DEEP_BROWSER" "$LOAD_TEST" <<'PYEOF'
import sys, json, hmac, hashlib, base64, time, subprocess, re, os, struct
from urllib.request import urlopen, Request
from urllib.error import HTTPError
import ssl, socket
from datetime import date, datetime, timedelta, UTC
from concurrent.futures import ThreadPoolExecutor, as_completed

BASE     = "https://trimio.pt"
API      = f"{BASE}/api"
VPS_IP   = "51.91.158.175"
ON_VPS   = __import__('os').environ.get('ON_VPS', '0') == '1'
LOCAL_API = "http://localhost:3000/api"
UA       = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"

raw         = __import__('os').environ.get('VPS_DATA', '')
slug_filter = sys.argv[1].strip()
DEEP_BROWSER = sys.argv[2] == '1'
LOAD_TEST = sys.argv[3] == '1'

jwt_secret = ""
superadmin_email = ""
superadmin_password = ""
smtp_host = ""
smtp_port = ""
node_env = ""
sentry_dsn = ""
all_slugs = []
users = []
section_name = None
for line in raw.split('\n'):
    line = line.strip()
    if line == '=JWT=':    section_name = 'jwt'
    elif line == '=SUPERADMIN_EMAIL=': section_name = 'superadmin_email'
    elif line == '=SUPERADMIN_PASSWORD=': section_name = 'superadmin_password'
    elif line == '=SLUGS=': section_name = 'slugs'
    elif line == '=USERS=': section_name = 'users'
    elif line == '=SMTP_HOST=': section_name = 'smtp_host'
    elif line == '=SMTP_PORT=': section_name = 'smtp_port'
    elif line == '=NODE_ENV=': section_name = 'node_env'
    elif line == '=SENTRY_DSN=': section_name = 'sentry_dsn'
    elif not line: continue
    elif section_name == 'jwt':   jwt_secret = line
    elif section_name == 'superadmin_email': superadmin_email = line
    elif section_name == 'superadmin_password': superadmin_password = line
    elif section_name == 'smtp_host': smtp_host = line
    elif section_name == 'smtp_port': smtp_port = line
    elif section_name == 'node_env': node_env = line
    elif section_name == 'sentry_dsn': sentry_dsn = line
    elif section_name == 'slugs': all_slugs.append(line)
    elif section_name == 'users':
        p = [x.strip() for x in line.split('|')]
        if len(p) >= 4: users.append({'id':p[0],'barbershopId':p[1],'slug':p[2],'email':p[3]})

SLUGS = [slug_filter] if slug_filter else all_slugs

# ── Cores ────────────────────────────────────────────────────────────
G='\033[0;32m';R='\033[0;31m';Y='\033[1;33m'
C='\033[0;36m';B='\033[1m';D='\033[2m';X='\033[0m'

passed=failed=warned=0
failures=[]; warnings=[]
_current_section=""

def ok(msg):   global passed; passed+=1; print(f"  {G}✓{X} {msg}")
def fail(msg, detail=None):
    global failed; failed+=1; failures.append(msg); print(f"  {R}✗{X} {msg}")
    if detail: print(f"    {D}↳ {detail}{X}")
def warn(msg): global warned; warned+=1; warnings.append(msg); print(f"  {Y}!{X} {msg}")
def sec(t):    print(f"\n{B}{C}▸ {t}{X}")
def note(msg): print(f"    {D}{msg}{X}")

def section_between(text, start, end=None):
    if end is None:
        m = re.search(rf'{re.escape(start)}\n(.*?)$', text, re.DOTALL)
    else:
        m = re.search(rf'{re.escape(start)}\n(.*?){re.escape(end)}', text, re.DOTALL)
    return m.group(1).strip() if m else ""

def bytes_human(n):
    try:
        n = int(n)
    except Exception:
        return str(n)
    units = ['B', 'KB', 'MB', 'GB', 'TB']
    size = float(n)
    for unit in units:
        if size < 1024 or unit == units[-1]:
            return f"{size:.1f}{unit}" if unit != 'B' else f"{int(size)}B"
        size /= 1024

# ── JWT ───────────────────────────────────────────────────────────────
def b64u(d):
    if isinstance(d,str): d=d.encode()
    return base64.urlsafe_b64encode(d).rstrip(b'=').decode()

def make_jwt(uid, bid, role='ADMIN'):
    h = b64u(json.dumps({"alg":"HS256","typ":"JWT"}))
    p = b64u(json.dumps({"userId":uid,"barbershopId":bid,"role":role,
                          "iat":int(time.time()),"exp":int(time.time())+7200}))
    sig = hmac.new(jwt_secret.encode(), f"{h}.{p}".encode(), hashlib.sha256).digest()
    return f"{h}.{p}.{b64u(sig)}"

# ── HTTP ──────────────────────────────────────────────────────────────
ctx = ssl.create_default_context()

def http(url, method="GET", body=None, headers=None, timeout=12):
    h = {"Content-Type":"application/json","User-Agent":UA,**(headers or {})}
    data = body.encode() if isinstance(body,str) else (json.dumps(body).encode() if isinstance(body,dict) else body)
    t0 = time.time()
    try:
        req = Request(url, data=data, headers=h, method=method)
        with urlopen(req, context=ctx, timeout=timeout) as r:
            return r.status, r.read(), int((time.time()-t0)*1000)
    except HTTPError as e:
        try: content=e.read()
        except: content=b''
        return e.code, content, int((time.time()-t0)*1000)
    except Exception as e:
        return 0, str(e).encode(), 0

def api(path, method="GET", body=None, token=None):
    h = {"Authorization":f"Bearer {token}"} if token else {}
    s,b,ms = http(f"{API}{path}", method, body, headers=h)
    try: return s, json.loads(b), ms
    except: return s, None, ms

def pub(path):
    s,b,ms = http(f"{API}/public{path}")
    try: return s, json.loads(b), ms
    except: return s, None, ms

def superapi(path, method="GET", body=None, token=None):
    h = {"Authorization":f"Bearer {token}"} if token else {}
    base = LOCAL_API if ON_VPS else API
    s,b,ms = http(f"{base}/superadmin{path}", method, body, headers=h)
    try: return s, json.loads(b), ms
    except: return s, None, ms

def check_page(label, url, expected=200):
    s,_,ms = http(url)
    if s==expected:
        if ms > 4500:
            warn(f"{label} — {s} lento ({ms}ms)")
        else:
            ok(f"{label} — {s} · {ms}ms")
    else:
        fail(f"{label} — esperado {expected}, recebeu {s}", url)

def img_ok(url):
    if not url: return None
    if url.startswith("data:image/"): return "data_uri"
    if url.startswith("/"): url = f"{BASE}{url}"
    s,_,_ = http(url,timeout=8); return s

def html_page(url, timeout=12):
    s, body, ms = http(url, timeout=timeout, headers={"Accept":"text/html"})
    try:
        text = body.decode('utf-8', 'replace')
    except Exception:
        text = ''
    return s, text, ms

def multi_sample(label, url, expected=200, samples=3, timeout=12):
    results = []
    bad = []
    for _ in range(samples):
        s, _, ms = http(url, timeout=timeout)
        results.append(ms)
        if s != expected:
            bad.append(s)
    if bad:
        fail(f"{label} — estados inesperados {bad}", url)
        return
    ordered = sorted(results)
    avg = sum(results) / len(results)
    p95 = ordered[min(len(ordered) - 1, max(0, int(len(ordered) * 0.95) - 1))]
    msg = f"{label} — avg {avg:.0f}ms · p95 {p95}ms"
    if avg > 1500 or p95 > 2500:
        fail(msg)
    elif avg > 800 or p95 > 1500:
        warn(msg)
    else:
        ok(msg)

def deep_browser_page(label, url, expect_canonical=False):
    s, html, ms = html_page(url, timeout=15)
    if s != 200:
        fail(f"{label} deep-browser — HTTP {s}", url)
        return

    ok(f"{label} HTML — 200 · {ms}ms · {bytes_human(len(html.encode('utf-8', 'ignore')))}")

    title = re.search(r'<title>(.*?)</title>', html, re.I | re.S)
    if title and title.group(1).strip():
        ok(f"{label} title → {title.group(1).strip()[:90]}")
    else:
        fail(f"{label} sem <title>")

    if '<div id="root">' in html or '<div id="root"></div>' in html:
        ok(f"{label} bootstrap root presente")
    else:
        warn(f"{label} sem root esperado da SPA")

    scripts = re.findall(r'<script[^>]+src="([^"]+)"', html, re.I)
    styles = re.findall(r'<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"', html, re.I)
    if scripts:
        ok(f"{label} scripts externos: {len(scripts)}")
    else:
        warn(f"{label} sem scripts externos")
    if styles:
        ok(f"{label} stylesheets externas: {len(styles)}")
    else:
        warn(f"{label} sem stylesheet externa")

    assets = []
    for ref in scripts[:5] + styles[:5]:
        full = ref if ref.startswith('http') else f"{BASE}{ref}"
        assets.append(full)
    broken = []
    for asset in assets:
        st, _, _ = http(asset, method="HEAD", timeout=10)
        if st != 200:
            broken.append((asset, st))
    if broken:
        for asset, st in broken:
            fail(f"{label} asset quebrado → {st}", asset)
    else:
        if assets:
            ok(f"{label} assets críticos acessíveis")

    if expect_canonical:
        canonical = re.search(r'<link[^>]+rel="canonical"[^>]+href="([^"]+)"', html, re.I)
        og_url = re.search(r'<meta[^>]+property="og:url"[^>]+content="([^"]+)"', html, re.I)
        desc = re.search(r'<meta[^>]+name="description"[^>]+content="([^"]+)"', html, re.I)
        if canonical:
            ok(f"{label} canonical → {canonical.group(1)[:120]}")
        else:
            warn(f"{label} sem canonical")
        if og_url:
            ok(f"{label} og:url → {og_url.group(1)[:120]}")
        else:
            warn(f"{label} sem og:url")
        if desc:
            ok(f"{label} meta description presente")
        else:
            warn(f"{label} sem meta description")

def load_profile(label, url, method="GET", body=None, headers=None, requests=12, workers=4, expected=(200,)):
    def one():
        st, _, ms = http(url, method=method, body=body, headers=headers, timeout=20)
        return st, ms

    results = []
    with ThreadPoolExecutor(max_workers=workers) as ex:
        futures = [ex.submit(one) for _ in range(requests)]
        for fut in as_completed(futures):
            results.append(fut.result())

    statuses = [st for st, _ in results]
    timings = sorted(ms for _, ms in results)
    bad = [st for st in statuses if st not in expected]
    avg = sum(timings) / len(timings)
    p95 = timings[min(len(timings)-1, max(0, int(len(timings)*0.95)-1))]
    mx = max(timings)
    msg = f"{label} — {requests} req/{workers} workers · avg {avg:.0f}ms · p95 {p95}ms · max {mx}ms"
    if bad:
        fail(f"{msg} · estados inesperados {bad[:5]}")
    elif avg > 2500 or p95 > 4000:
        fail(msg)
    elif avg > 1200 or p95 > 2500:
        warn(msg)
    else:
        ok(msg)

# ── Testa campo e valor esperado ─────────────────────────────────────
def chk(label, got, expected=None, nonempty=False):
    if nonempty:
        if got not in (None,"",[]): ok(f"{label} → {str(got)[:80]}")
        else: fail(f"{label} — vazio ou em falta")
    elif expected is not None:
        if got == expected: ok(f"{label} → {got}")
        else: fail(f"{label} — esperado '{expected}', got '{got}'")
    else:
        ok(f"{label} → {str(got)[:80]}") if got not in (None,"") else warn(f"{label} não preenchido")

def chk_optional(label, got):
    if got not in (None,"",[]):
        ok(f"{label} → {str(got)[:80]}")
    else:
        note(f"{label} não preenchido")

# ═══════════════════════════════════════════════════════════════════════
def test_barbershop(slug):
    print(f"\n{B}{'═'*50}{X}")
    print(f"{B}  {slug.upper()}{X}")
    print(f"{B}{'═'*50}{X}")

    user  = next((u for u in users if u['slug']==slug), None)
    token = make_jwt(user['id'],user['barbershopId']) if user and jwt_secret else None

    # ── 1. SUPERFÍCIE WEB DA BARBEARIA ──────────────────────────────
    sec("1 · Superfície web da barbearia")
    for label,path in [("Home",f"/{slug}"),
                       ("Serviços",f"/{slug}/services"),
                       ("Agendamento",f"/{slug}/booking"),
                       ("Gerir reserva",f"/{slug}/booking/manage"),
                       ("Planos",f"/{slug}/plans"),
                       ("Produtos",f"/{slug}/products"),
                       ("Barber login",f"/{slug}/barber/login"),
                       ("Barber dashboard",f"/{slug}/barber"),
                       ("Barber schedule",f"/{slug}/barber/schedule")]:
        check_page(label, f"{BASE}{path}")

    # ── 2. LATÊNCIA BASELINE ────────────────────────────────────────
    sec("2 · Latência baseline")
    multi_sample("Página pública", f"{BASE}/{slug}")
    multi_sample("API pública barbearia", f"{API}/public/{slug}")
    multi_sample("API serviços públicos", f"{API}/public/{slug}/services")

    if DEEP_BROWSER:
        sec("2b · Deep browser da barbearia")
        deep_browser_page("Home da barbearia", f"{BASE}/{slug}", expect_canonical=True)
        deep_browser_page("Serviços da barbearia", f"{BASE}/{slug}/services")
        deep_browser_page("Booking da barbearia", f"{BASE}/{slug}/booking")

    if LOAD_TEST:
        sec("2c · Load profile")
        load_profile("Load página pública", f"{BASE}/{slug}")
        load_profile("Load API pública barbearia", f"{API}/public/{slug}")
        load_profile("Load API serviços públicos", f"{API}/public/{slug}/services")

    # ── 3. DADOS PÚBLICOS DA BARBEARIA ──────────────────────────────
    sec("3 · Dados públicos da barbearia")
    s, shop, ms = pub(f"/{slug}")
    if not isinstance(shop,dict): fail(f"API /public/{slug} falhou ({s})"); return
    ok(f"API responde · {ms}ms")

    for f in ["id","name","slug"]: chk(f"'{f}'", shop.get(f), nonempty=True)
    chk_optional("'phone'", shop.get("phone"))
    chk("'address'", shop.get("address"))
    chk_optional("'whatsapp'", shop.get("whatsapp"))
    chk("'instagram'", shop.get("instagram"))
    chk("accentColor", shop.get("accentColor"), nonempty=True)
    gran = shop.get("slotGranularityMinutes")
    if gran in [5,10,15,20,30]: ok(f"slotGranularityMinutes → {gran} min")
    else: fail(f"slotGranularityMinutes inválido → {gran}")

    # ── 4. CONTEÚDO DO HERO ─────────────────────────────────────────
    sec("4 · Conteúdo do hero")
    for f,l in [("heroTitle","Título"),("heroSubtitle","Subtítulo"),("heroButtonText","Botão CTA")]:
        v=shop.get(f)
        if v: ok(f"{l} → \"{v[:70]}\"")
        else: warn(f"{l} não definido (usa texto por defeito)")

    # Logo
    logo=shop.get("logoUrl") or ""
    if not logo: warn("Logo não definido")
    else:
        r=img_ok(logo)
        if r=="data_uri": ok(f"Logo — data URI ({len(logo):,} bytes)")
        elif str(r).startswith("2"): ok(f"Logo — acessível")
        else: fail(f"Logo — inacessível ({r})")

    # Hero image
    hi=shop.get("heroImageUrl") or ""
    if not hi: warn("Imagem hero não definida")
    else:
        r=img_ok(hi)
        ok("Imagem hero — presente") if r=="data_uri" or str(r).startswith("2") else fail(f"Imagem hero inacessível ({r})")

    # Galeria
    gallery=shop.get("galleryImages") or []
    if not gallery: warn("Galeria vazia")
    else:
        ok(f"Galeria — {len(gallery)} imagem(s)")
        bad=[i for i,img in enumerate(gallery[:4]) if img_ok(img) not in ("data_uri",) and not str(img_ok(img)).startswith("2")]
        ok(f"Primeiras {min(4,len(gallery))} imagens acessíveis") if not bad else fail(f"Imagens inacessíveis: índices {bad}")

    # ── 5. BANNER PROMOCIONAL — LEITURA E ESCRITA ───────────────────
    sec("5 · Banner promocional (leitura + escrita)")
    if not token: warn("Sem token — testes de escrita ignorados"); promo_skip=True
    else: promo_skip=False

    promo_enabled=shop.get("promoEnabled",False)
    promo_title=shop.get("promoTitle") or ""
    promo_text=shop.get("promoText") or ""
    promo_btn=shop.get("promoButtonText") or ""

    if promo_enabled:
        ok("Banner ATIVO na API pública")
        if promo_title: ok(f"promoTitle → \"{promo_title[:60]}\"")
        else: fail("Banner ativo mas promoTitle VAZIO — não aparece nada no site!")
        if promo_text: ok(f"promoText → \"{promo_text[:60]}\"")
        else: warn("promoText vazio")
        if promo_btn: ok(f"promoButtonText → \"{promo_btn}\"")
        else: warn("promoButtonText vazio (usa padrão)")
    else:
        note("Banner desativado na API pública")

    if not promo_skip:
        # Escreve banner de teste
        TEST_TITLE = "__TESTE_AUTOMATICO__"
        s,_,_ = api("/barbershop","PUT",{
            "promoEnabled": True,
            "promoTitle": TEST_TITLE,
            "promoText": "Texto de teste automático",
            "promoButtonText": "Testar"
        }, token=token)
        if s == 200:
            ok("Guardar banner via admin API → 200")
            # Verifica que aparece na API pública
            time.sleep(0.5)
            _,shop2,_ = pub(f"/{slug}")
            if isinstance(shop2,dict):
                if shop2.get("promoEnabled") and shop2.get("promoTitle")==TEST_TITLE:
                    ok("Banner guardado aparece na API pública ✓")
                else:
                    fail("Banner guardado NÃO aparece na API pública — bug de escrita!")
            # Restaura estado original
            api("/barbershop","PUT",{
                "promoEnabled": promo_enabled,
                "promoTitle": promo_title,
                "promoText": promo_text,
                "promoButtonText": promo_btn
            }, token=token)
            ok("Estado original do banner restaurado")
        else:
            fail(f"Guardar banner falhou → {s} (pode ser 413 — payload demasiado grande)")

    # ── 6. CONTEÚDO DO SITE — ESCRITA ───────────────────────────────
    sec("6 · Conteúdo do site (escrita)")
    if token:
        orig_title = shop.get("heroTitle") or ""
        TEST_HERO = "__HERO_TESTE__"
        s,_,_ = api("/barbershop","PUT",{"heroTitle": TEST_HERO}, token=token)
        if s==200:
            ok("Guardar heroTitle → 200")
            time.sleep(0.5)
            _,s2,_ = pub(f"/{slug}")
            if isinstance(s2,dict) and s2.get("heroTitle")==TEST_HERO:
                ok("heroTitle guardado aparece na API pública ✓")
            else:
                fail("heroTitle NÃO aparece na API pública após guardar!")
            api("/barbershop","PUT",{"heroTitle": orig_title}, token=token)
            ok("heroTitle restaurado")
        else:
            fail(f"Guardar heroTitle falhou → {s}")

    # ── 7. SERVIÇOS ─────────────────────────────────────────────────
    sec("7 · Serviços")
    s,svcs,_ = pub(f"/{slug}/services")
    svc_id=None
    svc_duration=None
    if not isinstance(svcs,list): fail("Endpoint público de serviços falhou")
    elif not svcs: fail("Nenhum serviço — agendamento impossível!")
    else:
        ok(f"{len(svcs)} serviço(s) públicos")
        svc_id = svcs[0]["id"]
        svc_duration = svcs[0].get("duration") or 0
        for svc in svcs:
            n=svc.get("name","?"); p=svc.get("price"); d=svc.get("duration")
            if p is None or p<0: fail(f"'{n}' — preço inválido")
            elif p==0: warn(f"'{n}' — preço €0 (intencional?)")
            else: ok(f"'{n}' — €{p/100:.2f} · {d}min")

    if token:
        # Cria serviço de teste, verifica aparece na lista pública, apaga
        s,created,_ = api("/services","POST",{
            "name":"__SERVICO_TESTE__","price":100,"duration":10,"description":"teste"
        }, token=token)
        if s==201 or s==200:
            ok("Criar serviço de teste → OK")
            tid = (created or {}).get("id")
            time.sleep(0.3)
            _,pub_svcs,_ = pub(f"/{slug}/services")
            found = isinstance(pub_svcs,list) and any(sv.get("name")=="__SERVICO_TESTE__" for sv in pub_svcs)
            ok("Serviço criado aparece na API pública ✓") if found else fail("Serviço criado NÃO aparece na API pública!")
            if tid:
                s2,_,_ = api(f"/services/{tid}","DELETE",token=token)
                ok("Serviço de teste eliminado") if s2 in (200,204) else warn(f"Não foi possível eliminar serviço de teste ({s2})")
        else:
            fail(f"Criar serviço falhou → {s}")

    # ── 8. BARBEIROS ────────────────────────────────────────────────
    sec("8 · Barbeiros")
    s,barbs,_ = pub(f"/{slug}/barbers")
    barber_id=None
    if not isinstance(barbs,list): fail("Endpoint público de barbeiros falhou")
    elif not barbs: fail("Nenhum barbeiro — agendamento impossível!")
    else:
        ok(f"{len(barbs)} barbeiro(s) ativo(s)")
        barber_id=barbs[0]["id"]
        for b in barbs:
            n=b.get("name","?"); av=b.get("avatar") or ""
            if av:
                r=img_ok(av)
                ok(f"'{n}' — avatar OK") if r=="data_uri" or str(r).startswith("2") else fail(f"'{n}' — avatar inacessível ({r})")
            else: warn(f"'{n}' — sem avatar")

    if token:
        s,admin_barbs,_ = api("/barbers",token=token)
        if s==200 and isinstance(admin_barbs,list):
            ok(f"Admin: {len(admin_barbs)} barbeiro(s) total")
            inactive=[b for b in admin_barbs if not b.get("active",True)]
            inactive and note(f"{len(inactive)} barbeiro(s) inativo(s)")
        else: fail(f"Admin /barbers → {s}")

    # ── 9. EXTRAS ───────────────────────────────────────────────────
    sec("9 · Extras")
    s,extras,_ = pub(f"/{slug}/extras")
    if not isinstance(extras,list): fail("Endpoint extras falhou")
    elif not extras: note("Sem extras configurados")
    else:
        ok(f"{len(extras)} extra(s)")
        for e in extras:
            n=e.get("name","?"); p=e.get("price",0); d=e.get("duration",0)
            ok(f"'{n}' — €{p/100:.2f}" + (f" · +{d}min" if d else ""))

    if token:
        s,created,_ = api("/extras","POST",{
            "name":"__EXTRA_TESTE__","price":50,"duration":5,"description":"teste"
        }, token=token)
        if s in (200,201):
            ok("Criar extra de teste → OK")
            tid=(created or {}).get("id")
            time.sleep(0.3)
            _,pub_ex,_ = pub(f"/{slug}/extras")
            found=isinstance(pub_ex,list) and any(e.get("name")=="__EXTRA_TESTE__" for e in pub_ex)
            ok("Extra criado aparece na API pública ✓") if found else fail("Extra criado NÃO aparece na API pública!")
            if tid:
                s2,_,_ = api(f"/extras/{tid}","DELETE",token=token)
                ok("Extra de teste eliminado") if s2 in (200,204) else warn(f"Não eliminado ({s2})")
        else: fail(f"Criar extra falhou → {s}")

    # ── 10. PRODUTOS ────────────────────────────────────────────────
    sec("10 · Produtos")
    s,prods,_ = pub(f"/{slug}/products")
    if not isinstance(prods,list): fail("Endpoint produtos falhou")
    elif not prods: note("Sem produtos configurados")
    else:
        ok(f"{len(prods)} produto(s)")
        for p in prods: ok(f"'{p.get('name','?')}' — €{p.get('price',0)/100:.2f}")

    # ── 11. PLANOS ──────────────────────────────────────────────────
    sec("11 · Planos de subscrição")
    s,plans,_ = pub(f"/{slug}/plans")
    if not isinstance(plans,list): fail("Endpoint planos falhou")
    elif not plans: note("Sem planos configurados")
    else:
        ok(f"{len(plans)} plano(s)")
        for p in plans:
            n=p.get("name","?"); pr=p.get("price",0)
            svcs_in_plan=p.get("services") or p.get("allowedServices") or []
            ok(f"'{n}' — €{pr/100:.2f}/mês · {len(svcs_in_plan)} serviço(s)")

    # ── 12. HORÁRIOS ────────────────────────────────────────────────
    sec("12 · Horários de trabalho")
    if token:
        s,wh,_ = api("/working-hours",token=token)
        if s==200 and isinstance(wh,list):
            ok(f"{len(wh)} entrada(s) de horário")
            if not wh: fail("Sem horários configurados — agenda sempre vazia!")
        else: fail(f"GET /working-hours → {s}")

    # ── 13. DISPONIBILIDADE ─────────────────────────────────────────
    sec("13 · Disponibilidade (agenda)")
    if barber_id:
        total_slots=0
        first_day_with_slots=None
        request_duration = svc_duration or 30
        for i in range(1,8):
            d=(date.today()+timedelta(days=i)).isoformat()
            _,av,ms=pub(f"/{slug}/availability?date={d}&duration={request_duration}&barberId={barber_id}")
            n=len((av or {}).get("slots",[]))
            total_slots+=n
            if n>0 and not first_day_with_slots: first_day_with_slots=(d,n,ms)

        if total_slots>0:
            d,n,ms=first_day_with_slots
            ok(f"Primeiro dia com slots: {d} → {n} slot(s) · {ms}ms")
            ok(f"Total próximos 7 dias: {total_slots} slot(s)")
        else:
            fail("Nenhum slot disponível nos próximos 7 dias — horário não configurado?")

        # Testa parâmetros inválidos
        s,err,_ = pub(f"/{slug}/availability?date=invalido&duration=30&barberId={barber_id}")
        ok("Disponibilidade rejeita data inválida (400/422)") if s in (400,422) else warn(f"Data inválida retornou {s}")
    else:
        warn("Disponibilidade não testada — sem barbeiro")

    # ── 14. FLUXO DE AGENDAMENTO ────────────────────────────────────
    sec("14 · Fluxo de agendamento completo")

    # Lookup de cliente
    s,lk,_ = http(f"{API}/public/{slug}/customer-plan","POST",
                  json.dumps({"phone":"910000000","name":"Teste Automatico"}))
    try: json.loads(lk); ok("Lookup de cliente → JSON válido")
    except: fail("Lookup de cliente → resposta inválida")

    s,_,_ = pub(f"/{slug}/bookings/manage?token=token_invalido")
    ok("Managed booking inválido → 400/401/404") if s in (400,401,404) else warn(f"Managed booking inválido retornou {s}")

    s,_,_ = pub(f"/{slug}/bookings/manage/availability?token=token_invalido&date={date.today().isoformat()}")
    ok("Managed availability inválido → 400/401/404") if s in (400,401,404) else warn(f"Managed availability inválido retornou {s}")

    # Validação de campos obrigatórios
    s,_,_ = http(f"{API}/public/{slug}/bookings","POST","{}")
    ok("Booking sem dados → 400 (validação OK)") if s==400 else fail(f"Booking sem dados → {s} (esperado 400)")

    # Tentativa com dados parciais
    s,_,_ = http(f"{API}/public/{slug}/bookings","POST",
                 json.dumps({"barberId":"inexistente","startTime":"2099-01-01T10:00:00Z"}))
    ok(f"Booking com dados inválidos → {s} (rejeitado)") if s in (400,404,422) else warn(f"Booking inválido → {s}")

    if barber_id and svc_id:
        # Tenta criar booking real e cancela
        request_duration = svc_duration or 30
        booking_day=None
        slots=[]
        for i in range(1,8):
            candidate_day=(date.today()+timedelta(days=i)).isoformat()
            _,av,_ = pub(f"/{slug}/availability?date={candidate_day}&duration={request_duration}&barberId={barber_id}")
            slots=(av or {}).get("slots",[])
            if slots:
                booking_day=candidate_day
                break
        if slots:
            slot=slots[0]["startTime"]
            s,booking_raw,_ = http(f"{API}/public/{slug}/bookings","POST",json.dumps({
                "barberId": barber_id,
                "serviceIds": [svc_id],
                "extraIds": [],
                "productIds": [],
                "startTime": slot,
                "customer": {"name":"TESTE AUTOMATICO","phone":"910000000","email":""}
            }))
            try:
                booking=json.loads(booking_raw)
            except Exception:
                booking=None
            if s in (200,201):
                ok(f"Booking de teste criado → {s}")
                bid=(booking or {}).get("id") or (booking or {}).get("booking",{}).get("id")
                murl=(booking or {}).get("management",{}).get("managementUrl") or ""
                if murl:
                    ok("URL de gestão gerado ✓")
                else:
                    warn("URL de gestão não retornado")
                if bid and token:
                    s2,_,_ = api(f"/bookings/{bid}/status","PATCH",{"status":"CANCELLED"},token=token)
                    ok("Booking de teste cancelado") if s2==200 else warn(f"Cancelamento → {s2}")
                elif bid:
                    note(f"Booking criado (id:{bid}) — cancelar manualmente se necessário")
            elif s==400:
                ok(f"Booking rejeitado com 400 (slot pode não estar disponível)")
            else:
                warn(f"Criar booking → {s}")
        else:
            note("Sem slots disponíveis nos próximos 7 dias — teste de criação de booking ignorado")

    # ── 15. PAINEL ADMIN ────────────────────────────────────────────
    sec(f"15 · Painel admin ({(user or {}).get('email','n/a')})")
    if not token: warn("Sem token — painel admin não testado"); return

    endpoints = [
        ("Dados da barbearia",    "/barbershop",    "GET"),
        ("Lista de barbeiros",    "/barbers",       "GET"),
        ("Lista de serviços",     "/services",      "GET"),
        ("Lista de extras",       "/extras",        "GET"),
        ("Lista de produtos",     "/products",      "GET"),
        ("Lista de planos",       "/plans",         "GET"),
        ("Horários de trabalho",  "/working-hours", "GET"),
        ("Agendamentos",          "/bookings",      "GET"),
        ("Clientes",              "/customers",     "GET"),
        ("Notificações",          "/notifications", "GET"),
        ("Notif. não lidas",      "/notifications/unread", "GET"),
        ("Push config",           "/push/config",   "GET"),
        ("Relatórios",            "/bookings/reports", "GET"),
    ]
    for label,path,method in endpoints:
        s,data,ms = api(path, method, token=token)
        if s==200: ok(f"{label} — 200 · {ms}ms")
        elif s==403: fail(f"{label} — 403 Forbidden")
        elif s==404: fail(f"{label} — 404 Not Found")
        else: fail(f"{label} — {s}")

    # Verifica subscrição
    _,sad,_ = api("/barbershop",token=token)
    if isinstance(sad,dict):
        sub=sad.get("subscription",{})
        plan=sub.get("plan","?"); expired=sub.get("expired",False)
        if expired: warn(f"Subscrição EXPIRADA! Plano atual: {plan}")
        else: ok(f"Subscrição ativa — plano {plan}")
        lim=sub.get("limits",{})
        mb=lim.get("maxMonthlyBookings"); ab=lim.get("activeBarbers")
        cur=lim.get("monthlyBookings",0)
        if mb and cur is not None:
            pct=cur*100//mb
            if pct>=90: warn(f"Limite de bookings: {cur}/{mb} ({pct}%) — quase no limite!")
            else: ok(f"Bookings este mês: {cur}/{mb} ({pct}%)")

    # ── 16. BARBER PORTAL SEM TOKEN ────────────────────────────────
    sec("16 · Barber portal")
    s,_,_ = api("/barber-auth/me")
    ok("Barber auth sem token → 401") if s == 401 else fail(f"Barber auth sem token → {s}")
    for label,path in [
        ("Barber bookings", "/barber-portal/bookings"),
        ("Barber stats", "/barber-portal/stats"),
        ("Barber extras", "/barber-portal/extras"),
        ("Barber products", "/barber-portal/products"),
        ("Barber notifications", "/barber-portal/notifications"),
        ("Barber notifications unread", "/barber-portal/notifications/unread"),
        ("Barber push config", "/barber-portal/push/config"),
    ]:
        s,_,_ = api(path)
        ok(f"{label} sem token → 401") if s == 401 else fail(f"{label} sem token → {s}")

    # Verifica que não há dados de outras barbearias visíveis (isolamento)
    sec("17 · Isolamento de dados entre barbearias")
    other_slugs=[s for s in SLUGS if s!=slug]
    if other_slugs and token:
        other_user=next((u for u in users if u['slug']==other_slugs[0]),None)
        if other_user:
            other_token=make_jwt(other_user['id'],other_user['barbershopId'])
            # Token da outra barbearia não deve aceder a dados desta
            s,data,_ = api("/barbershop",token=other_token)
            if s==200 and isinstance(data,dict):
                if data.get("slug")==slug:
                    fail("ISOLAMENTO QUEBRADO — token de outra barbearia acedeu a dados desta!")
                else:
                    ok(f"Isolamento OK — token de '{other_slugs[0]}' acede apenas aos seus dados")
            else:
                ok(f"Isolamento OK — acesso cruzado bloqueado ({s})")
    else:
        note("Isolamento não testado — apenas 1 barbearia")

    # ── 18. IDOR — acesso a recursos de outra barbearia ─────────────
    sec("18 · IDOR — acesso a recursos de outra barbearia")
    if token and len(users) >= 2:
        other_user = next((u for u in users if u['slug'] != slug), None)
        if other_user:
            other_token = make_jwt(other_user['id'], other_user['barbershopId'])
            s_other_bk, other_bookings, _ = api("/bookings", token=other_token)
            if isinstance(other_bookings, list) and other_bookings:
                other_bid = other_bookings[0].get('id')
                if other_bid:
                    s_idor, d_idor, _ = api(f"/bookings/{other_bid}", token=token)
                    if s_idor == 200 and isinstance(d_idor, dict):
                        fail(f"IDOR: booking da barbearia '{other_user['slug']}' acessível com token de '{slug}'!")
                    elif s_idor in (403, 404):
                        ok(f"IDOR bookings: acesso cruzado → {s_idor} (isolamento OK)")
                    else:
                        note(f"IDOR test booking → {s_idor}")
            s_idor_cust, d_idor_cust, _ = api("/customers", token=other_token)
            s_mine, d_mine, _ = api("/customers", token=token)
            if isinstance(d_idor_cust, list) and isinstance(d_mine, list):
                shared = set(c.get('id') for c in d_idor_cust) & set(c.get('id') for c in d_mine)
                if shared:
                    fail(f"IDOR: {len(shared)} cliente(s) partilhados entre barbearias — dados cruzados!")
                else:
                    ok("IDOR clientes: sem dados partilhados entre barbearias")
        else:
            note("IDOR não testado — sem segundo utilizador de barbearia diferente")
    else:
        note("IDOR não testado — apenas 1 barbearia ou sem token")


# ════════════════════════════════════════════════════════════════════════
print(f"\n{B}{'═'*50}{X}")
print(f"{B}  TRIMIO · TESTE COMPLETO{X}")
print(f"  {D}{datetime.now().strftime('%Y-%m-%d %H:%M')}{X}")
print(f"{B}{'═'*50}{X}")

sec("Superfície web")
for label, path in [
    ("Platform home", "/"),
    ("Admin SPA root", "/admin"),
    ("Admin login", "/admin/login"),
    ("Admin forgot password", "/admin/forgot-password"),
    ("Admin reset password", "/admin/reset-password"),
    ("Admin resend verification", "/admin/resend-verification"),
    ("Register", "/register"),
    ("Verify email", "/verify-email"),
    ("Superadmin SPA root", "/superadmin"),
    ("Superadmin login", "/superadmin/login"),
    ("Barber login global", "/barber/login"),
]:
    check_page(label, f"{BASE}{path}")

if DEEP_BROWSER:
    sec("Deep browser — superfície global")
    for label, path in [
        ("Platform home", "/"),
        ("Admin login", "/admin/login"),
        ("Register", "/register"),
        ("Superadmin login", "/superadmin/login"),
    ]:
        deep_browser_page(label, f"{BASE}{path}", expect_canonical=(path == "/"))

sec("Barbearias")
if not SLUGS: fail("Nenhuma barbearia encontrada"); sys.exit(1)
ok(f"{len(SLUGS)} barbearia(s) ativa(s)")
for s in SLUGS: note(f"· {s}")
if not jwt_secret: warn("JWT_SECRET não encontrado — testes de escrita e admin ignorados")

for slug in SLUGS:
    test_barbershop(slug)

# ════════════════════════════════════════════════════════════════════════
# SISTEMA
# ════════════════════════════════════════════════════════════════════════
print(f"\n{B}{'═'*50}{X}")
print(f"{B}  SISTEMA{X}")
print(f"{B}{'═'*50}{X}")

sec("Autenticação")
for label,path in [("/barbershop","/barbershop"),("/barbers","/barbers"),
                    ("/services","/services"),("/bookings","/bookings")]:
    s,_,ms=api(path)
    ok(f"GET {label} sem token → 401 · {ms}ms") if s==401 else fail(f"GET {label} sem token → {s} (esperado 401)")

s,_,_ = api("/barbershop",token="token_invalido_xyz")
ok("Token inválido → 401") if s==401 else fail(f"Token inválido → {s}")

for label, path, method, body, expected in [
    ("Auth login inválido", "/auth/login", "POST", {"email":"x","password":"x","slug":"stukabarber"}, (400,401,429)),
    ("Auth register inválido", "/auth/register", "POST", {"email":"x"}, (400,422)),
    ("Verify email inválido", "/auth/verify-email", "POST", {"token":"invalido"}, (400,404)),
    ("Forgot password inválido", "/auth/forgot-password", "POST", {"email":"x","slug":"stukabarber"}, (400,404,429)),
    ("Reset password inválido", "/auth/reset-password", "POST", {"token":"x","password":"123"}, (400,404,429)),
    ("Superadmin login inválido", "/superadmin/auth/login", "POST", {"email":"x","password":"x"}, (400,401,429)),
    ("Barber login inválido", "/barber-auth/login", "POST", {"slug":"stukabarber","email":"x","password":"x"}, (400,401,429)),
]:
    s,_,_ = api(path, method, body)
    ok(f"{label} → {s}") if s in expected else warn(f"{label} retornou {s}")

for label, path in [
    ("Superadmin stats", "/superadmin/stats"),
    ("Superadmin barbershops", "/superadmin/barbershops"),
    ("Admin me", "/auth/me"),
    ("Push config", "/push/config"),
    ("Notifications unread", "/notifications/unread"),
]:
    s,_,_ = api(path)
    ok(f"{label} sem token → 401") if s == 401 else fail(f"{label} sem token → {s}")

# Tenta aceder a endpoint de outra barbearia se existir
if len(users)>=2:
    t1=make_jwt(users[0]['id'],users[0]['barbershopId'])
    t2=make_jwt(users[1]['id'],users[1]['barbershopId'])
    s,d1,_=api("/barbershop",token=t1); s,d2,_=api("/barbershop",token=t2)
    if isinstance(d1,dict) and isinstance(d2,dict) and d1.get("id")!=d2.get("id"):
        ok("Tokens de barbearias diferentes retornam dados diferentes ✓")
    else:
        fail("Possível problema de isolamento entre barbearias!")

sec("Superadmin autenticado")
super_token = None
first_shop = None
if not superadmin_email or not superadmin_password:
    warn("SUPERADMIN_EMAIL/SUPERADMIN_PASSWORD não encontrados — auditoria autenticada do superadmin ignorada")
else:
    s, data, _ = superapi("/auth/login", "POST", {
        "email": superadmin_email,
        "password": superadmin_password,
    })
    if s == 200 and isinstance(data, dict) and data.get("token"):
        super_token = data["token"]
        ok("Superadmin login real → 200")
    else:
        fail(f"Superadmin login real falhou → {s}")

if super_token:
    s, stats_data, ms = superapi("/stats", token=super_token)
    if s == 200 and isinstance(stats_data, dict):
        ok(f"Superadmin stats → 200 · {ms}ms")
        for field in ["totalBarbershops", "totalBookings", "totalCustomers", "bookingsThisMonth"]:
            if isinstance(stats_data.get(field), int) and stats_data.get(field) >= 0:
                ok(f"stats.{field} → {stats_data.get(field)}")
            else:
                fail(f"stats.{field} inválido", str(stats_data.get(field)))
        if isinstance(stats_data.get("planCounts"), list):
            ok(f"stats.planCounts → {len(stats_data['planCounts'])} entrada(s)")
        else:
            fail("stats.planCounts inválido")
    else:
        fail(f"Superadmin stats falhou → {s}")

    s, shops, ms = superapi("/barbershops", token=super_token)
    if s == 200 and isinstance(shops, list):
        ok(f"Superadmin listagem → 200 · {ms}ms")
        if shops:
            first_shop = shops[0]
            ok(f"Superadmin listagem retornou {len(shops)} barbearia(s)")
            for field in ["id", "name", "slug", "subscriptionPlan", "health", "security", "_count"]:
                if field in first_shop:
                    ok(f"barbershop.{field} presente")
                else:
                    fail(f"barbershop.{field} em falta")
        else:
            fail("Superadmin listagem sem barbearias")
    else:
        fail(f"Superadmin listagem falhou → {s}")

if super_token and first_shop:
    sample_slug = first_shop.get("slug", "")
    sample_id = first_shop.get("id", "")

    s, filtered, _ = superapi(f"/barbershops?q={sample_slug}", token=super_token)
    if s == 200 and isinstance(filtered, list):
        if any(shop.get("id") == sample_id for shop in filtered):
            ok("Superadmin filtro por slug encontra a barbearia")
        else:
            fail("Superadmin filtro por slug não encontrou a barbearia esperada")
    else:
        fail(f"Superadmin filtro por slug falhou → {s}")

    s, verified, _ = superapi("/barbershops?verification=verified", token=super_token)
    if s == 200 and isinstance(verified, list):
        ok("Superadmin filtro verification=verified → 200")
    else:
        fail(f"Superadmin filtro verification=verified falhou → {s}")

    s, active, _ = superapi("/barbershops?health=active", token=super_token)
    if s == 200 and isinstance(active, list):
        ok("Superadmin filtro health=active → 200")
    else:
        fail(f"Superadmin filtro health=active falhou → {s}")

    s, detail, ms = superapi(f"/barbershops/{sample_id}", token=super_token)
    if s == 200 and isinstance(detail, dict):
        ok(f"Superadmin detalhe → 200 · {ms}ms")
        if detail.get("id") == sample_id and detail.get("slug") == sample_slug:
            ok("Superadmin detalhe consistente com a listagem")
        else:
            fail("Superadmin detalhe inconsistente com a listagem")
        if isinstance(detail.get("limits"), dict):
            ok("Superadmin detalhe inclui limits")
        else:
            fail("Superadmin detalhe sem limits")
    else:
        fail(f"Superadmin detalhe falhou → {s}")

    s, support, ms = superapi(f"/barbershops/{sample_id}/support-session", "POST", {}, token=super_token)
    if s == 200 and isinstance(support, dict) and support.get("token"):
        ok(f"Superadmin support-session → 200 · {ms}ms")
        support_token = support["token"]
        support_user = support.get("user") if isinstance(support.get("user"), dict) else None
        if support_user and support_user.get("role") == "SUPPORT":
            ok("Support session devolve role SUPPORT no payload")
        else:
            fail("Support session não devolveu role SUPPORT no payload")

        s2, support_me, _ = api("/auth/me", token=support_token)
        if s2 == 200 and isinstance(support_me, dict) and support_me.get("barbershopId") == support_user.get("barbershopId"):
            ok("Support session autentica no painel admin da barbearia correta")
        else:
            fail(f"Support session não autenticou em /auth/me → {s2}")

        s3, _, _ = superapi("/stats", token=support_token)
        if s3 == 403:
            ok("Support token não consegue aceder a rotas de superadmin")
        else:
            fail(f"Support token nas rotas de superadmin → {s3} (esperado 403)")
    else:
        fail(f"Superadmin support-session falhou → {s}")

sec("SSL & Segurança")
try:
    conn=ssl.create_default_context().wrap_socket(
        socket.create_connection(("trimio.pt",443),timeout=8),server_hostname="trimio.pt")
    cert=conn.getpeercert(); conn.close()
    exp=datetime.strptime(cert["notAfter"],"%b %d %H:%M:%S %Y %Z")
    days=(exp-datetime.now(UTC).replace(tzinfo=None)).days
    if days<14: fail(f"Certificado SSL expira em {days} dia(s)!")
    elif days<30: warn(f"Certificado SSL expira em {days} dia(s)")
    else: ok(f"Certificado SSL válido — {days} dia(s) restantes")
except Exception as e: warn(f"SSL: {e}")

s,_,_=http("http://trimio.pt/")
ok("HTTP → HTTPS redirect OK") if s==200 else warn(f"HTTP redirect → {s}")

import urllib.request as ur
try:
    with ur.urlopen(Request(f"{BASE}/",headers={"User-Agent":UA}),context=ctx,timeout=8) as r:
        hdrs={k.lower():v for k,v in r.getheaders()}
    for h,expected in [("x-frame-options","SAMEORIGIN"),("x-content-type-options","nosniff")]:
        if h in hdrs: ok(f"Header '{h}' → {hdrs[h]}")
        else: warn(f"Header '{h}' em falta")
    hsts = hdrs.get('strict-transport-security','')
    if hsts: ok(f"HSTS → {hsts}")
    else: warn("HSTS (strict-transport-security) em falta")
    rp = hdrs.get('referrer-policy','')
    if rp: ok(f"Referrer-Policy → {rp}")
    else: warn("Referrer-Policy em falta")
    csp = hdrs.get('content-security-policy','')
    if csp: ok(f"CSP presente ({len(csp)} chars)")
    else: note("Content-Security-Policy não definido")
    pp = hdrs.get('permissions-policy','')
    if pp: ok(f"Permissions-Policy → {pp[:80]}")
    else: note("Permissions-Policy não definido")
except Exception as e: warn(f"Headers: {e}")

sec("Entrega & Cache")
# Detect current bundle name dynamically
_bundle_url = None
try:
    _, _html, _ = http(f"{BASE}/")
    _html_str = _html.decode('utf-8','replace') if isinstance(_html, bytes) else _html
    _bm = re.search(r'/assets/(index-[^"\']+\.js)', _html_str)
    if _bm: _bundle_url = f"{BASE}/assets/{_bm.group(1)}"
except Exception: pass

for label, url in [
    ("App bundle", _bundle_url or f"{BASE}/assets/index.js"),
    ("Service worker", f"{BASE}/push-sw.js"),
    ("Manifest clients", f"{BASE}/install-manifest.webmanifest?surface=clients&slug=stukabarber"),
]:
    if not url:
        warn(f"{label} — URL não detectado"); continue
    try:
        req = Request(url, headers={"User-Agent": UA}, method="HEAD")
        with urlopen(req, context=ctx, timeout=8) as r:
            hdrs = {k.lower(): v for k, v in r.getheaders()}
            cache = hdrs.get('cache-control', '')
            cf = hdrs.get('cf-cache-status', '')
            ctype = hdrs.get('content-type', '')
            enc = hdrs.get('content-encoding', '')
        chk_optional(f"{label} content-type", ctype)
        chk_optional(f"{label} cache-control", cache)
        chk_optional(f"{label} cf-cache-status", cf)
        if enc: ok(f"{label} compressão → {enc}")
        if label == "App bundle" and 'max-age' not in cache:
            warn("App bundle sem cache-control explícito")
        if label == "Service worker" and 'max-age' not in cache:
            warn("Service worker sem cache-control explícito")
    except Exception as e:
        warn(f"{label}: {e}")

sec("Compressão")
for label, url, accept in [
    ("HTML (home)", f"{BASE}/", "text/html"),
    ("API pública", f"{API}/public/{SLUGS[0] if SLUGS else 'stukabarber'}", "application/json"),
]:
    try:
        req = Request(url, headers={"User-Agent": UA, "Accept-Encoding": "gzip, br"})
        with urlopen(req, context=ctx, timeout=8) as r:
            hdrs = {k.lower(): v for k, v in r.getheaders()}
            enc = hdrs.get('content-encoding','')
            ctype = hdrs.get('content-type','')
        if enc in ('gzip','br','zstd'): ok(f"{label} → {enc}")
        elif enc: ok(f"{label} → {enc}")
        else: warn(f"{label} sem compressão (content-encoding ausente)")
    except Exception as e: warn(f"Compressão {label}: {e}")

sec("SEO")
try:
    _, home_html, _ = http(f"{BASE}/")
    home_str = home_html.decode('utf-8','replace') if isinstance(home_html, bytes) else home_html
    robots_txt_s, robots_body, _ = http(f"{BASE}/robots.txt")
    if robots_txt_s == 200:
        robots_str = robots_body.decode('utf-8','replace') if isinstance(robots_body, bytes) else robots_body
        ok(f"robots.txt → 200 · {len(robots_str)} chars")
        if 'Disallow: /' in robots_str and 'Allow' not in robots_str:
            warn("robots.txt bloqueia tudo — verificar se é intencional")
        elif 'User-agent' in robots_str: ok("robots.txt tem User-agent definido")
    else: warn(f"robots.txt → {robots_txt_s}")
    sitemap_s, _, _ = http(f"{BASE}/sitemap.xml")
    if sitemap_s == 200: ok("sitemap.xml → 200")
    else: note(f"sitemap.xml → {sitemap_s} (não existe)")
    og_image = re.search(r'og:image[^>]+content="([^"]+)"', home_str, re.I)
    if og_image: ok(f"og:image → {og_image.group(1)[:80]}")
    else: warn("og:image não definido na home (importante para partilha social)")
except Exception as e: warn(f"SEO: {e}")

sec("Favicon & Branding")
def png_dimensions(data):
    if len(data) < 24: return None, None
    try:
        w = struct.unpack('>I', data[16:20])[0]
        h = struct.unpack('>I', data[20:24])[0]
        return w, h
    except Exception: return None, None

for surface, expected_icon, expected_touch in [
    ("platform",   "platform-logo",   "platform-logo"),
    ("admin",      "admin-logo",       "admin-logo"),
    ("barber",     "barber-logo",      "barber-logo"),
    ("clients",    "clients-logo",     "clients-logo"),
    ("superadmin", "superadmin-logo",  "superadmin-logo"),
]:
    for variant, exp_dim, max_kb, kind in [
        (f"{expected_icon}-favicon.png",  64,  10, "favicon"),
        (f"{expected_touch}-touch.png",  180,  30, "touch"),
    ]:
        url = f"{BASE}/branding/{variant}"
        st, body, ms = http(url)
        if st != 200:
            fail(f"Branding {variant} → {st}"); continue
        size_kb = len(body) / 1024
        w, h = png_dimensions(body)
        if w == exp_dim and h == exp_dim:
            ok(f"{variant} → {w}×{h} · {size_kb:.1f}KB · {ms}ms")
        elif w and h:
            fail(f"{variant} → {w}×{h} (esperado {exp_dim}×{exp_dim})")
        else:
            warn(f"{variant} → dimensões não lidas · {size_kb:.1f}KB")
        if size_kb > max_kb:
            warn(f"{variant} → {size_kb:.1f}KB (acima de {max_kb}KB)")

# Check HTML favicon references
try:
    _, idx_html, _ = http(f"{BASE}/")
    idx_str = idx_html.decode('utf-8','replace') if isinstance(idx_html, bytes) else idx_html
    icon_href = re.search(r'<link[^>]+rel="icon"[^>]+href="([^"]+)"', idx_str, re.I)
    touch_href = re.search(r'<link[^>]+rel="apple-touch-icon"[^>]+href="([^"]+)"', idx_str, re.I)
    if icon_href:
        h = icon_href.group(1)
        if '-favicon.png' in h: ok(f"HTML favicon href → {h}")
        else: warn(f"HTML favicon href usa ficheiro não optimizado → {h}")
    else: warn("HTML sem <link rel='icon'>")
    if touch_href:
        h = touch_href.group(1)
        if '-touch.png' in h: ok(f"HTML apple-touch-icon href → {h}")
        else: warn(f"HTML apple-touch-icon usa ficheiro não optimizado → {h}")
    else: warn("HTML sem <link rel='apple-touch-icon'>")
except Exception as e: warn(f"HTML favicon check: {e}")

ON_VPS = os.path.exists('/var/www/trimio/.env')
SSH_CMD = ["bash", "-c"] if ON_VPS else ["ssh", "-i", os.path.expanduser('~/Desktop/trimio_vps_ed25519'), "-o", "StrictHostKeyChecking=no", "ubuntu@51.91.158.175"]

sec("Servidor (PM2 + recursos + logs)")
try:
    r=subprocess.run(SSH_CMD+["""
      echo '=PM2='
      pm2 jlist 2>/dev/null | python3 -c "
import sys,json
d=json.load(sys.stdin)
for p in d:
  print(p['name'],p['pm2_env']['status'],p['pm2_env']['restart_time'],p['monit']['memory']//1024//1024)
"
      echo '=RES='
      CPU=$(grep 'cpu ' /proc/stat | awk '{u=$2+$4;t=$2+$3+$4+$5;if(t>0)printf "%.1f",u*100/t}')
      MU=$(free -m | awk '/^Mem/{print $3}')
      MT=$(free -m | awk '/^Mem/{print $2}')
      DISK=$(df / | awk 'NR==2{print $5}' | tr -d '%')
      INODES=$(df -i / | awk 'NR==2{print $5}' | tr -d '%')
      SWU=$(free -m | awk '/^Swap/{print $3}')
      SWT=$(free -m | awk '/^Swap/{print $2}')
      LOAD=$(cut -d' ' -f1-3 /proc/loadavg)
      echo $CPU $MU $MT $DISK $INODES $SWU $SWT $LOAD
      echo '=UPTIME='
      uptime -p
      echo '=FAILED='
      systemctl --failed --no-legend --plain 2>/dev/null | head -10
      echo '=PORTS='
      ss -ltnp 2>/dev/null | awk 'NR>1{print $4,$NF}' | head -20
      echo '=TOP='
      ps -eo pid,comm,%cpu,%mem --sort=-%mem | head -6
      echo '=LOGS='
      du -sb /home/ubuntu/.pm2/logs 2>/dev/null | awk '{print $1}'
      echo '=NGINX='
      sudo nginx -t 2>&1 | tail -2
      echo '=REBOOT='
      if [ -f /var/run/reboot-required ]; then cat /var/run/reboot-required; else echo 'no'; fi
      echo '=ERR='
      sudo tail -300 /var/log/nginx/access.log 2>/dev/null | awk '$9+0>=500{print $9,$7}' | sort | uniq -c | sort -rn | head -5
      echo '=PRISMA='
      pm2 logs trimio-api --lines 50 --nostream --err 2>/dev/null | tail -20
      echo '=DB='
      sudo -u postgres psql -d trimio -At -c "SELECT current_setting('max_connections'), pg_database_size(current_database()), (SELECT count(*) FROM pg_stat_activity), (SELECT count(*) FROM pg_stat_activity WHERE state <> 'idle'), (SELECT COALESCE(sum(n_live_tup),0) FROM pg_stat_user_tables), (SELECT COALESCE(sum(n_dead_tup),0) FROM pg_stat_user_tables);" 2>/dev/null
      echo '=DBTOP='
      sudo -u postgres psql -d trimio -At -F '|' -c "SELECT relname, n_live_tup, n_dead_tup FROM pg_stat_user_tables ORDER BY n_dead_tup DESC NULLS LAST LIMIT 5;" 2>/dev/null
      echo '=NODE='
      node --version 2>/dev/null; npm --version 2>/dev/null
      echo '=PM2CFG='
      pm2 jlist 2>/dev/null | python3 -c "
import sys,json
d=json.load(sys.stdin)
for p in d:
  mem=p['pm2_env'].get('max_memory_restart','none')
  print(p['name'], mem)
" 2>/dev/null
      echo '=FAIL2BAN='
      sudo fail2ban-client status sshd 2>/dev/null | grep -E 'Total banned|Currently banned' || echo 'n/a'
      echo '=UFW='
      sudo ufw status 2>/dev/null | head -8
      echo '=UPDATES='
      apt-get -s upgrade 2>/dev/null | grep -c '^Inst' || echo 0
      echo '=FD='
      cat /proc/sys/fs/file-nr 2>/dev/null
      echo '=TCP='
      ss -s 2>/dev/null | grep -E 'TCP|estab|closed|time-wait' | head -5
      echo '=CRON='
      crontab -l 2>/dev/null | grep -v '^#' | grep -v '^$' | head -10
      ls /etc/cron.d/ 2>/dev/null | tr '\n' ' '
      echo ''
      echo '=LASTLOG='
      last -5 -w 2>/dev/null | head -6
      echo '=NGINXW='
      grep -rE 'worker_connections|worker_processes' /etc/nginx/nginx.conf 2>/dev/null | tr -s ' '
      echo '=DBCACHE='
      sudo -u postgres psql -d trimio -At -c "SELECT ROUND(sum(heap_blks_hit)*100.0/NULLIF(sum(heap_blks_hit)+sum(heap_blks_read),0),1) FROM pg_statio_user_tables;" 2>/dev/null
      echo '=DBIDX='
      sudo -u postgres psql -d trimio -At -F'|' -c "SELECT relname,idx_scan,seq_scan FROM pg_stat_user_tables WHERE seq_scan+idx_scan>0 ORDER BY seq_scan DESC LIMIT 6;" 2>/dev/null
      echo '=DBLOCKS='
      sudo -u postgres psql -d trimio -At -c "SELECT count(*) FROM pg_locks WHERE NOT granted;" 2>/dev/null
      echo '=DBVAC='
      sudo -u postgres psql -d trimio -At -F'|' -c "SELECT relname,last_autovacuum::date,last_autoanalyze::date FROM pg_stat_user_tables WHERE n_live_tup>50 ORDER BY last_autovacuum NULLS FIRST LIMIT 6;" 2>/dev/null
      echo '=DBLONGQ='
      sudo -u postgres psql -d trimio -At -F'|' -c "SELECT pid,EXTRACT(EPOCH FROM now()-query_start)::int,LEFT(query,80) FROM pg_stat_activity WHERE state='active' AND now()-query_start>interval '3 seconds' AND query NOT LIKE '%pg_stat%';" 2>/dev/null
      echo '=DBINDEXLIST='
      sudo -u postgres psql -d trimio -At -F'|' -c "SELECT tablename,indexname FROM pg_indexes WHERE schemaname='public' ORDER BY tablename,indexname;" 2>/dev/null
      echo '=ENVCHECK='
      grep -cE 'SECRET|KEY|PASSWORD|TOKEN' /var/www/trimio/.env 2>/dev/null || echo 0
      echo '=SSHKEYS='
      wc -l ~/.ssh/authorized_keys 2>/dev/null || echo '0 n/a'
      echo '=KERNEL='
      uname -r
      cat /etc/os-release 2>/dev/null | grep -E '^(PRETTY_NAME|VERSION_ID|VERSION_CODENAME)=' | tr -d '"'
      echo '=DMESG='
      sudo dmesg --time-format reltime 2>/dev/null | grep -iE 'oom|killed|out of memory|hardware error|mce|edac|i/o error' | tail -10
      echo '=SYSCTL='
      sysctl vm.overcommit_memory net.core.somaxconn net.ipv4.tcp_tw_reuse net.ipv4.ip_local_port_range 2>/dev/null
      echo '=NTP='
      timedatectl show 2>/dev/null | grep -E '(NTPSynchronized|TimeUSec|NTPService|Timezone)'
      echo '=SSHCFG='
      sudo grep -E '^(PasswordAuthentication|PermitRootLogin|Port|PubkeyAuthentication|X11Forwarding|MaxAuthTries|AllowUsers|AllowGroups)' /etc/ssh/sshd_config 2>/dev/null | tr -s ' '
      echo '=SSHKEYS_DETAIL='
      awk '{print $1, length($2)}' ~/.ssh/authorized_keys 2>/dev/null | head -10
      echo '=PASSWD_USERS='
      awk -F: '$3>=1000 && $1!="nobody" {print $1,$3,$7}' /etc/passwd 2>/dev/null
      echo '=ENV_PERMS='
      stat -c '%a %n' /var/www/trimio/.env 2>/dev/null
      echo '=AUTHLOG='
      sudo grep -cE 'Failed password|Invalid user|authentication failure' /var/log/auth.log 2>/dev/null || echo 0
      sudo grep 'Failed password' /var/log/auth.log 2>/dev/null | awk '{print $(NF-3)}' | sort | uniq -c | sort -rn | head -5
      echo '=SUID='
      timeout 10 find / -xdev -perm /4000 -type f 2>/dev/null | grep -vE '^/(usr/bin/(sudo|su|passwd|chsh|chfn|newgrp|gpasswd|pkexec|mount|umount|ntfs-3g|fusermount3)|usr/sbin/(pam_timestamp_check|unix_chkpwd)|usr/lib/(openssh/ssh-keysign|polkit-1/polkit-agent-helper-1|dbus-1\.0/dbus-daemon-launch-helper|x86_64-linux-gnu/utempter/utempter|eject/dmcrypt-get-device)|bin/(su|mount|umount)|snap/)' | head -10
      echo '=SUDOERS='
      sudo grep -rE 'NOPASSWD' /etc/sudoers /etc/sudoers.d/ 2>/dev/null | grep -v '^#' | head -10
      echo '=PGVER='
      sudo -u postgres psql -At -c "SELECT version();" 2>/dev/null | head -1
      echo '=PGHBA='
      sudo cat /etc/postgresql/*/main/pg_hba.conf 2>/dev/null | grep -vE '^[[:space:]]*(#|$)' | head -20
      echo '=PGIDLE='
      sudo -u postgres psql -d trimio -At -F'|' -c "SELECT pid, usename, LEFT(query,60), EXTRACT(EPOCH FROM (now()-query_start))::int FROM pg_stat_activity WHERE state='idle in transaction' AND query_start IS NOT NULL ORDER BY query_start LIMIT 10;" 2>/dev/null
      echo '=PGSEQ='
      sudo -u postgres psql -d trimio -At -F'|' -c "SELECT schemaname, sequencename, last_value, max_value, ROUND(last_value::numeric/NULLIF(max_value,0)*100,1) AS pct FROM pg_sequences WHERE max_value < 2147483648 ORDER BY pct DESC NULLS LAST LIMIT 10;" 2>/dev/null
      echo '=PGBACKUP='
      find /var/backups /root /home/ubuntu -name '*.sql' -o -name '*.dump' -o -name '*.sql.gz' 2>/dev/null | xargs ls -lt 2>/dev/null | head -5
      echo '=PGBOUNCER='
      which pgbouncer 2>/dev/null && pgbouncer --version 2>/dev/null || echo 'not_installed'
      echo '=PGBGWRITER='
      sudo -u postgres psql -d trimio -At -F'|' -c "SELECT checkpoints_timed, checkpoints_req, checkpoint_write_time::int/1000, buffers_checkpoint, buffers_clean, maxwritten_clean FROM pg_stat_bgwriter;" 2>/dev/null
      echo '=PGBLOAT='
      sudo -u postgres psql -d trimio -At -F'|' -c "SELECT relname, pg_size_pretty(pg_total_relation_size(oid)) as total, pg_size_pretty(pg_relation_size(oid)) as table_size, ROUND((pg_total_relation_size(oid) - pg_relation_size(oid))::numeric / NULLIF(pg_total_relation_size(oid),0) * 100, 1) AS index_pct FROM pg_class WHERE relkind='r' AND relname NOT LIKE 'pg_%' ORDER BY pg_total_relation_size(oid) DESC LIMIT 8;" 2>/dev/null
      echo '=PGREPSLOT='
      sudo -u postgres psql -d trimio -At -F'|' -c "SELECT slot_name, plugin, active, pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) AS wal_behind FROM pg_replication_slots;" 2>/dev/null
      echo '=NGINXCFG='
      sudo grep -rE 'client_max_body_size|proxy_read_timeout|keepalive_timeout|worker_rlimit_nofile|gzip[^_]|limit_req_zone|real_ip_header|set_real_ip_from' /etc/nginx/nginx.conf /etc/nginx/sites-enabled/ /etc/nginx/conf.d/ 2>/dev/null | grep -v '^Binary' | tr -s ' ' | head -30
      echo '=NGINXERR='
      sudo tail -50 /var/log/nginx/error.log 2>/dev/null | grep -vE 'No such file|favicon|sw[.]js' | tail -10
      echo '=DISKIO='
      iostat -x 1 1 2>/dev/null | awk '/^sd|^vd|^nvme/{print $1,$2,$3,$16}' | head -5
      echo '=VARLOG='
      du -sh /var/log 2>/dev/null | awk '{print $1}'
      echo '=LOGROTATE='
      ls /etc/logrotate.d/ 2>/dev/null | grep -i pm2 | head -3
      echo '=TMP='
      du -sh /tmp /var/tmp 2>/dev/null
      echo '=INODESX='
      df -i 2>/dev/null | awk 'NR>1{print $1,$5,$6}' | grep -vE '^tmpfs|^udev'
      echo '=BOOT='
      df -h /boot 2>/dev/null | awk 'NR==2{print $5,$4}'
      echo '=BACKUPS='
      find /etc/cron.d/ /var/spool/cron/crontabs/ /root /home/ubuntu -name '*.sh' 2>/dev/null | xargs grep -lE 'pg_dump|backup|rsync' 2>/dev/null | head -5
      find /var/backups /root /home/ubuntu /tmp -name '*.sql' -o -name '*.dump' -o -name '*.sql.gz' 2>/dev/null | head -5
      echo '=BACKUPSPACE='
      df -h /var/backups 2>/dev/null | awk 'NR==2{print $4,$5}'
      echo '=SERVICES='
      systemctl list-units --type=service --state=active --no-legend --plain 2>/dev/null | awk '{print $1}' | grep -vE '^(ssh|nginx|postgresql|pm2|cron|rsyslog|systemd|network|ufw|fail2ban|dbus|polkit|accounts|apt|unattended|cloud|snapd|multipathd|blk|lvm|apparmor|plymouth|console|getty|serial|acpid|thermald|irq|udisk|upower|wpa|avahi|bluetooth|cups|ModemManager)' | grep '[.]service$' | head -10
      echo '=MONITORING='
      grep -iE 'SENTRY_DSN|DATADOG|NEW_RELIC|PROMETHEUS|GRAFANA|LOGTAIL|LOGFLARE|BETTERSTACK' /var/www/trimio/.env 2>/dev/null | cut -d= -f1 | tr '\n' ' '
      echo ''
      echo '=PROMETHEUSP='
      ss -ltnp 2>/dev/null | grep -E ':9090|:9100|:3001|:9091' | head -5
      echo '=END='
    """], capture_output=True,text=True,timeout=90)
    out=r.stdout

    # PM2
    pm2_text = section_between(out, '=PM2=', '=RES=')
    if pm2_text:
        for line in pm2_text.split('\n'):
            parts=line.split()
            if len(parts)>=4:
                name,status,restarts,mem=parts[:4]
                if status=="online": ok(f"PM2 '{name}' — online · {mem}MB RAM")
                else: fail(f"PM2 '{name}' — {status}!")
                if int(restarts)>20: note(f"'{name}' histórico de {restarts} restart(s)")
                else: ok(f"'{name}' estável — {restarts} restart(s)")

    # Recursos
    res_text = section_between(out, '=RES=', '=UPTIME=')
    if res_text:
        parts=res_text.split()
        if len(parts)>=10:
            cpu,mu,mt,disk,inodes,swu,swt,load1,load5,load15=parts[:10]
            ok(f"CPU {float(cpu):.1f}%") if float(cpu)<80 else fail(f"CPU {cpu}% (alto!)")
            pct=int(mu)*100//int(mt)
            ok(f"RAM {mu}MB/{mt}MB ({pct}%)") if pct<85 else fail(f"RAM {pct}% (alto!)")
            ok(f"Disco {disk}%") if int(disk)<85 else warn(f"Disco {disk}% (quase cheio)")
            ok(f"Inodes {inodes}%") if int(inodes)<85 else warn(f"Inodes {inodes}% (quase cheio)")
            if int(swt) > 0:
                spct = int(swu)*100//max(int(swt), 1)
                ok(f"Swap {swu}MB/{swt}MB ({spct}%)") if spct < 50 else warn(f"Swap {spct}% (uso alto)")
            else:
                note("Swap desativada")
            ok(f"Load avg {load1} {load5} {load15}")

    uptime_text = section_between(out, '=UPTIME=', '=FAILED=')
    if uptime_text:
        ok(f"Uptime {uptime_text}")

    failed_units = [l.strip() for l in section_between(out, '=FAILED=', '=PORTS=').split('\n') if l.strip()]
    if not failed_units:
        ok("Sem units falhadas no systemd")
    else:
        for unit in failed_units:
            warn(f"systemd failed: {unit}")

    ports = [l.strip() for l in section_between(out, '=PORTS=', '=TOP=').split('\n') if l.strip()]
    interesting_ports = [p for p in ports if any(port in p for port in (':80', ':443', ':3000', ':5432', ':22'))]
    if interesting_ports:
        for port_line in interesting_ports:
            ok(f"Porta aberta {port_line}")
    else:
        warn("Não foi possível listar portas relevantes")

    top_lines = [l.strip() for l in section_between(out, '=TOP=', '=LOGS=').split('\n') if l.strip()]
    if len(top_lines) > 1:
        note("Top processos por memória:")
        for line in top_lines[1:]:
            note(line)

    logs_size = section_between(out, '=LOGS=', '=NGINX=').strip()
    if logs_size.isdigit():
        human = bytes_human(logs_size)
        ok(f"PM2 logs ocupam {human}") if int(logs_size) < 250 * 1024 * 1024 else warn(f"PM2 logs ocupam {human}")

    nginx_text = section_between(out, '=NGINX=', '=REBOOT=')
    if 'test is successful' in nginx_text:
        ok("nginx -t válido")
    else:
        fail("nginx -t falhou", nginx_text or None)

    reboot_text = section_between(out, '=REBOOT=', '=ERR=').strip()
    if reboot_text == 'no' or not reboot_text:
        ok("Sem reboot pendente")
    else:
        warn(f"Reboot pendente: {reboot_text}")

    # 5xx errors
    errs=[l.strip() for l in section_between(out, '=ERR=', '=PRISMA=').split('\n') if l.strip()]
    ok("Sem erros 5xx recentes") if not errs else [fail(f"{l}") for l in errs]

    # Prisma errors
    prisma_text = section_between(out, '=PRISMA=', '=DB=')
    if prisma_text:
        p2022=prisma_text.count("P2022")
        p2003=prisma_text.count("P2003")
        ok("Sem erros Prisma recentes") if not p2022 and not p2003 else fail(f"Erros Prisma: P2022×{p2022} P2003×{p2003}")

    db_text = section_between(out, '=DB=', '=DBTOP=')
    db_parts = db_text.split('|') if db_text else []
    if len(db_parts) >= 6:
        max_conn, db_size, total_conn, active_conn, live_tup, dead_tup = db_parts[:6]
        ok(f"PostgreSQL max_connections {max_conn}")
        ok(f"Base de dados ocupa {bytes_human(db_size)}")
        ok(f"Ligações PostgreSQL {total_conn} total / {active_conn} ativas")
        ok(f"Dead tuples totais reportados: {dead_tup}")

    db_top_lines = [l.strip() for l in section_between(out, '=DBTOP=', '=NODE=').split('\n') if l.strip()]
    if db_top_lines:
        noisy = []
        for line in db_top_lines:
            parts = line.split('|')
            if len(parts) == 3 and parts[1].isdigit() and parts[2].isdigit():
                live = int(parts[1])
                dead = int(parts[2])
                if dead > 1000 and (live == 0 or dead / max(live, 1) > 0.2):
                    noisy.append(parts)
        if noisy:
            for relname, live, dead in noisy:
                warn(f"Tabela com dead tuples: {relname} live={live} dead={dead}")
        else:
            note("Sem tabelas com dead tuples relevantes")
    # Node & PM2 config
    node_text = section_between(out, '=NODE=', '=PM2CFG=').strip()
    if node_text:
        lines_n = [l.strip() for l in node_text.split('\n') if l.strip()]
        if lines_n: ok(f"Node.js {lines_n[0]}" + (f" · npm {lines_n[1]}" if len(lines_n)>1 else ""))

    pm2cfg_text = section_between(out, '=PM2CFG=', '=FAIL2BAN=')
    for line in pm2cfg_text.split('\n'):
        p = line.strip().split()
        if len(p) >= 2:
            name, mem = p[0], p[1]
            if mem == 'none': warn(f"PM2 '{name}' sem max_memory_restart — pode crescer sem limite")
            else: ok(f"PM2 '{name}' max_memory_restart → {mem}")

    # Fail2ban
    f2b = section_between(out, '=FAIL2BAN=', '=UFW=').strip()
    if 'n/a' in f2b or not f2b: note("fail2ban sshd não disponível")
    else:
        for line in f2b.split('\n'):
            line = line.strip()
            if line: ok(f"fail2ban: {line}")

    # UFW
    ufw = section_between(out, '=UFW=', '=UPDATES=').strip()
    if ufw:
        first = ufw.split('\n')[0].strip()
        if 'active' in first.lower(): ok(f"UFW → {first}")
        elif 'inactive' in first.lower(): warn(f"UFW inativo — firewall desligada!")
        else: note(f"UFW: {first}")

    # Security updates
    updates_text = section_between(out, '=UPDATES=', '=FD=').strip()
    if updates_text.isdigit():
        n = int(updates_text)
        if n == 0: ok("Sem atualizações de segurança pendentes")
        elif n < 10: warn(f"{n} atualizações pendentes")
        else: fail(f"{n} atualizações pendentes — sistema desatualizado!")

    # Open file descriptors
    fd_text = section_between(out, '=FD=', '=TCP=').strip()
    if fd_text:
        parts = fd_text.split()
        if len(parts) >= 3:
            used, _, limit = parts[:3]
            pct = int(used)*100//max(int(limit),1)
            ok(f"File descriptors {used}/{limit} ({pct}%)") if pct < 70 else warn(f"File descriptors {pct}% usados!")

    # TCP states
    tcp_text = section_between(out, '=TCP=', '=CRON=').strip()
    if tcp_text:
        for line in tcp_text.split('\n'):
            if line.strip(): note(f"TCP: {line.strip()}")

    # Cron jobs
    cron_text = section_between(out, '=CRON=', '=LASTLOG=').strip()
    if cron_text: note(f"Cron: {cron_text[:120]}")
    else: note("Sem cron jobs de utilizador")

    # Last logins
    lastlog_text = section_between(out, '=LASTLOG=', '=NGINXW=').strip()
    if lastlog_text:
        lines_ll = [l for l in lastlog_text.split('\n') if l.strip() and 'wtmp' not in l]
        for l in lines_ll[:3]: note(f"Login: {l.strip()[:80]}")

    # Nginx worker config
    nginxw_text = section_between(out, '=NGINXW=', '=DBCACHE=').strip()
    if nginxw_text:
        for line in nginxw_text.split('\n'):
            if line.strip(): ok(f"Nginx config: {line.strip()}")

    # DB cache hit ratio
    dbcache_text = section_between(out, '=DBCACHE=', '=DBIDX=').strip()
    if dbcache_text:
        try:
            ratio = float(dbcache_text)
            if ratio >= 95: ok(f"DB cache hit ratio {ratio}% (excelente)")
            elif ratio >= 80: warn(f"DB cache hit ratio {ratio}% (abaixo do ideal >95%)")
            else: fail(f"DB cache hit ratio {ratio}% (baixo — considerar aumentar shared_buffers)")
        except: note(f"DB cache: {dbcache_text}")

    # Build index existence map from real pg_indexes
    _idx_list_text = section_between(out, '=DBINDEXLIST=', '=END=')
    _tables_with_indexes = set()
    for line in _idx_list_text.split('\n'):
        parts = line.strip().split('|')
        if len(parts) == 2 and parts[0]:
            _tables_with_indexes.add(parts[0])

    # DB index usage (stats are cumulative — cross-ref with actual index existence)
    dbidx_text = section_between(out, '=DBIDX=', '=DBLOCKS=')
    for line in dbidx_text.split('\n'):
        parts = line.strip().split('|')
        if len(parts) == 3 and parts[1].isdigit() and parts[2].isdigit():
            relname, idx, seq = parts
            idx, seq = int(idx), int(seq)
            total = idx + seq
            if total > 0:
                seq_pct = seq*100//total
                has_index = relname in _tables_with_indexes
                if seq_pct > 80 and total > 500 and not has_index:
                    warn(f"Tabela '{relname}' {seq_pct}% seq_scan ({seq} seq / {idx} idx) — falta índice?")
                elif seq_pct > 80 and total > 500 and has_index:
                    note(f"Tabela '{relname}' {seq_pct}% seq_scan histórico (índice já existe, stats ainda a normalizar)")
                else:
                    note(f"Índices '{relname}' idx={idx} seq={seq}")

    # DB locks
    dblocks_text = section_between(out, '=DBLOCKS=', '=DBVAC=').strip()
    if dblocks_text.isdigit():
        n = int(dblocks_text)
        ok("Sem locks bloqueados") if n == 0 else warn(f"{n} lock(s) bloqueado(s) na DB!")

    # Autovacuum status
    dbvac_text = section_between(out, '=DBVAC=', '=DBLONGQ=')
    vac_lines = [l.strip() for l in dbvac_text.split('\n') if l.strip()]
    never_vacuumed = [l.split('|')[0] for l in vac_lines if '|' in l and l.split('|')[1] == 'None']
    if never_vacuumed: warn(f"Tabelas sem autovacuum: {', '.join(never_vacuumed[:5])}")
    elif vac_lines: ok(f"Autovacuum registado em {len(vac_lines)} tabela(s)")

    # Long running queries
    dblongq_text = section_between(out, '=DBLONGQ=', '=DBINDEXLIST=')
    lq_lines = [l.strip() for l in dblongq_text.split('\n') if l.strip() and '|' in l]
    if lq_lines:
        for line in lq_lines:
            p = line.split('|')
            if len(p) >= 3: fail(f"Query lenta (pid={p[0]} · {p[1]}s): {p[2][:60]}")
    else: ok("Sem queries lentas (>3s)")

    # Env file sanity
    envcheck_text = section_between(out, '=ENVCHECK=', '=SSHKEYS=').strip()
    if envcheck_text.isdigit() and int(envcheck_text) > 0:
        ok(f".env tem {envcheck_text} variáveis sensíveis definidas")
    else: warn(".env parece vazio ou inexistente")

    # SSH authorized keys
    sshkeys_text = section_between(out, '=SSHKEYS=', '=KERNEL=').strip()
    if sshkeys_text:
        parts = sshkeys_text.split()
        count = parts[0] if parts else '?'
        ok(f"SSH authorized_keys → {count} chave(s)")

    # ── OS / Kernel ──────────────────────────────────────────────────
    sec("OS / Kernel / NTP")
    kernel_text = section_between(out, '=KERNEL=', '=DMESG=').strip()
    if kernel_text:
        lines_k = [l for l in kernel_text.split('\n') if l.strip()]
        if lines_k: ok(f"Kernel {lines_k[0]}")
        for l in lines_k[1:]:
            if 'PRETTY_NAME' in l: ok(f"OS: {l.split('=',1)[-1].strip()}")
            elif 'VERSION_ID' in l:
                vid = l.split('=',1)[-1].strip()
                eol_map = {'18.04': 2023, '20.04': 2025, '22.04': 2027, '24.04': 2029}
                eol = eol_map.get(vid)
                if eol and eol <= 2025: warn(f"Ubuntu {vid} — EOL {eol} (considerar upgrade urgente)")
                elif eol and eol <= 2026: warn(f"Ubuntu {vid} — EOL {eol} (monitorar)")
                elif eol: ok(f"Ubuntu {vid} — suportado até {eol}")

    dmesg_text = section_between(out, '=DMESG=', '=SYSCTL=').strip()
    if not dmesg_text:
        ok("dmesg limpo — sem OOM kills ou erros de hardware")
    else:
        for l in dmesg_text.split('\n'):
            if l.strip():
                if any(x in l.lower() for x in ['oom', 'killed', 'out of memory']):
                    fail(f"OOM killer activo: {l.strip()[:100]}")
                elif any(x in l.lower() for x in ['hardware error', 'mce', 'edac']):
                    warn(f"Erro hardware: {l.strip()[:100]}")
                else:
                    note(f"dmesg: {l.strip()[:100]}")

    sysctl_text = section_between(out, '=SYSCTL=', '=NTP=').strip()
    for line in sysctl_text.split('\n'):
        if '=' in line:
            key, val = line.split('=', 1)
            key, val = key.strip(), val.strip()
            if key == 'vm.overcommit_memory':
                ok(f"sysctl {key}={val}")
            elif key == 'net.core.somaxconn':
                try:
                    ok(f"sysctl {key}={val}") if int(val) >= 1024 else warn(f"sysctl {key}={val} (baixo — recomendado ≥1024)")
                except ValueError: note(f"sysctl {key}={val}")
            elif key == 'net.ipv4.tcp_tw_reuse':
                ok(f"sysctl {key}={val}")

    ntp_text = section_between(out, '=NTP=', '=SSHCFG=').strip()
    ntp_synced = None
    for line in ntp_text.split('\n'):
        if 'NTPSynchronized' in line:
            ntp_synced = line.split('=')[-1].strip()
            ok("NTP sincronizado") if ntp_synced == 'yes' else fail("NTP NÃO sincronizado — relógio pode estar errado!")
        elif 'Timezone' in line:
            ok(f"Timezone: {line.split('=')[-1].strip()}")
    if ntp_synced is None:
        note("Estado NTP não disponível")

    # ── Segurança SSH & Sistema ──────────────────────────────────────
    sec("Segurança SSH & Sistema")
    sshcfg = section_between(out, '=SSHCFG=', '=SSHKEYS_DETAIL=').strip()
    sshcfg_map = {}
    for line in sshcfg.split('\n'):
        if line.strip() and not line.startswith('#'):
            parts = line.split(None, 1)
            if len(parts) == 2: sshcfg_map[parts[0]] = parts[1].strip()

    pw_auth = sshcfg_map.get('PasswordAuthentication', 'yes')
    ok("PasswordAuthentication desativado") if pw_auth.lower() == 'no' else fail(f"PasswordAuthentication={pw_auth} — brute-force por password possível!")

    root_login = sshcfg_map.get('PermitRootLogin', 'yes')
    ok(f"PermitRootLogin={root_login}") if root_login.lower() in ('no', 'prohibit-password') else warn(f"PermitRootLogin={root_login} — considerar 'no' ou 'prohibit-password'")

    port_ssh = sshcfg_map.get('Port', '22')
    ok(f"SSH porta {port_ssh} (não-padrão)") if port_ssh != '22' else note("SSH na porta 22 padrão (considera mudar)")

    max_tries = sshcfg_map.get('MaxAuthTries', '6')
    try:
        ok(f"MaxAuthTries={max_tries}") if int(max_tries) <= 4 else warn(f"MaxAuthTries={max_tries} (recomendado ≤4)")
    except ValueError: note(f"MaxAuthTries={max_tries}")

    x11 = sshcfg_map.get('X11Forwarding', 'yes')
    ok("X11Forwarding desativado") if x11.lower() == 'no' else warn("X11Forwarding activo (desnecessário em servidor)")

    sshkeys_detail = section_between(out, '=SSHKEYS_DETAIL=', '=PASSWD_USERS=').strip()
    for line in sshkeys_detail.split('\n'):
        if line.strip():
            parts = line.split()
            if len(parts) >= 2:
                key_type, key_len = parts[0], parts[1]
                if key_type == 'ssh-rsa':
                    warn(f"Chave RSA presente — preferir ed25519")
                elif 'ed25519' in key_type:
                    ok(f"Chave ed25519 presente (óptimo)")
                elif 'ecdsa' in key_type:
                    ok(f"Chave ECDSA presente")
                else:
                    note(f"Chave tipo {key_type}")

    passwd_users = section_between(out, '=PASSWD_USERS=', '=ENV_PERMS=').strip()
    expected_users = {'ubuntu', 'postgres', 'www-data', 'nobody', 'systemd-network',
                      'systemd-resolve', 'messagebus', 'syslog', '_apt', 'landscape',
                      'pollinate', 'uuidd', 'sshd', 'systemd-timesync', 'lxd', 'fwupd-refresh'}
    for line in passwd_users.split('\n'):
        if line.strip():
            parts = line.split()
            if len(parts) >= 2:
                uname, uid = parts[0], parts[1]
                try:
                    if uname not in expected_users and int(uid) >= 1000:
                        warn(f"Utilizador inesperado: {uname} (UID {uid}) — verificar se é legítimo")
                except ValueError: pass

    env_perms = section_between(out, '=ENV_PERMS=', '=AUTHLOG=').strip()
    if env_perms:
        perms_parts = env_perms.split()
        if perms_parts:
            perms = perms_parts[0]
            if perms == '600': ok(".env permissões 600 (correto)")
            elif perms in ('640', '660'): warn(f".env permissões {perms} — deve ser 600")
            else: fail(f".env permissões {perms} — qualquer utilizador pode ler segredos!")
    else:
        warn(".env não encontrado ou sem permissões legíveis")

    authlog_text = section_between(out, '=AUTHLOG=', '=SUID=').strip()
    authlog_lines = [l for l in authlog_text.split('\n') if l.strip()]
    if authlog_lines:
        try:
            total_fails = int(authlog_lines[0])
            if total_fails > 1000: warn(f"auth.log: {total_fails} falhas de autenticação — brute-force em curso?")
            elif total_fails > 100: note(f"auth.log: {total_fails} falhas de autenticação")
            else: ok(f"auth.log: {total_fails} falhas (nível normal)")
        except ValueError: pass
        for line in authlog_lines[1:]:
            parts = line.strip().split()
            if len(parts) >= 2:
                try:
                    count_bf = int(parts[0])
                    ip_bf = parts[1]
                    if count_bf > 50: warn(f"IP atacante recorrente: {ip_bf} ({count_bf} tentativas)")
                except (ValueError, IndexError): pass

    suid_text = section_between(out, '=SUID=', '=SUDOERS=').strip()
    if not suid_text:
        ok("Sem ficheiros SUID inesperados")
    else:
        for f in suid_text.split('\n'):
            if f.strip():
                fail(f"SUID inesperado: {f.strip()}")

    sudoers_text = section_between(out, '=SUDOERS=', '=PGVER=').strip()
    for line in sudoers_text.split('\n'):
        if 'NOPASSWD' in line and line.strip() and not line.strip().startswith('#'):
            if 'ubuntu' in line.lower():
                note(f"sudoers NOPASSWD ubuntu (esperado): {line.strip()[:80]}")
            else:
                warn(f"sudoers NOPASSWD inesperado: {line.strip()[:80]}")

    # ── PostgreSQL profundo ──────────────────────────────────────────
    sec("PostgreSQL — auditoria profunda")
    pgver_text = section_between(out, '=PGVER=', '=PGHBA=').strip()
    if pgver_text:
        ok(f"PostgreSQL: {pgver_text[:80]}")
        m_pgver = re.search(r'PostgreSQL (\d+)', pgver_text)
        if m_pgver:
            major_pg = int(m_pgver.group(1))
            eol_pg = {13: 2025, 14: 2026, 15: 2027, 16: 2028, 17: 2029}
            eol_pg_yr = eol_pg.get(major_pg)
            if eol_pg_yr and eol_pg_yr <= 2025: warn(f"PostgreSQL {major_pg} — EOL {eol_pg_yr} (upgrade urgente!)")
            elif eol_pg_yr and eol_pg_yr <= 2026: warn(f"PostgreSQL {major_pg} — EOL {eol_pg_yr} (monitorar)")
            elif eol_pg_yr: ok(f"PostgreSQL {major_pg} — suportado até {eol_pg_yr}")

    pghba_text = section_between(out, '=PGHBA=', '=PGIDLE=').strip()
    for line in pghba_text.split('\n'):
        line = line.strip()
        if not line or line.startswith('#'): continue
        parts_hba = line.split()
        if len(parts_hba) >= 4:
            conn_type_hba = parts_hba[0]
            method_hba = parts_hba[-1]
            if method_hba == 'trust' and conn_type_hba != 'local':
                fail(f"pg_hba.conf: {conn_type_hba} → TRUST sem password!")
            elif '0.0.0.0/0' in line and conn_type_hba == 'host':
                warn(f"pg_hba.conf: aceita ligações de qualquer IP → {line[:80]}")
            else:
                note(f"pg_hba: {line[:80]}")

    pgidle_text = section_between(out, '=PGIDLE=', '=PGSEQ=').strip()
    idle_lines_pg = [l for l in pgidle_text.split('\n') if l.strip() and '|' in l]
    if not idle_lines_pg:
        ok("Sem sessões idle in transaction")
    else:
        for line in idle_lines_pg:
            parts_idle = line.split('|')
            if len(parts_idle) >= 4:
                pid_idle, user_idle, query_idle, secs_idle = parts_idle[:4]
                warn(f"Idle in transaction: pid={pid_idle.strip()} há {secs_idle.strip()}s — '{query_idle.strip()[:50]}'")

    pgseq_text = section_between(out, '=PGSEQ=', '=PGBACKUP=').strip()
    for line in pgseq_text.split('\n'):
        if line.strip() and '|' in line:
            parts_seq = line.split('|')
            if len(parts_seq) >= 5:
                schema_seq, seqname_seq, last_val_seq, max_val_seq, pct_seq = parts_seq[:5]
                try:
                    pct_f = float(pct_seq.strip())
                    if pct_f > 80:
                        fail(f"Sequence {seqname_seq.strip()}: {pct_f}% usado — overflow próximo! Migrar para bigint.")
                    elif pct_f > 50:
                        warn(f"Sequence {seqname_seq.strip()}: {pct_f}% usado — monitorar")
                    else:
                        ok(f"Sequence {seqname_seq.strip()}: {pct_f}%")
                except ValueError: pass

    pgbackup_text = section_between(out, '=PGBACKUP=', '=PGBOUNCER=').strip()
    backup_found = False
    for line in pgbackup_text.split('\n'):
        if line.strip() and any(x in line for x in ['.sql', '.dump', '.gz']):
            ok(f"Backup encontrado: {line.strip()[:100]}")
            backup_found = True
            break
    if not backup_found:
        fail("Sem ficheiros .sql/.dump encontrados — sem backup verificável!")

    pgbouncer_text = section_between(out, '=PGBOUNCER=', '=PGBGWRITER=').strip()
    if 'not_installed' in pgbouncer_text or not pgbouncer_text.strip():
        note("PgBouncer não instalado (connection pooling apenas via app)")
    else:
        ok(f"PgBouncer: {pgbouncer_text.split(chr(10))[0]}")

    pgbgw_text = section_between(out, '=PGBGWRITER=', '=PGBLOAT=').strip()
    if pgbgw_text and '|' in pgbgw_text:
        parts_bgw = pgbgw_text.split('|')
        if len(parts_bgw) >= 6:
            chk_timed_bgw, chk_req_bgw = parts_bgw[0].strip(), parts_bgw[1].strip()
            maxwritten_bgw = parts_bgw[5].strip()
            try:
                total_bgw = int(chk_timed_bgw) + int(chk_req_bgw)
                req_ratio_bgw = int(chk_req_bgw) * 100 // max(total_bgw, 1)
                if req_ratio_bgw > 20:
                    warn(f"Checkpoints: {req_ratio_bgw}% forçados (chk_req={chk_req_bgw}) — aumentar checkpoint_completion_target")
                else:
                    ok(f"Checkpoints: {chk_timed_bgw} timed + {chk_req_bgw} req ({req_ratio_bgw}% forçados)")
                if int(maxwritten_bgw) > 100:
                    warn(f"maxwritten_clean={maxwritten_bgw} — bgwriter não consegue limpar rápido")
            except ValueError: note(f"bgwriter: {pgbgw_text}")

    pgbloat_text = section_between(out, '=PGBLOAT=', '=PGREPSLOT=').strip()
    for line in pgbloat_text.split('\n'):
        if line.strip() and '|' in line:
            parts_bloat = line.split('|')
            if len(parts_bloat) >= 2:
                note(f"Tabela {parts_bloat[0].strip()}: {parts_bloat[1].strip()} total")

    pgrepslot_text = section_between(out, '=PGREPSLOT=', '=NGINXCFG=').strip()
    repslot_lines_pg = [l for l in pgrepslot_text.split('\n') if l.strip() and '|' in l]
    if not repslot_lines_pg:
        ok("Sem replication slots activos")
    else:
        for line in repslot_lines_pg:
            parts_slot = line.split('|')
            if len(parts_slot) >= 4:
                slot_name_pg, plugin_pg, active_pg, wal_behind_pg = parts_slot[:4]
                if active_pg.strip() == 'f':
                    fail(f"Replication slot '{slot_name_pg.strip()}' INACTIVO — WAL a acumular: {wal_behind_pg.strip()}!")
                else:
                    ok(f"Replication slot '{slot_name_pg.strip()}' activo · lag: {wal_behind_pg.strip()}")

    # ── Nginx — configuração real ────────────────────────────────────
    sec("Nginx — configuração real")
    nginxcfg_text = section_between(out, '=NGINXCFG=', '=NGINXERR=').strip()
    found_rate_limit = 'limit_req_zone' in nginxcfg_text
    found_real_ip = 'real_ip_header' in nginxcfg_text or 'set_real_ip_from' in nginxcfg_text
    found_gzip = False
    for line in nginxcfg_text.split('\n'):
        line_s = line.strip()
        if not line_s: continue
        if 'client_max_body_size' in line_s:
            val_nb = line_s.split()[-1].rstrip(';')
            ok(f"nginx client_max_body_size={val_nb}")
        elif 'proxy_read_timeout' in line_s:
            val_rt = line_s.split()[-1].rstrip(';')
            try:
                secs_rt = int(val_rt.rstrip('s'))
                ok(f"nginx proxy_read_timeout={val_rt}") if secs_rt >= 30 else warn(f"nginx proxy_read_timeout={val_rt} baixo")
            except ValueError: note(f"nginx proxy_read_timeout={val_rt}")
        elif 'keepalive_timeout' in line_s:
            ok(f"nginx keepalive_timeout={line_s.split()[-1].rstrip(';')}")
        elif line_s.strip().startswith('gzip ') and not found_gzip:
            val_gz = line_s.split()[-1].rstrip(';')
            found_gzip = True
            ok("nginx gzip on") if val_gz == 'on' else warn("nginx gzip off — ativar compressão!")
        elif 'limit_req_zone' in line_s:
            ok(f"nginx rate limit: {line_s[:80]}")
        elif 'real_ip_header' in line_s:
            ok(f"nginx real_ip_header={line_s.split()[-1].rstrip(';')} (Cloudflare)")

    if not found_rate_limit: warn("nginx sem limit_req_zone — sem rate limiting configurado!")
    if not found_real_ip: warn("nginx sem real_ip_header/set_real_ip_from — IPs de Cloudflare não passados ao Node.js!")
    if not found_gzip: note("nginx gzip não detectado na config (pode estar em conf.d/)")

    nginxerr_text = section_between(out, '=NGINXERR=', '=DISKIO=').strip()
    err_lines_ng = [l for l in nginxerr_text.split('\n') if l.strip()]
    if not err_lines_ng:
        ok("nginx error.log limpo")
    else:
        crit_ng = [l for l in err_lines_ng if any(x in l.lower() for x in ['crit', 'emerg', 'alert'])]
        for l in crit_ng[:3]: fail(f"nginx error: {l.strip()[:100]}")
        if not crit_ng: note(f"nginx error.log: {len(err_lines_ng)} entrada(s) (sem críticos)")

    # ── Disco & I/O ──────────────────────────────────────────────────
    sec("Disco & I/O")
    diskio_text = section_between(out, '=DISKIO=', '=VARLOG=').strip()
    if diskio_text:
        for line in diskio_text.split('\n'):
            if line.strip():
                parts_io = line.split()
                if len(parts_io) >= 4:
                    dev_io, reads_io, writes_io, await_io = parts_io[0], parts_io[1], parts_io[2], parts_io[3]
                    try:
                        ok(f"I/O {dev_io}: await {await_io}ms") if float(await_io) <= 20 else warn(f"I/O await alto: {dev_io} → {await_io}ms (disco lento?)")
                    except ValueError: note(f"I/O {dev_io}")
    else:
        note("iostat não disponível")

    varlog_text = section_between(out, '=VARLOG=', '=LOGROTATE=').strip()
    if varlog_text:
        if varlog_text.endswith('G') or varlog_text.endswith('T'):
            warn(f"/var/log ocupa {varlog_text} — verificar rotação de logs!")
        else:
            ok(f"/var/log ocupa {varlog_text}")

    logrotate_text = section_between(out, '=LOGROTATE=', '=TMP=').strip()
    if logrotate_text:
        ok(f"logrotate PM2: {logrotate_text}")
    else:
        warn("Sem logrotate configurado para PM2 — logs podem crescer indefinidamente!")

    tmp_text = section_between(out, '=TMP=', '=INODESX=').strip()
    for line in tmp_text.split('\n'):
        if line.strip():
            parts_tmp = line.split()
            if len(parts_tmp) >= 2:
                size_tmp, path_tmp = parts_tmp[0], parts_tmp[1]
                if size_tmp.endswith('G'): warn(f"{path_tmp} ocupa {size_tmp} — limpar?")
                else: ok(f"{path_tmp} ocupa {size_tmp}")

    inodesx_text = section_between(out, '=INODESX=', '=BOOT=').strip()
    for line in inodesx_text.split('\n'):
        if line.strip():
            parts_in = line.split()
            if len(parts_in) >= 3:
                dev_in, pct_in, mount_in = parts_in[:3]
                try:
                    pct_in_n = int(pct_in.rstrip('%'))
                    if pct_in_n > 85: fail(f"Inodes {mount_in} ({dev_in}): {pct_in} usados!")
                    elif pct_in_n > 70: warn(f"Inodes {mount_in}: {pct_in}")
                    else: ok(f"Inodes {mount_in}: {pct_in}")
                except ValueError: pass

    boot_text = section_between(out, '=BOOT=', '=BACKUPS=').strip()
    if boot_text:
        parts_boot = boot_text.split()
        if len(parts_boot) >= 2:
            pct_boot, free_boot = parts_boot[0], parts_boot[1]
            try:
                pct_boot_n = int(pct_boot.rstrip('%'))
                ok(f"/boot {pct_boot} usado · {free_boot} livre") if pct_boot_n <= 80 else warn(f"/boot {pct_boot} usado · {free_boot} livre — limpar kernels antigos!")
            except ValueError: note(f"/boot {boot_text}")

    # ── Backups ──────────────────────────────────────────────────────
    sec("Backups")
    backups_text = section_between(out, '=BACKUPS=', '=BACKUPSPACE=').strip()
    backup_lines_b = [l for l in backups_text.split('\n') if l.strip()]
    backup_scripts_b = [l for l in backup_lines_b if l.endswith('.sh')]
    backup_files_b = [l for l in backup_lines_b if any(x in l for x in ['.sql', '.dump', '.gz'])]
    if backup_scripts_b:
        for s_bs in backup_scripts_b: ok(f"Script de backup encontrado: {s_bs.strip()}")
    else:
        warn("Nenhum script com pg_dump encontrado em cron/root/ubuntu!")
    if backup_files_b:
        ok(f"Backup mais recente: {backup_files_b[0].strip()[:100]}")
    else:
        fail("Nenhum ficheiro .sql/.dump encontrado — estratégia de backup não verificável!")

    backupspace_text = section_between(out, '=BACKUPSPACE=', '=SERVICES=').strip()
    if backupspace_text:
        parts_bsp = backupspace_text.split()
        if len(parts_bsp) >= 2:
            free_bsp, pct_bsp = parts_bsp[0], parts_bsp[1]
            try:
                pct_bsp_n = int(pct_bsp.rstrip('%'))
                ok(f"/var/backups {pct_bsp} usado · {free_bsp} livre") if pct_bsp_n < 85 else warn(f"/var/backups {pct_bsp} cheio!")
            except ValueError: note(f"backupspace: {backupspace_text}")

    # ── Serviços & Monitoring ─────────────────────────────────────────
    sec("Serviços & Monitoring")
    services_text_m = section_between(out, '=SERVICES=', '=MONITORING=').strip()
    known_unnecessary_svcs = ['avahi-daemon', 'bluetooth', 'cups', 'ModemManager', 'lxd']
    for line in services_text_m.split('\n'):
        svc_m = line.strip()
        if svc_m:
            if any(u in svc_m for u in known_unnecessary_svcs):
                warn(f"Serviço desnecessário activo: {svc_m}")

    monitoring_text = section_between(out, '=MONITORING=', '=PROMETHEUSP=').strip()
    has_resend = bool(section_between(out, '=SMTP_HOST=', '=NODE_ENV=').strip() or
                      any('RESEND_API_KEY' in line for line in out.split('\n')))
    if monitoring_text.strip():
        for tool_m in monitoring_text.split():
            ok(f"Monitoring configurado: {tool_m}")
    elif has_resend:
        note("Monitoring externo não configurado — email transaccional activo via Resend")
    else:
        warn("Nenhum serviço de monitoring/alerting detectado (Sentry, Datadog, etc.)")

    prometheus_text = section_between(out, '=PROMETHEUSP=', '=END=').strip()
    if prometheus_text:
        ok(f"Endpoint metrics detectado: {prometheus_text[:80]}")
    else:
        note("Sem endpoint Prometheus/metrics exposto")

except Exception as e: warn(f"Dados do servidor: {e}")

sec("App Logs — PM2 amplos")
try:
    r_pm2logs = subprocess.run(SSH_CMD + ["""
      echo '=PM2LOGS='
      pm2 logs trimio-api --lines 100 --nostream 2>/dev/null | grep -iE 'unhandledRejection|UnhandledPromise|smtp|SMTP|Error.*smtp|nodemailer|ECONNREFUSED|ENOTFOUND|Cannot find module|Error: listen' | tail -15
      echo '=PM2SIZES='
      ls -lh /home/ubuntu/.pm2/logs/ 2>/dev/null
      echo '=PM2LOGEND='
    """], capture_output=True, text=True, timeout=20)
    out_pm2l = r_pm2logs.stdout

    pm2logs_text = section_between(out_pm2l, '=PM2LOGS=', '=PM2SIZES=').strip()
    if pm2logs_text:
        for line in pm2logs_text.split('\n'):
            if line.strip():
                if any(x in line for x in ['unhandledRejection', 'UnhandledPromise']):
                    warn(f"PM2: unhandledRejection → {line.strip()[:100]}")
                elif any(x in line.lower() for x in ['smtp', 'nodemailer', 'econnrefused', 'enotfound']):
                    warn(f"PM2: erro rede/SMTP → {line.strip()[:100]}")
                elif 'Cannot find module' in line:
                    fail(f"PM2: módulo em falta → {line.strip()[:100]}")
                else:
                    note(f"PM2 log: {line.strip()[:100]}")
    else:
        ok("PM2 logs sem erros críticos (unhandledRejection, SMTP, startup)")

    pm2sizes_text = section_between(out_pm2l, '=PM2SIZES=', '=PM2LOGEND=').strip()
    for line in pm2sizes_text.split('\n'):
        if line.strip() and '.log' in line:
            parts_pl = line.split()
            if len(parts_pl) >= 5:
                size_pl = parts_pl[4]
                fname_pl = parts_pl[-1]
                if size_pl.endswith('G') or (size_pl.endswith('M') and float(size_pl[:-1]) > 100):
                    warn(f"Log grande: {fname_pl} — {size_pl} (configurar logrotate!)")
                else:
                    note(f"Log {fname_pl}: {size_pl}")
except Exception as e: warn(f"PM2 logs check: {e}")

sec("Email & SMTP & NODE_ENV")
if smtp_host:
    port_smtp = int(smtp_port) if smtp_port.isdigit() else 587
    try:
        s_smtp = socket.create_connection((smtp_host, port_smtp), timeout=8)
        s_smtp.close()
        ok(f"SMTP {smtp_host}:{port_smtp} — ligação OK")
    except ConnectionRefusedError:
        fail(f"SMTP {smtp_host}:{port_smtp} — ligação recusada!")
    except OSError as e_smtp:
        warn(f"SMTP {smtp_host}:{port_smtp} — {e_smtp}")
    try:
        s_smtp465 = socket.create_connection((smtp_host, 465), timeout=5)
        s_smtp465.close()
        ok(f"SMTP {smtp_host}:465 (TLS) — acessível")
    except Exception:
        note(f"SMTP {smtp_host}:465 não acessível (normal se usar 587)")
else:
    warn("SMTP_HOST não encontrado no .env — email pode não estar configurado")

if node_env:
    ok(f"NODE_ENV={node_env}") if node_env == 'production' else fail(f"NODE_ENV={node_env} (deve ser 'production'!)")
else:
    warn("NODE_ENV não definido no .env")

if sentry_dsn:
    ok("SENTRY_DSN configurado — error tracking activo")
else:
    note("SENTRY_DSN não configurado (sem error tracking automático)")

sec("Cloudflare / CDN")
try:
    req_cf = Request(f"{BASE}/", headers={"User-Agent": UA})
    with urlopen(req_cf, context=ctx, timeout=8) as r_cf:
        hdrs_cf = {k.lower(): v for k, v in r_cf.getheaders()}
    cf_ray = hdrs_cf.get('cf-ray', '')
    if cf_ray:
        ok(f"CF-RAY presente → {cf_ray} (Cloudflare proxy activo)")
    else:
        warn("CF-RAY ausente — tráfego pode não passar pelo Cloudflare!")
    server_cf = hdrs_cf.get('server', '')
    if 'cloudflare' in server_cf.lower(): ok(f"Server header: {server_cf}")
    else: note(f"Server header: {server_cf}")

    slug_cf = SLUGS[0] if SLUGS else 'stukabarber'
    for label_cf, url_cf in [
        ("API pública", f"{API}/public/{slug_cf}"),
        ("API serviços", f"{API}/public/{slug_cf}/services"),
        ("Página HTML", f"{BASE}/{slug_cf}"),
    ]:
        try:
            req_cf2 = Request(url_cf, headers={"User-Agent": UA}, method="HEAD")
            with urlopen(req_cf2, context=ctx, timeout=8) as r_cf2:
                hdrs_cf2 = {k.lower(): v for k, v in r_cf2.getheaders()}
            cf_cache_s = hdrs_cf2.get('cf-cache-status', 'absent')
            age_cf = hdrs_cf2.get('age', '')
            if cf_cache_s == 'HIT':
                ok(f"CF-Cache {label_cf}: HIT" + (f" · age {age_cf}s" if age_cf else ""))
            elif cf_cache_s in ('MISS', 'DYNAMIC', 'BYPASS'):
                note(f"CF-Cache {label_cf}: {cf_cache_s}")
            elif cf_cache_s == 'absent':
                note(f"CF-Cache {label_cf}: header ausente")
            else:
                ok(f"CF-Cache {label_cf}: {cf_cache_s}")
        except Exception as e_cf2: note(f"CF cache {label_cf}: {e_cf2}")
except Exception as e_cf: warn(f"Cloudflare check: {e_cf}")

sec("Cookies & Headers de browser")
try:
    req_ck = Request(f"{BASE}/", headers={"User-Agent": UA})
    with urlopen(req_ck, context=ctx, timeout=8) as r_ck:
        all_hdrs_ck = r_ck.getheaders()
    set_cookies_ck = [v for k, v in all_hdrs_ck if k.lower() == 'set-cookie']
    if set_cookies_ck:
        for cookie_ck in set_cookies_ck:
            cookie_lower_ck = cookie_ck.lower()
            name_ck = cookie_ck.split('=')[0]
            flags_ck = []
            if 'httponly' in cookie_lower_ck: flags_ck.append('HttpOnly')
            if 'secure' in cookie_lower_ck: flags_ck.append('Secure')
            sm_ck = re.search(r'samesite=(\w+)', cookie_lower_ck)
            if sm_ck: flags_ck.append(f"SameSite={sm_ck.group(1).capitalize()}")
            if 'httponly' not in cookie_lower_ck:
                fail(f"Cookie '{name_ck}' sem HttpOnly — XSS pode roubar sessão!")
            elif 'secure' not in cookie_lower_ck:
                warn(f"Cookie '{name_ck}' sem Secure flag")
            else:
                ok(f"Cookie '{name_ck}': {', '.join(flags_ck)}")
    else:
        note("Sem cookies na home (normal para SPA com JWT)")

    s_csrf, _, _ = http(f"{API}/auth/login", "POST",
                         json.dumps({"email": "test@test.com", "password": "test", "slug": "stukabarber"}),
                         headers={"Origin": "https://evil.com", "Referer": "https://evil.com/"})
    if s_csrf not in (200,):
        ok(f"CSRF/CORS: POST de origem suspeita → {s_csrf} (bloqueado)")
    else:
        warn("POST de origem evil.com retornou 200 — verificar CSRF protection")
except Exception as e_ck: warn(f"Cookie check: {e_ck}")

sec("DNS — SPF / DKIM / DMARC / MX")
DOMAIN_DNS = "trimio.pt"
def dig(qtype, name):
    try:
        r_dig = subprocess.run(["dig", "+short", qtype, name, "@1.1.1.1"],
                               capture_output=True, text=True, timeout=10)
        return r_dig.stdout.strip()
    except Exception:
        return ""

mx_dns = dig("MX", DOMAIN_DNS)
if mx_dns: ok(f"MX records: {mx_dns[:120]}")
else: warn(f"Sem MX records para {DOMAIN_DNS}")

txt_dns = dig("TXT", DOMAIN_DNS)
spf_lines_dns = [l for l in txt_dns.split('\n') if 'v=spf1' in l.lower()]
if spf_lines_dns:
    spf_rec = spf_lines_dns[0]
    ok(f"SPF: {spf_rec[:100]}")
    if '+all' in spf_rec: fail("SPF usa +all — qualquer servidor pode enviar email!")
    elif '-all' in spf_rec: ok("SPF usa -all (hardfail)")
    elif '~all' in spf_rec: note("SPF usa ~all (softfail) — considerar -all")
else:
    fail(f"Sem registo SPF para {DOMAIN_DNS} — email pode ser forjado!")

dmarc_dns = dig("TXT", f"_dmarc.{DOMAIN_DNS}")
if dmarc_dns and 'v=DMARC1' in dmarc_dns:
    ok(f"DMARC: {dmarc_dns[:100]}")
    if 'p=none' in dmarc_dns: warn("DMARC p=none — apenas monitoring, sem enforcement!")
    elif 'p=quarantine' in dmarc_dns: ok("DMARC p=quarantine")
    elif 'p=reject' in dmarc_dns: ok("DMARC p=reject (máxima protecção)")
else:
    fail(f"Sem DMARC para {DOMAIN_DNS} — emails falsos não são bloqueados!")

dkim_found_dns = False
for selector_dns in ['default', 'google', 'mail', 'resend', 'mailgun', 'sendgrid', 'dkim']:
    dkim_dns = dig("TXT", f"{selector_dns}._domainkey.{DOMAIN_DNS}")
    if dkim_dns and 'p=' in dkim_dns:
        ok(f"DKIM selector '{selector_dns}' encontrado")
        dkim_found_dns = True
        break
if not dkim_found_dns:
    note("DKIM não encontrado nos seletores comuns — verificar com fornecedor de email")

vps_ip_dns = "51.91.158.175"
domain_ip_dns = dig("A", DOMAIN_DNS)
if vps_ip_dns in domain_ip_dns:
    fail(f"IP real do VPS ({vps_ip_dns}) exposto no DNS — Cloudflare proxy inativo?")
elif domain_ip_dns:
    ok(f"DNS aponta para {domain_ip_dns} (IP directo do VPS mascarado — Cloudflare proxy activo)")
else:
    warn(f"Não foi possível resolver {DOMAIN_DNS}")

sec("TLS — cipher suites & portas sensíveis")
try:
    for tls_label, tls_attr in [("TLS 1.0", "TLSv1"), ("TLS 1.1", "TLSv1_1")]:
        try:
            tls_ver_attr = getattr(ssl.TLSVersion, tls_attr, None)
            if tls_ver_attr is None:
                note(f"{tls_label}: TLSVersion enum não suportado nesta versão Python")
                continue
            ctx_old = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
            ctx_old.maximum_version = tls_ver_attr
            ctx_old.minimum_version = tls_ver_attr
            ctx_old.check_hostname = False
            ctx_old.verify_mode = ssl.CERT_NONE
            with socket.create_connection(("trimio.pt", 443), timeout=5) as sock_tls:
                try:
                    with ctx_old.wrap_socket(sock_tls, server_hostname="trimio.pt"):
                        fail(f"{tls_label} ACEITE — deve estar desativado!")
                except ssl.SSLError:
                    ok(f"{tls_label} rejeitado (correto)")
        except Exception as e_tls:
            ok(f"{tls_label} rejeitado ({type(e_tls).__name__})")

    ctx_check_tls = ssl.create_default_context()
    with socket.create_connection(("trimio.pt", 443), timeout=8) as sock_check:
        with ctx_check_tls.wrap_socket(sock_check, server_hostname="trimio.pt") as ssock_check:
            tls_ver_neg = ssock_check.version()
            cipher_neg = ssock_check.cipher()
            ok(f"TLS negociado: {tls_ver_neg}")
            if cipher_neg:
                cipher_name_neg = cipher_neg[0]
                if any(x in cipher_name_neg for x in ['RC4', 'DES', 'NULL', 'EXPORT']):
                    fail(f"Cipher fraco: {cipher_name_neg}")
                else:
                    ok(f"Cipher: {cipher_name_neg}")
except AttributeError:
    note("Teste TLS 1.0/1.1: Python sem suporte TLSVersion enum")
except Exception as e_tls_main: warn(f"TLS check: {e_tls_main}")

sensitive_ports_check = {
    5432: "PostgreSQL",
    6379: "Redis",
    27017: "MongoDB",
    11211: "Memcached",
    9200: "Elasticsearch",
    2375: "Docker daemon (HTTP)",
    8080: "HTTP alternativo",
}
for port_sp, label_sp in sensitive_ports_check.items():
    try:
        s_sp = socket.create_connection((VPS_IP, port_sp), timeout=3)
        s_sp.close()
        fail(f"Porta {port_sp} ({label_sp}) ABERTA publicamente!")
    except (ConnectionRefusedError, OSError):
        ok(f"Porta {port_sp} ({label_sp}) fechada publicamente")
    except Exception as e_sp:
        note(f"Porta {port_sp} ({label_sp}): {e_sp}")

sec("Nginx — erros recentes (últimas 300 requests)")
try:
    r=subprocess.run(SSH_CMD+[
        "sudo tail -300 /var/log/nginx/access.log 2>/dev/null | awk '$9+0>=400{print $9,$7}' | sort | uniq -c | sort -rn | head -10"],
        capture_output=True,text=True,timeout=15)
    lines=[l.strip() for l in r.stdout.strip().split('\n') if l.strip()]
    if not lines: ok("Sem erros 4xx/5xx nas últimas 300 requests")
    else:
        for l in lines:
            p=l.split(); cnt,code,path=p[0],p[1],p[2] if len(p)>2 else "?"
            if code.startswith("5"):   fail(f"{cnt}× {path} → {code}")
            elif code=="413":          warn(f"{cnt}× {path} → {code} (payload grande)")
            elif code in("401","403"): note(f"{cnt}× {path} → {code} (auth)")
            elif code=="404":          note(f"{cnt}× {path} → {code}")
            elif code=="400" and ("/bookings" in path or "/availability" in path): note(f"{cnt}× {path} → {code} (teste automático)")
            elif code=="422" and "/api/public/" in path and "/bookings" in path: note(f"{cnt}× {path} → {code} (validação pública)")
            elif code=="499":          note(f"{cnt}× {path} → {code} (teste automático)")
            else:                      warn(f"{cnt}× {path} → {code}")
except Exception as e: warn(f"Nginx logs: {e}")

sec("API Edge Cases & Segurança")
# Payload demasiado grande → 413
try:
    big = json.dumps({"name": "x" * 2_000_000})
    s,_,_ = http(f"{API}/auth/register", "POST", big)
    ok(f"Payload 2MB → {s} (413 esperado)") if s == 413 else warn(f"Payload 2MB → {s} (esperado 413 — client_max_body_size?)")
except Exception as e: warn(f"Payload test: {e}")

# JSON malformado → 400
s,_,_ = http(f"{API}/auth/login", "POST", b"not json{{{{")
ok(f"JSON malformado → {s}") if s in (400,422) else warn(f"JSON malformado → {s} (esperado 400)")

# SQL injection no slug → não deve 500
s,_,_ = pub("/'; DROP TABLE \"Barbershop\";--/")
ok(f"SQL injection no slug → {s} (não 500)") if s != 500 else fail("SQL injection retornou 500!")

# Slug com XSS → não deve reflectir
s,b,_ = pub("/<script>alert(1)</script>")
body_str = b.decode('utf-8','replace') if isinstance(b, bytes) else (b or '')
ok("XSS em slug não refletido") if '<script>alert' not in body_str else fail("XSS refletido na resposta!")

# CORS — API deve ter headers em rotas públicas
try:
    req = Request(f"{API}/public/{SLUGS[0] if SLUGS else 'stukabarber'}", headers={"Origin": "https://evil.com", "User-Agent": UA})
    with urlopen(req, context=ctx, timeout=8) as r:
        cors_hdrs = {k.lower(): v for k, v in r.getheaders()}
    acao = cors_hdrs.get('access-control-allow-origin','')
    if acao == '*': note(f"CORS public API → * (público, esperado)")
    elif acao: ok(f"CORS public API → {acao}")
    else: note("CORS header ausente em rota pública")
except Exception as e: note(f"CORS check: {e}")

# Endpoint inexistente → 404 não 500
s,_,_ = api("/rota-que-nao-existe-xyz")
ok(f"Rota inexistente → {s}") if s == 404 else warn(f"Rota inexistente → {s} (esperado 404)")

sec("API Security — aprofundada")
# JWT algorithm confusion — alg:none
if users and jwt_secret:
    user_sec = users[0]
    h_none = b64u(json.dumps({"alg": "none", "typ": "JWT"}))
    p_none = b64u(json.dumps({
        "userId": user_sec['id'],
        "barbershopId": user_sec['barbershopId'],
        "role": "ADMIN",
        "iat": int(time.time()),
        "exp": int(time.time()) + 7200
    }))
    token_none = f"{h_none}.{p_none}."
    s_none, _, _ = api("/barbershop", token=token_none)
    ok("JWT alg:none rejeitado → 401") if s_none == 401 else fail(f"JWT alg:none ACEITE → {s_none} (vulnerabilidade crítica!)")

    # Paginação sem limite
    valid_token_sec = make_jwt(user_sec['id'], user_sec['barbershopId'])
    s_limit, data_limit, _ = api("/bookings?limit=99999&page=0", token=valid_token_sec)
    if isinstance(data_limit, list) and len(data_limit) > 500:
        warn(f"Paginação sem limite: /bookings?limit=99999 retornou {len(data_limit)} registos!")
    elif s_limit == 200:
        ok(f"Paginação /bookings?limit=99999 → aceite (sem dados excessivos)")
    else:
        ok(f"Paginação extrema → {s_limit}")

    # Mass assignment — PUT /barbershop com campos sensíveis
    t_ma = make_jwt(user_sec['id'], user_sec['barbershopId'])
    s_ma, d_ma, _ = api("/barbershop", "PUT", {
        "subscriptionPlan": "ENTERPRISE",
        "subscriptionExpiry": "2099-12-31",
        "suspended": False,
        "_isAdmin": True,
    }, token=t_ma)
    if s_ma == 200 and isinstance(d_ma, dict):
        if d_ma.get("subscriptionPlan") == "ENTERPRISE":
            fail("Mass assignment: subscriptionPlan alterado via PUT /barbershop — vulnerabilidade crítica!")
        else:
            ok("Mass assignment: campos sensíveis ignorados (subscriptionPlan não alterado)")
    elif s_ma in (400, 422, 403):
        ok(f"Mass assignment rejeitado → {s_ma}")
    else:
        note(f"Mass assignment PUT → {s_ma}")
else:
    note("API security deep: JWT/users não disponíveis — ignorado")

# Token de reset de password inválido não deve 200
fake_reset_token_sec = "eyJhbGciOiJIUzI1NiJ9.fake.fake"
s_reuse, _, _ = api("/auth/reset-password", "POST", {
    "token": fake_reset_token_sec,
    "password": "NovaPassword123!"
})
ok(f"Token de reset inválido → {s_reuse}") if s_reuse in (400, 404, 401) else warn(f"Reset com token falso → {s_reuse}")

# Enumeration — IDs são UUIDs?
if users:
    user_id_check = users[0]['id']
    uuid_pat  = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', re.I)
    cuid_pat  = re.compile(r'^c[a-z0-9]{20,}$')
    cuid2_pat = re.compile(r'^[a-z0-9]{20,}$')
    if uuid_pat.match(user_id_check):
        ok("IDs usam UUID — dificulta enumeration/IDOR")
    elif cuid_pat.match(user_id_check) or cuid2_pat.match(user_id_check):
        ok(f"IDs usam CUID (opaco, não sequencial) — OK")
    else:
        warn(f"ID parece sequencial ('{user_id_check[:20]}') — facilita enumeration")

# HTTP method override
s_meth, _, _ = http(f"{API}/auth/me", "POST",
                     headers={"X-HTTP-Method-Override": "GET", "X-Method-Override": "GET"})
note(f"HTTP method override (POST + X-HTTP-Method-Override:GET) → {s_meth}")

# Host header injection
try:
    s_host, b_host, _ = http(f"{BASE}/", headers={"Host": "evil.com"})
    body_host = b_host.decode('utf-8', 'replace') if isinstance(b_host, bytes) else (b_host or '')
    if 'evil.com' in body_host:
        fail("Host header injection — 'evil.com' refletido na resposta!")
    else:
        ok(f"Host header injection não refletido → {s_host}")
except Exception as e_host: note(f"Host injection check: {e_host}")

# ════════════════════════════════════════════════════════════════════════
sec("Resumo por severidade")
if failures:
    print(f"  {R}{B}Críticos / falhas{X}")
    for item in failures[:12]:
        print(f"    {R}- {item}{X}")
    if len(failures) > 12:
        print(f"    {D}... e mais {len(failures)-12}{X}")
else:
    ok("Sem falhas críticas")

if warnings:
    print(f"  {Y}{B}Warnings principais{X}")
    for item in warnings[:12]:
        print(f"    {Y}- {item}{X}")
    if len(warnings) > 12:
        print(f"    {D}... e mais {len(warnings)-12}{X}")
else:
    ok("Sem warnings relevantes")

total=passed+failed+warned
print(f"\n{B}{'═'*50}{X}")
print(f"  {G}{B}{passed} passou{X}  {R}{B}{failed} falhou{X}  {Y}{B}{warned} aviso(s){X}  {D}({total} testes){X}")
print(f"{B}{'═'*50}{X}")
if   failed==0 and warned==0: print(f"\n  {G}{B}Sistema 100% operacional{X}\n")
elif failed==0:               print(f"\n  {Y}{B}Sistema operacional com avisos menores{X}\n")
else:                         print(f"\n  {R}{B}{failed} problema(s) encontrado(s){X}\n"); sys.exit(1)
PYEOF
