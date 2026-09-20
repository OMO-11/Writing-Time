/** Shared by the surface pass and dust pass, in original-image UV coordinates. */
export const scatteringGLSL = `
// Shared twilight color progression for surfaces, shafts and airborne dust.
float sunsetWarmth(float elevation) {
  return (1.-smoothstep(.02,.65,elevation))*smoothstep(-.22,-.02,elevation);
}
vec3 sunlightTint(float warmth) {
  return mix(vec3(1.,.96,.84),vec3(1.,.39,.105),warmth);
}
vec3 windowSun(float hour) {
  float angle=(hour-6.)/12.*3.14159265;
  float elevation=max(0.,sin(angle));
  return normalize(vec3(-.9-.18*cos(angle),.2+.72*elevation,.52+.12*elevation));
}
vec3 windowMoon(float hour) {
  float phase=((hour<12.?hour+24.:hour)-18.)/12.*3.14159265;
  return normalize(vec3(-.9+.38*cos(phase),.25+.65*max(0.,sin(phase)),.48));
}
float rayField(vec2 uv,float hour) {
  float elevation=sin((hour-6.)/12.*3.14159265);
  float daylight=smoothstep(-.18,.32,elevation);
  vec3 source=normalize(mix(windowMoon(hour),windowSun(hour),daylight));
  float slope=clamp(-source.x/max(.2,source.y)*.563,.3,.8);
  float q=uv.x-slope*uv.y;
  float width=.012+.024*max(uv.y,0.);
  float rays=exp(-pow((q-.08)/width,2.))*.7;
  rays+=exp(-pow((q-.215)/(width*1.3),2.));
  rays+=exp(-pow((q-.365)/(width*.85),2.))*.65;
  float distanceFade=exp(-uv.y*1.15)*smoothstep(.015,.15,uv.y);
  // Keep foreground skin/cloth clear; scatter is mostly in the air behind them.
  vec2 head=(uv-vec2(.661,.29))/vec2(.13,.24);
  vec2 body=(uv-vec2(.702,.62))/vec2(.21,.26);
  float foreground=max(exp(-dot(head,head)*2.),exp(-dot(body,body)*2.));
  return rays*distanceFade*(1.-foreground*.92);
}
`;

export const dustVertexShader = `
precision highp float;
attribute vec4 aSeed;
uniform vec2 uViewport;
uniform vec2 uImage;
uniform float uHour;
uniform float uTime;
uniform float uPixelRatio;
uniform float uAtmosphereStrength;
varying vec3 vTint;
varying float vAlpha;
${scatteringGLSL}
void main() {
  // Depth varies size and speed within a shared airflow.
  float depth=aSeed.z;
  float speed=mix(.006,.022,depth*depth);
  float t=uTime*speed;
  float daylight=smoothstep(-.18,.32,sin((uHour-6.)/12.*3.14159265));
  vec3 lightDirection=normalize(mix(windowMoon(uHour),windowSun(uHour),daylight));
  float gust=sin(uTime*.42+aSeed.y*6.)*.025;
  float hourDrift=sin(uHour/24.*6.283185+aSeed.w*3.)*.045;
  vec2 uv=vec2(fract(aSeed.x+t*(.65-lightDirection.x*.35)+gust+hourDrift+sin(uTime*.7+aSeed.w*30.)*.006),fract(aSeed.y-t*(.65+lightDirection.y*.5)+cos(uTime*.31+aSeed.x*11.)*.009));
  vec2 ratio=uViewport/uImage;
  vec2 visible=uViewport/(uImage*max(ratio.x,ratio.y));
  vec2 screen=(uv-(1.-visible)*vec2(uViewport.x<761.?.65:.67,.5))/visible;
  gl_Position=vec4(screen.x*2.-1.,1.-screen.y*2.,0.,1.);
  gl_PointSize=(3.5+depth*depth*12.)*uPixelRatio;
  float elevation=sin((uHour-6.)/12.*3.14159265);
  float day=smoothstep(-.18,.32,elevation);
  float golden=sunsetWarmth(elevation);
  vTint=mix(vec3(.47,.67,1.),sunlightTint(golden),day);
  float beam=rayField(uv,uHour);
  float life=smoothstep(0.,.12,uv.y)*(1.-smoothstep(.88,1.,uv.y));
  vec2 faceDistance=(uv-vec2(.655,.345))/vec2(.095,.135);
  float faceClear=1.-exp(-dot(faceDistance,faceDistance)*1.5);
  vAlpha=(.15+day*.40+beam*mix(.8,2.1,day))*life*(.85+.15*sin(aSeed.w*33.+uTime*.7))*uAtmosphereStrength*faceClear;
}
`;

export const dustFragmentShader = `
precision mediump float;
varying vec3 vTint;
varying float vAlpha;
uniform float uExposure;
uniform float uHdr;
void main() {
  vec2 p=gl_PointCoord*2.-1.;
  float radius=dot(p,p);
  float profile=(.72*exp(-radius*6.)+.28*exp(-radius*1.8))*(1.-smoothstep(.6,1.,radius));
  vec3 tint=uHdr>.5 ? pow(vTint,vec3(2.2))*1.35 : vTint;
  float exposureAlpha=uHdr>.5 ? 1. : min(1.25,exp2(uExposure*.5));
  gl_FragColor=vec4(tint,min(.9,profile*vAlpha*exposureAlpha));
}
`;





