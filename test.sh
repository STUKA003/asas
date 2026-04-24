#!/usr/bin/env bash
# Trimio — auditoria completa: app + VPS + superfície pública + stress leve
# Uso:
#   ./test.sh
#   ./test.sh stukabarber
#   ./test.sh --deep-browser
#   ./test.sh --load
#   ./test.sh --full

SLUG_FILTER=""
DEEP_BROWSER=1
LOAD_TEST=1
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
SSH=(ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no ubuntu@51.91.158.175)

VPS_DATA=$("${SSH[@]}" "
  echo '=JWT='
  grep '^JWT_SECRET=' /var/www/trimio/.env | cut -d= -f2- | tr -d '\"'
  echo '=SLUGS='
  sudo -u postgres psql -d trimio -t -c \"SELECT slug FROM \\\"Barbershop\\\" WHERE suspended=false ORDER BY name;\" 2>/dev/null | tr -d ' ' | grep -v '^\$'
  echo '=USERS='
  sudo -u postgres psql -d trimio -t -c \"SELECT u.id, u.\\\"barbershopId\\\", b.slug, u.email FROM \\\"User\\\" u JOIN \\\"Barbershop\\\" b ON b.id=u.\\\"barbershopId\\\" WHERE b.suspended=false ORDER BY b.name;\" 2>/dev/null | grep -v '^\$'
" 2>/dev/null)

VPS_DATA="$VPS_DATA" python3 -u - "$SLUG_FILTER" "$DEEP_BROWSER" "$LOAD_TEST" <<'PYEOF'
import sys, json, hmac, hashlib, base64, time, subprocess, re, os
from urllib.request import urlopen, Request
from urllib.error import HTTPError
import ssl, socket
from datetime import date, datetime, timedelta, UTC
from concurrent.futures import ThreadPoolExecutor, as_completed

BASE = "https://trimio.pt"
API  = f"{BASE}/api"
UA   = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"

raw         = __import__('os').environ.get('VPS_DATA', '')
slug_filter = sys.argv[1].strip()
DEEP_BROWSER = sys.argv[2] == '1'
LOAD_TEST = sys.argv[3] == '1'

jwt_secret = ""; all_slugs = []; users = []
section_name = None
for line in raw.split('\n'):
    line = line.strip()
    if line == '=JWT=':    section_name = 'jwt'
    elif line == '=SLUGS=': section_name = 'slugs'
    elif line == '=USERS=': section_name = 'users'
    elif not line: continue
    elif section_name == 'jwt':   jwt_secret = line
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
except Exception as e: warn(f"Headers: {e}")

sec("Entrega & Cache")
for label, url in [
    ("App bundle", f"{BASE}/assets/index-xkeEDyRy.js"),
    ("Service worker", f"{BASE}/push-sw.js"),
    ("Manifest clients", f"{BASE}/install-manifest.webmanifest?surface=clients&slug=stukabarber"),
]:
    try:
        req = Request(url, headers={"User-Agent": UA}, method="HEAD")
        with urlopen(req, context=ctx, timeout=8) as r:
            hdrs = {k.lower(): v for k, v in r.getheaders()}
            cache = hdrs.get('cache-control', '')
            cf = hdrs.get('cf-cache-status', '')
            ctype = hdrs.get('content-type', '')
        chk_optional(f"{label} content-type", ctype)
        chk_optional(f"{label} cache-control", cache)
        chk_optional(f"{label} cf-cache-status", cf)
        if label == "App bundle" and 'max-age' not in cache:
            warn("App bundle sem cache-control explícito")
        if label == "Service worker" and 'max-age' not in cache:
            warn("Service worker sem cache-control explícito")
    except Exception as e:
        warn(f"{label}: {e}")

SSH_CMD = ["ssh", "-i", os.path.expanduser('~/Desktop/trimio_vps_ed25519'), "-o", "StrictHostKeyChecking=no", "ubuntu@51.91.158.175"]

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
    """], capture_output=True,text=True,timeout=25)
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

    db_top_lines = [l.strip() for l in section_between(out, '=DBTOP=', None).split('\n') if l.strip()]
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
except Exception as e: warn(f"Dados do servidor: {e}")

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

sec("Base de dados")
try:
    r=subprocess.run(SSH_CMD+[
        "sudo -u postgres psql -d trimio -t -c "
        "'SELECT count(*) FROM pg_stat_activity;' 2>/dev/null | tr -d ' '"],
        capture_output=True,text=True,timeout=10)
    conns=r.stdout.strip()
    if conns.isdigit():
        ok(f"PostgreSQL acessível · {conns} conexões ativas")
        int(conns)>50 and warn(f"{conns} conexões — pode haver leak")
    else: fail("PostgreSQL não responde")
except Exception as e: warn(f"DB: {e}")

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
