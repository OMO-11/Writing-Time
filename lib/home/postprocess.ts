// Linear half-float scene -> exposed bloom pyramid -> tone mapping -> display.
// Unsupported render targets fall back to the original direct scene renderer.
export function createHomePostprocess(gl: WebGLRenderingContext) {
  const half = gl.getExtension("OES_texture_half_float");
  if (!half || !gl.getExtension("OES_texture_half_float_linear") || !gl.getExtension("EXT_color_buffer_half_float")) return null;
  const shaders: WebGLShader[] = [];
  const programs: WebGLProgram[] = [];
  type Target = { texture: WebGLTexture; frame: WebGLFramebuffer; w: number; h: number };
  const targets: Target[] = [];
  let width = 0, height = 0;
  const vertex = `attribute vec2 aPosition; varying vec2 uv; void main(){uv=aPosition*.5+.5;gl_Position=vec4(aPosition,0.,1.);}`;
  const make = (fragment: string) => {
    const p = gl.createProgram()!; programs.push(p);
    for (const [type, source] of [[gl.VERTEX_SHADER, vertex], [gl.FRAGMENT_SHADER, fragment]] as const) {
      const s = gl.createShader(type)!; shaders.push(s); gl.shaderSource(s, source); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "Post shader failed");
      gl.attachShader(p, s);
    }
    gl.bindAttribLocation(p, 0, "aPosition"); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error("Post link failed");
    return p;
  };
  const preamble = `precision highp float; varying vec2 uv; uniform sampler2D source; uniform float exposure;`;
  const extract = make(preamble + `
    uniform vec2 texel; uniform float threshold;
    vec3 bright(vec2 p){vec3 c=texture2D(source,p).rgb*exp2(exposure);float l=max(c.r,max(c.g,c.b));
      float knee=clamp(l-(threshold-.25),0.,.5);knee=knee*knee/1.;float contribution=max(l-threshold,knee);return c*contribution/max(l,.0001);}
    void main(){gl_FragColor=vec4((bright(uv+texel*vec2(-.5,-.5))+bright(uv+texel*vec2(.5,-.5))+bright(uv+texel*vec2(-.5,.5))+bright(uv+texel*vec2(.5,.5)))*.25,1.);}`);
  const blur = make(preamble + `uniform vec2 texel; void main(){vec3 c=texture2D(source,uv).rgb*.227027;
    c+=(texture2D(source,uv+texel*1.384615).rgb+texture2D(source,uv-texel*1.384615).rgb)*.316216;
    c+=(texture2D(source,uv+texel*3.230769).rgb+texture2D(source,uv-texel*3.230769).rgb)*.070270;
    gl_FragColor=vec4(c,1.);}`);
  const composite = make(preamble + `uniform sampler2D bloom0;uniform sampler2D bloom1;uniform sampler2D bloom2;uniform float day;uniform float bloomStrength;
    void main(){vec3 c=texture2D(source,uv).rgb*exp2(exposure);
    vec3 b=texture2D(bloom0,uv).rgb*.55+texture2D(bloom1,uv).rgb*.3+texture2D(bloom2,uv).rgb*.15;
    c+=b*bloomStrength*mix(.34375,1.,day);
    // A luminance shoulder preserves highlight hue and leaves midtones intact.
    float peak=max(c.r,max(c.g,c.b));float mapped=.8+.2*(1.-exp(-max(peak-.8,0.)/.2));
    c*=peak>.8 ? mapped/max(peak,.0001) : 1.;
    float l=dot(c,vec3(.2126,.7152,.0722));
    c=mix(vec3(l),c,mix(.96,1.025,day));
    // Very restrained cool shade / warm paper highlights; no full-screen veil.
    vec3 grade=mix(vec3(.985,.995,1.018),vec3(1.012,1.,.985),smoothstep(.18,.8,l));
    c*=mix(vec3(1.),grade,day*.65);
    gl_FragColor=vec4(pow(clamp(c,0.,1.),vec3(1./2.2)),1.);}`);
  const clear = () => { targets.forEach(t => {gl.deleteTexture(t.texture);gl.deleteFramebuffer(t.frame);}); targets.length = 0; };
  const allocate = (w: number, h: number) => {
    const texture = gl.createTexture()!, frame = gl.createFramebuffer()!;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, half.HALF_FLOAT_OES, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, frame); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    targets.push({texture, frame, w, h});
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error("HDR framebuffer incomplete");
  };
  const bind = (p: WebGLProgram, name: string, texture: WebGLTexture, unit: number) => {
    gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,texture);gl.uniform1i(gl.getUniformLocation(p,name),unit);
  };
  const pass = (p: WebGLProgram, input: Target, output: Target | null, exposure: number, x=0, y=0) => {
    gl.bindFramebuffer(gl.FRAMEBUFFER,output?.frame ?? null);gl.viewport(0,0,output?.w ?? width,output?.h ?? height);
    gl.useProgram(p);bind(p,"source",input.texture,3);
    gl.uniform1f(gl.getUniformLocation(p,"exposure"),exposure);gl.uniform2f(gl.getUniformLocation(p,"texel"),x,y);
    gl.drawArrays(gl.TRIANGLES,0,6);
  };
  return {
    begin(w: number,h: number) {
      if (w!==width || h!==height) {
        clear();width=w;height=h;gl.activeTexture(gl.TEXTURE3);allocate(w,h);
        for(let level=1;level<=3;level++){const divisor=2**level;allocate(Math.max(1,Math.ceil(w/divisor)),Math.max(1,Math.ceil(h/divisor)));allocate(Math.max(1,Math.ceil(w/divisor)),Math.max(1,Math.ceil(h/divisor)));}
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER,targets[0].frame);gl.viewport(0,0,w,h);
    },
    finish(quad: WebGLBuffer,exposure: number,hour: number,bloom: number,threshold: number,radius: number) {
      gl.disable(gl.BLEND);gl.bindBuffer(gl.ARRAY_BUFFER,quad);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
      gl.useProgram(extract);gl.uniform1f(gl.getUniformLocation(extract,"threshold"),threshold);
      pass(extract,targets[0],targets[1],exposure,1/width,1/height);
      for(let level=0;level<3;level++){
        const a=targets[1+level*2],b=targets[2+level*2];
        pass(blur,level===0?a:targets[level*2-1],b,0,radius/a.w,0);
        pass(blur,b,a,0,0,radius/a.h);
      }
      gl.useProgram(composite);
      gl.uniform1f(gl.getUniformLocation(composite,"bloomStrength"),bloom);
      [1,3,5].forEach((index,i)=>bind(composite,`bloom${i}`,targets[index].texture,4+i));
      const elevation=Math.sin((hour-6)/12*Math.PI);const t=Math.max(0,Math.min(1,(elevation+.18)/.5));
      gl.uniform1f(gl.getUniformLocation(composite,"day"),t*t*(3-2*t));
      pass(composite,targets[0],null,exposure);gl.disableVertexAttribArray(0);
    },
    dispose(){clear();programs.forEach(p=>gl.deleteProgram(p));shaders.forEach(s=>gl.deleteShader(s));}
  };
}
