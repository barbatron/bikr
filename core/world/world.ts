// World features:

import { Movement, Presence, TurnOptions } from "../types.ts";

// TODO: handleMovement:
// GIVEN
// * Presence [position, direction]
// * Movement [distance, direction]

// RETURNS
// * New Presence [position, direction]
// * Movement Actual [distance, direction]
// * List of Turn options to be displayed as turn options to the user

export type MovementRequest = { presence: Presence; movement: Movement };
export type MovementResult = {
  movementActual: Movement;
  presence: Presence;
  turnOptions: TurnOptions;
} | null;

export interface World {
  handleMovement: (movementRequest: MovementRequest) => Promise<MovementResult>;
}
