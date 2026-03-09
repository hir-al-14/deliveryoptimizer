import { Location, Load } from "./common.types"

export type VehicleInput = {
  id: number
  vehicleType: string
  driverName: string
  startLocation: Location
  endLocation?: Location
  capacity: Load
  timeWindow?: [number, number]
}

export type Vehicle = {
  id: number
  start: [number, number]
  end?: [number, number]
  capacity: number[]
  timeWindow?: [number, number]
}