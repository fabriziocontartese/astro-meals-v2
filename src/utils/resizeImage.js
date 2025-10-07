// src/utils/resizeImage.js
export async function resizeImage(file, {
    maxWidth = 1600,
    maxHeight = 1600,
    maxBytes = 600 * 1024,   // 600 KB
    mime = "image/jpeg",
  } = {}) {
    if (!(file instanceof Blob)) throw new Error("Invalid file");
    const bitmap = await createImageBitmap(file);
    const { width: w, height: h } = bitmap;
  
    // scale down if needed
    const scale = Math.min(maxWidth / w, maxHeight / h, 1);
    const targetW = Math.round(w * scale);
    const targetH = Math.round(h * scale);
  
    // draw to canvas
    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bitmap, 0, 0, targetW, targetH);
  
    // compress to fit maxBytes
    let q = 0.9;
    let blob = await new Promise((res) => canvas.toBlob(res, mime, q));
    while (blob && blob.size > maxBytes && q > 0.3) {
      q -= 0.1;
      blob = await new Promise((res) => canvas.toBlob(res, mime, q));
    }
  
    // fallback if toBlob failed
    if (!blob) blob = file;
  
    // name with .jpg
    const name = (file.name || "image").replace(/\.[^.]+$/, "") + ".jpg";
    return { blob, name, width: targetW, height: targetH, mime };
  }
  