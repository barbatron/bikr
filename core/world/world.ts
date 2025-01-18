// World features:

import { Movement, Presence } from "../types.ts";

export type MovementRequest = { presence: Presence; movement: Movement };
export type MovementResult = {
  movementActual: Movement;
  presence: Presence;
} | null;

export interface World {
  handleMovement: (movementRequest: MovementRequest) => Promise<MovementResult>;
}
