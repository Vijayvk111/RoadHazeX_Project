import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import './HeroSection.css';
import { useLanguage } from '../contexts/LanguageContext';
gsap.registerPlugin(ScrollTrigger);

const HeroSection = ({ onGetStarted, onMenuClick, isSidebarOpen }) => {
  const { t } = useLanguage();
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const titleRef = useRef(null);
  const subtitleRef = useRef(null);
  const scrollProgressRef = useRef(null);
  const menuRef = useRef(null);

  const smoothCameraPos = useRef({ x: 0, y: 30, z: 100 });
  
  const [scrollProgress, setScrollProgress] = useState(0);
  const [currentSection, setCurrentSection] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const totalSections = 2; // Intervals for 3 sections (0, 1, 2)
  
  const threeRefs = useRef({
    scene: null,
    camera: null,
    renderer: null,
    composer: null,
    stars: [],
    nebula: null,
    mountains: [],
    animationId: null,
    targetCameraX: 0,
    targetCameraY: 30,
    targetCameraZ: 300,
    locations: []
  });

  // Initialize Three.js
  useEffect(() => {
    const initThree = () => {
      const { current: refs } = threeRefs;
      
      // Scene setup
      refs.scene = new THREE.Scene();
      refs.scene.fog = new THREE.FogExp2(0x000000, 0.00025);

      // Camera
      refs.camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        2000
      );
      refs.camera.position.z = 300;
      refs.camera.position.y = 30;

      // Renderer
      refs.renderer = new THREE.WebGLRenderer({
        canvas: canvasRef.current,
        antialias: true,
        alpha: true
      });
      refs.renderer.setSize(window.innerWidth, window.innerHeight);
      refs.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      refs.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      refs.renderer.toneMappingExposure = 0.5;

      // Post-processing
      refs.composer = new EffectComposer(refs.renderer);
      const renderPass = new RenderPass(refs.scene, refs.camera);
      refs.composer.addPass(renderPass);

      const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.8,
        0.4,
        0.85
      );
      refs.composer.addPass(bloomPass);

      // Create scene elements
      createStarField();
      createNebula();
      createMountains();
      createAtmosphere();
      
      // Get initial positions for mountains
      refs.locations = refs.mountains.map(m => m.position.z);

      // Start animation
      animate();
      
      // Mark as ready after Three.js is initialized
      setIsReady(true);
    };

    const createStarField = () => {
      const { current: refs } = threeRefs;
      const starCount = 5000;
      
      for (let i = 0; i < 3; i++) {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(starCount * 3);
        const colors = new Float32Array(starCount * 3);
        const sizes = new Float32Array(starCount);

        for (let j = 0; j < starCount; j++) {
          const radius = 200 + Math.random() * 800;
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(Math.random() * 2 - 1);

          positions[j * 3] = radius * Math.sin(phi) * Math.cos(theta);
          positions[j * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
          positions[j * 3 + 2] = radius * Math.cos(phi);

          // Color variation
          const color = new THREE.Color();
          const colorChoice = Math.random();
          if (colorChoice < 0.7) {
            color.setHSL(0, 0, 0.8 + Math.random() * 0.2);
          } else if (colorChoice < 0.9) {
            color.setHSL(0.08, 0.5, 0.8);
          } else {
            color.setHSL(0.6, 0.5, 0.8);
          }
          
          colors[j * 3] = color.r;
          colors[j * 3 + 1] = color.g;
          colors[j * 3 + 2] = color.b;

          sizes[j] = Math.random() * 2 + 0.5;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const material = new THREE.ShaderMaterial({
          uniforms: {
            time: { value: 0 },
            depth: { value: i }
          },
          vertexShader: `
            attribute float size;
            attribute vec3 color;
            varying vec3 vColor;
            uniform float time;
            uniform float depth;
            
            void main() {
              vColor = color;
              vec3 pos = position;
              
              float angle = time * 0.05 * (1.0 - depth * 0.3);
              mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
              pos.xy = rot * pos.xy;
              
              vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
              gl_PointSize = size * (300.0 / -mvPosition.z);
              gl_Position = projectionMatrix * mvPosition;
            }
          `,
          fragmentShader: `
            varying vec3 vColor;
            
            void main() {
              float dist = length(gl_PointCoord - vec2(0.5));
              if (dist > 0.5) discard;
              
              float opacity = 1.0 - smoothstep(0.0, 0.5, dist);
              gl_FragColor = vec4(vColor, opacity);
            }
          `,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        });

        const starSet = new THREE.Points(geometry, material);
        refs.scene.add(starSet);
        refs.stars.push(starSet);
      }
    };

    const createNebula = () => {
      const { current: refs } = threeRefs;
      
      const geometry = new THREE.PlaneGeometry(8000, 4000, 100, 100);
      const material = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          color1: { value: new THREE.Color(0xff6b6b) }, // Red highlight
          color2: { value: new THREE.Color(0x1e3c72) }, // Deep blue
          opacity: { value: 0.3 }
        },
        vertexShader: `
          varying vec2 vUv;
          varying float vElevation;
          uniform float time;
          
          void main() {
            vUv = uv;
            vec3 pos = position;
            
            float elevation = sin(pos.x * 0.01 + time) * cos(pos.y * 0.01 + time) * 20.0;
            pos.z += elevation;
            vElevation = elevation;
            
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 color1;
          uniform vec3 color2;
          uniform float opacity;
          uniform float time;
          varying vec2 vUv;
          varying float vElevation;
          
          void main() {
            float mixFactor = sin(vUv.x * 10.0 + time) * cos(vUv.y * 10.0 + time);
            vec3 color = mix(color1, color2, mixFactor * 0.5 + 0.5);
            
            float alpha = opacity * (1.0 - length(vUv - 0.5) * 2.0);
            alpha *= 1.0 + vElevation * 0.01;
            
            gl_FragColor = vec4(color, alpha);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false
      });

      const nebulaMesh = new THREE.Mesh(geometry, material);
      nebulaMesh.position.z = -1050;
      refs.scene.add(nebulaMesh);
      refs.nebula = nebulaMesh;
    };

    const createMountains = () => {
      const { current: refs } = threeRefs;
      
      const layers = [
        { distance: -50, height: 60, color: 0x0a0f2c, opacity: 1 },
        { distance: -100, height: 80, color: 0x1e3c72, opacity: 0.8 },
        { distance: -150, height: 100, color: 0x2a5298, opacity: 0.6 },
        { distance: -200, height: 120, color: 0x3a6186, opacity: 0.4 }
      ];

      layers.forEach((layer, index) => {
        const points = [];
        const segments = 50;
        
        for (let i = 0; i <= segments; i++) {
          const x = (i / segments - 0.5) * 2000;
          const y = Math.sin(i * 0.1) * layer.height + 
                   Math.sin(i * 0.05) * layer.height * 0.5 +
                   Math.random() * layer.height * 0.2 - 100;
          points.push(new THREE.Vector2(x, y));
        }
        
        points.push(new THREE.Vector2(5000, -500));
        points.push(new THREE.Vector2(-5000, -500));

        const shape = new THREE.Shape(points);
        const geometry = new THREE.ShapeGeometry(shape);
        const material = new THREE.MeshBasicMaterial({
          color: layer.color,
          transparent: true,
          opacity: layer.opacity,
          side: THREE.DoubleSide
        });

        const mountain = new THREE.Mesh(geometry, material);
        mountain.position.z = layer.distance;
        mountain.userData = { baseZ: layer.distance, index };
        refs.scene.add(mountain);
        refs.mountains.push(mountain);
      });
    };

    const createAtmosphere = () => {
      const { current: refs } = threeRefs;
      const geometry = new THREE.SphereGeometry(600, 32, 32);
      const material = new THREE.ShaderMaterial({
        uniforms: { time: { value: 0 } },
        vertexShader: `
          varying vec3 vNormal;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          varying vec3 vNormal;
          uniform float time;
          void main() {
            float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
            vec3 atmosphere = vec3(0.3, 0.6, 1.0) * intensity;
            float pulse = sin(time * 2.0) * 0.1 + 0.9;
            atmosphere *= pulse;
            gl_FragColor = vec4(atmosphere, intensity * 0.25);
          }
        `,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true
      });

      const atmosphere = new THREE.Mesh(geometry, material);
      refs.scene.add(atmosphere);
    };

    const animate = () => {
      const { current: refs } = threeRefs;
      refs.animationId = requestAnimationFrame(animate);
      
      const time = Date.now() * 0.001;

      refs.stars.forEach(starSet => {
        if (starSet.material.uniforms) starSet.material.uniforms.time.value = time;
      });

      if (refs.nebula && refs.nebula.material.uniforms) {
        refs.nebula.material.uniforms.time.value = time * 0.5;
      }

      if (refs.camera) {
        const smoothingFactor = 0.05;
        smoothCameraPos.current.x += (refs.targetCameraX - smoothCameraPos.current.x) * smoothingFactor;
        smoothCameraPos.current.y += (refs.targetCameraY - smoothCameraPos.current.y) * smoothingFactor;
        smoothCameraPos.current.z += (refs.targetCameraZ - smoothCameraPos.current.z) * smoothingFactor;
        
        const floatX = Math.sin(time * 0.1) * 2;
        const floatY = Math.cos(time * 0.15) * 1;
        
        refs.camera.position.x = smoothCameraPos.current.x + floatX;
        refs.camera.position.y = smoothCameraPos.current.y + floatY;
        refs.camera.position.z = smoothCameraPos.current.z;
        refs.camera.lookAt(0, 10, -600);
      }

      refs.mountains.forEach((mountain, i) => {
        const parallaxFactor = 1 + i * 0.5;
        mountain.position.x = Math.sin(time * 0.1) * 2 * parallaxFactor;
      });

      if (refs.composer) refs.composer.render();
    };

    initThree();

    const handleResize = () => {
      const { current: refs } = threeRefs;
      if (refs.camera && refs.renderer && refs.composer) {
        refs.camera.aspect = window.innerWidth / window.innerHeight;
        refs.camera.updateProjectionMatrix();
        refs.renderer.setSize(window.innerWidth, window.innerHeight);
        refs.composer.setSize(window.innerWidth, window.innerHeight);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      const { current: refs } = threeRefs;
      if (refs.animationId) cancelAnimationFrame(refs.animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Scroll handling
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const maxScroll = Math.max(1, documentHeight - windowHeight);
      const progress = Math.min(scrollY / maxScroll, 1);
      
      setScrollProgress(progress);
      const newSection = Math.min(Math.floor(progress * (totalSections + 0.1)), totalSections);
      setCurrentSection(newSection);

      const { current: refs } = threeRefs;
      const totalProgress = progress * totalSections;
      const sectionProgress = totalProgress % 1;
      
      const cameraPositions = [
        { x: 0, y: 30, z: 300 },    // HORIZON
        { x: 0, y: 40, z: -50 },     // COSMOS
        { x: 0, y: 50, z: -700 }      // INFINITY
      ];
      
      const currentPos = cameraPositions[newSection] || cameraPositions[0];
      const nextPos = cameraPositions[newSection + 1] || currentPos;
      
      refs.targetCameraX = currentPos.x + (nextPos.x - currentPos.x) * sectionProgress;
      refs.targetCameraY = currentPos.y + (nextPos.y - currentPos.y) * sectionProgress;
      refs.targetCameraZ = currentPos.z + (nextPos.z - currentPos.z) * sectionProgress;

      refs.mountains.forEach((mountain, i) => {
        const speed = 1 + i * 0.9;
        const baseZ = refs.locations[i] || -50;
        const targetZ = baseZ + scrollY * speed * 0.5;
        
        if (progress > 0.7) mountain.position.z = 600000;
        else mountain.position.z = targetZ;
      });
      if(refs.nebula && refs.mountains[3]) refs.nebula.position.z = refs.mountains[3].position.z;
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const splitTitle = (text) => {
    return text.split('').map((char, i) => (
      <span key={i} className="title-char opacity-0 translate-y-8">
        {char}
      </span>
    ));
  };

  useEffect(() => {
    // GSAP text animation on mount
    const ctx = gsap.context(() => {
      const tl = gsap.timeline();
      
      tl.to('.title-char', {
        y: 0,
        opacity: 1,
        rotateX: 0,
        duration: 1.2,
        stagger: 0.05,
        ease: 'power4.out',
        delay: 0.2
      })
      .fromTo('.subtitle-line', 
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 1, stagger: 0.2, ease: 'power3.out' },
        "-=0.8"
      )
      .fromTo('.hero-content button',
        { opacity: 0, scale: 0.8 },
        { opacity: 1, scale: 1, duration: 0.8, ease: 'back.out(1.5)' },
        "-=0.5"
      );
    }, containerRef);
    
    return () => ctx.revert(); // Cleanup GSAP animations on unmount
  }, [currentSection]);

  return (
    <div ref={containerRef} className="hero-container cosmos-style">
      <canvas ref={canvasRef} className="hero-canvas" />
      
      {/* Side menu linked to Sidebar */}
      <div 
        ref={menuRef} 
        className="side-menu" 
        style={{ 
            display: isSidebarOpen ? 'none' : 'flex' 
        }}
        onClick={onMenuClick}
      >
        <div className="menu-icon">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <div className="vertical-text">SPACE</div>
      </div>

      {/* Main content - Fixed in center */}
      <div className="hero-content cosmos-content" style={{ opacity: currentSection === 0 ? 1 : 0, transition: 'opacity 0.8s ease-in-out' }}>
        <h1 className="hero-title">{splitTitle(t('heroTitle'))}</h1>
        <div className="hero-subtitle cosmos-subtitle">
          <p className="subtitle-line">{t('heroSubtitle1')}</p>
          <p className="subtitle-line">{t('heroSubtitle2')}</p>
          <button 
            className="mt-12 px-10 py-4 bg-white text-black font-extrabold rounded-full hover:bg-red-500 hover:text-white transition-all transform hover:scale-105 active:scale-95 shadow-2xl pointer-events-auto cursor-pointer"
            onClick={onGetStarted}
            style={{ pointerEvents: 'auto', zIndex: 50 }}
          >
            {t('heroGetStarted')}
          </button>
        </div>
      </div>

      {/* Scroll indicator */}
      <div ref={scrollProgressRef} className="scroll-progress" style={{ display: isSidebarOpen ? 'none' : 'flex' }}>
        <div className="scroll-text">SCROLL</div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${scrollProgress * 100}%` }} />
        </div>
        <div className="section-counter">
          {String(currentSection).padStart(2, '0')} / {String(totalSections).padStart(2, '0')}
        </div>
      </div>

      {/* Additional sections for scrolling */}
      <div className="scroll-sections">
       {[...Array(totalSections + 1)].map((_, i) => {
          if (i === 0) return <section key={i} className="content-section h-screen" />; // Main is already handled
          const titles = { 1: t('heroAIDriven'), 2: t('heroSafeRoads') };
          const subtitles = {
            1: { line1: t('heroMonitoring'), line2: t('heroRisks') },
            2: { line1: t('heroBridging'), line2: t('heroEngineering') }
          };
          
          return (
            <section key={i} className="content-section" style={{ opacity: i === currentSection ? 1 : 0, transition: 'opacity 0.8s ease-in-out' }}>
              <div className="section-inner px-6">
                <h1 className="hero-title">{splitTitle(titles[i])}</h1>
                <div className="hero-subtitle cosmos-subtitle">
                  <p className="subtitle-line">{subtitles[i].line1}</p>
                  <p className="subtitle-line">{subtitles[i].line2}</p>
                  <button 
                    className="mt-12 px-10 py-4 bg-white text-black font-extrabold rounded-full hover:bg-red-500 hover:text-white transition-all transform hover:scale-105 active:scale-95 shadow-2xl pointer-events-auto cursor-pointer"
                    onClick={onGetStarted}
                  >
                    {t('heroEnterHub')}
                  </button>
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};

export default HeroSection;
