import React, { useEffect, useRef } from 'react';

export default function BackgroundShader() {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function syncSize() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    }
    window.addEventListener('resize', syncSize);
    syncSize();

    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return;

    const vs = `attribute vec2 a_position;
varying vec2 v_texCoord;
void main() {
  v_texCoord = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;
    const fs = `precision highp float;
varying vec2 v_texCoord;
uniform float u_time;
uniform vec2 u_resolution;

float noise(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
    // ---- Rotate the whole frame 90 degrees (portrait -> landscape) ----
    vec2 uv = vec2(v_texCoord.y, 1.0 - v_texCoord.x);

    // Background split: White (left) -> Scattered (middle) -> Black (right)
    float x = uv.x;
    
    // Base color
    vec3 color = vec3(0.0);
    
    // Create the scattered stripe effect in the middle (0.3 to 0.7)
    float scatter = 0.0;
    if (x > 0.2 && x < 0.8) {
        float stripeWidth = 0.02;
        float stripePos = mod(x * 10.0 + u_time * 0.1, 1.0);
        float n = noise(vec2(floor(uv.x * 20.0), floor(uv.y * 10.0 + u_time * 0.05)));
        
        if (n > 0.6) {
            scatter = step(0.5, mod(uv.y * 50.0 + n * 10.0, 1.0));
        }
    }
    
    // Smooth transitions
    float leftSide = 1.0 - smoothstep(0.3, 0.4, x);
    float rightSide = smoothstep(0.6, 0.7, x);
    
    color = mix(vec3(1.0), vec3(0.0), smoothstep(0.3, 0.7, x));
    
    // Add the scattered stripes
    color = mix(color, vec3(1.0 - color.r), scatter * smoothstep(0.2, 0.3, x) * (1.0 - smoothstep(0.7, 0.8, x)));
    
    // Tint slightly to fit the dark grey LAWSEARCHER theme
    color = mix(color, vec3(0.02, 0.02, 0.03), 0.7); // Darken the overall output

    gl_FragColor = vec4(color, 1.0);
}`;
    function cs(type, src) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    }
    const prog = gl.createProgram();
    gl.attachShader(prog, cs(gl.VERTEX_SHADER, vs));
    gl.attachShader(prog, cs(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog);
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
    const pos = gl.getAttribLocation(prog, 'a_position');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
    const uTime = gl.getUniformLocation(prog, 'u_time');
    const uRes = gl.getUniformLocation(prog, 'u_resolution');

    function render(t) {
      gl.viewport(0, 0, canvas.width, canvas.height);
      if (uTime) gl.uniform1f(uTime, t * 0.001);
      if (uRes) gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      animationRef.current = requestAnimationFrame(render);
    }
    animationRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', syncSize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', zIndex: -1, pointerEvents: 'none' }}>
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
      {/* Overlay to ensure readability */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(6,6,8,0.7)', pointerEvents: 'none' }} />
    </div>
  );
}
