import unicodedata

ARTIST_ALIASES: dict[str, list[str]] = {
    # ── Louvre ────────────────────────────────────────────────────────────────
    "leonard-de-vinci":   ["léonard de vinci", "leonard de vinci", "leonardo da vinci", "da vinci", "vinci", "léonard"],
    "raphael":            ["raphaël", "raphael", "raffaello", "sanzio", "raffaello sanzio"],
    "vermeer":            ["vermeer", "johannes vermeer", "jan vermeer"],
    "rembrandt":          ["rembrandt", "rembrandt van rijn", "van rijn"],
    "rubens":             ["rubens", "peter paul rubens", "pieter paul rubens"],
    "caravage":           ["caravage", "caravaggio", "merisi", "michelangelo merisi"],
    "poussin":            ["poussin", "nicolas poussin"],
    "david":              ["david", "jacques-louis david", "louis david"],
    "ingres":             ["ingres", "jean-auguste-dominique ingres", "dominique ingres"],
    "delacroix":          ["delacroix", "eugène delacroix", "eugene delacroix"],
    # ── Orsay ─────────────────────────────────────────────────────────────────
    "manet":              ["manet", "edouard manet", "édouard manet"],
    "monet":              ["monet", "claude monet"],
    "renoir":             ["renoir", "pierre-auguste renoir", "auguste renoir"],
    "degas":              ["degas", "edgar degas"],
    "van-gogh":           ["van gogh", "vincent van gogh", "gogh", "van gogh vincent"],
    "gauguin":            ["gauguin", "paul gauguin"],
    "cezanne":            ["cézanne", "cezanne", "paul cézanne", "paul cezanne"],
    "seurat":             ["seurat", "georges seurat"],
    "courbet":            ["courbet", "gustave courbet"],
    "toulouse-lautrec":   ["toulouse-lautrec", "lautrec", "henri de toulouse-lautrec", "toulouse lautrec"],
    # ── Centre Pompidou ───────────────────────────────────────────────────────
    "matisse":            ["matisse", "henri matisse"],
    "kandinsky":          ["kandinsky", "wassily kandinsky", "vassily kandinsky"],
    "braque":             ["braque", "georges braque"],
    "leger":              ["léger", "leger", "fernand léger", "fernand leger"],
    "duchamp":            ["duchamp", "marcel duchamp"],
    "delaunay-r":         ["robert delaunay", "delaunay", "r. delaunay"],
    "brancusi":           ["brancusi", "constantin brancusi"],
    "klein-yves":         ["yves klein", "klein"],
    "miro":               ["miró", "miro", "joan miró", "joan miro"],
    "giacometti":         ["giacometti", "alberto giacometti"],
    # ── Orangerie ─────────────────────────────────────────────────────────────
    "monet-nlg":          ["nymphéas", "nympheéas", "nympheas"],  # identified via artwork title
    "modigliani":         ["modigliani", "amedeo modigliani"],
    "soutine":            ["soutine", "chaïm soutine", "chaim soutine"],
    "derain":             ["derain", "andré derain", "andre derain"],
    "utrillo":            ["utrillo", "maurice utrillo"],
    "laurencin":          ["laurencin", "marie laurencin"],
    "vlaminck":           ["vlaminck", "de vlaminck", "maurice de vlaminck", "maurice vlaminck"],
    "rousseau-h":         ["henri rousseau", "le douanier", "douanier rousseau", "rousseau le douanier", "le douanier rousseau"],
    "picasso-org":        ["picasso", "pablo picasso"],
    "sisley":             ["sisley", "alfred sisley"],
    # ── Fondation Louis Vuitton ───────────────────────────────────────────────
    "basquiat":           ["basquiat", "jean-michel basquiat"],
    "rothko":             ["rothko", "mark rothko"],
    "richter":            ["richter", "gerhard richter"],
    "hockney":            ["hockney", "david hockney"],
    "boltanski":          ["boltanski", "christian boltanski"],
    "koons":              ["koons", "jeff koons"],
    "kapoor":             ["kapoor", "anish kapoor"],
    "kelly-e":            ["ellsworth kelly"],
    "turrell":            ["turrell", "james turrell"],
    "prince-r":           ["richard prince"],
}


def _normalize(s: str) -> str:
    return unicodedata.normalize("NFD", s.lower()).encode("ascii", "ignore").decode()


_INDEX: dict[str, str] = {}
for _artist_id, _aliases in ARTIST_ALIASES.items():
    for _alias in _aliases:
        _INDEX[_normalize(_alias)] = _artist_id


def match_artist(name: str | None) -> str | None:
    if not name:
        return None
    n = _normalize(name)
    if n in _INDEX:
        return _INDEX[n]
    for alias_norm, artist_id in _INDEX.items():
        if alias_norm in n or n in alias_norm:
            return artist_id
    return None
