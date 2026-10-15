export function edgeSpeed(clientY: number, top: number, bottom: number): number {
  if (clientY >= top && clientY < top + 40) {
    const distance = clientY - top
    return -Math.ceil(((40 - distance) / 40) * 18)
  }
  if (clientY <= bottom && clientY > bottom - 40) {
    const distance = bottom - clientY
    return Math.ceil(((40 - distance) / 40) * 18)
  }
  return 0
}
