const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createPNG(width, height, drawPixel) {
    const rawData = Buffer.alloc(height * (1 + width * 4));
    for (let y = 0; y < height; y++) {
        const rowStart = y * (1 + width * 4);
        rawData[rowStart] = 0; // Filter: None
        for (let x = 0; x < width; x++) {
            const pixelStart = rowStart + 1 + x * 4;
            const color = drawPixel(x, y, width, height);
            rawData[pixelStart] = color[0];     // R
            rawData[pixelStart + 1] = color[1]; // G
            rawData[pixelStart + 2] = color[2]; // B
            rawData[pixelStart + 3] = color[3]; // A
        }
    }

    const compressed = zlib.deflateSync(rawData);

    function calcCRC(buf) {
        let c;
        const table = [];
        for (let n = 0; n < 256; n++) {
            c = n;
            for (let k = 0; k < 8; k++) {
                if (c & 1) c = 0xedb88320 ^ (c >>> 1);
                else c = c >>> 1;
            }
            table[n] = c;
        }
        let crc = 0xffffffff;
        for (let i = 0; i < buf.length; i++) {
            crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
        }
        return (crc ^ 0xffffffff) >>> 0;
    }

    function createChunk(type, data) {
        const len = Buffer.alloc(4);
        len.writeUInt32BE(data.length, 0);
        const typeBuf = Buffer.from(type, 'ascii');
        const body = Buffer.concat([typeBuf, data]);
        const crc = Buffer.alloc(4);
        crc.writeUInt32BE(calcCRC(body), 0);
        return Buffer.concat([len, body, crc]);
    }

    const header = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    const ihdrData = Buffer.alloc(13);
    ihdrData.writeUInt32BE(width, 0);
    ihdrData.writeUInt32BE(height, 4);
    ihdrData[8] = 8;  // bit depth
    ihdrData[9] = 6;  // color type: RGBA
    ihdrData[10] = 0; // compression
    ihdrData[11] = 0; // filter
    ihdrData[12] = 0; // interlace

    const ihdr = createChunk('IHDR', ihdrData);
    const idat = createChunk('IDAT', compressed);
    const iend = createChunk('IEND', Buffer.alloc(0));

    return Buffer.concat([header, ihdr, idat, iend]);
}

const dir = path.join(__dirname, '../src/assets');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

function drawThickPencil(rgbaColor) {
    return createPNG(24, 24, (x, y) => {
        const axis = x + y;
        const perp = Math.abs(axis - 23);

        if (perp <= 3.2 && x >= 3 && x <= 20 && y >= 3 && y <= 20) {
            if (x <= 7 && y >= 16) {
                if ((x === 3 && y === 20) || (x <= 5 && y >= 18) || (x <= 6 && y >= 17)) {
                    return rgbaColor;
                }
            } else {
                return rgbaColor;
            }
        }
        return [0, 0, 0, 0];
    });
}

function drawTrash(rgbaColor) {
    return createPNG(24, 24, (x, y) => {
        if (y === 2 && x >= 8 && x <= 15) return rgbaColor;
        if ((x === 8 || x === 15) && y >= 2 && y <= 4) return rgbaColor;

        if ((y === 5 || y === 6) && x >= 3 && x <= 20) return rgbaColor;

        if (y >= 7 && y <= 21) {
            if ((x === 5 || x === 6 || x === 17 || x === 18) && y <= 20) return rgbaColor;
            if ((y === 20 || y === 21) && x >= 5 && x <= 18) return rgbaColor;
            if ((x === 9 || x === 10 || x === 13 || x === 14) && y >= 9 && y <= 18) return rgbaColor;
        }
        return [0, 0, 0, 0];
    });
}

// 1. Pencil Light -> Dark Grey (#4B4B4B) for Normal Mode
fs.writeFileSync(path.join(dir, 'pencil-light.png'), drawThickPencil([75, 75, 75, 255]));

// 2. Pencil Dark (Charcoal Black for Edit Mode Blue background)
fs.writeFileSync(path.join(dir, 'pencil-dark.png'), drawThickPencil([15, 15, 15, 255]));

// 3. Trash Light (Medium-Light Grey)
fs.writeFileSync(path.join(dir, 'trash-light.png'), drawTrash([200, 200, 200, 255]));

console.log("Dark grey pencil icon generated!");
