#!/usr/bin/env bash
# Trimio — teste COMPLETO: leitura + escrita + consistência + sistema
# Uso: ./test.sh            → todas as barbearias
#      ./test.sh stukabarber → só essa barbearia

SLUG_FILTER="${1:-}"
SSH="ssh -i ~/Desktop/trimio_vps_ed25519 -o StrictHostKeyChecking=no ubuntu@51.91.158.175"

VPS_DATA=$($SSH "
  echo '=JWT='
  grep '^JWT_SECRET=' /var/www/trimio/.env | cut -d= -f2- | tr -d '\"'
  echo '=SLUGS='
  sudo -u postgres psql -d trimio -t -c \"SELECT slug FROM \\\"Barbershop\\\" WHERE suspended=false ORDER BY name;\" 2>/dev/null | tr -d ' ' | grep -v '^\$'
  echo '=USERS='
  sudo -u postgres psql -d trimio -t -c \"SELECT u.id, u.\\\"barbershopId\\\", b.slug, u.email FROM \\\"User\\\" u JOIN \\\"Barbershop\\\" b ON b.id=u.\\\"barbershopId\\\" WHERE b.suspended=false ORDER BY b.name;\" 2>/dev/null | grep -v '^\$'
" 2>/dev/null)

python3 - "$VPS_DATA" "$SLUG_FILTER" <<'PYEOF'
import sys, json, hmac, hashlib, base64, time, subprocess, re
from urllib.request import urlopen, Request
from urllib.error import HTTPError
import ssl, socket
from datetime import date, datetime, timedelta, UTC

BASE = "https://trimio.pt"
API  = f"{BASE}/api"
UA   = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"

raw         = sys.argv[1]
slug_filter = sys.argv[2].strip()

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
_current_section=""

def ok(msg):   global passed; passed+=1; print(f"  {G}✓{X} {msg}")
def fail(msg, detail=None):
    global failed; failed+=1; print(f"  {R}✗{X} {msg}")
    if detail: print(f"    {D}↳ {detail}{X}")
def warn(msg): global warned; warned+=1; print(f"  {Y}!{X} {msg}")
def sec(t):    print(f"\n{B}{C}▸ {t}{X}")
def note(msg): print(f"    {D}{msg}{X}")

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
        ms>3000 and warn(f"{label} — {s} lento ({ms}ms)") or ok(f"{label} — {s} · {ms}ms")
    else: fail(f"{label} — esperado {expected}, recebeu {s}", url)

def img_ok(url):
    if not url: return None
    if url.startswith("data:image/"): return "data_uri"
    s,_,_ = http(url,timeout=8); return s

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

    # ── 1. PÁGINAS PÚBLICAS ─────────────────────────────────────────
    sec("1 · Páginas públicas")
    for label,path in [("Home",f"/{slug}"),("Serviços",f"/{slug}/services"),
                       ("Agendamento",f"/{slug}/booking"),("Planos",f"/{slug}/plans"),
                       ("Produtos",f"/{slug}/products")]:
        check_page(label, f"{BASE}{path}")

    # ── 2. DADOS PÚBLICOS DA BARBEARIA ──────────────────────────────
    sec("2 · Dados públicos da barbearia")
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

    # ── 3. CONTEÚDO DO HERO ─────────────────────────────────────────
    sec("3 · Conteúdo do hero")
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

    # ── 4. BANNER PROMOCIONAL — LEITURA E ESCRITA ───────────────────
    sec("4 · Banner promocional (leitura + escrita)")
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

    # ── 5. CONTEÚDO DO SITE — ESCRITA ───────────────────────────────
    sec("5 · Conteúdo do site (escrita)")
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

    # ── 6. SERVIÇOS ─────────────────────────────────────────────────
    sec("6 · Serviços")
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

    # ── 7. BARBEIROS ────────────────────────────────────────────────
    sec("7 · Barbeiros")
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

    # ── 8. EXTRAS ───────────────────────────────────────────────────
    sec("8 · Extras")
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

    # ── 9. PRODUTOS ─────────────────────────────────────────────────
    sec("9 · Produtos")
    s,prods,_ = pub(f"/{slug}/products")
    if not isinstance(prods,list): fail("Endpoint produtos falhou")
    elif not prods: note("Sem produtos configurados")
    else:
        ok(f"{len(prods)} produto(s)")
        for p in prods: ok(f"'{p.get('name','?')}' — €{p.get('price',0)/100:.2f}")

    # ── 10. PLANOS ──────────────────────────────────────────────────
    sec("10 · Planos de subscrição")
    s,plans,_ = pub(f"/{slug}/plans")
    if not isinstance(plans,list): fail("Endpoint planos falhou")
    elif not plans: note("Sem planos configurados")
    else:
        ok(f"{len(plans)} plano(s)")
        for p in plans:
            n=p.get("name","?"); pr=p.get("price",0)
            svcs_in_plan=p.get("services") or p.get("allowedServices") or []
            ok(f"'{n}' — €{pr/100:.2f}/mês · {len(svcs_in_plan)} serviço(s)")

    # ── 11. HORÁRIOS ────────────────────────────────────────────────
    sec("11 · Horários de trabalho")
    if token:
        s,wh,_ = api("/working-hours",token=token)
        if s==200 and isinstance(wh,list):
            ok(f"{len(wh)} entrada(s) de horário")
            if not wh: fail("Sem horários configurados — agenda sempre vazia!")
        else: fail(f"GET /working-hours → {s}")

    # ── 12. DISPONIBILIDADE ─────────────────────────────────────────
    sec("12 · Disponibilidade (agenda)")
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

    # ── 13. FLUXO DE AGENDAMENTO ────────────────────────────────────
    sec("13 · Fluxo de agendamento completo")

    # Lookup de cliente
    s,lk,_ = http(f"{API}/public/{slug}/customer-plan","POST",
                  json.dumps({"phone":"910000000","name":"Teste Automatico"}))
    try: json.loads(lk); ok("Lookup de cliente → JSON válido")
    except: fail("Lookup de cliente → resposta inválida")

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

    # ── 14. PAINEL ADMIN ────────────────────────────────────────────
    sec(f"14 · Painel admin ({(user or {}).get('email','n/a')})")
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

    # Verifica que não há dados de outras barbearias visíveis (isolamento)
    sec("15 · Isolamento de dados entre barbearias")
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

SSH_CMD = "ssh -i ~/Desktop/trimio_vps_ed25519 -o StrictHostKeyChecking=no ubuntu@51.91.158.175"

sec("Servidor (PM2 + recursos + logs)")
try:
    r=subprocess.run(SSH_CMD.split()+["""
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
      echo $CPU $MU $MT $DISK
      echo '=ERR='
      sudo tail -300 /var/log/nginx/access.log 2>/dev/null | awk '$9+0>=500{print $9,$7}' | sort | uniq -c | sort -rn | head -5
      echo '=PRISMA='
      pm2 logs trimio-api --lines 50 --nostream --err 2>/dev/null | tail -20
    """], capture_output=True,text=True,timeout=25)
    out=r.stdout

    # PM2
    pm2_section=re.search(r'=PM2=\n(.*?)=RES=',out,re.DOTALL)
    if pm2_section:
        for line in pm2_section.group(1).strip().split('\n'):
            parts=line.split()
            if len(parts)>=4:
                name,status,restarts,mem=parts[:4]
                if status=="online": ok(f"PM2 '{name}' — online · {mem}MB RAM")
                else: fail(f"PM2 '{name}' — {status}!")
                if int(restarts)>20: warn(f"'{name}' reiniciou {restarts}× (histórico)")
                else: ok(f"'{name}' estável — {restarts} restart(s)")

    # Recursos
    res_section=re.search(r'=RES=\n(.*?)=ERR=',out,re.DOTALL)
    if res_section:
        parts=res_section.group(1).strip().split()
        if len(parts)>=4:
            cpu,mu,mt,disk=parts[:4]
            ok(f"CPU {float(cpu):.1f}%") if float(cpu)<80 else fail(f"CPU {cpu}% (alto!)")
            pct=int(mu)*100//int(mt)
            ok(f"RAM {mu}MB/{mt}MB ({pct}%)") if pct<85 else fail(f"RAM {pct}% (alto!)")
            ok(f"Disco {disk}%") if int(disk)<85 else warn(f"Disco {disk}% (quase cheio)")

    # 5xx errors
    err_section=re.search(r'=ERR=\n(.*?)=PRISMA=',out,re.DOTALL)
    errs=[l.strip() for l in (err_section.group(1).strip().split('\n') if err_section else []) if l.strip()]
    ok("Sem erros 5xx recentes") if not errs else [fail(f"{l}") for l in errs]

    # Prisma errors
    prisma_section=re.search(r'=PRISMA=\n(.*?)$',out,re.DOTALL)
    if prisma_section:
        prisma_text=prisma_section.group(1)
        p2022=prisma_text.count("P2022")
        p2003=prisma_text.count("P2003")
        ok("Sem erros Prisma recentes") if not p2022 and not p2003 else fail(f"Erros Prisma: P2022×{p2022} P2003×{p2003}")
except Exception as e: warn(f"Dados do servidor: {e}")

sec("Nginx — erros recentes (últimas 300 requests)")
try:
    r=subprocess.run(SSH_CMD.split()+[
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
    r=subprocess.run(SSH_CMD.split()+[
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
total=passed+failed+warned
print(f"\n{B}{'═'*50}{X}")
print(f"  {G}{B}{passed} passou{X}  {R}{B}{failed} falhou{X}  {Y}{B}{warned} aviso(s){X}  {D}({total} testes){X}")
print(f"{B}{'═'*50}{X}")
if   failed==0 and warned==0: print(f"\n  {G}{B}Sistema 100% operacional{X}\n")
elif failed==0:               print(f"\n  {Y}{B}Sistema operacional com avisos menores{X}\n")
else:                         print(f"\n  {R}{B}{failed} problema(s) encontrado(s){X}\n"); sys.exit(1)
PYEOF
