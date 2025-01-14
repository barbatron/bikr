# BIKR Concepts

## Mode of Transportation (MoT)

The mode of transportation translates user activity events into movement
requests.

- MoT: Bike trainer
  - v1.0+
    - Combines `cadence` and `gear` metrics into `speed` in the current Presence
      direction.
  - v2.0+
    - May use physical properties of the trainer e.g. `weight` and `wheelSize`,
      and combine with Presence `incline` to emit requests to change trainer
      gear.

## Presence

Represents current position and orientation in a world.

Real-time events from user activities (UI input, trainer metrics) combine into
movement, which updates the current position and possibly orientation.

## World

A World encapsulates a trip's coordinate system. A World may represent domains
such as planet Earth, or some arbitrary synthetic game world e.g. Doom 2 or Eve
Online, why not.

- Creates initial Presence based on user input
- Provides Movement middleware compatible with its domain

### EarthWorld

- Two-dimensional mode
  - Presence components
    - Position is `latitude`, `longitude`
      - Position yields `elevation`
      - Position + orientation + average speed yields an average `incline`
    - Orientation is `direction` (degrees)
- Three-dimensional mode
  - Presence components
    - Position is `latitude`, `longitude`, `elevation`
    - Orientation is `yaw` (=`direction`), `pitch`, `roll`
- External Map API provides information used for handling movement.

## Trip

A trip is a real-time event stream combining trainer metrics, world features and
user input, feeding back Presence updates.

- Static state
  - User
  - World
  - Start time
- Dynamic state
  - Trip duration
  - Presence

## Trip modes

Trip modes may be implemented through composition of Movement middleware,
implemented by the World.

## Free-roam trips

- Initialized with Presence
- Relies on world features such as road directions and user "turn signals" for
  determining how forks and crossings effect current direction.

## Pre-planned trips

- Initialized with a Route
- Route provides initial Presence
- Movements Route determines orientation
