export const earthVertex = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorldPos;

void main() {
  vUv = uv;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldPos = world.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const earthFragment = /* glsl */ `
uniform sampler2D dayMap;
uniform sampler2D nightMap;
uniform sampler2D bumpMap;
uniform sampler2D detailMap;
uniform vec3 sunDirection;
uniform float detailCenterLon;
uniform float detailHalfLon;
uniform float detailSouth;
uniform float detailNorth;
uniform float detailStrength;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorldPos;

void main() {
  vec3 n = normalize(vNormal);
  vec3 sun = normalize(sunDirection);
  float h = texture2D(bumpMap, vUv).r;
  n = normalize(n + sun * (h - 0.45) * 0.08);

  float ndl = dot(n, sun);
  vec3 day = texture2D(dayMap, vUv).rgb;
  if (detailStrength > 0.004 && detailHalfLon > 0.05 && detailNorth > detailSouth) {
    float lon = vUv.x * 360.0 - 180.0;
    float lat = vUv.y * 180.0 - 90.0;
    float dlon = lon - detailCenterLon;
    dlon = mod(dlon + 180.0, 360.0) - 180.0;
    float uu = dlon / (detailHalfLon * 2.0) + 0.5;
    float vv = (lat - detailSouth) / (detailNorth - detailSouth);
    if (uu > 0.0 && uu < 1.0 && vv > 0.0 && vv < 1.0) {
      vec4 det = texture2D(detailMap, vec2(uu, vv));
      if (det.a > 0.45) {
        vec3 low = texture2D(detailMap, vec2(uu, vv), 3.4).rgb;
        float fx = smoothstep(0.0, 0.08, uu) * smoothstep(1.0, 0.92, uu);
        float fy = smoothstep(0.0, 0.08, vv) * smoothstep(1.0, 0.92, vv);
        float w = fx * fy * detailStrength;
        day = clamp(day + (det.rgb - low) * (1.2 * w), 0.0, 1.0);
      }
    }
  }
  vec3 nightTex = texture2D(nightMap, vUv).rgb;

  float wrap = max(ndl, 0.0);
  vec3 dayLit = day * (0.16 + 0.84 * wrap);

  vec3 nightGround = day * vec3(0.034, 0.040, 0.068);

  // NASA Black Marble — keep the real urban pattern, not orange orbs.
  vec3 lights = max(nightTex - vec3(0.022), 0.0);
  lights = pow(lights, vec3(1.16)) * 5.4;
  lights *= vec3(1.18, 0.96, 0.68);

  float nightAmt = 1.0 - smoothstep(-0.12, 0.18, ndl);
  vec3 night = nightGround + lights * nightAmt;

  float t = smoothstep(-0.16, 0.13, ndl);
  vec3 color = mix(night, dayLit, t);

  float term = exp(-pow(ndl * 8.2, 2.0));
  color += vec3(0.52, 0.26, 0.10) * term * 0.20;

  vec3 viewDir = normalize(cameraPosition - vWorldPos);
  float fresnel = pow(1.0 - max(dot(viewDir, n), 0.0), 2.6);
  color += vec3(0.26, 0.46, 0.88) * fresnel * max(ndl + 0.12, 0.0) * 0.40;

  gl_FragColor = vec4(color, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export const atmosVertex = /* glsl */ `
varying vec3 vNormal;
varying vec3 vWorldPos;

void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldPos = world.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const atmosFragment = /* glsl */ `
uniform vec3 sunDirection;
varying vec3 vNormal;
varying vec3 vWorldPos;

void main() {
  vec3 n = normalize(vNormal);
  vec3 viewDir = normalize(cameraPosition - vWorldPos);
  float f = pow(0.72 - dot(viewDir, n), 2.6);
  f = clamp(f, 0.0, 1.0);
  float sun = pow(max(dot(n, normalize(sunDirection)), 0.0), 1.2);
  vec3 c = mix(vec3(0.08, 0.22, 0.62), vec3(0.55, 0.78, 1.0), sun);
  gl_FragColor = vec4(c, f * 0.85);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export const cloudVertex = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorldPos;

void main() {
  vUv = uv;
  vNormal = normalize(mat3(modelMatrix) * normal);
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldPos = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const cloudFragment = /* glsl */ `
uniform sampler2D cloudMap;
uniform vec3 sunDirection;
uniform float cover;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorldPos;

void main() {
  vec4 tex = texture2D(cloudMap, vUv);
  float density = tex.r;
  if (density < 0.016) discard;

  vec3 n = normalize(vNormal);
  float ndl = dot(n, normalize(sunDirection));
  float day = smoothstep(-0.10, 0.38, ndl);
  float rim = exp(-pow(ndl * 7.5, 2.0));
  float loft = pow(density, 0.72);

  vec3 shade = vec3(0.16, 0.18, 0.22);
  vec3 lit = vec3(0.97, 0.98, 1.0);
  vec3 color = mix(shade, lit, 0.18 + 0.82 * day);
  color *= 0.52 + 0.48 * loft;
  color += vec3(1.0, 0.76, 0.52) * rim * density * 0.38;

  float alpha = density * mix(0.05, 0.64, day);
  alpha += density * rim * 0.10;
  alpha = clamp(alpha, 0.0, 0.76) * cover;

  gl_FragColor = vec4(color, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export const moonVertex = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormal;

void main() {
  vUv = uv;
  vNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const moonFragment = /* glsl */ `
uniform sampler2D moonMap;
uniform vec3 sunDirection;
varying vec2 vUv;
varying vec3 vNormal;

void main() {
  vec3 n = normalize(vNormal);
  float ndl = max(dot(n, normalize(sunDirection)), 0.0);
  vec3 albedo = texture2D(moonMap, vUv).rgb;
  vec3 lit = albedo * (0.04 + 0.96 * pow(ndl, 1.05));
  gl_FragColor = vec4(lit, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export const sunVertex = /* glsl */ `
varying vec3 vNormal;
varying vec3 vWorldPos;

void main() {
  vNormal = normalize(mat3(modelMatrix) * normal);
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldPos = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const sunFragment = /* glsl */ `
varying vec3 vNormal;
varying vec3 vWorldPos;

void main() {
  vec3 n = normalize(vNormal);
  vec3 viewDir = normalize(cameraPosition - vWorldPos);
  float facing = pow(max(dot(n, viewDir), 0.0), 0.45);
  vec3 core = vec3(1.0, 0.96, 0.82);
  vec3 limb = vec3(1.0, 0.62, 0.18);
  vec3 color = mix(limb, core, facing);
  color *= 1.35;
  gl_FragColor = vec4(color, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;
