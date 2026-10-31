#!/bin/bash
# Montaż filmiku promocyjnego z nagrań Playwright, plansz i muzyki. Użycie: tools/promo/assemble.sh promo
set -e
P="${1:-promo}"; R="$P/raw"; C="$P/cards"; S="$P/seg"; mkdir -p "$S"
ENC=(-c:v libx264 -preset medium -crf 19 -r 30 -pix_fmt yuv420p -an)
T1="$R/take1_inside.webm"; T2="$R/take2_outside.webm"

card() { # name png dur
  ffmpeg -v error -y -loop 1 -framerate 30 -t "$3" -i "$C/$2.png" -vf "fade=t=in:st=0:d=0.5,fade=t=out:st=$(echo "$3-0.45"|bc):d=0.45,format=yuv420p" "${ENC[@]}" "$S/$1.mp4"; echo "seg $1"; }
clip() { # name src start dur overlay ov_in ov_out [extra-vf]
  local vf="fps=30,scale=1920:1080:flags=neighbor${8:+,$8}"
  if [ -n "$5" ]; then
    ffmpeg -v error -y -ss "$3" -t "$4" -i "$2" -loop 1 -framerate 30 -t "$4" -i "$C/$5.png" \
      -filter_complex "[0:v]$vf[g];[1:v]format=rgba,fade=t=in:st=$6:d=0.35:alpha=1,fade=t=out:st=$7:d=0.45:alpha=1[o];[g][o]overlay=0:0:shortest=1,format=yuv420p" "${ENC[@]}" "$S/$1.mp4"
  else
    ffmpeg -v error -y -ss "$3" -t "$4" -i "$2" -vf "$vf,format=yuv420p" "${ENC[@]}" "$S/$1.mp4"
  fi; echo "seg $1"; }

card s00 card_01 3.0
card s01 card_02 2.6
clip s02 "$T1" 1.0 4.0 ov_menu 0.4 3.3
clip s03 "$T1" 5.2 9.0 ov_inside 0.5 7.0
clip s04 "$T1" 18.8 6.5 "" 
card s05 card_03 2.0
# zbliżenie na licznik POLSKA (ujęcie 2, wezwanie Prezydenta = -15)
ffmpeg -v error -y -ss 18.6 -t 4.4 -i "$T2" -loop 1 -framerate 30 -t 4.4 -i "$C/ov_citizens.png" \
  -filter_complex "[0:v]fps=30,crop=500:104:1348:8,scale=1680:349:flags=neighbor,pad=1920:1080:(ow-iw)/2:(oh-ih)/2-120:color=0x05070f[z];[1:v]format=rgba,fade=t=in:st=0.3:d=0.35:alpha=1,fade=t=out:st=3.8:d=0.45:alpha=1[o];[z][o]overlay=0:0:shortest=1,format=yuv420p" "${ENC[@]}" "$S/s06.mp4"; echo "seg s06"
clip s07 "$T2" 2.5 7.5 ov_outside 0.4 6.0
clip s08 "$T2" 29.0 10.6 ov_president 0.5 8.5
clip s09 "$T2" 39.6 7.4 ov_ending 3.0 6.4
card s10 card_04 4.5

ls "$S"/s*.mp4 | sed "s|^|file '$PWD/|; s|$|'|" > "$S/list.txt"
ffmpeg -v error -y -f concat -safe 0 -i "$S/list.txt" -c copy "$S/video_noaudio.mp4"
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$S/video_noaudio.mp4")
echo "wideo bez dźwięku: ${DUR}s"
# dźwięk: chiptune ściszony, wyciszenie na końcu
ffmpeg -v error -y -i "$S/video_noaudio.mp4" -i "$P/music.wav" -filter_complex "[1:a]volume=1.0,afade=t=in:st=0:d=0.8,afade=t=out:st=$(echo "$DUR-3.5"|bc):d=3.5,aformat=channel_layouts=stereo[a]" -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 160k -shortest -movflags +faststart "$P/stan-wyzszej-koniecznosci-promo.mp4"
ffprobe -v error -show_entries format=duration:stream=codec_name,width,height -of default=nw=1 "$P/stan-wyzszej-koniecznosci-promo.mp4"; ls -la "$P/stan-wyzszej-koniecznosci-promo.mp4"
