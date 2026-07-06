import { SphereGeometry, TruncatedConeGeometry } from '@luma.gl/engine'

// Procedural "map pin" built from two primitives: a tapering stem whose
// point touches the ground, topped with a sphere "head" — no external
// 3D model file needed.
export const PIN_CONE_HEIGHT = 45
export const PIN_CONE_TOP_RADIUS = 15
export const PIN_SPHERE_RADIUS = 20
export const PIN_SPHERE_Z = PIN_CONE_HEIGHT + PIN_SPHERE_RADIUS * 0.5
export const PIN_TOTAL_HEIGHT = PIN_SPHERE_Z + PIN_SPHERE_RADIUS

export const pinStemMesh = new TruncatedConeGeometry({
  topRadius: PIN_CONE_TOP_RADIUS,
  bottomRadius: 0,
  height: PIN_CONE_HEIGHT,
  verticalAxis: 'z',
  topCap: true,
  bottomCap: false,
  nradial: 24,
})

export const pinHeadMesh = new SphereGeometry({
  radius: PIN_SPHERE_RADIUS,
  nlat: 16,
  nlong: 16,
})

// Both meshes are authored centered at their local origin along z in
// [-height/2, height/2] (stem) or [-radius, radius] (sphere); shift every
// instance up so the stem's point sits at z=0 (the ground).
export const PIN_STEM_TRANSLATION: [number, number, number] = [0, 0, PIN_CONE_HEIGHT / 2]
export function pinHeadTranslation(): [number, number, number] {
  return [0, 0, PIN_SPHERE_Z]
}
