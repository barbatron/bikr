# BIKR Client / Server responsibilities

## Server

- Maintains user's trip state
  - Consumes real-time event streams
    - Trainer bikes provide cadence, gear, and physical properties e.g. weight
      and wheel size, used to compute speed based on time deltas.
    - User input e.g. turn signals when free-roaming.
  - Uses World to update Presence, based on current Presence.
- Feeds

## Client

- Requests server-side trip initialization
  - Free-roam trip
    - Initial location & direction
  - Trainer device physical properties
- Renders active trip state based on world presence:
  - Street view
  - Map
