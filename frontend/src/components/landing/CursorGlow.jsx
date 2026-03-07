import React, { useEffect, useState } from 'react';

const CursorGlow = () => {
    const [pos, setPos] = useState({ x: 0, y: 0 });
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const move = (e) => {
            setPos({ x: e.clientX, y: e.clientY });
            setVisible(true);
        };
        const leave = () => setVisible(false);
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseleave', leave);
        return () => {
            window.removeEventListener('mousemove', move);
            window.removeEventListener('mouseleave', leave);
        };
    }, []);

    if (!visible) return null;

    return (
        <div
            className="pointer-events-none fixed z-[9999] rounded-full mix-blend-screen"
            style={{
                left: pos.x - 200,
                top: pos.y - 200,
                width: 400,
                height: 400,
                background: 'radial-gradient(circle, rgba(37,99,235,0.06) 0%, rgba(37,99,235,0.02) 40%, transparent 70%)',
                transition: 'left 0.15s ease-out, top 0.15s ease-out',
            }}
        />
    );
};

export default CursorGlow;
