"use client";

import React, { Suspense, ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Stage } from '@react-three/drei';
import { resolveAssetUrl, isBackendAssetUrl } from '@/lib/api';

interface ModelProps {
  url: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message?: string;
}

class ModelErrorBoundary extends React.Component<{ fallback: ReactNode; children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { fallback: ReactNode; children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

function Model({ url }: ModelProps) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
}

export default function Product3DViewer({ modelUrl }: { modelUrl: string }) {
  const resolvedUrl = resolveAssetUrl(modelUrl);
  const canRenderModel = modelUrl && isBackendAssetUrl(resolvedUrl);

  if (!canRenderModel) {
    return (
      <div className="w-full h-[400px] md:h-[500px] bg-gray-50 rounded-md border border-gray-100 p-6 text-center text-sm text-gray-500">
        3D preview unavailable for this model. Please use the product images instead.
      </div>
    );
  }

  return (
    <div className="w-full h-[400px] md:h-[500px] bg-gray-50 rounded-md overflow-hidden border border-gray-100">
      <Canvas shadows camera={{ position: [0, 0, 150], fov: 40 }}>
        <Suspense
          fallback={
            <mesh>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color="#999" />
            </mesh>
          }
        >
          <ModelErrorBoundary
            fallback={
              <group>
                <mesh>
                  <boxGeometry args={[80, 80, 2]} />
                  <meshStandardMaterial color="#f3f4f6" />
                </mesh>
              </group>
            }
          >
            <Stage environment="city" intensity={0.6}>
              <Model url={resolvedUrl} />
            </Stage>
          </ModelErrorBoundary>
        </Suspense>
        <OrbitControls autoRotate enableZoom={true} />
      </Canvas>
    </div>
  );
}
