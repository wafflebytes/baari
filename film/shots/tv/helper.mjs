// The TV draws its join QR with qrcode-generator 1.4.4 from cdnjs, which the
// recording container can't reach, so the QR comes out as a white box with the
// link in it. This prints the exact SVG the TV would draw (same library and
// version, same call as drawQr in app/invite.js) as an "eval" step that puts
// it into #qr-c. Run it after `npm pack qrcode-generator@1.4.4` and untar:
//
//   node shots/tv/helper.mjs path/to/package/qrcode.js
//
// and paste the printed step into a TV shot file after the first wait.
import fs from "node:fs";
import vm from "node:vm";
const src = fs.readFileSync(process.argv[2], "utf8");
const ctx = { module: {}, exports: {} };
vm.runInNewContext(src + "\n;this.qrcode = qrcode;", ctx);
const q = ctx.qrcode(0, "M");
q.addData("https://t.me/Baari_ken_bot");
q.make();
const svg = q.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
const js = `(()=>{const b=document.querySelector('#qr-c');if(b&&!b.querySelector('svg'))b.innerHTML=${JSON.stringify(svg)}})()`;
console.log(JSON.stringify({ eval: js, after: 0 }));
