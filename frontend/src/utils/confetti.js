// Simple dependency-free confetti implementation
export const triggerConfetti = () => {
    const colors = ['#00C853', '#69F0AE', '#B9F6CA', '#FFD700', '#FF4081', '#2196F3'];
    const particleCount = 100;

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');

        // Random properties
        const x = window.innerWidth / 2; // Start from center
        const y = window.innerHeight / 2;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const size = Math.random() * 8 + 4;
        const speedX = (Math.random() - 0.5) * 20; // Spread horizontal
        const speedY = (Math.random() - 1) * 20 - 5; // Spread upward initially
        const rotation = Math.random() * 360;

        // Apply styles
        particle.style.position = 'fixed';
        particle.style.left = `${x}px`;
        particle.style.top = `${y}px`;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.backgroundColor = color;
        particle.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px'; // Circles and squares
        particle.style.pointerEvents = 'none';
        particle.style.zIndex = '9999';
        particle.style.transform = `rotate(${rotation}deg)`;

        document.body.appendChild(particle);

        // Animate
        let posX = x;
        let posY = y;
        let velX = speedX;
        let velY = speedY;
        let rot = rotation;
        const gravity = 0.5;
        const friction = 0.98;

        const animate = () => {
            velX *= friction;
            velY += gravity;
            posX += velX;
            posY += velY;
            rot += 2;

            particle.style.left = `${posX}px`;
            particle.style.top = `${posY}px`;
            particle.style.transform = `rotate(${rot}deg)`;
            particle.style.opacity = Math.max(0, parseFloat(particle.style.opacity || 1) - 0.01);

            if (posY < window.innerHeight && parseFloat(particle.style.opacity || 1) > 0) {
                requestAnimationFrame(animate);
            } else {
                particle.remove();
            }
        };

        requestAnimationFrame(animate);
    }
};
