import{S as T,U as F,a as G,M as _,R,r as t,e as U,u as h,B as L,P as V,V as y,C,b as O,j as i}from"./index-Dnf1O89K.js";function m(){return m=Object.assign?Object.assign.bind():function(o){for(var e=1;e<arguments.length;e++){var r=arguments[e];for(var n in r)({}).hasOwnProperty.call(r,n)&&(o[n]=r[n])}return o},m.apply(null,arguments)}function $(o,e,r,n){var s;return s=class extends T{constructor(l){super({vertexShader:e,fragmentShader:r,...l});for(const a in o)this.uniforms[a]=new F(o[a]),Object.defineProperty(this,a,{get(){return this.uniforms[a].value},set(c){this.uniforms[a].value=c}});this.uniforms=G.clone(this.uniforms)}},s.key=_.generateUUID(),s}const H=()=>parseInt(R.replace(/\D+/g,"")),B=H(),q=$({cellSize:.5,sectionSize:1,fadeDistance:100,fadeStrength:1,fadeFrom:1,cellThickness:.5,sectionThickness:1,cellColor:new C,sectionColor:new C,infiniteGrid:!1,followCamera:!1,worldCamProjPosition:new y,worldPlanePosition:new y},`
    varying vec3 localPosition;
    varying vec4 worldPosition;

    uniform vec3 worldCamProjPosition;
    uniform vec3 worldPlanePosition;
    uniform float fadeDistance;
    uniform bool infiniteGrid;
    uniform bool followCamera;

    void main() {
      localPosition = position.xzy;
      if (infiniteGrid) localPosition *= 1.0 + fadeDistance;
      
      worldPosition = modelMatrix * vec4(localPosition, 1.0);
      if (followCamera) {
        worldPosition.xyz += (worldCamProjPosition - worldPlanePosition);
        localPosition = (inverse(modelMatrix) * worldPosition).xyz;
      }

      gl_Position = projectionMatrix * viewMatrix * worldPosition;
    }
  `,`
    varying vec3 localPosition;
    varying vec4 worldPosition;

    uniform vec3 worldCamProjPosition;
    uniform float cellSize;
    uniform float sectionSize;
    uniform vec3 cellColor;
    uniform vec3 sectionColor;
    uniform float fadeDistance;
    uniform float fadeStrength;
    uniform float fadeFrom;
    uniform float cellThickness;
    uniform float sectionThickness;

    float getGrid(float size, float thickness) {
      vec2 r = localPosition.xz / size;
      vec2 grid = abs(fract(r - 0.5) - 0.5) / fwidth(r);
      float line = min(grid.x, grid.y) + 1.0 - thickness;
      return 1.0 - min(line, 1.0);
    }

    void main() {
      float g1 = getGrid(cellSize, cellThickness);
      float g2 = getGrid(sectionSize, sectionThickness);

      vec3 from = worldCamProjPosition*vec3(fadeFrom);
      float dist = distance(from, worldPosition.xyz);
      float d = 1.0 - min(dist / fadeDistance, 1.0);
      vec3 color = mix(cellColor, sectionColor, min(1.0, sectionThickness * g2));

      gl_FragColor = vec4(color, (g1 + g2) * pow(d, fadeStrength));
      gl_FragColor.a = mix(0.75 * gl_FragColor.a, gl_FragColor.a, g2);
      if (gl_FragColor.a <= 0.0) discard;

      #include <tonemapping_fragment>
      #include <${B>=154?"colorspace_fragment":"encodings_fragment"}>
    }
  `),A=t.forwardRef(({args:o,cellColor:e="#000000",sectionColor:r="#2080ff",cellSize:n=.5,sectionSize:s=1,followCamera:l=!1,infiniteGrid:a=!1,fadeDistance:c=100,fadeStrength:g=1,fadeFrom:f=1,cellThickness:w=.5,sectionThickness:p=1,side:v=L,...x},u)=>{U({GridMaterial:q});const d=t.useRef(null);t.useImperativeHandle(u,()=>d.current,[]);const z=new V,M=new y(0,1,0),S=new y(0,0,0);h(I=>{z.setFromNormalAndCoplanarPoint(M,S).applyMatrix4(d.current.matrixWorld);const j=d.current.material,D=j.uniforms.worldCamProjPosition,E=j.uniforms.worldPlanePosition;z.projectPoint(I.camera.position,D.value),E.value.set(0,0,0).applyMatrix4(d.current.matrixWorld)});const b={cellSize:n,sectionSize:s,cellColor:e,sectionColor:r,cellThickness:w,sectionThickness:p},k={fadeDistance:c,fadeStrength:g,fadeFrom:f,infiniteGrid:a,followCamera:l};return t.createElement("mesh",m({ref:d,frustumCulled:!1},x),t.createElement("gridMaterial",m({transparent:!0,"extensions-derivatives":!0,side:v},b,k)),t.createElement("planeGeometry",{args:o}))});var N=`#define GLSLIFY 1
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}float snoise(vec3 v){const vec2 C=vec2(1.0/6.0,1.0/3.0);const vec4 D=vec4(0.0,0.5,1.0,2.0);vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;i=mod289(i);vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));float n_=0.142857142857;vec3 ns=n_*D.wyz-D.xzx;vec4 j=p-49.0*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_);vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.0-abs(x)-abs(y);vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;vec4 sh=-step(h,vec4(0.0));vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);m=m*m;return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));}`;class W extends O{constructor(e={}){super(e),this.setValues(e),this._time={value:0},this._distort={value:.4},this._radius={value:1}}onBeforeCompile(e){e.uniforms.time=this._time,e.uniforms.radius=this._radius,e.uniforms.distort=this._distort,e.vertexShader=`
      uniform float time;
      uniform float radius;
      uniform float distort;
      ${N}
      ${e.vertexShader}
    `,e.vertexShader=e.vertexShader.replace("#include <begin_vertex>",`
        float updateTime = time / 50.0;
        float noise = snoise(vec3(position / 2.0 + updateTime * 5.0));
        vec3 transformed = vec3(position * (noise * pow(distort, 2.0) + radius));
        `)}get time(){return this._time.value}set time(e){this._time.value=e}get distort(){return this._distort.value}set distort(e){this._distort.value=e}get radius(){return this._radius.value}set radius(e){this._radius.value=e}}const Y=t.forwardRef(({speed:o=1,...e},r)=>{const[n]=t.useState(()=>new W);return h(s=>n&&(n.time=s.clock.elapsedTime*o)),t.createElement("primitive",m({object:n,ref:r,attach:"material"},e))});function J(o,e){const r=o+"Geometry";return t.forwardRef(({args:n,children:s,...l},a)=>{const c=t.useRef(null);return t.useImperativeHandle(a,()=>c.current),t.useLayoutEffect(()=>void(e==null?void 0:e(c.current))),t.createElement("mesh",m({ref:c},l),t.createElement(r,{attach:"geometry",args:n}),s)})}const K=J("sphere"),P=t.forwardRef(({children:o,enabled:e=!0,speed:r=1,rotationIntensity:n=1,floatIntensity:s=1,floatingRange:l=[-.1,.1],autoInvalidate:a=!1,...c},g)=>{const f=t.useRef(null);t.useImperativeHandle(g,()=>f.current,[]);const w=t.useRef(Math.random()*1e4);return h(p=>{var v,x;if(!e||r===0)return;a&&p.invalidate();const u=w.current+p.clock.elapsedTime;f.current.rotation.x=Math.cos(u/4*r)/8*n,f.current.rotation.y=Math.sin(u/4*r)/8*n,f.current.rotation.z=Math.sin(u/4*r)/20*n;let d=Math.sin(u/4*r)/10;d=_.mapLinear(d,-.1,.1,(v=l==null?void 0:l[0])!==null&&v!==void 0?v:-.1,(x=l==null?void 0:l[1])!==null&&x!==void 0?x:.1),f.current.position.y=d*s,f.current.updateMatrix()}),t.createElement("group",c,t.createElement("group",{ref:f,matrixAutoUpdate:!1},o))}),X=()=>{const o=t.useRef();return h(e=>{o.current&&(o.current.rotation.x=e.clock.getElapsedTime()*.05,o.current.rotation.y=e.clock.getElapsedTime()*.08)}),i.jsxs(i.Fragment,{children:[i.jsx("ambientLight",{intensity:.6,color:"#ffffff"}),i.jsx("directionalLight",{position:[10,10,5],intensity:1,color:"#3b82f6"}),i.jsx("pointLight",{position:[0,-2,5],intensity:1.2,color:"#ffffff"}),i.jsx(A,{position:[0,-2.5,0],args:[40,40],cellSize:1,cellThickness:.5,cellColor:"#cbd5e1",sectionSize:5,sectionThickness:1,sectionColor:"#3b82f6",fadeDistance:25,fadeStrength:1}),i.jsx(P,{speed:1.5,rotationIntensity:.2,floatIntensity:.5,children:i.jsx(K,{ref:o,args:[1.6,64,64],position:[0,0,0],children:i.jsx(Y,{color:"#ffffff",attach:"material",distort:.3,speed:1.5,roughness:.2,metalness:.1,transparent:!0,opacity:.8})})}),i.jsx(P,{speed:2,rotationIntensity:1,floatIntensity:.3,children:i.jsxs("mesh",{position:[2,-.5,-1],rotation:[Math.PI/4,0,0],children:[i.jsx("torusGeometry",{args:[1.2,.01,16,100]}),i.jsx("meshStandardMaterial",{color:"#3b82f6",transparent:!0,opacity:.4})]})}),i.jsx(P,{speed:1.5,rotationIntensity:.8,floatIntensity:.4,children:i.jsxs("mesh",{position:[-2,1,-2],rotation:[-Math.PI/3,.5,.2],children:[i.jsx("torusGeometry",{args:[1.8,.01,16,100]}),i.jsx("meshStandardMaterial",{color:"#3b82f6",transparent:!0,opacity:.3})]})})]})};export{X as default};
