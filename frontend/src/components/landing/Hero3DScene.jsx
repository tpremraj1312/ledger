import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float, Sphere, MeshDistortMaterial, Grid } from '@react-three/drei';

const Hero3DScene = () => {
    const meshRef = useRef();

    // Subtle rotation of the main abstract object
    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.x = state.clock.getElapsedTime() * 0.1;
            meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.15;
        }
    });

    return (
        <>
            <ambientLight intensity={0.5} color="#ffffff" />
            <directionalLight position={[10, 10, 5]} intensity={1.5} color="#3b82f6" />
            <directionalLight position={[-10, -10, -5]} intensity={1} color="#7c3aed" />
            <pointLight position={[0, -5, 5]} intensity={2} color="#ffffff" />

            {/* 3D Animated Grid Floor */}
            <Float speed={1} floatIntensity={0.2} floatingRange={[-0.1, 0.1]}>
                <Grid
                    position={[0, -2.5, 0]}
                    args={[30, 30]}
                    cellSize={1}
                    cellThickness={1}
                    cellColor="#3b82f6"
                    sectionSize={5}
                    sectionThickness={1.5}
                    sectionColor="#7c3aed"
                    fadeDistance={25}
                    fadeStrength={1}
                />
            </Float>

            <Float
                speed={2}
                rotationIntensity={0.5}
                floatIntensity={1}
                floatingRange={[-0.5, 0.5]}
            >
                <Sphere ref={meshRef} args={[1.5, 64, 64]} position={[0, 0, 0]}>
                    <MeshDistortMaterial
                        color="#f8fafc"
                        attach="material"
                        distort={0.4}
                        speed={2}
                        roughness={0.1}
                        metalness={0.5}
                        envMapIntensity={1}
                        wireframe={false}
                        transparent={true}
                        opacity={0.9}
                    />
                </Sphere>
            </Float>

            {/* Decorative floating rings representing financial orbits */}
            <Float speed={1.5} rotationIntensity={1} floatIntensity={0.5}>
                <mesh position={[2, -1, -2]}>
                    <torusGeometry args={[1, 0.04, 16, 100]} />
                    <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={0.8} />
                </mesh>
            </Float>

            <Float speed={1} rotationIntensity={0.8} floatIntensity={0.8}>
                <mesh position={[-2.5, 1.5, -3]}>
                    <torusGeometry args={[1.5, 0.03, 16, 100]} />
                    <meshStandardMaterial color="#7c3aed" emissive="#7c3aed" emissiveIntensity={0.6} />
                </mesh>
            </Float>
        </>
    );
};

export default Hero3DScene;
