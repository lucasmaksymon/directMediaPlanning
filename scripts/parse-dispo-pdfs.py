"""
Parsea PDFs de disponibilidad (PC Carnevale + Marti) → JSON + fotos.
Uso: python scripts/parse-dispo-pdfs.py
"""
from __future__ import annotations

import json
import os
import re
import unicodedata
from pathlib import Path

from pdfminer.high_level import extract_text
import pypdfium2 as pdfium

ROOT = Path(__file__).resolve().parents[1]
DOCS = Path(os.environ.get("DISPO_PDF_DIR", r"C:\Users\lucas\OneDrive\Documentos"))
OUT_JSON = ROOT / "prisma" / "data" / "dispo-inventory.json"
OUT_IMG = ROOT / "public" / "inventory"
NAMES_FILE = ROOT / ".tmp-pdf-names.json"


def slug(s: str) -> str:
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = re.sub(r"[^a-zA-Z0-9]+", "-", s.lower()).strip("-")
    return s[:70] or "espacio"


def money_to_amount(raw: str) -> str:
    if not raw:
        return ""
    t = raw.replace("\xa0", " ")
    t = t.replace("+IVA", "").replace("+ IVA", "").replace("IVA", "")
    t = t.replace(".-", "").replace(".", "").replace(" ", "")
    t = t.replace(",", ".")
    m = re.search(r"(\d+(?:\.\d+)?)", t)
    if not m:
        return ""
    n = float(m.group(1))
    if n < 100:
        return ""
    return str(int(n) if n.is_integer() else n)


def format_ars_plain(amount: str) -> str:
    if not amount:
        return ""
    n = int(float(amount))
    return f"$ {n:,}".replace(",", ".")


def clean_medida(raw: str) -> str:
    t = re.sub(r"\s+", " ", (raw or "")).strip()
    t = re.sub(r"^(columna|estructura|cartel|mural)\s+", "", t, flags=re.I)
    t = re.sub(r"\s*cada cara.*$", "", t, flags=re.I)
    m = re.search(r"(\d+[.,]?\d*)\s*[x×]\s*(\d+[.,]?\d*)", t, re.I)
    if m:
        return f"{m.group(1).replace(',', '.')} x {m.group(2).replace(',', '.')} mts"
    if re.search(r"determinar", t, re.I):
        return ""
    return t[:80]


def detect_tipo(raw: str) -> str:
    t = (raw or "").lower()
    if "columna" in t:
        return "Columna"
    if "estructura" in t:
        return "Estructura"
    if "mural" in t:
        return "Mural"
    if "azotea" in t:
        return "Cartel sobre azotea"
    if "amurado" in t:
        return "Cartel amurado"
    if "doble faz" in t or "cartel" in t:
        return "Cartel"
    return ""


def detect_caras(text: str) -> str:
    t = (text or "").lower()
    if "doble" in t:
        return "Doble"
    if "simple" in t:
        return "Simple"
    return ""


def visibilidad_from_flags(title: str, extra: str = "") -> str:
    blob = f"{title} {extra}"
    if re.search(r"\bTAP\b", blob):
        return "Tránsito a Provincia"
    if re.search(r"\bTAC\b", blob):
        return "Tránsito a Capital"
    m = re.search(
        r"(Tránsito a (?:Provincia|Capital|CABA)[^\n]*)",
        blob,
        re.I,
    )
    if m:
        return m.group(1).strip()
    return extra.strip()


def find_pdfs() -> dict[str, Path]:
    if NAMES_FILE.exists():
        names = json.loads(NAMES_FILE.read_text(encoding="utf-8"))
    else:
        names = [f for f in os.listdir(DOCS) if f.lower().endswith(".pdf")]
    out: dict[str, Path] = {}
    for name in names:
        p = DOCS / name
        if not p.exists():
            continue
        key = name.lower()
        if "carnevale" in key:
            out["carnevale"] = p
        elif "marti" in key:
            out["marti"] = p
    return out


def page_texts(pdf_path: Path) -> list[str]:
    pdf = pdfium.PdfDocument(str(pdf_path))
    n = len(pdf)
    pdf.close()
    pages = []
    for i in range(n):
        pages.append(extract_text(str(pdf_path), page_numbers=[i]) or "")
    return pages


def render_page(pdf_path: Path, index: int, dest: Path, scale: float = 1.6) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    pdf = pdfium.PdfDocument(str(pdf_path))
    page = pdf[index]
    bitmap = page.render(scale=scale)
    pil = bitmap.to_pil()
    if pil.mode != "RGB":
        pil = pil.convert("RGB")
    pil.save(dest, "JPEG", quality=82, optimize=True)
    pdf.close()


def parse_carnevale(pages: list[str]) -> list[dict]:
    units: list[dict] = []
    last_price = ""
    last_prod = ""
    last_key = ""

    for i, raw in enumerate(pages):
        text = raw.replace("\xa0", " ")
        if not re.search(r"Medida\s*Comercial", text, re.I):
            continue

        # Título: antes de Medida Comercial, o al final de la ficha
        head = re.split(r"Medida\s*Comercial\s*:?", text, maxsplit=1, flags=re.I)[0]
        title = re.sub(r"\s+", " ", head).strip(" -\n\t")
        if len(title) < 8:
            after = text
            lines = [re.sub(r"\s+", " ", ln).strip() for ln in after.splitlines() if ln.strip()]
            candidates = [
                ln
                for ln in lines
                if re.search(
                    r"Av\.|Aut\.|Acc\.|Libertador|Fondo de la|Márquez|Marquez|Km\.|TAP|TAC|Santa Fe",
                    ln,
                    re.I,
                )
                and not re.match(
                    r"^(Medida|Caras|Material|Impuestos|Luz|Disponible|VALOR|Columna|Estructura|Simple|Doble|Front|Back)",
                    ln,
                    re.I,
                )
                and not re.match(r"^\$", ln)
            ]
            title = candidates[-1] if candidates else ""
        if len(title) < 8:
            continue

        medida_raw = field(text, r"Medida\s*Comercial", r"Caras|Material|Impuestos|Disponible")
        caras_raw = field(text, r"Caras", r"Material|Impuestos|Luz|Disponible")
        material = field(text, r"Material", r"Impuestos|Luz|Disponible|VALOR")
        impuestos = field(text, r"Impuestos", r"Luz|Disponible|VALOR")
        luz = field(text, r"Luz", r"Disponible|VALOR")
        disponible = field(text, r"Disponible\s+en", r"VALOR|Medida")
        exhibicion = field(
            text,
            r"VALOR\s+EXHIBICI.N\s+MENSUAL",
            r"VALOR\s+PRODUCCI.N|Disponible",
        )
        if not exhibicion:
            m = re.search(
                r"MENSUAL\s*:?\s*(\$\s*[\d.]+(?:\s*\+?\s*IVA)?)",
                text,
                re.I,
            )
            if m:
                exhibicion = m.group(1)
        produccion = field(text, r"VALOR\s+PRODUCCI.N", r"VALOR|Disponible")

        loc_key = re.sub(
            r"\s*[-–—]\s*(Izquierda|Derecha|TA[PC])\s*$",
            "",
            title,
            flags=re.I,
        ).strip()
        loc_key = re.sub(r"\s*[-–—]\s*TA[PC]\s*$", "", loc_key, flags=re.I).strip()
        price = money_to_amount(exhibicion)
        prod = money_to_amount(produccion)
        if not price and (
            loc_key == last_key
            or (last_key and loc_key.startswith(last_key[:24]))
            or (last_price and last_key.startswith("Libertador") and title.startswith("Libertador"))
        ):
            price = last_price
            prod = prod or last_prod
        if price:
            last_price, last_prod, last_key = price, prod or last_prod, loc_key

        vis = visibilidad_from_flags(title)
        medida = clean_medida(medida_raw)
        tipo = detect_tipo(medida_raw) or detect_tipo(title)
        caras = detect_caras(caras_raw) or detect_caras(title)
        zona = infer_zona_carnevale(title)

        units.append(
            {
                "providerName": "PC Carnevale",
                "page": i + 1,
                "title": title,
                "zona": zona,
                "locationLabel": title,
                "medidaRaw": medida_raw,
                "medida": medida,
                "tipo": tipo,
                "caras": caras,
                "material": material,
                "visibilidad": vis,
                "impuestos": impuestos,
                "luz": luz,
                "disponibleEn": disponible.replace(":", "").strip(),
                "produccion": prod,
                "basePriceAmount": price or "1",
                "priceModel": "fixed_list" if price else "negotiable",
            }
        )
    return units


def field(text: str, label: str, stop: str) -> str:
    m = re.search(
        rf"{label}\s*:?\s*(.+?)(?={stop}|$)",
        text,
        flags=re.I | re.S,
    )
    if not m:
        return ""
    val = re.sub(r"\s+", " ", m.group(1)).strip(" :-")
    return val[:180]


def infer_zona_carnevale(title: str) -> str:
    t = title.lower()
    if "cantilo" in t or "lugones" in t:
        return "CABA"
    if "panamericana" in t:
        return "Zona Norte"
    if "acceso oeste" in t or "acc. oeste" in t or "acc oeste" in t:
        return "Zona Oeste"
    if "la plata" in t:
        return "Zona Sur"
    if "san isidro" in t or "malaver" in t or "libertador" in t:
        return "Zona Norte"
    if "dardo rocha" in t or "unidad nacional" in t or "santa fe" in t:
        return "Zona Norte"
    if "márquez" in t or "marquez" in t:
        return "Zona Norte"
    return ""


def parse_marti(pages: list[str]) -> list[dict]:
    units: list[dict] = []
    skip = re.compile(
        r"^(www\.|zona sur gba|zona oeste gba|avellaneda|lan[uú]s|lomas de zamora|"
        r"s\.?\s*f\.?\s*solano|san justo|moreno|ruta 2|la plata|t[eé]rminos)$",
        re.I,
    )

    for i, raw in enumerate(pages):
        text = raw.replace("\xa0", " ")
        if not re.search(r"\bFORMATO\b|\bMEDIDAS\b", text, re.I):
            continue
        if re.search(r"T[EÉ]RMINOS CONTRACTUALES", text, re.I):
            continue

        lines = [re.sub(r"\s+", " ", ln).strip() for ln in text.splitlines() if ln.strip()]
        title = ""
        zona_macro = ""
        zona = ""
        for ln in lines:
            low = ln.lower()
            if low.startswith("www."):
                continue
            if low in {"zona sur gba", "zona oeste gba", "ruta 2"}:
                zona_macro = ln
                continue
            if skip.match(ln) and not title:
                if not zona:
                    zona = ln
                continue
            if re.match(r"^(formato|medidas|visibilidad|vista desde)", ln, re.I):
                break
            if not title:
                title = ln
            elif "|" not in title and len(ln) < 80 and not re.match(r"^\$", ln):
                # segunda línea de ubicación a veces no existe
                break

        if not title or len(title) < 6:
            continue

        # Si el título quedó como barrio (Avellaneda), buscar la dirección real
        if skip.match(title):
            for ln in lines:
                if re.search(r"\d|AV\.|AUTOPISTA|RUTA|MITRE|YRIGOYEN", ln, re.I) and not skip.match(ln):
                    if not re.match(r"^(formato|medidas|visibilidad|\$)", ln, re.I):
                        title = ln
                        break

        formato = field(text, r"FORMATO", r"MEDIDAS|VISIBILIDAD|Vista|ZONA|\$")
        medidas = field(text, r"MEDIDAS", r"VISIBILIDAD|Vista|FORMATO|ZONA|\$")
        vis = field(text, r"VISIBILIDAD", r"ZONA\s+(SUR|OESTE)|FORMATO|MEDIDAS|\$")
        prices = re.findall(r"\$\s*[\d.]+", text)
        # última cifra grande suele ser el precio de la ficha
        price = ""
        for p in prices:
            amt = money_to_amount(p)
            if amt and int(float(amt)) >= 400000:
                price = amt

        # Ruta 2: "Una cara $ 430.000 | 2 caras o más $ 400.000"
        if "ruta 2" in title.lower() or "etcheverry" in title.lower():
            una = re.search(r"Una cara\s*\$\s*([\d.]+)", text, re.I)
            if una:
                price = money_to_amount(una.group(1))

        if not zona:
            for ln in lines:
                if ln.lower() in {
                    "avellaneda",
                    "lanús",
                    "lanus",
                    "lomas de zamora",
                    "san justo",
                    "moreno",
                    "solano (partido de quilmes)",
                    "cruce etcheverry (la plata)",
                }:
                    zona = ln
                    break

        if zona_macro and not zona:
            zona = zona_macro

        tipo = detect_tipo(formato)
        caras = detect_caras(formato + " " + medidas + " " + vis)
        medida = clean_medida(medidas)

        units.append(
            {
                "providerName": "Marti Publicidad",
                "page": i + 1,
                "title": title,
                "zona": zona or zona_macro,
                "locationLabel": title,
                "medidaRaw": medidas,
                "medida": medida,
                "tipo": tipo or formato,
                "caras": caras,
                "material": "",
                "visibilidad": vis,
                "impuestos": "",
                "luz": "",
                "disponibleEn": "Agosto",
                "produccion": "",
                "basePriceAmount": price or "1",
                "priceModel": "fixed_list" if price else "negotiable",
            }
        )
    return units


def to_drive_unit(u: dict, image_path: str | None) -> dict:
    zona = u.get("zona") or ""
    loc = u["locationLabel"]
    tipo = u.get("tipo") or "Espacio"
    name_parts = [tipo, zona, loc]
    name = " — ".join(p for p in name_parts if p)

    desc_bits = []
    if u.get("medida"):
        desc_bits.append(f"Medida: {u['medida']}")
    if u.get("visibilidad"):
        desc_bits.append(f"Visual: {u['visibilidad']}")
    if u.get("material"):
        desc_bits.append(f"Material: {u['material']}")
    if u.get("disponibleEn"):
        desc_bits.append(f"Disponible en: {u['disponibleEn']}")
    desc_bits.append("Pauta: Mensual")
    if u.get("basePriceAmount") and u["basePriceAmount"] != "1":
        desc_bits.append(f"Costo mensual: {format_ars_plain(u['basePriceAmount'])} + IVA")
    if u.get("produccion"):
        desc_bits.append(f"Producción: {format_ars_plain(u['produccion'])} + IVA")

    costo = (
        f"{format_ars_plain(u['basePriceAmount'])} + IVA"
        if u.get("basePriceAmount") and u["basePriceAmount"] != "1"
        else ""
    )

    meta = {
        "tipo": tipo,
        "zona": zona,
        "medida": u.get("medida") or "",
        "caras": u.get("caras") or "",
        "visibilidad": u.get("visibilidad") or "",
        "pauta": "Mensual",
        "costoMensual": costo,
        "disponibleEn": u.get("disponibleEn") or "",
        "source": "dispo-agosto-2026",
    }
    if u.get("material"):
        meta["material"] = u["material"]
    if u.get("produccion"):
        meta["produccion"] = format_ars_plain(u["produccion"]) + " + IVA"
    if u.get("impuestos"):
        meta["impuestos"] = u["impuestos"]
    if u.get("luz"):
        meta["luz"] = u["luz"]
    meta = {k: v for k, v in meta.items() if v}

    return {
        "providerName": u["providerName"],
        "name": name[:200],
        "locationLabel": loc[:240],
        "description": "\n".join(desc_bits),
        "format": "static_ooh",
        "basePriceAmount": u["basePriceAmount"] or "1",
        "priceModel": u["priceModel"],
        "status": "published",
        "sourceFile": u.get("sourceFile", ""),
        "metadata": meta,
        "imagePath": image_path,
        "disponibleEn": u.get("disponibleEn") or "",
    }


def main() -> None:
    pdfs = find_pdfs()
    if "carnevale" not in pdfs or "marti" not in pdfs:
        raise SystemExit(f"Faltan PDFs. Encontrados: {list(pdfs)}")

    print("Parseando Carnevale...")
    car_pages = page_texts(pdfs["carnevale"])
    carnevale = parse_carnevale(car_pages)
    print(f"  {len(carnevale)} posiciones")

    print("Parseando Marti...")
    mar_pages = page_texts(pdfs["marti"])
    marti = parse_marti(mar_pages)
    print(f"  {len(marti)} posiciones")

    parsed = [("PC Carnevale", pdfs["carnevale"], carnevale), ("Marti Publicidad", pdfs["marti"], marti)]
    units_out = []

    for provider, pdf_path, items in parsed:
        folder = slug(provider)
        for u in items:
            u["sourceFile"] = pdf_path.name
            img_rel = f"/inventory/{folder}/{slug(u['locationLabel'])}-p{u['page']}.jpg"
            dest = ROOT / "public" / img_rel.lstrip("/").replace("/", os.sep)
            print(f"  foto p{u['page']}: {u['locationLabel'][:70].encode('ascii', 'replace').decode()}")
            if not dest.exists() or dest.stat().st_size < 8000:
                render_page(pdf_path, u["page"] - 1, dest)
            units_out.append(to_drive_unit(u, img_rel))

    by_provider: dict[str, int] = {}
    for u in units_out:
        by_provider[u["providerName"]] = by_provider.get(u["providerName"], 0) + 1

    payload = {
        "generatedAt": "2026-08-27",
        "source": "dispo-agosto-2026",
        "count": len(units_out),
        "byProvider": by_provider,
        "units": units_out,
    }
    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"OK {len(units_out)} unidades -> {OUT_JSON}")
    for k, v in by_provider.items():
        print(f"  {k}: {v}")


if __name__ == "__main__":
    main()
