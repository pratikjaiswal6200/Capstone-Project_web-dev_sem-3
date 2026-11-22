# Frontend phase

The campus overview opens with a photo-style aerial rendering. Map pins open landmark information. The 3D view supports orbit, pan, zoom, reset and a camera tour through five campus landmarks. Layers toggle academic, sports and access markers. Expanding the explorer keeps controls available, and Escape restores the page.

The names and general organisation of Blocks A–C, the football ground and the highway entrance were informed by K.R. Mangalam University's published campus plan. The aerial image was generated for the app. Building footprints, scale and projected map pin positions are illustrative. The WebGL model uses original procedural geometry.

- [K.R. Mangalam University student handbook and campus plan](https://www.krmangalam.edu.in/wp-content/uploads/2025/03/University-Student-Handbook_2025-Binder.pdf)
- [K.R. Mangalam University campus facilities](https://www.krmangalam.edu.in/krmu-campus-facilities)

The mobile layout collapses campus navigation into a menu. Use the account menu to switch sample roles, or connect to the Express API. The authenticated workspace receives Socket.IO invalidations and reloads records from the API. Tables and forms handle loading, validation and empty results.

Check landmark focus and reset, keyboard-accessible dialogs, student-only attendance, admin enrolment through the section roster, announcement filtering and persistence on refresh.
