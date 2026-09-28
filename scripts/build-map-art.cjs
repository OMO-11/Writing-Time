/* eslint-disable @typescript-eslint/no-require-imports -- Local art packaging. */
// Usage: node scripts/build-map-art.cjs <generated-image-directory>
// The four regions were independently detailed by ImageGen from overlapping crops.
// A minimum-error seam retains detail rather than ghosting it across a wide blend.
const sharp = require('sharp');
const path = require('node:path');
const fs = require('node:fs/promises');
const root = process.argv[2];
if (!root) throw new Error('Pass the generated image directory.');
const names = ['exec-1599f7ba-5333-4952-a1c1-48a1cd9c7b4f.png', 'exec-14ae1bb8-7746-44cb-8d32-bb9a3cbf910b.png', 'exec-b627573b-2d18-492b-a07d-818be63ecf16.png', 'exec-903499a6-ac21-47bf-ba4d-ca3926c06bce.png'];
async function read(name) { return sharp(path.join(root, name)).removeAlpha().raw().toBuffer({ resolveWithObject: true }); }
function join(a, b, offset, vertical = false) {
  const aw = a.info.width, ah = a.info.height, bw = b.info.width, bh = b.info.height;
  const cross = vertical ? aw : ah, overlap = (vertical ? ah : aw) - offset;
  const outW = vertical ? aw : offset + bw, outH = vertical ? offset + bh : ah;
  const at = (isB, x, y, channel) => {
    const img = isB ? b : a;
    const xx = vertical ? y : x + (isB ? 0 : offset);
    const yy = vertical ? x + (isB ? 0 : offset) : y;
    return img.data[(yy * img.info.width + xx) * 3 + channel];
  };
  const parent = new Int16Array(cross * overlap);
  let previous = new Float64Array(overlap);
  for (let y = 0; y < cross; y++) {
    const next = new Float64Array(overlap);
    for (let x = 0; x < overlap; x++) {
      let cost = 0;
      for (let c = 0; c < 3; c++) cost += Math.abs(at(false,x,y,c) - at(true,x,y,c));
      // Keep the seam away from the strip's outer boundaries.
      cost += x < 20 || x > overlap - 21 ? 200 : 0;
      let best = x;
      if (x && previous[x-1] < previous[best]) best = x-1;
      if (x+1 < overlap && previous[x+1] < previous[best]) best = x+1;
      next[x] = cost + previous[best]; parent[y*overlap+x] = best;
    }
    previous = next;
  }
  let best = 0;
  for (let x = 1; x < overlap; x++) if (previous[x] < previous[best]) best = x;
  const seam = new Int16Array(cross);
  for (let y = cross-1; y >= 0; y--) { seam[y] = best; best = parent[y*overlap+best]; }
  const output = Buffer.alloc(outW*outH*3);
  for (let y=0;y<outH;y++) for(let x=0;x<outW;x++) {
    const axis = vertical ? y : x, lane = vertical ? x : y;
    const w = Math.max(0,Math.min(1,(axis-offset-seam[lane]+5)/10));
    for(let c=0;c<3;c++) {
      const av = axis < (vertical ? ah : aw) ? a.data[(y*aw+x)*3+c] : 0;
      const bx = vertical ? x : x-offset, by = vertical ? y-offset : y;
      const bv = axis >= offset ? b.data[(by*bw+bx)*3+c] : 0;
      output[(y*outW+x)*3+c] = Math.round(av*(1-w)+bv*w);
    }
  }
  return { data: output, info: { width: outW, height: outH, channels: 3 } };
}
(async () => {
  const tiles = await Promise.all(names.map(read));
  const sx = tiles[0].info.width / 960, sy = tiles[0].info.height / 540;
  const top = join(tiles[0], tiles[1], Math.round(712*sx));
  const bottom = join(tiles[2], tiles[3], Math.round(712*sx));
  const final = join(top, bottom, Math.round(401*sy), true);
  await fs.mkdir('public/assets/world-map/pieces', {recursive:true});
  await sharp(final.data,{raw:final.info}).webp({quality:94,effort:6}).toFile('public/assets/world-map/terrain-detailed.webp');
  const sheet = path.join(root,'exec-451ff278-e179-42d6-9f28-7b194d478247.png');
  for(const [i,name] of ['noval','eden'].entries()) {
    const { data,info } = await sharp(sheet).extract({left:i*768,top:0,width:768,height:1024}).raw().toBuffer({resolveWithObject:true});
    let x0=768,y0=1024,x1=0,y1=0;
    for(let y=0;y<1024;y++) for(let x=0;x<768;x++) if(data[(y*768+x)*4+3]>16){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
    await sharp(data,{raw:info}).extract({left:x0,top:y0,width:x1-x0+1,height:y1-y0+1}).resize({height:512}).webp({quality:95,alphaQuality:100}).toFile(`public/assets/world-map/pieces/${name}-chess.webp`);
  }
  console.log('Packaged map:', final.info, 'and two transparent chess pieces.');
})().catch(error=>{console.error(error);process.exitCode=1;});
