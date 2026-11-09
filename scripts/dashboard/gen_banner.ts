import ZAI from "z-ai-web-dev-sdk";
import fs from "fs";

const PROMPT = `Dark fantasy game launcher UI banner, wide horizontal composition on a very dark near-black background with faint silhouettes of jagged mountains on the left glowing with burning-orange light and a gothic castle with lit windows on the far right at dusk. IMPORTANT: the five cards together occupy only the middle 50% of the image height, tightly centered vertically, wide airy composition with large empty dark background above and below the cards. Centered horizontally: five ornate rounded trading-card panels fanned in a gentle arc, slightly tilted outward from the center, each with a dark charcoal frame and a subtle warm golden edge. Card 1 (far left): fantasy castle on a cliff at golden sunset, label 'Books' and text '12 projects'. Card 2: armored warrior silhouette against a huge blood-red moon, label 'Games', text '5 projects'. Card 3 (CENTER, raised higher than the others, surrounded by a bright golden glowing border): a glowing blue computer monitor on a dark desk, label 'Software', text '3 projects'. Card 4: golden film reels and a clapperboard in warm light, label 'Movies', text '6 projects'. Card 5 (far right): vintage television set with floating fantasy islands in a purple dusk sky, label 'Cartoons', text '4 projects'. EXACT TEXT SPELLING, always the plural word 'projects': 'Books 12 projects', 'Games 5 projects', 'Software 3 projects', 'Movies 6 projects', 'Cartoons 4 projects'. All labels in clean readable white serif font, a tiny three-dot menu icon under each label. Rich amber, gold and deep brown palette, cinematic rim lighting, polished AAA game launcher art style, high quality, detailed illustration`;

const OUT = process.argv[2] ?? "scripts/dashboard/banner_raw.png";
// API prihvata samo dimenzije deljive sa 32 (CLI lista je uža): 1440x704 ✓
const SIZE = "1440x704" as unknown as "1440x720";

const zai = await ZAI.create();
const response = await zai.images.generations.create({ prompt: PROMPT, size: SIZE });
const b64 = response?.data?.[0]?.base64;
if (!b64) throw new Error("Nema base64 u odgovoru");
fs.writeFileSync(OUT, Buffer.from(b64, "base64"));
console.log("OK:", OUT, fs.statSync(OUT).size, "bajtova,", SIZE);
