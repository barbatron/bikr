// World features:

import { Movement, Presence, TurnOptions } from "../types.ts";

export type MovementRequest = { presence: Presence; movement: Movement };
export type MovementResult = {
  movementActual: Movement;
  presence: Presence;
  turnOptions: TurnOptions;
} | null;

export interface World {
  handleMovement: (movementRequest: MovementRequest) => Promise<MovementResult>;
}
