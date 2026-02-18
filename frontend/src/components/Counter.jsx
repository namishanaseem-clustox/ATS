import React, { useState, useEffect } from 'react';

const Counter = ({ end, duration = 1500, className }) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
        let startTime;
        let animationFrame;

        const animate = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const progress = timestamp - startTime;
            // Ease out function for smoother animation
            const easeOutQuart = 1 - Math.pow(1 - Math.min(progress / duration, 1), 4);

            setCount(Math.floor(end * easeOutQuart));

            if (progress < duration) {
                animationFrame = requestAnimationFrame(animate);
            }
        };

        animationFrame = requestAnimationFrame(animate);

        return () => cancelAnimationFrame(animationFrame);
    }, [end, duration]);

    return <span className={className}>{count}</span>;
};

export default Counter;
