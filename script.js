// Tab switching functionality
document.addEventListener('DOMContentLoaded', function() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');

            // Remove active class from all buttons and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // Add active class to clicked button and corresponding content
            button.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
            
            // Show/hide leaves based on active tab
            const leavesContainer = document.getElementById('interactive-leaves');
            if (leavesContainer) {
                if (targetTab === 'about') {
                    leavesContainer.style.display = 'block';
                } else {
                    leavesContainer.style.display = 'none';
                }
            }
            
            // Trigger scroll animations when switching tabs
            setTimeout(() => {
                observeElements();
            }, 100);
        });
    });

    // Initialize globe (if exists)
    initGlobe();
    
    // Initialize falling interactive leaves
    initFallingLeaves();
    
    // Initialize scroll animations
    observeElements();
});

// Scroll animations
function observeElements() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    document.querySelectorAll('.timeline-item, .research-card').forEach(el => {
        observer.observe(el);
    });
}

// Continuously Falling Interactive Leaves
function initFallingLeaves() {
    const container = document.getElementById('interactive-leaves');
    if (!container) return;

    // Leaf images - preload to prevent stuttering
    const leafImages = [
        { name: 'yellow', src: 'yellowleaf.avif' }
    ];
    
    // Preload images to prevent stuttering
    leafImages.forEach(leafData => {
        const preloadImg = new Image();
        preloadImg.src = leafData.src;
    });

    const leaves = [];
    let leafIdCounter = 0;

    // Create a new leaf
    function createLeaf() {
        const leafData = leafImages[Math.floor(Math.random() * leafImages.length)];
        const size = Math.random() * 25 + 35; // 35-60px (smaller)
        
        // Spawn only on left (0-20%) or right (80-100%) sides
        const spawnOnLeft = Math.random() < 0.5;
        const x = spawnOnLeft 
            ? Math.random() * (window.innerWidth * 0.2) 
            : window.innerWidth * 0.8 + Math.random() * (window.innerWidth * 0.2 - size);
        
        const leaf = {
            id: leafIdCounter++,
            element: null,
            x: x,
            y: -size - 50, // Start above screen
            size: size,
            imageSrc: leafData.src,
            rotation: Math.random() * 360,
            vx: (Math.random() - 0.5) * 0.5, // Horizontal drift (even slower for smoothness)
            vy: Math.random() * 0.4 + 0.6, // Falling speed (0.6-1.0px per frame - smoother)
            rotationSpeed: (Math.random() - 0.5) * 1.0, // Slower rotation for smoothness
            isDragging: false,
            isHovering: false,
            dragOffsetX: 0,
            dragOffsetY: 0,
            releaseTime: 0,
            hoverDuration: 0,
            hasBeenDragged: false, // Track if leaf has been moved
            // Add smoothing variables
            targetVx: 0,
            targetVy: 0,
            smoothFactor: 0.15
        };
        
        leaves.push(leaf);
        createLeafElement(leaf, container);
        return leaf;
    }

    // Create leaf DOM element
    function createLeafElement(leaf, container) {
        const leafEl = document.createElement('div');
        leafEl.className = 'interactive-leaf';
        leafEl.style.width = leaf.size + 'px';
        leafEl.style.height = leaf.size + 'px';
        leafEl.style.transform = `translate3d(${leaf.x}px, ${leaf.y}px, 0) rotate(${leaf.rotation}deg)`;
        leafEl.dataset.leafId = leaf.id;
        
        // Create image element with optimizations for smooth rendering
        const img = document.createElement('img');
        img.src = leaf.imageSrc;
        img.alt = 'falling leaf';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'contain';
        img.style.pointerEvents = 'none';
        img.draggable = false;
        img.loading = 'eager';
        img.decoding = 'async'; // Smooth image decoding
        
        leafEl.appendChild(img);
        
        leaf.element = leafEl;
        container.appendChild(leafEl);
        
        // Add interaction handlers
        addLeafInteraction(leaf);
    }

    // Add drag and throw physics
    function addLeafInteraction(leaf) {
        const el = leaf.element;
        let lastX = 0, lastY = 0, lastTime = 0;
        
        function startDrag(e) {
            // Only allow dragging once
            if (leaf.hasBeenDragged) {
                return;
            }
            
            leaf.isDragging = true;
            leaf.isHovering = false; // Reset hover state
            leaf.hoverDuration = 0; // Reset hover duration
            el.classList.add('dragging');
            
            const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
            const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
            
            leaf.dragOffsetX = clientX - leaf.x;
            leaf.dragOffsetY = clientY - leaf.y;
            
            // Store velocity history
            lastX = clientX;
            lastY = clientY;
            lastTime = Date.now();
            
            e.preventDefault();
        }
        
        function drag(e) {
            if (!leaf.isDragging) return;
            
            const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
            const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
            
            leaf.x = clientX - leaf.dragOffsetX;
            leaf.y = clientY - leaf.dragOffsetY;
            
            // Calculate velocity for throwing
            const now = Date.now();
            const dt = Math.max(now - lastTime, 1);
            leaf.vx = (clientX - lastX) / dt * 15;
            leaf.vy = (clientY - lastY) / dt * 15;
            
            lastX = clientX;
            lastY = clientY;
            lastTime = now;
            
            updateLeafPosition(leaf);
            e.preventDefault();
        }
        
        function endDrag(e) {
            if (!leaf.isDragging) return;
            
            leaf.isDragging = false;
            leaf.hasBeenDragged = true; // Mark as used
            leaf.releaseTime = performance.now();
            
            // Enable hovering effect after drag
            leaf.isHovering = true;
            leaf.hoverDuration = 800; // Hover for 800ms before falling
            
            el.classList.remove('dragging');
            el.style.cursor = 'default'; // Change cursor to indicate it can't be moved again
            el.style.opacity = '0.7'; // Slightly fade to show it's been used
            
            e.preventDefault();
        }
        
        // Mouse events
        el.addEventListener('mousedown', startDrag);
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', endDrag);
        
        // Touch events
        el.addEventListener('touchstart', startDrag, { passive: false });
        document.addEventListener('touchmove', drag, { passive: false });
        document.addEventListener('touchend', endDrag);
    }

    // Update leaf position with hardware acceleration
    function updateLeafPosition(leaf) {
        if (!leaf.element) return;
        // Use translate3d for hardware acceleration and smoother rendering
        leaf.element.style.transform = `translate3d(${leaf.x}px, ${leaf.y}px, 0) rotate(${leaf.rotation}deg)`;
    }

    // Remove leaf
    function removeLeaf(leaf) {
        if (leaf.element && leaf.element.parentNode) {
            leaf.element.remove();
        }
        const index = leaves.indexOf(leaf);
        if (index > -1) {
            leaves.splice(index, 1);
        }
    }

    // Physics and animation loop with delta time for smooth motion
    let lastTime = performance.now();
    
    function animate(currentTime) {
        // Calculate delta time for frame-independent movement
        const deltaTime = Math.min((currentTime - lastTime) / 16.67, 2); // Cap at 2x for lag spikes
        lastTime = currentTime;
        
        // Update all leaves
        for (let i = leaves.length - 1; i >= 0; i--) {
            const leaf = leaves[i];
            
            if (leaf.isDragging) continue;
            
            const timeNow = currentTime * 0.001; // Convert to seconds
            
            // Handle hovering state after drag release
            if (leaf.isHovering) {
                const timeSinceRelease = currentTime - leaf.releaseTime;
                
                if (timeSinceRelease < leaf.hoverDuration) {
                    // Hovering phase - smooth slowdown
                    leaf.vx *= Math.pow(0.90, deltaTime);
                    leaf.vy *= Math.pow(0.85, deltaTime);
                    
                    // Add slight upward drift for realistic hovering
                    leaf.vy -= 0.15 * deltaTime;
                    
                    // Very smooth floating motion using sine waves
                    const floatX = Math.sin(timeNow * 2 + leaf.id) * 0.4;
                    const floatY = Math.cos(timeNow * 1.5 + leaf.id) * 0.25;
                    
                    leaf.x += (floatX + leaf.vx) * deltaTime;
                    leaf.y += (floatY + leaf.vy) * deltaTime;
                    
                    // Smooth rotation during hover
                    leaf.rotation += leaf.rotationSpeed * 0.3 * deltaTime;
                } else {
                    // End hovering, transition to falling
                    leaf.isHovering = false;
                }
            } else {
                // Smooth natural falling physics
                const timeSinceRelease = currentTime - leaf.releaseTime;
                
                // Apply gentle air resistance for smooth motion
                leaf.vx *= Math.pow(0.985, deltaTime);
                leaf.vy *= Math.pow(0.992, deltaTime);
                
                if (timeSinceRelease > 1000) {
                    // Natural falling with gentle sway
                    const swayForce = Math.sin(timeNow * 0.8 + leaf.id) * 0.02;
                    leaf.vx += swayForce * deltaTime;
                    
                    // Maintain minimum fall speed
                    if (leaf.vy < 0.6) {
                        leaf.vy += 0.03 * deltaTime;
                    }
                    
                    // Cap fall speed for smoothness
                    leaf.vy = Math.min(leaf.vy, 1.0);
                } else {
                    // Smooth gravity transition after throw
                    leaf.vy += 0.15 * deltaTime;
                }
                
                // Apply smooth velocity with gentle horizontal sway
                const gentleSway = Math.sin(timeNow * 0.6 + leaf.id) * 0.2;
                leaf.x += (leaf.vx + gentleSway) * deltaTime;
                leaf.y += leaf.vy * deltaTime;
                
                // Very smooth rotation
                leaf.rotation += leaf.rotationSpeed * deltaTime;
            }
            
            // Smooth bounce off side walls
            if (leaf.x < 0) {
                leaf.x = 0;
                leaf.vx = Math.abs(leaf.vx) * 0.3;
            }
            if (leaf.x > window.innerWidth - leaf.size) {
                leaf.x = window.innerWidth - leaf.size;
                leaf.vx = -Math.abs(leaf.vx) * 0.3;
            }
            
            // Remove if off screen (bottom)
            if (leaf.y > window.innerHeight + 100) {
                removeLeaf(leaf);
                continue;
            }
            
            // Remove if too far left or right
            if (leaf.x < -200 || leaf.x > window.innerWidth + 200) {
                removeLeaf(leaf);
                continue;
            }
            
            updateLeafPosition(leaf);
        }
        
        requestAnimationFrame(animate);
    }

    // Spawn leaves continuously
    function spawnLeaf() {
        createLeaf();
        
        // Random interval between spawns (4000-8000ms) - much less frequent
        setTimeout(spawnLeaf, Math.random() * 4000 + 4000);
    }

    // Start the system
    animate(performance.now());
    
    // Delay before starting spawning - wait 3 seconds after page load
    setTimeout(() => {
        spawnLeaf();
    }, 3000);
    
    // Create initial batch with delay - only 2 leaves, starting after 3 seconds
    for (let i = 0; i < 2; i++) {
        setTimeout(() => createLeaf(), 3000 + (i * 2000)); // First at 3s, second at 5s
    }
}

// Interactive Globe using Three.js (kept if exists)
function initGlobe() {
    const canvas = document.getElementById('globe');
    if (!canvas) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ 
        canvas: canvas, 
        alpha: true,
        antialias: true 
    });

    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    const geometry = new THREE.SphereGeometry(1, 64, 64);
    
    const vertexShader = `
        varying vec3 vWorldPosition;
        void main() {
            vec4 worldPosition = modelMatrix * vec4(position, 1.0);
            vWorldPosition = worldPosition.xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `;
    
    const fragmentShader = `
        uniform vec3 oceanColor;
        uniform vec3 landColor1;
        uniform vec3 landColor2;
        uniform vec3 landColor3;
        uniform float time;
        varying vec3 vWorldPosition;
        
        float noise(vec2 p) {
            return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
        }
        
        float smoothNoise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            f = f * f * (3.0 - 2.0 * f);
            
            float a = noise(i);
            float b = noise(i + vec2(1.0, 0.0));
            float c = noise(i + vec2(0.0, 1.0));
            float d = noise(i + vec2(1.0, 1.0));
            
            return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }
        
        float fbm(vec2 p) {
            float value = 0.0;
            float amplitude = 0.5;
            for (int i = 0; i < 4; i++) {
                value += amplitude * smoothNoise(p);
                p *= 2.0;
                amplitude *= 0.5;
            }
            return value;
        }
        
        void main() {
            vec3 pos = normalize(vWorldPosition);
            float lat = asin(pos.y);
            float lon = atan(pos.z, pos.x);
            
            vec2 uv = vec2(lon / 3.14159, lat / 1.5708);
            uv = uv * 0.5 + 0.5;
            
            float continent = fbm(uv * 4.0 + vec2(time * 0.01, 0.0));
            continent += fbm(uv * 8.0) * 0.5;
            continent += fbm(uv * 16.0) * 0.25;
            
            float landMask = smoothstep(0.35, 0.5, continent);
            float iceCap = smoothstep(0.7, 0.9, abs(lat / 1.5708));
            
            vec3 color;
            if (iceCap > 0.1) {
                color = mix(landColor1, vec3(0.95, 0.98, 1.0), iceCap);
            } else if (landMask > 0.5) {
                float variation = fbm(uv * 32.0);
                if (variation > 0.6) {
                    color = landColor2;
                } else if (variation > 0.3) {
                    color = landColor1;
                } else {
                    color = landColor3;
                }
            } else {
                float depth = fbm(uv * 8.0);
                color = mix(oceanColor * 0.7, oceanColor, depth);
            }
            
            vec3 lightDir = normalize(vec3(0.5, 1.0, 0.3));
            float light = max(0.3, dot(pos, lightDir));
            
            if (landMask < 0.5) {
                float specular = pow(max(0.0, dot(reflect(-lightDir, pos), normalize(-vWorldPosition))), 32.0);
                color += vec3(0.2, 0.3, 0.4) * specular * 0.5;
            }
            
            color *= light;
            
            gl_FragColor = vec4(color, 1.0);
        }
    `;
    
    const earthMaterialShader = new THREE.ShaderMaterial({
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        uniforms: {
            oceanColor: { value: new THREE.Color(0x1E3A8A) },
            landColor1: { value: new THREE.Color(0x8B7355) },
            landColor2: { value: new THREE.Color(0x4A7C59) },
            landColor3: { value: new THREE.Color(0x5D4E37) },
            time: { value: 0.0 }
        }
    });

    const globe = new THREE.Mesh(geometry, earthMaterialShader);
    scene.add(globe);

    const wireframe = new THREE.WireframeGeometry(geometry);
    const line = new THREE.LineSegments(wireframe, new THREE.LineBasicMaterial({
        color: 0x2C5F7C,
        opacity: 0.15,
        transparent: true
    }));
    scene.add(line);
    
    const atmosphereGeometry = new THREE.SphereGeometry(1.015, 64, 64);
    const atmosphereMaterial = new THREE.MeshBasicMaterial({
        color: 0x87CEEB,
        transparent: true,
        opacity: 0.15,
        side: THREE.BackSide
    });
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    scene.add(atmosphere);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 3, 5);
    scene.add(directionalLight);

    camera.position.z = 2.5;

    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    canvas.addEventListener('mousedown', (e) => {
        isDragging = true;
        previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    canvas.addEventListener('mousemove', (e) => {
        if (isDragging) {
            const deltaX = e.clientX - previousMousePosition.x;
            const deltaY = e.clientY - previousMousePosition.y;

            globe.rotation.y += deltaX * 0.01;
            globe.rotation.x += deltaY * 0.01;
            globe.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, globe.rotation.x));
            line.rotation.y = globe.rotation.y;
            line.rotation.x = globe.rotation.x;
            atmosphere.rotation.y = globe.rotation.y * 0.98;

            previousMousePosition = { x: e.clientX, y: e.clientY };
        }
    });

    canvas.addEventListener('mouseup', () => {
        isDragging = false;
    });

    canvas.addEventListener('mouseleave', () => {
        isDragging = false;
    });

    let autoRotate = true;
    let lastTime = Date.now();

    function animate() {
        requestAnimationFrame(animate);

        const currentTime = Date.now();
        const deltaTime = currentTime - lastTime;
        lastTime = currentTime;

        earthMaterialShader.uniforms.time.value = currentTime * 0.001;

        if (autoRotate && !isDragging) {
            globe.rotation.y += 0.0003 * deltaTime;
            line.rotation.y = globe.rotation.y;
            atmosphere.rotation.y = globe.rotation.y;
        }

        atmosphere.rotation.y = globe.rotation.y * 0.98;

        renderer.render(scene, camera);
    }

    function handleResize() {
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    }

    window.addEventListener('resize', handleResize);

    animate();
}
