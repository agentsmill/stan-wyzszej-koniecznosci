#!/bin/bash
# Dynamiczny montaż (~33 s, 1920x1080) z promo/raw_fast + napisy kinetyczne + muzyka 140 BPM.
# Użycie: tools/promo/assemble_fast.sh promo [LAG]   (LAG = opóźnienie wideo względem znaczników, s)
set -e
P="${1:-promo}"; LAG="${2:-2.8}"; R="$P/raw_fast"; K="$P/kinetic"; C="$P/cards"; S="$P/seg_fast"; mkdir -p "$S"
ENC=(-c:v libx264 -preset medium -crf 18 -r 30 -pix_fmt yuv420p -an)
F1="$R/f1_inside.webm"; F2="$R/f2_outside.webm"
m() { python3 -I -c "import json,sys; d=json.load(open('$R/$1.json')); print([x['t'] for x in d['marks'] if x['label']=='$2'][0])"; }
add() { echo "$1 + $2" | bc; }
# clip name src start dur [ov1 in out] [ov2 in out] [crop x y]   (crop = 960x540 -> 2x zoom)
clip() {
  local name=$1 src=$2 st=$3 dur=$4 ov1=$5 i1=$6 o1=$7 ov2=$8 i2=$9 o2=${10} cx=${11} cy=${12}
  local pre="fps=30,scale=1920:1080:flags=neighbor"; [ -n "$cx" ] && pre="fps=30,crop=960:540:$cx:$cy,scale=1920:1080:flags=neighbor"
  local inputs=(-ss "$st" -t "$dur" -i "$src"); local fc="[0:v]$pre[v0]"; local last="v0"; local n=1
  for spec in "$ov1|$i1|$o1" "$ov2|$i2|$o2"; do
    IFS='|' read -r ov iin oout <<< "$spec"; [ -z "$ov" ] && continue
    inputs+=(-loop 1 -framerate 30 -t "$dur" -i "$K/$ov.png")
    fc="$fc;[$n:v]format=rgba,fade=t=in:st=$iin:d=0.08:alpha=1,fade=t=out:st=$oout:d=0.12:alpha=1[o$n];[$last][o$n]overlay=0:0:shortest=1[v$n]"; last="v$n"; n=$((n+1))
  done
  ffmpeg -v error -y "${inputs[@]}" -filter_complex "$fc;[$last]format=yuv420p[out]" -map "[out]" "${ENC[@]}" "$S/$name.mp4"; echo "seg $name"
}
B1=$(m f1_inside build); BO=$(m f1_inside bosses); FR=$(m f1_inside freeze); MN=$(m f1_inside menu)
SW=$(m f2_outside swarm); CU=$(m f2_outside cut); CH=$(m f2_outside chairman); PR=$(m f2_outside president); EN=$(m f2_outside ending)
# dryf nagrania: czas wideo = znacznik * (długość wideo / znacznik końca)
D1=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$F1"); E1=$(m f1_inside end); D2=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$F2"); E2=$(m f2_outside end)
V1() { echo "$1 * $D1 / $E1" | bc -l; }; V2() { echo "$1 * $D2 / $E2" | bc -l; }
# momenty zbliżeń z trackingu Prezydenta (furtka, boczne wejście) + środki kadrów 960x540
read -r GT GX GY DT DX DY <<< "$(python3 -I -c "
import json; d=json.load(open('$R/f2_outside.json')); tr=d['track']
def px(p): return (60+(640+(p['gx']-p['gy'])*32)*1.40625, (118+(p['gx']+p['gy'])*16)*1.40625)
def crop(p): x,y=px(p); return int(max(0,min(960,x-480))), int(max(0,min(540,y-270-20)))
g=[p for p in tr if 9.5<=p['gy']<=11.5 and 10.5<=p['gx']<=13.5] or tr[len(tr)//3:len(tr)//3+1]
dd=[p for p in tr if p['gx']>=15 and p['gy']<=5.5] or tr[-3:-2]
gp=g[len(g)//2]; dp=dd[0]
print(gp['t'], *crop(gp), dp['t'], *crop(dp))")"
echo "zbliżenia: furtka t=$GT crop=$GX,$GY  boczne t=$DT crop=$DX,$DY"
echo "dryf f1: $(echo "$D1/$E1"|bc -l | cut -c1-5)  f2: $(echo "$D2/$E2"|bc -l | cut -c1-5)"

# s00 tytuł z „uderzeniem" (zoom z 1.12 do 1.0)
ffmpeg -v error -y -loop 1 -framerate 30 -t 1.6 -i "$C/card_02.png" -vf "zoompan=z='if(lte(on,1),1.12,max(1.0,zoom-0.004))':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080:fps=30,fade=t=out:st=1.4:d=0.2,format=yuv420p" "${ENC[@]}" "$S/s00.mp4"; echo "seg s00"
clip s01 "$F1" $(V1 $(add $MN 0.1)) 1.3 w_wybierz 0.1 1.15
clip s02 "$F1" $(V1 $B1) 3.6 w_kordon 0.1 1.6 w_sedziowie 1.75 3.4
clip s03 "$F1" $(V1 $(add $BO 0.2)) 2.6 w_akta 0.2 2.4
clip s04 "$F1" $(V1 $FR) 1.6 w_przerwa 0.1 1.45
clip s05 "$F2" $(V2 $(add $SW 0.3)) 2.6 w_tlum 0.1 2.4
clip s06 "$F2" $(V2 $(add $CU -0.9)) 1.6 w_ciecie 0.3 1.45 "" "" "" 570 391
clip s07 "$F2" $(V2 $(add $CH 0.3)) 2.0 w_policyjne 0.1 1.85
# s08 licznik POLSKA (spadek o 15 przy wezwaniu Prezydenta)
ffmpeg -v error -y -ss $(V2 $(add $PR -1.3)) -t 1.8 -i "$F2" -loop 1 -framerate 30 -t 1.8 -i "$K/w_polska.png" -filter_complex "[0:v]fps=30,crop=528:106:1326:8,scale=1680:337:flags=neighbor,pad=1920:1080:(ow-iw)/2:(oh-ih)/2+60:color=0x05070f[z];[1:v]format=rgba,fade=t=in:st=0.1:d=0.08:alpha=1,fade=t=out:st=1.45:d=0.12:alpha=1[o];[z][o]overlay=0:0:shortest=1,format=yuv420p" "${ENC[@]}" "$S/s08.mp4"; echo "seg s08"
clip s09 "$F2" $(V2 $(add $PR 0.3)) 2.4 w_prezydent 0.1 2.2
clip s10 "$F2" $(V2 $(add $GT -0.5)) 2.2 w_sedziami 0.3 2.05 "" "" "" $GX $GY
clip s11 "$F2" $(V2 $(add $DT -0.2)) 2.0 w_boczne 0.2 1.85 "" "" "" $DX $DY
# s12 błysk zwycięstwa (z białym flashem na cięciu)
ffmpeg -v error -y -ss $(V2 $EN) -t 1.2 -i "$F2" -vf "fps=30,scale=1920:1080:flags=neighbor,fade=t=in:st=0:d=0.12:color=white,format=yuv420p" "${ENC[@]}" "$S/s12.mp4"; echo "seg s12"
clip s13 "$F2" $(add $(V2 $EN) 1.2) 3.4 w_zawsze 1.0 3.2
ffmpeg -v error -y -loop 1 -framerate 30 -t 3.2 -i "$C/card_04.png" -vf "fade=t=in:st=0:d=0.3,fade=t=out:st=2.8:d=0.4,format=yuv420p" "${ENC[@]}" "$S/s14.mp4"; echo "seg s14"

ls "$S"/s*.mp4 | sed "s|^|file '$PWD/|; s|$|'|" > "$S/list.txt"
ffmpeg -v error -y -f concat -safe 0 -i "$S/list.txt" -c copy "$S/video_noaudio.mp4"
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$S/video_noaudio.mp4"); echo "wideo: ${DUR}s"
# muzyka z uderzeniami na cięciach (czasy = sumy długości segmentów)
HITS=$(python3 -I -c "
d=[1.6,1.3,3.6,2.6,1.6,2.6,1.6,2.0,1.8,2.4,2.2,2.0,1.2,3.4]; t=0; out=[]
for x in d: t+=x; out.append(round(t,2))
print(','.join(str(x) for x in out))")
python3 tools/promo/chiptune.py "$P/music_fast.wav" $(echo "$DUR+1"|bc) 140 "$HITS" --drums-from-start >/dev/null
ffmpeg -v error -y -i "$S/video_noaudio.mp4" -i "$P/music_fast.wav" -filter_complex "[1:a]volume=0.9,afade=t=in:st=0:d=0.3,afade=t=out:st=$(echo "$DUR-2.2"|bc):d=2.2,aformat=channel_layouts=stereo[a]" -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 160k -shortest -movflags +faststart "$P/stan-wyzszej-koniecznosci-promo-fast.mp4"
ffprobe -v error -show_entries format=duration -of csv=p=0 "$P/stan-wyzszej-koniecznosci-promo-fast.mp4"; ls -la "$P/stan-wyzszej-koniecznosci-promo-fast.mp4"
