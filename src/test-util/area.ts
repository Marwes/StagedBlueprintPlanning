import { BBox } from "../lib/geometry"
import { WorldArea } from "../utils/world-location"

export function testArea(index: number): WorldArea {
  return {
    surface: game.surfaces[1],
    bbox: BBox.coords(2 + index * 100, 2, 102 + index * 100, 102),
  }
}

export function clearTestArea(index: number = 0): WorldArea {
  const area = testArea(index)
  area.surface.find_entities_filtered({ area: area.bbox }).forEach((e) => e.destroy())
  return area
}
