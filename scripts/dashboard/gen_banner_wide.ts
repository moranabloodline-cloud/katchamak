import ZAI from "z-ai-web-dev-sdk";
import fs from "fs";

const PROMPT = `Dark fantasy game launcher UI banner, ultra-wide panoramic horizontal composition on a very dark near-black background. IMPORTANT LAYOUT: the five category cards occupy ONLY the central 45% of the image width, tightly clustered in the middle; the remaining left and right 27% each show wide atmospheric dark fantasy landscape stretching all the way to the image edges — jagged dark mountains with burning-orange glowing cracks on the left edge, a gothic castle with lit windows on the distant right edge, heavy dark clouds, cinematic dusk fog. Centered horizontally: five ornate rounded trading-card panels fanned in a gentle arc, slightly tilted outward from the center, each with a dark charcoal frame and a subtle warm golden edge. Card 1 (far left of the group): fantasy castle on a cliff at golden sunset, label 'Books' and text '12 projects'. Card 2: armored warrior silhouette against a huge blood-red moon, label 'Games', text '5 projects'. Card 3 (CENTER of the group, raised higher, surrounded by a bright golden glowing border): a glowing blue computer monitor on a dark desk, label 'Software', text '3 projects'. Card 4: golden film reels and a clapperboard in warm light, label 'Movies', text '6 projects'. Card 5 (far right of the group): vintage television set with floating fantasy islands in a purple dusk sky, label 'Cartoons', text '4 projects'. EXACT TEXT, always plural 'projects': 'Books 12 projects', 'Games 5 projects', 'Software 3 projects', 'Movies 6 projects', 'Cartoons 4 projects'. Clean readable white serif labels, tiny three-dot icon under each label. Rich amber, gold and deep brown palette, polished AAA game launcher art, high quality, detailed`;

const OUT = process.argv[2] ?? "scripts/dashboard/banner_wide.png";
// API: dimenzije deljive sa 32, do 2880px, max 2^22px -> 2880x640 ✓
const SIZE = "2880x640" as unknown as "1440x720";

const zai = await ZAI.create();
const response = await zai.images.generations.create({ prompt: PROMPT, size: SIZE });
const b64 = response?.data?.[0]?.base64;
if (!b64) throw new Error("Nema base64 u odgovoru");
fs.writeFileSync(OUT, Buffer.from(b64, "base64"));
console.log("OK:", OUT, fs.statSync(OUT).size, "bajtova,", SIZE);
