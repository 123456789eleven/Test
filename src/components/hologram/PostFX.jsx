import { useEffect, useMemo } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { EffectComposer, RenderPass, UnrealBloomPass } from "three-stdlib";
import { Vector2 } from "three";

// Same bloom setup as the original (RenderPass + UnrealBloomPass, no gamma
// pass) via three-stdlib's ports of the stock three.js addons, wired into
// R3F's render loop instead of a manual requestAnimationFrame call. Passing
// a positive priority to useFrame hands R3F's own default render call over
// to us, the same way the old animate() loop called composer.render()
// instead of renderer.render().
export default function PostFX({ strength = 0.8, radius = 0.22, threshold = 0.28 }) {
  const { gl, scene, camera, size } = useThree();

  const composer = useMemo(() => new EffectComposer(gl), [gl]);
  const renderPass = useMemo(() => new RenderPass(scene, camera), [scene, camera]);
  const bloomPass = useMemo(() => new UnrealBloomPass(new Vector2(1, 1), strength, radius, threshold), [strength, radius, threshold]);

  useEffect(() => {
    composer.addPass(renderPass);
    composer.addPass(bloomPass);
    return () => {
      composer.removePass(renderPass);
      composer.removePass(bloomPass);
    };
  }, [composer, renderPass, bloomPass]);

  useEffect(() => {
    composer.setSize(size.width, size.height);
  }, [composer, size]);

  useFrame(() => {
    composer.render();
  }, 1);

  return null;
}
