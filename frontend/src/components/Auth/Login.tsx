import { useState, useEffect, useRef } from 'react';

interface LoginProps {
  onSuccess: (token: string, username: string) => void;
  apiUrl: string;
}

export function Login({ onSuccess, apiUrl }: LoginProps) {
  const [mode, setMode]         = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const canvasRef               = useRef<HTMLDivElement>(null);

  // ── Three.js background ──────────────────────────────────────────────────
  useEffect(() => {
    if (!canvasRef.current) return;
    let animFrameId: number;
    let cleanup: (() => void) | undefined;

    const init = async () => {
      await new Promise<void>((resolve, reject) => {
        if ((window as any).THREE) { resolve(); return; }
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
        s.onload = () => resolve();
        s.onerror = reject;
        document.head.appendChild(s);
      });

      const THREE = (window as any).THREE;
      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0xe6e6e8, 0.025);

      const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
      camera.position.z = 25;
      camera.position.x = 5;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      if (canvasRef.current) canvasRef.current.appendChild(renderer.domElement);

      const noiseShader = `
        vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
        vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
        vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}
        vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
        float snoise(vec3 v){
          const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);
          vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
          vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;
          vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
          vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
          i=mod289(i);
          vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
          float n_=.142857142857;vec3 ns=n_*D.wyz-D.xzx;
          vec4 j=p-49.*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_);
          vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.-abs(x)-abs(y);
          vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
          vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;vec4 sh=-step(h,vec4(0.));
          vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
          vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
          vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
          p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
          vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m;
          return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
        }
      `;

      const material = new THREE.ShaderMaterial({
        vertexShader: `${noiseShader}
          uniform float uTime; varying float vNoise;
          void main(){
            float noise=snoise(vec3(position.x*.2,position.y*.2,position.z*.2+uTime*.1));
            vNoise=noise;
            vec3 np=position+normal*(noise*2.);
            vec4 mv=modelViewMatrix*vec4(np,1.);
            gl_PointSize=(12.*(1.+noise))*(10./-mv.z);
            gl_Position=projectionMatrix*mv;
          }`,
        fragmentShader: `varying float vNoise;
          void main(){
            vec2 xy=gl_PointCoord.xy-vec2(.5);float ll=length(xy);
            if(ll>.5)discard;
            vec3 c=mix(vec3(.8,.85,.9),vec3(1.,1.,1.),vNoise+.5);
            float a=(0.5-ll)*2.;a*=smoothstep(-1.,.5,vNoise);
            gl_FragColor=vec4(c,a*.8);
          }`,
        uniforms: { uTime: { value: 0 } },
        transparent: true, depthWrite: false, blending: THREE.NormalBlending,
      });

      const geometry = new THREE.TorusKnotGeometry(4, 1.5, 300, 64);
      geometry.scale(1, 1.4, 0.8);
      const pointCloud = new THREE.Points(geometry, material);
      pointCloud.position.set(2, 0, 0);
      scene.add(pointCloud);

      const debGeo = new THREE.BufferGeometry();
      const pos = new Float32Array(3000);
      for (let i = 0; i < 3000; i++) pos[i] = (Math.random() - 0.5) * 30;
      debGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      scene.add(new THREE.Points(debGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.05, transparent: true, opacity: 0.4 })));

      const clock = new THREE.Clock();
      let mx = 0, my = 0;
      const onMM = (e: MouseEvent) => { mx = (e.clientX - window.innerWidth / 2) * 0.001; my = (e.clientY - window.innerHeight / 2) * 0.001; };
      const onResize = () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); };
      document.addEventListener('mousemove', onMM);
      window.addEventListener('resize', onResize);

      const animate = () => {
        animFrameId = requestAnimationFrame(animate);
        material.uniforms.uTime.value = clock.getElapsedTime() * 0.5;
        pointCloud.rotation.y += 0.05 * (mx * 0.5 - pointCloud.rotation.y) + 0.001;
        pointCloud.rotation.x += 0.05 * (my * 0.5 - pointCloud.rotation.x);
        renderer.render(scene, camera);
      };
      animate();

      cleanup = () => {
        cancelAnimationFrame(animFrameId);
        document.removeEventListener('mousemove', onMM);
        window.removeEventListener('resize', onResize);
        if (canvasRef.current && renderer.domElement.parentNode === canvasRef.current) {
          canvasRef.current.removeChild(renderer.domElement);
        }
        renderer.dispose();
      };
    };

    init().catch(() => {});
    return () => cleanup?.();
  }, []);

  // ── Form submit ──────────────────────────────────────────────────────────
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    setLoading(true);
    setError('');
    const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
    try {
      const res = await fetch(`${apiUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || '请求失败'); return; }
      localStorage.setItem('token', data.token);
      localStorage.setItem('username', data.username);
      onSuccess(data.token, data.username);
    } catch {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#e6e6e8', color: '#141414', fontFamily: "'Manrope', sans-serif", width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative', WebkitFontSmoothing: 'antialiased' }}>

      {/* Geometric accent */}
      <div style={{ position: 'absolute', top: '40%', left: '55%', width: '25vw', height: '35vh', backgroundColor: '#0A3A8A', transform: 'translate(-50%, -50%)', zIndex: 0, mixBlendMode: 'multiply', opacity: 0.7, animation: 'float-plane 20s ease-in-out infinite alternate' }} />

      {/* Three.js canvas */}
      <div ref={canvasRef} style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }} />

      {/* UI layer */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 10, display: 'flex', flexDirection: 'column', padding: 'clamp(24px, 4vw, 48px)' }}>

        {/* Header */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.4rem', fontWeight: 600, fontStyle: 'italic', letterSpacing: '0.02em' }}>
            Agent.
          </span>
          <div style={{ display: 'flex', gap: '32px' }}>
            {(['login', 'register'] as const).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase',
                  fontWeight: 500, fontFamily: "'Manrope', sans-serif",
                  color: mode === m ? '#0A3A8A' : '#555555',
                  borderBottom: mode === m ? '1px solid #0A3A8A' : '1px solid transparent',
                  paddingBottom: '2px', transition: 'color 0.3s, border-color 0.3s',
                }}
              >
                {m === 'login' ? '登录' : '注册'}
              </button>
            ))}
          </div>
        </header>

        {/* Main */}
        <main style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
          <div style={{ maxWidth: '340px' }}>
            <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(2.8rem, 5vw, 5rem)', fontWeight: 600, lineHeight: 0.9, letterSpacing: '-0.02em', color: '#0a0a0a', marginBottom: '2.5rem', textShadow: '0 2px 30px rgba(255,255,255,0.8)' }}>
              {mode === 'login' ? <>Welcome<br />Back.</> : <>Create<br />Account.</>}
            </h1>

            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Username */}
              <div style={{ borderBottom: '1px solid #999', paddingBottom: '8px' }}>
                <div style={{ fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#555', marginBottom: '6px' }}>用户名</div>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  autoFocus
                  style={{ width: '100%', background: 'none', border: 'none', outline: 'none', fontSize: '1rem', fontFamily: "'Manrope', sans-serif", color: '#141414', letterSpacing: '0.02em' }}
                  placeholder="your username"
                />
              </div>

              {/* Password */}
              <div style={{ borderBottom: '1px solid #999', paddingBottom: '8px' }}>
                <div style={{ fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#555', marginBottom: '6px' }}>密码</div>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ width: '100%', background: 'none', border: 'none', outline: 'none', fontSize: '1rem', fontFamily: "'Manrope', sans-serif", color: '#141414', letterSpacing: '0.02em' }}
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <div style={{ fontSize: '0.75rem', color: '#c0392b', letterSpacing: '0.05em' }}>{error}</div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !username.trim() || !password.trim()}
                style={{
                  background: loading || !username.trim() || !password.trim() ? '#999' : '#141414',
                  color: '#e6e6e8', border: 'none', cursor: loading ? 'wait' : 'pointer',
                  padding: '14px 32px', fontSize: '0.7rem', letterSpacing: '0.15em',
                  textTransform: 'uppercase', fontFamily: "'Manrope', sans-serif", fontWeight: 500,
                  transition: 'background 0.3s', marginTop: '8px', alignSelf: 'flex-start',
                  display: 'flex', alignItems: 'center', gap: '10px',
                }}
              >
                {loading && <span style={{ width: '12px', height: '12px', border: '1px solid #e6e6e8', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />}
                {mode === 'login' ? 'Enter' : 'Register'}
              </button>
            </form>
          </div>
        </main>

        {/* Footer */}
        <footer style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#555' }}>
          <span>MCP · Agent Chat</span>
          <span>v2</span>
        </footer>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
