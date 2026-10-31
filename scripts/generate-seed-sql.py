#!/usr/bin/env python3
"""
Génère `supabase/seed.sql` à partir des données locales du site.

Source de vérité initiale : data/database.json (catalogue) et
data/experience-references.json (références entrepreneuriales).

Le script est idempotent (ON CONFLICT DO UPDATE) : il peut être rejoué après
une modification des fichiers locaux. Il ne contient aucun secret.

Usage :  python3 scripts/generate-seed-sql.py
"""
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
DB = json.loads((ROOT / "data/database.json").read_text(encoding="utf-8"))
EXP_FILE = ROOT / "data/experience-references.json"
if EXP_FILE.exists():
    payload = json.loads(EXP_FILE.read_text(encoding="utf-8"))
    REFS = payload["references"] if isinstance(payload, dict) else payload
else:
    REFS = []

# Les références vivent désormais dans Supabase (et non plus dans un fichier
# JSON local). Pour ne JAMAIS les effacer lors d'une régénération, le bloc
# déjà présent dans `supabase/seed.sql` est conservé tel quel quand le fichier
# source est absent.
SEED_FILE = ROOT / "supabase/seed.sql"
REFS_MARKER = "\n-- Références « Expérience entrepreneuriale »"


def existing_references_block():
    """Bloc « références » du seed actuel, ou None s'il n'existe pas."""
    if not SEED_FILE.exists():
        return None
    text = SEED_FILE.read_text(encoding="utf-8")
    start = text.find(REFS_MARKER)
    if start == -1:
        return None
    end = text.find("\nCOMMIT;", start)
    if end == -1:
        return None
    return text[start:end].rstrip("\n")


def reference_count():
    """Nombre de références réellement écrites dans le seed produit."""
    if REFS:
        return len(REFS)
    block = existing_references_block()
    if not block:
        return 0
    return sum(1 for line in block.splitlines() if line.strip().startswith("('"))


def s(value):
    """Littéral SQL texte ou NULL."""
    if value is None or value == "":
        return "NULL"
    return "'" + str(value).replace("'", "''") + "'"


def num(value):
    if value is None or value == "":
        return "NULL"
    return str(value)


def boolean(value):
    return "true" if value else "false"


def j(value):
    """Littéral JSONB."""
    return "'" + json.dumps(value, ensure_ascii=False).replace("'", "''") + "'::jsonb"


out = []
out.append("-- =========================================================================")
out.append("-- ALFFA NIGER — JEUCONTENU INITIAL (généré par scripts/generate-seed-sql.py)")
out.append("-- Idempotent : peut être rejoué sans perte de données.")
out.append(f"-- Catalogue : {len(DB['products'])} produits, {len(DB['brands'])} marques")
out.append(f"-- Expérience : {reference_count()} références")
out.append("-- =========================================================================")
out.append("BEGIN;")

# --- Paramètres du site -----------------------------------------------------
st = DB["settings"]
settings_rows = [
    ("name", st.get("name")),
    ("slogan", st.get("slogan")),
    ("whatsapp_electronique", st.get("whatsappElectronique")),
    ("whatsapp_textile", st.get("whatsappTextile")),
    ("phone", st.get("phone")),
    ("address", st.get("address")),
    ("email", st.get("email")),
    ("hours", st.get("hours")),
    ("facebook", st.get("facebook")),
    ("instagram", st.get("instagram")),
    ("tiktok", st.get("tiktok")),
    ("maps_electronique", st.get("mapsElectronique")),
    ("maps_textile", st.get("mapsTextile")),
    ("site_url", st.get("siteUrl")),
    ("legal_name", st.get("legalName")),
    ("legal_info", st.get("legalInfo")),
    ("nif", st.get("nif")),
    ("rccm", st.get("rccm")),
    ("privacy_text", st.get("privacyText")),
    ("hero_title", st.get("heroTitle")),
    ("hero_subtitle", st.get("heroSubtitle")),
    ("elec_intro", st.get("elecIntro")),
    ("textile_intro", st.get("textileIntro")),
]
cols = ", ".join(c for c, _ in settings_rows)
vals = ", ".join(s(v) for _, v in settings_rows)
updates = ", ".join(f"{c} = EXCLUDED.{c}" for c, _ in settings_rows)
out.append("\n-- Paramètres du site")
out.append(f"INSERT INTO public.site_settings (id, {cols}, updated_at)")
out.append(f"VALUES (1, {vals}, now())")
out.append(f"ON CONFLICT (id) DO UPDATE SET {updates}, updated_at = now();")

# --- Produits ---------------------------------------------------------------
out.append("\n-- Produits")
out.append(
    "INSERT INTO public.products (id, shop, name, brand, category, price, availability,"
    " capacity, colors, condition, reference, description, specs, model, image,"
    " source_image, is_new, hidden, created_at, display_order) VALUES"
)
rows = []
# L'ordre d'affichage est propre à chaque boutique : le rang dans le fichier
# source (filtré par boutique) devient `display_order`.
position_in_shop = {}
for p in DB["products"]:
    position_in_shop[p["shop"]] = position_in_shop.get(p["shop"], 0) + 1
    rows.append(
        "(" + ", ".join([
            s(p["id"]), s(p["shop"]), s(p["name"]), s(p.get("brand")), s(p.get("category")),
            num(p.get("price")), s(p.get("availability")), s(p.get("capacity")),
            s(p.get("colors")), s(p.get("condition")), s(p.get("reference")),
            s(p.get("description")), s(p.get("specs")), s(p.get("model")),
            s(p.get("image")), s(p.get("sourceImage")),
            boolean(p.get("isNew")), boolean(p.get("hidden")), num(p.get("createdAt")),
            num(position_in_shop[p["shop"]]),
        ]) + ")"
    )
out.append(",\n".join(rows))
out.append(
    "ON CONFLICT (id) DO UPDATE SET"
    " shop = EXCLUDED.shop, name = EXCLUDED.name, brand = EXCLUDED.brand,"
    " category = EXCLUDED.category, price = EXCLUDED.price,"
    " availability = EXCLUDED.availability, capacity = EXCLUDED.capacity,"
    " colors = EXCLUDED.colors, condition = EXCLUDED.condition,"
    " reference = EXCLUDED.reference, description = EXCLUDED.description,"
    " specs = EXCLUDED.specs, model = EXCLUDED.model, image = EXCLUDED.image,"
    " source_image = EXCLUDED.source_image, is_new = EXCLUDED.is_new,"
    " hidden = EXCLUDED.hidden;"
)

# --- Marques ----------------------------------------------------------------
if DB["brands"]:
    out.append("\n-- Marques textiles")
    out.append("INSERT INTO public.brands (id, name, logo, source_logo, display_order) VALUES")
    rows = []
    for b in DB["brands"]:
        rows.append(
            "(" + ", ".join([
                s(b["id"]), s(b["name"]), s(b.get("logo")), s(b.get("sourceLogo")),
                num(b.get("order", 1)),
            ]) + ")"
        )
    out.append(",\n".join(rows))
    out.append(
        "ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, logo = EXCLUDED.logo,"
        " source_logo = EXCLUDED.source_logo, display_order = EXCLUDED.display_order;"
    )

# --- Sélections à la une ----------------------------------------------------
out.append("\n-- Sélections « à la une »")
out.append("DELETE FROM public.featured;")
rows = []
for shop in ("electronique", "textile"):
    for i, pid in enumerate(DB["featured"].get(shop, []), start=1):
        rows.append(f"({s(shop)}, {s(pid)}, {i})")
if rows:
    out.append("INSERT INTO public.featured (shop, product_id, display_order) VALUES")
    out.append(",\n".join(rows) + ";")

# --- Références entrepreneuriales ------------------------------------------
if not REFS:
    preserved = existing_references_block()
    if preserved:
        out.append(preserved)
        print("ℹ Références conservées depuis supabase/seed.sql (source JSON absente).")
else:
    out.append("\n-- Références « Expérience entrepreneuriale »")
    out.append(
        "INSERT INTO public.experience_references (id, title, domain, description,"
        " beneficiary, procedure, location, execution, validation, published, photos,"
        " documents, display_order, created_at, updated_at, published_at) VALUES"
    )
    rows = []
    for r in REFS:
        rows.append(
            "(" + ", ".join([
                s(r["id"]), s(r["title"]), s(r["domain"]), s(r.get("description")),
                s(r.get("beneficiary")), s(r.get("procedure")), s(r.get("location")),
                s(r.get("execution")), s(r.get("validation")), boolean(r.get("published")),
                j(r.get("photos") or []), j(r.get("documents") or []),
                num(r.get("order", 1)), num(r.get("createdAt")), num(r.get("updatedAt")),
                num(r.get("publishedAt")),
            ]) + ")"
        )
    out.append(",\n".join(rows))
    out.append(
        "ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, domain = EXCLUDED.domain,"
        " description = EXCLUDED.description, beneficiary = EXCLUDED.beneficiary,"
        " procedure = EXCLUDED.procedure, location = EXCLUDED.location,"
        " execution = EXCLUDED.execution, validation = EXCLUDED.validation,"
        " published = EXCLUDED.published, photos = EXCLUDED.photos,"
        " documents = EXCLUDED.documents, display_order = EXCLUDED.display_order,"
        " updated_at = EXCLUDED.updated_at, published_at = EXCLUDED.published_at;"
    )

out.append("\nCOMMIT;")
out.append("")

target = ROOT / "supabase/seed.sql"
target.write_text("\n".join(out), encoding="utf-8")
print(f"✔ {target} — {target.stat().st_size} octets")
