#!/usr/bin/env python3
"""
extract_hns.py — Extract maps from the Pokémon Heart & Soul (HnS) submodule.

HnS is a pokeemerald-based GBA hack, so its maps are the same 2D metatile
format as Hoenn. This reuses tools/extract_tilesets_emerald.py verbatim, just
retargeted at source/pokemonhns with a distinct `hns_` tileset prefix and
output dir data/layouts/hns/ (so it never collides with the Hoenn extraction).

Usage:
  python3 tools/extract_hns.py                       # full run (all layouts)
  EXTRACT_LAYOUT_FILTER=NEW_BARK,CHERRYGROVE,VIOLET,ROUTE_29,ROUTE_30 \
      python3 tools/extract_hns.py                    # prototype subset

Outputs:
  data/tilesets/hns_<name>.png + .json   (metatile spritesheets)
  data/layouts/hns/<LAYOUT_ID>.json      (grid + collision, game format)
"""
import importlib.util
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
GAME_ROOT  = SCRIPT_DIR.parent

# Load the Emerald extractor as a module and retarget its module-level config.
spec = importlib.util.spec_from_file_location(
    "em_extract", SCRIPT_DIR / "extract_tilesets_emerald.py")
em = importlib.util.module_from_spec(spec)
spec.loader.exec_module(em)

em.SOURCE_ROOT  = GAME_ROOT / "source" / "pokemonhns"
em.LAYOUTS_JSON = em.SOURCE_ROOT / "data" / "layouts" / "layouts.json"
em.OUT_LAYOUTS  = GAME_ROOT / "data" / "layouts" / "hns"
em.REGION_PREFIX = "hns_"
# HnS expands the primary tileset to 640 tiles (pokeemerald default is 512).
# See source/pokemonhns/include/fieldmap.h: NUM_TILES_IN_PRIMARY 640.
em.PRIMARY_TILE_COUNT = 640

if __name__ == "__main__":
    if not em.LAYOUTS_JSON.exists():
        raise SystemExit(
            "HnS submodule not initialized. Run:\n"
            "  git submodule update --init source/pokemonhns")
    em.main()
