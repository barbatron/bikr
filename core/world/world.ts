// World features:

import { Observable } from "npm:rxjs";
import { Movement, Presence } from "../types.ts";

export type MovementRequest = Movement;

export type MovementResult = {
  movementActual: Movement;
  presence: Presence;
} | null;

export interface World<TPresence extends Presence> {
  handleMovement: (
    movementRequest: MovementRequest,
  ) => void | Promise<MovementResult | void>;
  createPresence: () => Observable<TPresence>;
}
