import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

const customStyles = {
  geometricIntervention: {
    position: 'absolute',
    top: '40%',
    left: '55%',
    width: '25vw',
    height: '35vh',
    backgroundColor: '#0A3A8A',
    transform: 'translate(-50%, -50%)',
    zIndex: 0,
    mixBlendMode: 'multiply',
    opacity: 0.8,
    animation: 'float-plane 20s ease-in-out infinite alternate',
  },
  uiLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 10,
    padding: 'calc(max(2vw, 20px) * 2)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    pointerEvents: 'none',
  },
  logo: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: '1.5rem',
    letterSpacing: '0.05em',
    fontWeight: 600,
    textTransform: 'none',
    fontStyle: 'italic',
  },
  h1: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 'clamp(3rem, 6vw, 7rem)',
    fontWeight: 600,
    lineHeight: 0.9,
    letterSpacing: '-0.02em',
    marginBottom: 'calc(max(2vw, 20px) * 1.5)',
    color: '#0a0a0a',
    maxWidth: '60%',
    textAlign: 'left',
    textShadow: '0 2px 30px rgba(255,255,255,0.8), 0 0 60px rgba(255,255,255,0.4)',
    position: 'relative',
    zIndex: 20,
  },
  subheadContainer: {
    position: 'relative',
    paddingLeft: '20px',
  },
  subhead: {
    fontFamily: "'Manrope', sans-serif",
    fontSize: 'clamp(0.9rem, 1.1vw, 1.2rem)',
    fontWeight: 400,
    lineHeight: 1.6,
    color: '#555555',
    maxWidth: '320px',
    letterSpacing: '0.01em',
  },
  scrollLine: {
    width: '40px',
    height: '1px',
    backgroundColor: '#555555',
    position: 'relative',
    overflow: 'hidden',
  },
  navLink: {
    cursor: 'pointer',
    position: 'relative',
    overflow: 'hidden',
    paddingBottom: '4px',
    fontSize: '0.75rem',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    fontWeight: 500,
  },
  contentLeft: {
    maxWidth: '45vw',
    paddingLeft: 'calc(max(2vw, 20px) * 2)',
    transformStyle: 'preserve-3d',
  },
};

const HomePage = () => {
  const canvasContainerRef = useRef(null);
  const parallaxContentRef = useRef(null);
  const [hoveredNav, setHoveredNav] = useState(null);
  const [glitchEnter, setGlitchEnter] = useState(false);
  const animationRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);

  useEffect(() => {
    if (!canvasContainerRef.current) return;

    let THREE;
    let pointCloud, debris, material, camera, renderer, scene, clock;
    let mouseX = 0;
    let mouseY = 0;
    let animFrameId;

    const loadThree = async () => {
      await new Promise((resolve, reject) => {
        if (window.THREE) { resolve(); return; }
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });

      THREE = window.THREE;

      scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0xe6e6e8, 0.025);

      camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
      camera.position.z = 25;
      camera.position.x = 5;

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      canvasContainerRef.current.appendChild(renderer.domElement);
      rendererRef.current = renderer;
      sceneRef.current = scene;

      const noiseShader = `
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
        vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
        float snoise(vec3 v) {
          const vec2 C = vec2(1.0/6.0, 1.0/3.0);
          const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
          vec3 i = floor(v + dot(v, C.yyy));
          vec3 x0 = v - i + dot(i, C.xxx);
          vec3 g = step(x0.yzx, x0.xyz);
          vec3 l = 1.0 - g;
          vec3 i1 = min(g.xyz, l.zxy);
          vec3 i2 = max(g.xyz, l.zxy);
          vec3 x1 = x0 - i1 + C.xxx;
          vec3 x2 = x0 - i2 + C.yyy;
          vec3 x3 = x0 - D.yyy;
          i = mod289(i);
          vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
          float n_ = 0.142857142857;
          vec3 ns = n_ * D.wyz - D.xzx;
          vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
          vec4 x_ = floor(j * ns.z);
          vec4 y_ = floor(j - 7.0 * x_);
          vec4 x = x_ * ns.x + ns.yyyy;
          vec4 y = y_ * ns.x + ns.yyyy;
          vec4 h = 1.0 - abs(x) - abs(y);
          vec4 b0 = vec4(x.xy, y.xy);
          vec4 b1 = vec4(x.zw, y.zw);
          vec4 s0 = floor(b0)*2.0 + 1.0;
          vec4 s1 = floor(b1)*2.0 + 1.0;
          vec4 sh = -step(h, vec4(0.0));
          vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
          vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
          vec3 p0 = vec3(a0.xy, h.x);
          vec3 p1 = vec3(a0.zw, h.y);
          vec3 p2 = vec3(a1.xy, h.z);
          vec3 p3 = vec3(a1.zw, h.w);
          vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
          p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
          vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
          m = m * m;
          return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
        }
      `;

      const vertexShader = `
        ${noiseShader}
        uniform float uTime;
        varying float vNoise;
        void main() {
          float noise = snoise(vec3(position.x * 0.2, position.y * 0.2, position.z * 0.2 + uTime * 0.1));
          vNoise = noise;
          vec3 newPosition = position + normal * (noise * 2.0);
          vec4 mvPosition = modelViewMatrix * vec4(newPosition, 1.0);
          gl_PointSize = (12.0 * (1.0 + noise)) * (10.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `;

      const fragmentShader = `
        varying float vNoise;
        void main() {
          vec2 xy = gl_PointCoord.xy - vec2(0.5);
          float ll = length(xy);
          if (ll > 0.5) discard;
          vec3 colorMain = vec3(1.0, 1.0, 1.0);
          vec3 colorShadow = vec3(0.8, 0.85, 0.9);
          vec3 finalColor = mix(colorShadow, colorMain, vNoise + 0.5);
          float alpha = (0.5 - ll) * 2.0;
          alpha *= smoothstep(-1.0, 0.5, vNoise);
          gl_FragColor = vec4(finalColor, alpha * 0.8);
        }
      `;

      const geometry = new THREE.TorusKnotGeometry(4, 1.5, 300, 64);
      geometry.scale(1, 1.4, 0.8);

      material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: { uTime: { value: 0.0 } },
        transparent: true,
        depthWrite: false,
        blending: THREE.NormalBlending,
      });

      pointCloud = new THREE.Points(geometry, material);
      pointCloud.position.set(2, 0, 0);
      scene.add(pointCloud);

      const debrisGeometry = new THREE.BufferGeometry();
      const debrisCount = 1000;
      const positions = new Float32Array(debrisCount * 3);
      for (let i = 0; i < debrisCount * 3; i++) {
        positions[i] = (Math.random() - 0.5) * 30;
      }
      debrisGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const debrisMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.05, transparent: true, opacity: 0.4 });
      debris = new THREE.Points(debrisGeometry, debrisMaterial);
      scene.add(debris);

      clock = new THREE.Clock();
      const windowHalfX = window.innerWidth / 2;
      const windowHalfY = window.innerHeight / 2;

      const onMouseMove = (event) => {
        mouseX = (event.clientX - windowHalfX) * 0.001;
        mouseY = (event.clientY - windowHalfY) * 0.001;
      };
      document.addEventListener('mousemove', onMouseMove);

      const animate = () => {
        animFrameId = requestAnimationFrame(animate);
        const elapsedTime = clock.getElapsedTime();
        material.uniforms.uTime.value = elapsedTime * 0.5;

        const targetX = mouseX * 0.5;
        const targetY = mouseY * 0.5;
        pointCloud.rotation.y += 0.05 * (targetX - pointCloud.rotation.y);
        pointCloud.rotation.x += 0.05 * (targetY - pointCloud.rotation.x);
        pointCloud.rotation.y += 0.001;

        debris.rotation.y -= 0.0005;
        debris.rotation.x -= 0.0002;

        if (parallaxContentRef.current) {
          const textMoveX = mouseX * -20;
          const textMoveY = mouseY * -20;
          parallaxContentRef.current.style.transform = `translate3d(${textMoveX}px, ${textMoveY}px, 0)`;
        }

        renderer.render(scene, camera);
      };

      animate();
      animationRef.current = animFrameId;

      const onResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      };
      window.addEventListener('resize', onResize);

      return () => {
        cancelAnimationFrame(animFrameId);
        document.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('resize', onResize);
        if (rendererRef.current && canvasContainerRef.current) {
          canvasContainerRef.current.removeChild(rendererRef.current.domElement);
          rendererRef.current.dispose();
        }
      };
    };

    const cleanup = loadThree();
    return () => {
      cleanup.then(fn => fn && fn());
    };
  }, []);

  const navLinkStyle = (name) => ({
    ...customStyles.navLink,
    pointerEvents: 'auto',
    color: hoveredNav === name ? '#0A3A8A' : '#141414',
    animation: (name === 'Enter' && glitchEnter) ? 'text-glitch 0.3s cubic-bezier(.25, .46, .45, .94) both infinite' : 'none',
  });

  return (
    <div style={{ backgroundColor: '#e6e6e8', color: '#141414', fontFamily: "'Manrope', sans-serif", overflow: 'hidden', width: '100vw', height: '100vh', WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale', position: 'relative' }}>
      <div style={customStyles.geometricIntervention}></div>
      <div
        ref={canvasContainerRef}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1, pointerEvents: 'none' }}
      ></div>

      <div style={customStyles.uiLayer}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', pointerEvents: 'auto' }}>
          <div style={customStyles.logo}>TMR.</div>
          <div style={{ display: 'flex', gap: 'calc(max(2vw, 20px) * 2)' }}>
            {['Thesis', 'Exhibition', 'Enter'].map((name) => (
              <span
                key={name}
                style={navLinkStyle(name)}
                onMouseEnter={() => {
                  setHoveredNav(name);
                  if (name === 'Enter') setGlitchEnter(true);
                }}
                onMouseLeave={() => {
                  setHoveredNav(null);
                  if (name === 'Enter') setGlitchEnter(false);
                }}
              >
                {name}
                <span style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  width: '100%',
                  height: '1px',
                  backgroundColor: '#141414',
                  transform: hoveredNav === name ? 'translateX(0)' : 'translateX(-101%)',
                  transition: 'transform 0.4s cubic-bezier(0.19, 1, 0.22, 1)',
                  display: 'block',
                }}></span>
              </span>
            ))}
          </div>
        </header>

        <main style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', alignItems: 'center', flexGrow: 1, position: 'relative' }}>
          <div
            ref={parallaxContentRef}
            style={{ ...customStyles.contentLeft, pointerEvents: 'auto' }}
          >
            <h1 style={customStyles.h1}>
              The Modern<br />Renaissance
            </h1>
          </div>
        </main>

        <footer style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#555555', pointerEvents: 'auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span>Vol. I — Digital Humanism</span>
            <span>Coordinates: 40.7128° N, 74.0060° W</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
            <span>Discover</span>
            <div style={customStyles.scrollLine}>
              <span style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundColor: '#141414',
                animation: 'scroll-progress 2s cubic-bezier(0.65, 0, 0.35, 1) infinite',
                display: 'block',
              }}></span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

const App = () => {
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,400&family=Manrope:wght@300;400;500&display=swap';
    document.head.appendChild(link);

    const style = document.createElement('style');
    style.textContent = `
      @keyframes float-plane {
        0% { transform: translate(-50%, -50%) rotate(0deg) scale(1); }
        100% { transform: translate(-48%, -49%) rotate(1deg) scale(1.02); }
      }
      @keyframes scroll-progress {
        0% { transform: translateX(-100%); }
        50% { transform: translateX(0); }
        100% { transform: translateX(100%); }
      }
      @keyframes text-glitch {
        0% { transform: translate(0); }
        20% { transform: translate(-2px, 1px); }
        40% { transform: translate(-1px, -1px); }
        60% { transform: translate(2px, 1px); }
        80% { transform: translate(1px, -1px); }
        100% { transform: translate(0); }
      }
      * { margin: 0; padding: 0; box-sizing: border-box; }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(link);
      document.head.removeChild(style);
    };
  }, []);

  return (
    <Router basename="/">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="*" element={<HomePage />} />
      </Routes>
    </Router>
  );
};

export default App;