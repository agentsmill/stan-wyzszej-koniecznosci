#!/bin/bash
# Montaż 30 s w pionie (1080x1920) z nagrań promo/raw_v i plansz promo/cards_v. Użycie: tools/promo/assemble_vertical.sh promo
set -e
P="${1:-promo}"; R="$P/raw_v"; C="$P/cards_v"; S="$P/seg_v"; mkdir -p "$S"
ENC=(-c:v libx264 -preset medium -crf 19 -r 30 -pix_fmt yuv420p -an)
T1="$R/take1_inside.webm"; T2="$R/take2_outside.webm"
card() { ffmpeg -v error -y -loop 1 -framerate 30 -t "$3" -i "$C/$2.png" -vf "fade=t=in:st=0:d=0.45,fade=t=out:st=$(echo "$3-0.45"|bc):d=0.45,format=yuv420p" "${ENC[@]}" "$S/$1.mp4"; echo "seg $1"; }
clip() { # name src start dur overlay ov_in ov_out
  ffmpeg -v error -y -ss "$3" -t "$4" -i "$2" -loop 1 -framerate 30 -t "$4" -i "$C/$5.png" \
    -filter_complex "[0:v]fps=30,scale=1080:1920:flags=neighbor[g];[1:v]format=rgba,fade=t=in:st=$6:d=0.35:alpha=1,fade=t=out:st=$7:d=0.45:alpha=1[o];[g][o]overlay=0:0:shortest=1,format=yuv420p" "${ENC[@]}" "$S/$1.mp4"; echo "seg $1"; }

card v00 cardv_01 2.5
clip v01 "$T1" 6.0 8.0 ovv_inside 0.4 7.3
ffmpeg -v error -y -ss 20.4 -t 3.0 -i "$T2" -loop 1 -framerate 30 -t 3.0 -i "$C/ovv_polska.png" \
  -filter_complex "[0:v]fps=30,crop=322:68:756:638,scale=1030:218:flags=neighbor,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=0x05070f[z];[1:v]format=rgba,fade=t=in:st=0.2:d=0.3:alpha=1,fade=t=out:st=2.5:d=0.4:alpha=1[o];[z][o]overlay=0:0:shortest=1,format=yuv420p" "${ENC[@]}" "$S/v02.mp4"; echo "seg v02"
clip v03 "$T2" 33.0 7.5 ovv_outside 0.4 6.8
clip v04 "$T2" 40.5 5.5 ovv_ending 2.4 4.9
card v05 cardv_04 3.5
ls "$S"/v*.mp4 | sed "s|^|file '$PWD/|; s|$|'|" > "$S/list.txt"
ffmpeg -v error -y -f concat -safe 0 -i "$S/list.txt" -c copy "$S/video_noaudio.mp4"
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$S/video_noaudio.mp4"); echo "wideo: ${DUR}s"
ffmpeg -v error -y -i "$S/video_noaudio.mp4" -i "$P/music.wav" -filter_complex "[1:a]volume=1.0,afade=t=in:st=0:d=0.6,afade=t=out:st=$(echo "$DUR-2.5"|bc):d=2.5,aformat=channel_layouts=stereo[a]" -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 160k -shortest -movflags +faststart "$P/stan-wyzszej-koniecznosci-promo-9x16.mp4"
ffprobe -v error -show_entries format=duration:stream=width,height -of default=nw=1 "$P/stan-wyzszej-koniecznosci-promo-9x16.mp4" | tr '\n' ' '; echo; ls -la "$P/stan-wyzszej-koniecznosci-promo-9x16.mp4"
