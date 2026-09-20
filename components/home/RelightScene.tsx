"use client";

import { useEffect, useRef, useState } from "react";
import { fragmentShader, vertexShader } from "@/lib/home/relight-shaders";
import { createHomePostprocess } from "@/lib/home/postprocess";
import { dustFragmentShader, dustVertexShader } from "@/lib/home/atmosphere-shaders";

export type RelightSettings = {
  bloom: number;
  threshold: number;
  radius: number;
  styleStrength: number;
  hour: number;
  softness: number;
  sheen: number;
  exposure: number;
  view: number;
  moving: boolean;
  atmosphere: number;
};

const colorSource = "/assets/home/enhance-noval-observatory.webp";
const dustCount = 420;
const closedSource = "/assets/home/noval-observatory-closed.png";
const normalSource = "/assets/home/noval-observatory-normal.png";

export function RelightScene(settings: RelightSettings) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const latest = useRef(settings);
  const requestDraw = useRef<(() => void) | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => { latest.current = settings; requestDraw.current?.(); }, [settings]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { alpha: false, antialias: false, depth: false, powerPreference: "low-power" });
    if (!gl) return;
    let disposed = false;
    let frame = 0;
    let currentHour = latest.current.hour;
    let lastTime = 0;
    let motionTime = 0;
    let initialized = false;
    let imageWidth = 3344;
    let imageHeight = 1882;
    const textures: WebGLTexture[] = [];
    const shaders: WebGLShader[] = [];
    const programs: WebGLProgram[] = [];
    const buffers: WebGLBuffer[] = [];
    let post: ReturnType<typeof createHomePostprocess> = null;
    let sceneProgram: WebGLProgram;
    let dustProgram: WebGLProgram;
    let quad: WebGLBuffer;
    let seeds: WebGLBuffer;
    let scenePosition = 0;
    let dustPosition = 0;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const uniforms: Record<string, WebGLUniformLocation | null> = {};
    const dustUniforms: Record<string, WebGLUniformLocation | null> = {};
    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) throw new Error("Unable to allocate shader");
      shaders.push(shader);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? "Shader compilation failed");
      return shader;
    };
    const program = (vertex: string, fragment: string) => {
      const result = gl.createProgram();
      if (!result) throw new Error("Unable to allocate program");
      programs.push(result);
      gl.attachShader(result, compile(gl.VERTEX_SHADER, vertex));
      gl.attachShader(result, compile(gl.FRAGMENT_SHADER, fragment));
      gl.linkProgram(result);
      if (!gl.getProgramParameter(result, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(result) ?? "Link failed");
      return result;
    };
    const buffer = (values: Float32Array) => {
      const result = gl.createBuffer();
      if (!result) throw new Error("Unable to allocate buffer");
      buffers.push(result);
      gl.bindBuffer(gl.ARRAY_BUFFER, result);
      gl.bufferData(gl.ARRAY_BUFFER, values, gl.STATIC_DRAW);
      return result;
    };
    const bindAttribute = (buffer: WebGLBuffer, location: number, dimensions: number) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, dimensions, gl.FLOAT, false, 0, 0);
    };
    const draw = (time: number) => {
      frame = 0;
      if (!initialized || disposed || document.hidden || gl.isContextLost()) return;
      const target = latest.current;
      const animated = target.moving && !reduced.matches && target.view === 0;
      if (animated && time - lastTime < 32) { frame = requestAnimationFrame(draw); return; }
      const delta = ((target.hour - currentHour + 36) % 24) - 12;
      const dt = Math.min((time - lastTime) / 1000 || .016, .06);
      currentHour = reduced.matches || Math.abs(delta) < .002 ? target.hour : (currentHour + delta * (1 - Math.exp(-dt * 7)) + 24) % 24;
      if (animated) motionTime += dt;
      lastTime = time;
      // +1 EV only after evening has faded; manual exposure remains additive.
      const nightPhase = Math.max(0, Math.min(1, (currentHour - 18.5) / 1.5));
      const dawnPhase = Math.max(0, Math.min(1, (6 - currentHour) / 1.5));
      const phase = currentHour >= 12 ? nightPhase : dawnPhase;
      const effectiveExposure = target.exposure + phase * phase * (3 - 2 * phase);
      canvas.dataset.effectiveExposure = effectiveExposure.toFixed(3);
      const width = canvas.clientWidth, height = canvas.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5, 2560 / Math.max(width, height));
      const w = Math.max(1, Math.round(width * dpr)), h = Math.max(1, Math.round(height * dpr));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      const hdr = target.view === 0 && post !== null;
      if (hdr) {
        try { post!.begin(w, h); } catch (error) {
          console.warn("HDR unavailable; using direct lighting", error);
          post?.dispose(); post = null;
        }
      }
      const useHdr = hdr && post !== null;
      if (!useHdr) gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      canvas.dataset.pipeline = useHdr ? "hdr-bloom" : "direct";
      gl.viewport(0, 0, w, h);
      gl.disable(gl.BLEND);
      gl.useProgram(sceneProgram);
      bindAttribute(quad, scenePosition, 2);
      gl.uniform2f(uniforms.uViewport, width, height);
      gl.uniform1f(uniforms.uHour, currentHour);
      gl.uniform1f(uniforms.uSoftness, target.softness);
      gl.uniform1f(uniforms.uStyle, target.styleStrength);
      gl.uniform1f(uniforms.uSheen, target.sheen);
      gl.uniform1f(uniforms.uExposure, effectiveExposure);
      gl.uniform1f(uniforms.uTime, reduced.matches ? 0 : motionTime);
      gl.uniform1f(uniforms.uHdr, useHdr ? 1 : 0);
      gl.uniform1f(uniforms.uView, target.view);
      gl.uniform1f(uniforms.uAtmosphereStrength, target.atmosphere);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.disableVertexAttribArray(scenePosition);
      if (target.view === 0) {
        gl.useProgram(dustProgram);
        bindAttribute(seeds, dustPosition, 4);
        gl.uniform2f(dustUniforms.uViewport, width, height);
        gl.uniform2f(dustUniforms.uImage, imageWidth, imageHeight);
        gl.uniform1f(dustUniforms.uHour, currentHour);
        gl.uniform1f(dustUniforms.uTime, motionTime);
        gl.uniform1f(dustUniforms.uPixelRatio, dpr);
        gl.uniform1f(dustUniforms.uExposure, effectiveExposure);
        gl.uniform1f(dustUniforms.uHdr, useHdr ? 1 : 0);
        gl.uniform1f(dustUniforms.uAtmosphereStrength, target.atmosphere);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.drawArrays(gl.POINTS, 0, dustCount);
        gl.disableVertexAttribArray(dustPosition);
      }
      if (useHdr) post!.finish(quad, effectiveExposure, currentHour, target.bloom, target.threshold, target.radius);
      if (animated || Math.abs(delta) > .002 && !reduced.matches) frame = requestAnimationFrame(draw);
    };
    const schedule = () => { if (!frame && !disposed && !document.hidden) frame = requestAnimationFrame(draw); };
    const image = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Texture failed: ${src}`));
      img.src = src;
    });
    const initialize = async () => {
      try {
        const [color, normal, closed] = await Promise.all([image(colorSource), image(normalSource), image(closedSource).catch(() => image(colorSource))]);
        if (disposed || gl.isContextLost()) return;
        imageWidth = color.naturalWidth;
        imageHeight = color.naturalHeight;
        // A true continuous Gaussian low-pass in NORMAL-texture coordinates.
        // The previous sparse, widely spaced taps produced displaced copies of
        // high-contrast features. Neither the color image nor linework is blurred.
        const smooth = document.createElement("canvas");
        smooth.width = Math.round(normal.naturalWidth / 2);
        smooth.height = Math.round(normal.naturalHeight / 2);
        const context = smooth.getContext("2d");
        if (!context) throw new Error("Unable to filter normal texture");
        context.fillStyle = "rgb(128,128,255)";
        context.fillRect(0, 0, smooth.width, smooth.height);
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";
        context.filter = "blur(7px)";
        context.drawImage(normal, 0, 0, smooth.width, smooth.height);

        post = createHomePostprocess(gl);
        sceneProgram = program(vertexShader, fragmentShader);
        dustProgram = program(dustVertexShader, dustFragmentShader);
        quad = buffer(new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]));
        const dust = new Float32Array(dustCount * 4);
        let seed = 173;
        for (let i = 0; i < dust.length; i++) { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; dust[i] = seed / 4294967296; }
        seeds = buffer(dust);
        scenePosition = gl.getAttribLocation(sceneProgram, "aPosition");
        dustPosition = gl.getAttribLocation(dustProgram, "aSeed");
        for (const name of ["uColor", "uClosed", "uTime", "uNormal", "uSmoothNormal", "uViewport", "uImage", "uHour", "uSoftness", "uStyle", "uSheen", "uExposure", "uHdr", "uView", "uAtmosphereStrength"]) uniforms[name] = gl.getUniformLocation(sceneProgram, name);
        for (const name of ["uViewport", "uImage", "uHour", "uTime", "uPixelRatio", "uExposure", "uHdr", "uAtmosphereStrength"]) dustUniforms[name] = gl.getUniformLocation(dustProgram, name);
        gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
        const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
        [color, normal, smooth, closed].forEach((img, index) => {
          const texture = gl.createTexture();
          if (!texture) throw new Error("Unable to allocate texture");
          textures.push(texture);
          gl.activeTexture(gl.TEXTURE0 + (index === 3 ? 7 : index));
          gl.bindTexture(gl.TEXTURE_2D, texture);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          let source: TexImageSource = img;
          if (Math.max(img.width, img.height) > maxTextureSize) {
            const compatible = document.createElement("canvas");
            const scale = maxTextureSize / Math.max(img.width, img.height);
            compatible.width = Math.round(img.width * scale);
            compatible.height = Math.round(img.height * scale);
            const resizeContext = compatible.getContext("2d");
            if (!resizeContext) throw new Error("Unable to resize texture");
            resizeContext.drawImage(img, 0, 0, compatible.width, compatible.height);
            source = compatible;
          }
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
        });
        gl.useProgram(sceneProgram);
        gl.uniform1i(uniforms.uColor, 0);
        gl.uniform1i(uniforms.uClosed, 7);
        gl.uniform1i(uniforms.uNormal, 1);
        gl.uniform1i(uniforms.uSmoothNormal, 2);
        gl.uniform2f(uniforms.uImage, imageWidth, imageHeight);
        initialized = true;
        currentHour = latest.current.hour;
        lastTime = 0;
        draw(performance.now());
        setReady(true);
      } catch (error) { console.error("Home relighting unavailable:", error); setReady(false); }
    };
    requestDraw.current = schedule;
    const resize = new ResizeObserver(schedule);
    resize.observe(canvas);
    const visibility = () => { if (document.hidden) { cancelAnimationFrame(frame); frame = 0; } else { lastTime = performance.now(); schedule(); } };
    const lost = (event: Event) => { event.preventDefault(); initialized = false; cancelAnimationFrame(frame); frame = 0; setReady(false); };
    const restored = () => { post = null; textures.length = 0; shaders.length = 0; programs.length = 0; buffers.length = 0; void initialize(); };
    document.addEventListener("visibilitychange", visibility);
    reduced.addEventListener("change", schedule);
    canvas.addEventListener("webglcontextlost", lost);
    canvas.addEventListener("webglcontextrestored", restored);
    void initialize();
    return () => {
      disposed = true;
      requestDraw.current = null;
      cancelAnimationFrame(frame);
      resize.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      reduced.removeEventListener("change", schedule);
      canvas.removeEventListener("webglcontextlost", lost);
      canvas.removeEventListener("webglcontextrestored", restored);
      post?.dispose();
      textures.forEach(t => gl.deleteTexture(t));
      shaders.forEach(s => gl.deleteShader(s));
      buffers.forEach(b => gl.deleteBuffer(b));
      programs.forEach(p => gl.deleteProgram(p));
    };
  }, []);
  return <canvas ref={canvasRef} className="dream-relight" data-ready={ready} aria-hidden="true" style={{ opacity: ready ? 1 : 0 }} />;
}


