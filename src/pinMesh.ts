import { CylinderGeometry } from '@luma.gl/engine'

// Procedural "disc marker" built from two primitives: a thin pole planted in
// the ground, topped with a flat coin-like disc — echoes the round shape of
// an actual manhole cover. No external 3D model file needed.
export const PIN_POLE_HEIGHT = 45
export const PIN_DISC_RADIUS = 24
export const PIN_DISC_HEIGHT = 7
export const PIN_DISC_Z = PIN_POLE_HEIGHT + PIN_DISC_HEIGHT / 2
export const PIN_TOTAL_HEIGHT = PIN_DISC_Z + PIN_DISC_HEIGHT / 2

export const pinStemMesh = new CylinderGeometry({
  radius: 4,
  height: PIN_POLE_HEIGHT,
  verticalAxis: 'z',
  topCap: true,
  bottomCap: false,
  nradial: 16,
})

export const pinHeadMesh = new CylinderGeometry({
  radius: PIN_DISC_RADIUS,
  height: PIN_DISC_HEIGHT,
  verticalAxis: 'z',
  topCap: true,
  bottomCap: true,
  nradial: 32,
})

// Both meshes are authored centered at their local origin along z in
// [-height/2, height/2]; shift every instance up so the pole's base sits at
// z=0 (the ground).
export const PIN_STEM_TRANSLATION: [number, number, number] = [0, 0, PIN_POLE_HEIGHT / 2]
export function pinHeadTranslation(): [number, number, number] {
  return [0, 0, PIN_DISC_Z]
}
