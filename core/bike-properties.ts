import { of } from "npm:rxjs";

export type BikeIntrinsicProperties = {
  weightKilos: number;
  wheelDiameterCm: number;
  // TODO: Gears w ratios
};

export const bikeProperties = ({
  weightKilos,
  wheelDiameterCm,
}: BikeIntrinsicProperties) => of({ weightKilos, wheelDiameterCm });
