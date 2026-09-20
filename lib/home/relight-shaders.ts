import { scatteringGLSL } from "./atmosphere-shaders";

export const vertexShader = `
attribute vec2 aPosition;
varying vec2 vUv;
void main() { vUv = vec2(aPosition.x * .5 + .5, .5 - aPosition.y * .5); gl_Position = vec4(aPosition, 0., 1.); }
`;

export const fragmentShader = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uColor;
uniform sampler2D uClosed;
uniform float uTime;
uniform sampler2D uNormal;
uniform sampler2D uSmoothNormal;
uniform float uAtmosphereStrength;
${scatteringGLSL}
uniform vec2 uViewport;
uniform vec2 uImage;
uniform float uHour;
uniform float uSoftness;
uniform float uStyle;
uniform float uSheen;
uniform float uExposure;
uniform float uHdr;
uniform float uView;
float region(vec2 uv,vec2 center,vec2 radius) { return 1.-smoothstep(.72,1.,length((uv-center)/radius)); }
// All material textures and masks use this single inverse deformation field.
vec2 animatedUv(vec2 uv) {
  vec3 guide=texture2D(uColor,uv).rgb;
  float faceGuard=region(uv,vec2(.656,.346),vec2(.079,.116));
  float earGuard=region(uv,vec2(.712,.297),vec2(.025,.049));
  float handGuard=max(region(uv,vec2(.626,.439),vec2(.045,.083)),region(uv,vec2(.714,.76),vec2(.09,.052)));
  float protect=max(faceGuard,max(earGuard,handGuard));
  float hairArea=max(region(uv,vec2(.648,.238),vec2(.113,.165)),region(uv,vec2(.752,.423),vec2(.053,.127)));
  float silver=smoothstep(.28,.56,guide.g)*(1.-smoothstep(.04,.13,guide.r-guide.b));
  float hair=hairArea*silver*(1.-protect);
  float tips=smoothstep(.13,.45,uv.y);
  float sway=sin(uTime*1.05+uv.y*9.)*.65+sin(uTime*1.73+uv.x*13.)*.35;
  vec2 offset=vec2(sway*.0018, sin(uTime*.95+uv.x*8.)*.0005)*hair*tips;
  float torso=region(uv,vec2(.713,.589),vec2(.133,.158))*(1.-handGuard)*(1.-faceGuard);
  float breath=sin(uTime*1.35);
  offset+=vec2((uv.x-.69)*.006, -.00115)*breath*torso;
  return uv-offset;
}
float blinkAmount(float time) {
  float cycle=mod(time,13.7);
  float first=smoothstep(2.9,2.98,cycle)*(1.-smoothstep(3.05,3.19,cycle));
  float second=smoothstep(7.8,7.88,cycle)*(1.-smoothstep(7.95,8.10,cycle));
  float third=smoothstep(12.0,12.08,cycle)*(1.-smoothstep(12.14,12.28,cycle));
  return max(first,max(second,third));
}
// The generated normal artwork is not a pixel-perfect geometry scan. Filter
// its vectors continuously at upload time and retain only broad surface form.
// Fine outlines, nose and hair strands come exclusively from the color image.
vec3 surfaceNormal(vec2 uv) {
  vec3 broad=texture2D(uSmoothNormal,uv).rgb*2.-1.;
  vec3 mappedNormal=normalize(broad*vec3(.85,.85,1.));
  // The inferred hair/face normals contain concave pockets on a convex head.
  // A continuous whole-head guide stabilizes the terminator without circular
  // nose patches or independent highlight islands. Mapped geometry is retained.
  vec2 p=(uv-vec2(.65,.269))/vec2(.108,.192);
  vec3 headNormal=normalize(vec3(p.x*.78,p.y*.5,sqrt(max(.34,1.-dot(p,p)*.42))));
  float headWeight=exp(-pow(dot(p,p),2.)*.9)*.7;
  return normalize(mix(mappedNormal,headNormal,headWeight));
}
// A small finite window aperture stabilizes the incident-light estimate.
// Every aperture sample obeys Lambert's cosine law; a turned-away surface gets
// direct light only if it can see an actual part of the window. A nonzero
// aperture remains fixed; softness changes only the painted transition below.
float windowDiffuse(vec3 normal,vec3 direction) {
  vec3 right=normalize(cross(vec3(0.,1.,0.),direction));
  vec3 up=normalize(cross(direction,right));
  float aperture=.20;
  vec3 x=right*aperture;
  vec3 y=up*aperture*1.25;
  float light=max(0.,dot(normal,direction))*4.;
  light+=2.*max(0.,dot(normal,normalize(direction+x)));
  light+=2.*max(0.,dot(normal,normalize(direction-x)));
  light+=2.*max(0.,dot(normal,normalize(direction+y)));
  light+=2.*max(0.,dot(normal,normalize(direction-y)));
  light+=max(0.,dot(normal,normalize(direction+x+y)));
  light+=max(0.,dot(normal,normalize(direction+x-y)));
  light+=max(0.,dot(normal,normalize(direction-x+y)));
  light+=max(0.,dot(normal,normalize(direction-x-y)));
  return light/16.;
}
// KumengScreen parameter reference: threshold .50, edge .025–.14,
// painted levels .14/.70, style strength .85. Keep 15% continuous shading
// within each broad tone; only the boundary is softened by the slider.
float paintedResponse(float incident,float softness) {
  float edge=mix(.025,.14,clamp(softness,0.,1.));
  float band=smoothstep(.5-edge,.5+edge,incident);
  float painted=mix(.14,.70,band);
  return mix(incident,painted,uStyle)*smoothstep(0.,.08,incident);
}
void main() {
  vec2 ratio=uViewport/uImage;
  vec2 visible=uViewport/(uImage*max(ratio.x,ratio.y));
  vec2 uv=vUv*visible+(1.-visible)*vec2(uViewport.x<761.?.65:.67,.5);
  vec2 originalUv=uv;
  if (uView<.5) uv=animatedUv(uv);
  vec3 base=texture2D(uColor,uv).rgb;
  if (uView>1.5) { gl_FragColor=vec4(texture2D(uNormal,uv).rgb,1.); return; }
  if (uView>.5) { gl_FragColor=vec4(base,1.); return; }

  float blink=blinkAmount(uTime);
  float leftEye=region(uv,vec2(.623,.342),vec2(.0185,.027));
  float rightEye=region(uv,vec2(.676,.298),vec2(.019,.029));
  vec2 closedUv=uv+mix(vec2(-.004,.004),vec2(.001,.008),step(.65,uv.x));
  vec3 closedColor=texture2D(uClosed,closedUv).rgb;
  base=mix(base,closedColor,blink*max(leftEye,rightEye));
  float angle=(uHour-6.)/12.*3.14159265;
  float elevation=sin(angle);
  float day=smoothstep(-.18,.32,elevation);
  float night=1.-day;
  float golden=sunsetWarmth(elevation);
  // The room has one large window on image-left. Solar elevation changes,
  // but sunlight cannot teleport to the solid wall on the right at noon.
  vec3 sun=windowSun(uHour);
  // An independent moon crosses the window side of the sky at night.
  float moonPhase=(uHour<12.?uHour+24.:uHour)-18.;
  float moonElevation=max(0.,sin(moonPhase/12.*3.14159265));
  vec3 moon=windowMoon(uHour);
  vec3 sunColor=sunlightTint(golden);
  vec3 moonColor=vec3(.43,.64,1.);
  vec3 daylightSky=mix(vec3(.86,.94,1.),vec3(.88,.49,.32),golden*.72);
  vec3 skyColor=mix(vec3(.45,.62,.94),daylightSky,day);

  float pigment=smoothstep(.006,.055,base.r-base.g)*smoothstep(-.016,.018,base.g-base.b);
  vec2 faceCoord=(uv-vec2(.655,.345))/vec2(.073,.103);
  float face=exp(-dot(faceCoord,faceCoord)*2.)*pigment;
  float skin=max(face,max(region(uv,vec2(.63,.438),vec2(.033,.067)),region(uv,vec2(.709,.756),vec2(.072,.037)))*pigment);
  vec3 n=surfaceNormal(uv);
  // Continuous pigment-weighted direction correction retains normal shading.
  float sunFacing=dot(n,sun);
  vec3 faceLight=normalize(sun+vec3(0.,-.035,.065)*face);
  float incident=windowDiffuse(n,faceLight);
  float sunDiffuse=paintedResponse(incident,uSoftness);
  // Face-only soft ramp: keep normals and lit direction, reduce the two-tone
  // jump locally instead of washing out hair, clothing or the whole image.
  float faceEdge=mix(.12,.22,uSoftness);
  float faceBand=smoothstep(.5-faceEdge,.5+faceEdge,incident);
  float faceDiffuse=mix(incident,mix(.22,.68,faceBand),uStyle*.8)*smoothstep(0.,.08,incident);
  sunDiffuse=mix(sunDiffuse,faceDiffuse,min(1.,face*1.65));
  float moonFacing=dot(n,moon);
  float moonDiffuse=paintedResponse(windowDiffuse(n,moon),min(1.,uSoftness+.10));

  // Restrained pigment palette: cool colored shade, warm paper-like highlights.
  // No white additive fill, no inverse-light division, no boosted albedo.
  vec3 reflectance=pow(base,vec3(2.2));
  vec3 shadowTint=mix(vec3(.91,.94,1.),vec3(1.,.88,.85),skin*.25);
  vec3 litTint=mix(vec3(1.),vec3(1.,.96,.93),skin*.3);
  float hemisphere=smoothstep(-.6,.85,n.y);
  float roomDepth=smoothstep(.4,.94,uv.x);
  // Lower fill in the occluded hemisphere while retaining clear lit values.
  // Contrast comes from light transport, not a dark fullscreen overlay.
  float skyAccess=smoothstep(-.5,.7,sunFacing);
  float fillStrength=(.10+.18*day)*mix(.9,1.1,skyAccess);
  vec3 ambient=skyColor*mix(.05,fillStrength,day)*mix(.8,1.08,hemisphere)*(1.-roomDepth*.1);
  float downward=smoothstep(-.05,.8,-n.y);
  float nearDesk=smoothstep(.35,.83,uv.y);
  vec3 woodBounce=vec3(.55,.31,.19)*(.018+.092*day)*nearDesk*(.25+.75*downward);
  vec3 color=reflectance*(ambient+woodBounce)*mix(shadowTint,vec3(.87,.9,1.),night*.55);
  color+=reflectance*litTint*sunDiffuse*sunColor*day*(1.14-.12*golden);
  color+=reflectance*vec3(1.,.82,.72)*face*day*(1.-faceBand)*.065;

  // Broad feathered window transmission, evaluated on the scene's UVs and
  // multiplied by surface incidence. Light pools move as the moon moves.
  float projection=uv.x+.27*uv.y+moon.x*.055;
  float pane1=smoothstep(.38,.44,projection)*(1.-smoothstep(.57,.64,projection));
  float pane2=smoothstep(.67,.74,projection)*(1.-smoothstep(.91,1.,projection));
  float windowTransmission=.38+.62*max(pane1,pane2);
  float moonStrength=night*(.22+.12*moonElevation);
  color+=reflectance*moonColor*moonStrength*(1.02*moonDiffuse)*windowTransmission;
  // A broad moon-facing rim, bounded by incidence and silhouette normals.
  float grazing=pow(1.-max(n.z,0.),1.5)*smoothstep(.0,.65,moonFacing);
  color+=reflectance*moonColor*night*grazing*.085*windowTransmission;
  color+=reflectance*vec3(.9,.45,.29)*skin*day*(1.-sunDiffuse)*.024;

  float hairRegion=region(uv,vec2(.65,.252),vec2(.112,.164));
  float hair=hairRegion*(1.-smoothstep(.045,.13,base.r-base.b))*smoothstep(.3,.62,base.g)*(1.-face);
  vec3 mainDirection=normalize(mix(moon,sun,day));
  float x=uv.x-.647;
  float ribbonY=.205+4.4*x*x-.22*x+mainDirection.x*.025;
  float ribbon=exp(-pow((uv.y-ribbonY)/.029,2.));
  float sheenFacing=smoothstep(.05,.7,dot(n,mainDirection))*mix(moonDiffuse,sunDiffuse,day);
  vec3 sheenColor=sunColor*day*.025+moonColor*night*.004*windowTransmission;
  // Reflectance modulation, not a white strip pasted over the painted hair.
  color+=reflectance*sheenColor*hair*ribbon*sheenFacing*uSheen;
  float eyes=max(region(uv,vec2(.624,.343),vec2(.009,.011)),region(uv,vec2(.675,.3),vec2(.009,.012)));
  float iris=(1.-blink)*eyes*smoothstep(.005,.045,base.b-base.r);
  float glint=pow(max(0.,dot(n,normalize(mainDirection+vec3(0.,0.,1.)))),12.)*mix(moonDiffuse,sunDiffuse,day);
  color+=iris*glint*(sunColor*day*.012+moonColor*night*.0015);

  float window=(1.-smoothstep(.42,.49,uv.x))*(1.-smoothstep(.45,.6,uv.y));
  vec3 outside=reflectance*mix(skyColor*.065+moonColor*.035,mix(vec3(.96,.985,1.),vec3(1.,.49,.22),golden*.8),day);
  color=mix(color,outside,window*.7);
  // Single-scattering approximation: feathered light shafts through window
  // apertures, attenuated by optical distance and foreground occlusion.
  float rays=rayField(originalUv,uHour);
  vec3 scatterTint=mix(moonColor,sunColor,day);
  float opticalDensity=rays*(.022+.083*day+.055*golden*day)*uAtmosphereStrength;
  color+=scatterTint*(1.-exp(-opticalDensity));
  // Exposure is in stops; only the highlight shoulder is compressed, without
  // lifting dark tones. All light contributions pass through this same curve.
  if (uHdr>.5) { gl_FragColor=vec4(max(color,vec3(0.)),1.); return; }
  color=max(color,vec3(0.))*exp2(uExposure);
  vec3 shoulder=vec3(.85)+.15*(vec3(1.)-exp(-max(color-vec3(.85),vec3(0.))/.15));
  color=mix(color,shoulder,step(vec3(.85),color));
  gl_FragColor=vec4(pow(color,vec3(1./2.2)),1.);
}
`;









