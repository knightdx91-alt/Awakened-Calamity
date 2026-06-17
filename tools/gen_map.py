#!/usr/bin/env python3
"""gen_map — CLI for the Awakened Calamity map generator.

Examples:
  python3 tools/gen_map.py town   --name VerdantTown --size 50x50 --seed 11
  python3 tools/gen_map.py route  --name GreenmileTrail --size 64x30 --seed 3
  python3 tools/gen_map.py forest --name MistwoodPath --size 50x50 --seed 7
  python3 tools/gen_map.py dungeon  --name HollowVein --size 48x48 --seed 4
  python3 tools/gen_map.py interior --name DawnhearthInn --size 24x18 --seed 2
  python3 tools/gen_map.py place "Hollow Vein"        # data-driven from data/world
Generated maps register in data/maps/<region>_index.json and boot via
  game.html?map=<Name>&region=<region>
"""
import argparse, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mapgen

def parse_size(s, dw, dh):
    if not s: return dw, dh
    w, h = s.lower().split("x"); return int(w), int(h)

def main():
    ap = argparse.ArgumentParser(description="Awakened Calamity map generator")
    sub = ap.add_subparsers(dest="cmd", required=True)
    for arch in ("town", "route", "forest", "dungeon", "interior"):
        p = sub.add_parser(arch)
        p.add_argument("--name", required=True)
        p.add_argument("--size", default="")
        p.add_argument("--seed", type=int, default=None)
        p.add_argument("--region", default="awakened")
        if arch == "town":
            p.add_argument("--houses", type=int, default=12)
            p.add_argument("--no-keep", action="store_true")
            p.add_argument("--no-pond", action="store_true")
        if arch == "route":
            p.add_argument("--vertical", action="store_true")
        if arch in ("dungeon", "interior"):
            p.add_argument("--tier", type=int, default=1)
            p.add_argument("--hazard", default="")
    pl = sub.add_parser("place")
    pl.add_argument("query")
    pl.add_argument("--region", default="awakened")
    pl.add_argument("--seed", type=int, default=None)
    args = ap.parse_args()

    seed = args.seed if getattr(args, "seed", None) is not None else hash(getattr(args, "name", "")) & 0xffff

    if args.cmd == "town":
        w, h = parse_size(args.size, 50, 50)
        mid = mapgen.gen_town(args.name, w, h, seed, args.region,
                              houses=args.houses, keep=not args.no_keep, pond=not args.no_pond)
    elif args.cmd == "route":
        w, h = parse_size(args.size, (30 if args.vertical else 64), (64 if args.vertical else 30))
        mid = mapgen.gen_route(args.name, w, h, seed, args.region, vertical=args.vertical)
    elif args.cmd == "forest":
        w, h = parse_size(args.size, 50, 50)
        mid = mapgen.gen_forest(args.name, w, h, seed, args.region)
    elif args.cmd in ("dungeon", "interior"):
        import mapgen_indoor
        w, h = parse_size(args.size, (48, 48) if args.cmd == "dungeon" else (24, 18))[0:2] if False else \
               parse_size(args.size, *( (48, 48) if args.cmd == "dungeon" else (26, 18) ))
        fn = mapgen_indoor.gen_dungeon if args.cmd == "dungeon" else mapgen_indoor.gen_interior
        mid = fn(args.name, w, h, seed, args.region, tier=args.tier, hazard=args.hazard)
    elif args.cmd == "place":
        import world_driver
        mid = world_driver.generate_place(args.query, region=args.region, seed=args.seed)
    print("generated", mid)

if __name__ == "__main__":
    main()
