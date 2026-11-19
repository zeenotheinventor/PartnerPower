# UI kit

- **Role and name for the screen shell** (FRK-4): The shell is a layout container with no role or name of its own. A label on a container that is not an accessibility element does nothing on iOS. The "role and name" criterion is applied to components that mean something by themselves.
- **Depth edge** (FRK-4): Built from layered views in token colours. Token-coloured shadows do not exist.
- **Settings screen captions** (FRK-26): The kit `Toggle` has an optional `description`, drawn under the label and given as the switch's accessibility hint. The settings rows use it.
