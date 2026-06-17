#!/usr/bin/env python3
"""Import RTP audio -> data/audio/{se,me,bgs,bgm}/ + rtp_audio_index.json.
By default copies the light categories (SE/ME/BGS); BGM (~78MB) is indexed but
NOT copied unless --bgm is given (keeps the deployed site lean). SRC overridable."""
import json, os, shutil, sys
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC=os.environ.get("SRC", os.path.join(ROOT,"assets-source","vx-ace-rtp","Audio"))
DST=os.path.join(ROOT,"data","audio")
COPY=["SE","ME","BGS"] + (["BGM"] if "--bgm" in sys.argv else [])
def main():
    index={"source":"RPG Maker VX Ace RTP audio (prototype; branch vx-ace-rtp)","categories":{}}
    for cat in ["BGM","BGS","ME","SE"]:
        sd=os.path.join(SRC,cat)
        files=sorted(f for f in os.listdir(sd) if f.lower().endswith((".ogg",".mp3",".m4a")))
        present = cat in COPY
        if present:
            od=os.path.join(DST,cat.lower()); os.makedirs(od,exist_ok=True)
            for f in files: shutil.copyfile(os.path.join(sd,f), os.path.join(od,f))
        index["categories"][cat.lower()]={"present":present,"dir":"data/audio/"+cat.lower(),
            "tracks":[f[:-4] for f in files]}
        print(f"{cat}: {len(files)} tracks {'COPIED' if present else 'indexed only (on branch)'}")
    json.dump(index, open(os.path.join(DST,"rtp_audio_index.json"),"w"))
main()
