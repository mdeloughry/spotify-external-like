import { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import * as THREE from 'three';

interface PsychedelicVisualizerProps {
  audioElement?: HTMLAudioElement | null;
  onClose: () => void;
}

export default function PsychedelicVisualizer({ audioElement, onClose }: PsychedelicVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const frameRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);

  const cleanup = useCallback(() => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
    }
    if (rendererRef.current) {
      rendererRef.current.dispose();
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    // Setup Three.js
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Setup audio analyser
    let audioData = new Uint8Array(128).fill(128);

    if (audioElement) {
      try {
        const audioContext = new AudioContext();
        audioContextRef.current = audioContext;
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;

        const source = audioContext.createMediaElementSource(audioElement);
        source.connect(analyser);
        analyser.connect(audioContext.destination);

        dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
      } catch (e) {
        console.log('Audio context already exists or failed to create');
      }
    }

    // Demoscene colors
    const colors = [
      new THREE.Color(0x00ffff), // Cyan
      new THREE.Color(0xff00ff), // Magenta
      new THREE.Color(0xff6600), // Orange
      new THREE.Color(0x00ff66), // Green
      new THREE.Color(0x6600ff), // Purple
      new THREE.Color(0xffff00), // Yellow
    ];

    // Create morphing blob geometry
    const blobGeometry = new THREE.IcosahedronGeometry(1.5, 4);
    const blobMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uBass: { value: 0 },
        uMid: { value: 0 },
        uTreble: { value: 0 },
        uColor1: { value: colors[0] },
        uColor2: { value: colors[1] },
      },
      vertexShader: `
        uniform float uTime;
        uniform float uBass;
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying float vDisplacement;

        //	Simplex 3D Noise
        vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
        vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
        float snoise(vec3 v){
          const vec2 C = vec2(1.0/6.0, 1.0/3.0);
          const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
          vec3 i  = floor(v + dot(v, C.yyy));
          vec3 x0 = v - i + dot(i, C.xxx);
          vec3 g = step(x0.yzx, x0.xyz);
          vec3 l = 1.0 - g;
          vec3 i1 = min(g.xyz, l.zxy);
          vec3 i2 = max(g.xyz, l.zxy);
          vec3 x1 = x0 - i1 + C.xxx;
          vec3 x2 = x0 - i2 + C.yyy;
          vec3 x3 = x0 - D.yyy;
          i = mod(i, 289.0);
          vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
          float n_ = 1.0/7.0;
          vec3 ns = n_ * D.wyz - D.xzx;
          vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
          vec4 x_ = floor(j * ns.z);
          vec4 y_ = floor(j - 7.0 * x_);
          vec4 x = x_ *ns.x + ns.yyyy;
          vec4 y = y_ *ns.x + ns.yyyy;
          vec4 h = 1.0 - abs(x) - abs(y);
          vec4 b0 = vec4(x.xy, y.xy);
          vec4 b1 = vec4(x.zw, y.zw);
          vec4 s0 = floor(b0)*2.0 + 1.0;
          vec4 s1 = floor(b1)*2.0 + 1.0;
          vec4 sh = -step(h, vec4(0.0));
          vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
          vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
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

        void main() {
          vNormal = normal;
          vPosition = position;

          float noise = snoise(position * 1.5 + uTime * 0.5);
          float displacement = noise * (0.3 + uBass * 0.5);
          vDisplacement = displacement;

          vec3 newPosition = position + normal * displacement;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uBass;
        uniform float uMid;
        uniform float uTreble;
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying float vDisplacement;

        void main() {
          float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.0);

          vec3 color1 = uColor1;
          vec3 color2 = uColor2;

          float colorMix = sin(vDisplacement * 10.0 + uTime * 2.0) * 0.5 + 0.5;
          vec3 baseColor = mix(color1, color2, colorMix);

          // Add glow
          vec3 glow = baseColor * fresnel * (1.5 + uBass);

          // Add iridescence
          float iridescence = sin(vPosition.x * 10.0 + vPosition.y * 10.0 + uTime * 3.0) * 0.5 + 0.5;
          vec3 iridColor = mix(vec3(1.0, 0.0, 0.5), vec3(0.0, 1.0, 0.5), iridescence);

          vec3 finalColor = baseColor + glow + iridColor * 0.3 * uTreble;

          gl_FragColor = vec4(finalColor, 0.9);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
    });

    const blob = new THREE.Mesh(blobGeometry, blobMaterial);
    scene.add(blob);

    // Create particle system
    const particleCount = 2000;
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const r = 3 + Math.random() * 2;

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      const color = colors[Math.floor(Math.random() * colors.length)];
      particleColors[i * 3] = color.r;
      particleColors[i * 3 + 1] = color.g;
      particleColors[i * 3 + 2] = color.b;
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // Create tunnel rings
    const rings: THREE.Mesh[] = [];
    for (let i = 0; i < 20; i++) {
      const ringGeometry = new THREE.TorusGeometry(2 + i * 0.3, 0.02, 16, 100);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: colors[i % colors.length],
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
      });
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.position.z = -i * 0.5;
      ring.rotation.x = Math.PI / 2;
      scene.add(ring);
      rings.push(ring);
    }

    // Animation
    let time = 0;

    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      time += 0.016;

      // Get audio data
      let bass = 0.5, mid = 0.5, treble = 0.5;

      if (analyserRef.current && dataArrayRef.current) {
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
        const data = dataArrayRef.current;

        // Split frequency data into bass, mid, treble
        const third = Math.floor(data.length / 3);
        bass = Array.from(data.slice(0, third)).reduce((a, b) => a + b, 0) / (third * 255);
        mid = Array.from(data.slice(third, third * 2)).reduce((a, b) => a + b, 0) / (third * 255);
        treble = Array.from(data.slice(third * 2)).reduce((a, b) => a + b, 0) / (third * 255);
      } else {
        // Fake audio response for demo
        bass = 0.5 + Math.sin(time * 2) * 0.3;
        mid = 0.5 + Math.sin(time * 3) * 0.2;
        treble = 0.5 + Math.sin(time * 5) * 0.25;
      }

      // Color cycling – continuous, seamless loop around the palette (~60s per full orbit)
      const loopSpeed = 0.1; // paletteSize / loopSpeed ≈ 60s when paletteSize = 6
      const paletteSize = colors.length;
      const phase = (time * loopSpeed) % paletteSize;
      const baseIndex = Math.floor(phase);
      const mix = phase - baseIndex;

      const c0 = colors[baseIndex];
      const c1 = colors[(baseIndex + 1) % paletteSize];
      const c2 = colors[(baseIndex + 2) % paletteSize];
      const c3 = colors[(baseIndex + 3) % paletteSize];

      const colorA = new THREE.Color().lerpColors(c0, c1, mix);
      const colorB = new THREE.Color().lerpColors(c2, c3, mix);

      // Update blob
      blobMaterial.uniforms.uTime.value = time;
      blobMaterial.uniforms.uBass.value = bass;
      blobMaterial.uniforms.uMid.value = mid;
      blobMaterial.uniforms.uTreble.value = treble;
      blobMaterial.uniforms.uColor1.value.copy(colorA);
      blobMaterial.uniforms.uColor2.value.copy(colorB);

      blob.rotation.x += 0.005 + bass * 0.02;
      blob.rotation.y += 0.007 + mid * 0.02;
      blob.scale.setScalar(1 + bass * 0.3);

      // Update particles
      particles.rotation.y += 0.002 + treble * 0.01;
      particles.rotation.x += 0.001;
      particleMaterial.size = 0.05 + bass * 0.05;

      // Update rings
      rings.forEach((ring, i) => {
        ring.rotation.z += 0.01 * (i % 2 === 0 ? 1 : -1);
        ring.scale.setScalar(1 + Math.sin(time * 2 + i * 0.5) * 0.1 * bass);
        (ring.material as THREE.MeshBasicMaterial).opacity = 0.3 + mid * 0.3;
      });

      // Camera movement
      camera.position.x = Math.sin(time * 0.5) * 0.5;
      camera.position.y = Math.cos(time * 0.3) * 0.5;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };

    animate();

    // Handle resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // Handle escape key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      cleanup();
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, [audioElement, onClose, cleanup]);

  // Render into document.body so we escape any layout/overflow clipping and truly cover the viewport
  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      ref={containerRef}
      className="fixed inset-0 z-[100] bg-black cursor-pointer"
      onClick={onClose}
    >
      {/* Scanlines overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
        }}
      />

      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.5) 100%)',
        }}
      />

      {/* Instructions */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/50 text-sm font-mono">
        Click anywhere or press ESC to exit
      </div>

      {/* Demoscene text */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 text-center">
        <div
          className="text-4xl font-bold tracking-widest"
          style={{
            background: 'linear-gradient(90deg, #00ffff, #ff00ff, #ffff00, #00ffff)',
            backgroundSize: '300% 100%',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            animation: 'gradient 10s linear infinite',
          }}
        >
          SPILLOVER
        </div>
        <div className="text-white/30 text-xs mt-2 font-mono tracking-[0.5em]">
          VISUALIZER
        </div>
      </div>

      <style>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          100% { background-position: 300% 50%; }
        }
      `}</style>
    </div>,
    document.body
  );
}
