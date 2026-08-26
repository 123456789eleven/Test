import { useEffect, useMemo } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { EffectComposer, RenderPass, SSAOPass, UnrealBloomPass, FilmPass, ShaderPass, VignetteShader } from "three-stdlib";
import { Vector2 } from "three";

// Round 3 of the graphics-overhaul plan: bloom was the ONLY post-processing
// pass in this scene -- no ambient occlusion, no grain, no vignette. All
// three added here via three-stdlib (already a dependency -- deliberately
// NOT adding @react-three/postprocessing alongside this hand-rolled
// composer; see the plan for the full research/tradeoff behind that call).
//
// Pass order: RenderPass -> SSAOPass -> UnrealBloomPass -> FilmPass ->
// Vignette. AO runs against the scene early, before bloom's own blur/
// brightening touches it; grain and vignette are camera-artifact
// stylization and belong last, on top of everything including bloom --
// the conventional pipeline order, not an arbitrary one. (SSAOPass renders
// the scene itself internally rather than reading RenderPass's output --
// keeping RenderPass anyway matches the official three.js SSAO example's
// own composer setup, at the cost of the scene technically rendering
// twice; flagged here as a real, known cost for the "does this hold up at
// full node density" check this round needs.)
export default function PostFX({ strength = 0.8, radius = 0.22, threshold = 0.32 }) {
  const { gl, scene, camera, size } = useThree();

  const composer = useMemo(() => new EffectComposer(gl), [gl]);
  const renderPass = useMemo(() => new RenderPass(scene, camera), [scene, camera]);

  const ssaoPass = useMemo(() => {
    const pass = new SSAOPass(scene, camera, size.width, size.height);
    // Defaults (kernelRadius 8, minDistance 0.005, maxDistance 0.1) are
    // tuned for typical unit-scale meshes; this scene's node sizes
    // (0.19-0.75) and spacing (tier1 ~6.5 units apart) run larger, so these
    // are a first real guess, not a verified value -- needs real eyes to
    // confirm AO reads as depth rather than muddying the smallest function
    // nodes.
    pass.kernelRadius = 10;
    pass.minDistance = 0.002;
    pass.maxDistance = 0.15;
    return pass;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, camera]);

  const bloomPass = useMemo(() => new UnrealBloomPass(new Vector2(1, 1), strength, radius, threshold), [strength, radius, threshold]);

  const filmPass = useMemo(() => {
    // scanlinesIntensity/scanlinesCount deliberately 0 -- Node.jsx/
    // ExternalNode.jsx's rim shader already scrolls its own per-object
    // scanline (round 1 of this plan); this pass is only for the noise/
    // grain term, so the two don't stack into a doubled-up look.
    // grayscale MUST stay false -- three-stdlib's FilmShader defaults it to
    // true, which would render this violet-toned scene in black and white.
    return new FilmPass(0.12, 0, 0, false);
  }, []);

  const vignettePass = useMemo(() => {
    const pass = new ShaderPass(VignetteShader);
    pass.uniforms.darkness.value = 0.65;
    pass.uniforms.offset.value = 1.0;
    return pass;
  }, []);

  useEffect(() => {
    composer.addPass(renderPass);
    composer.addPass(ssaoPass);
    composer.addPass(bloomPass);
    composer.addPass(filmPass);
    composer.addPass(vignettePass);
    return () => {
      composer.removePass(renderPass);
      composer.removePass(ssaoPass);
      composer.removePass(bloomPass);
      composer.removePass(filmPass);
      composer.removePass(vignettePass);
    };
  }, [composer, renderPass, ssaoPass, bloomPass, filmPass, vignettePass]);

  // EffectComposer.setSize() already iterates every pass and calls its own
  // .setSize() (confirmed by reading three-stdlib's actual source, not
  // assumed) -- so this alone resizes SSAOPass's render targets too, no
  // separate per-pass resize call needed.
  useEffect(() => {
    composer.setSize(size.width, size.height);
  }, [composer, size]);

  // FilmPass's own `time` uniform auto-increments off the deltaTime
  // EffectComposer.render() passes down its pass chain (using its internal
  // clock when called with no argument, as here) -- no manual wiring needed.
  useFrame(() => {
    composer.render();
  }, 1);

  return null;
}
