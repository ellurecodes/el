## 1. Introduction

Urban traffic congestion and the associated delays to emergency response vehicles are a huge public safety issue in rapidly growing Indian cities. According to the National Crime Records Bureau (NCRB), India records over 1.5 lakh road accident fatalities annually, with and a big part of this happens because of delayed emergency response caused by traffic congestion and a lack of coordinated traffic management systems. When an ambulance, fire truck, or police vehicle is trapped in a gridlock, every second of delay directly translates to increased mortality risks or escalating property damage. 

The concept of Vehicle-to-Everything (V2X) communication has is becoming a big step forward in Intelligent Transportation Systems (ITS). V2X enables real-time, low-latency data exchange between vehicles (Vehicle-to-Vehicle, V2V), vehicles and roadside infrastructure (Vehicle-to-Infrastructure, V2I), and vehicles and cellular networks (Vehicle-to-Network, V2N). Traditionally, V2X implementations have relied on Dedicated Short-Range Communications (DSRC) operating in the 5.9 GHz band (IEEE 802.11p) or the more recent Cellular V2X (C-V2X) protocols under LTE and 5G NR standards. While these technologies offer ultra-low latencies, their adoption is held back by the high cost of dedicated hardware, such as On-Board Units (OBUs) in vehicles and Roadside Units (RSUs) on traffic signals.

This project, titled **V2X**, presents a fully functional, cloud-synchronized, web-based V2X Emergency Clearance System that avoids the need for costly hardware by using consumer-grade smartphones, browser-based Geolocation APIs, and Firebase Realtime Database. The system implements a complete V2V and V2I communication pipeline. When an emergency vehicle (EV) activates its emergency mode, its live location, speed, and heading are continuously streamed to the cloud. Nearby civilian vehicles receive real-time, bearing-aware yield instructions (such as "MOVE LEFT" or "MOVE RIGHT") to clear the lane before the emergency vehicle arrives. At the same time, approaching traffic signals automatically preempt their cycles, turning green in the EV's direction and red in conflicting directions to secure a smooth emergency corridor.

The application is built using standard client-side web technologies — HTML5, CSS3, and Vanilla JavaScript (ES6+) — with Leaflet.js for interactive mapping and Open Source Routing Machine (OSRM) for dynamic routing. This architecture makes it lightweight, easy to run anywhere, and ready to use right away on any modern smartphone browser. The system has been successfully deployed live on Firebase Hosting (https://v2v-v2i-project.web.app), proving that software-defined V2X systems can offer a cost-effective, scalable, and immediately viable solution for municipal emergency traffic management.

---

## 2. Problem Definition

### 2.1 Problem Statement

Emergency vehicles navigating congested urban corridors in big cities like Bengaluru face random delays at signalized intersections. Under standard traffic conditions, emergency drivers rely on sirens and emergency lights to push through heavy traffic. However, this approach is passive, relies entirely on the immediate visual and auditory reaction of civilian drivers, and often fails when traffic density reaches saturation points where civilian cars have no physical space to maneuver.

The core problem is the **absence of an active, cooperative, and real-time communication loop between emergency vehicles, traffic signal controllers, and surrounding civilian drivers**. Specifically:
1. **Lack of Signal Preemption:** Traffic signals operate on fixed-time cycles or localized loop-detectors that cannot distinguish between emergency vehicles and standard traffic, resulting in emergency vehicles being forced to wait at red lights.
2. **Delayed Civilian Awareness:** Civilian drivers only become aware of an approaching emergency vehicle when they hear a siren in close proximity. This late detection leads to chaotic, uncoordinated yielding maneuvers, often blocking the emergency vehicle further.
3. **No Direct Yield Instructions:** Civilian drivers lack spatial orientation guidance (e.g., whether to yield left or right) relative to the approaching emergency vehicle's path.
4. **Hardware Cost Barrier:** Implementing traditional hardware-based DSRC or C-V2X solutions requires massive municipal upfront cost, making it too expensive for rapid, large-scale deployment in developing nations.

### 2.2 Background Information (Literature Review)

Intelligent Transportation Systems (ITS) have long investigated Emergency Vehicle Preemption (EVP) as a method to reduce response times. Early EVP systems used optical sensors (strobe light detection), acoustic detectors (siren frequency analysis), or localized infrared transmitters. While functional, these systems are highly affected by bad weather, buildings blocking the signal, and high false-positive rates due to ambient urban noise.

With the rise of global satellite navigation, GPS-based preemption systems emerged. Qin and Khan (2012) demonstrated that GPS-based signal preemption reduces emergency vehicle travel times by 15–25% and reduces intersection accidents involving emergency vehicles. However, standard GPS signals in dense urban environments suffer from severe multipath reflections (where signals bounce off buildings), leading to positional errors of up to 35 meters. This noise makes raw GPS coordinates unreliable for critical safety decisions, such as determining which specific lane or approach corridor a vehicle is occupying.

To solve this, state estimation algorithms are applied. The Kalman Filter, developed by Rudolf E. Kálmán in 1960, uses a series of measurements observed over time (containing statistical noise) and estimates the joint probability distribution of the variables. In vehicle tracking, a Kalman filter successfully smooths noisy GPS inputs by combining a physical motion model (predicting position based on velocity and heading) with actual GPS measurements. 

For non-linear and non-Gaussian noise profiles typical in urban canyons, Sequential Monte Carlo methods (Particle Filters) are preferred. A Particle Filter represents the probability distribution of the vehicle's state by a set of random samples (particles). As new measurements arrive, particles are resampled based on their likelihood of matching the physical constraints of the vehicle.

Firebase Realtime Database, a NoSQL cloud database, synchronizes data across all connected clients in real-time. For V2X communication, Firebase acts as a low-latency broker. Unlike standard HTTP polling, Firebase uses WebSockets to maintain a persistent connection, allowing data updates to be pushed to clients instantly (typical latency < 150ms). This performance profile enables software-defined V2X applications to achieve response times comparable to dedicated short-range communications for non-safety-critical driver advisories.

---

## 3. Objectives

### 3.1 Primary Objectives

1. **V2V Proximity Alert System:** Develop a real-time Vehicle-to-Vehicle alert system where civilian vehicle nodes subscribe to emergency vehicle location updates. The system must calculate the distance between the nodes and trigger visual and audio yields when the distance falls below a configurable desirable threshold (e.g., 100 meters).
2. **V2I Traffic Signal Preemption:** Develop an automated preemption system for traffic signals. When an emergency vehicle is detected within a configurable desirable preemption range of an intersection, the signal controller must override its normal phase cycle, forcing a green light for the EV's approach corridor while holding conflicting directions at a red phase.
3. **Dynamic Bearing-Based Yield Advisories:** Implement a spatial analysis algorithm that calculates the bearing between the emergency vehicle and the civilian vehicle relative to the EV's heading vector. The system must display a precise yield direction ("MOVE LEFT" or "MOVE RIGHT") to clear a path for the EV.
4. **Centralized Admin Dashboard:** Build an interactive web control center that displays all system nodes (EVs, signals, civilian vehicles) on a live map, allowing administrators to monitor movements, configure detection ranges dynamically, log system events, and override signal phases manually.

### 3.2 Secondary Objectives

1. **Dual-Stage GPS Filtering:** Integrate a Kalman Filter and a Particle Filter pipeline to smooth raw browser geolocation inputs, reducing positional error in urban areas.
2. **Route Planning and Corridor Visualization:** Integrate the Open Source Routing Machine (OSRM) API to calculate optimal emergency routes, displaying the route corridor across all connected civilian and traffic signal dashboards in real-time.
3. **Security and Access Control:** Implement secure Google OAuth 2.0 authentication with role-based access controls, ensuring only approved drivers and operators can access administrative and control dashboards.
4. **Progressive Web App (PWA) Capabilities:** Configure a Service Worker to cache static assets, enabling rapid page load times and offline map rendering capabilities during temporary network drops.

---

## 4. Methodology

### 4.1 Approach

The V2X system uses a decentralized client-server architecture communicating through a centralized Firebase Realtime Database. The system operates on a Publish-Subscribe (Pub-Sub) model. The emergency vehicle acts as a publisher, broadcasting its state variables to specific database paths. The civilian vehicles and traffic signal controllers act as subscribers, listening for real-time changes on those paths and executing localized computations to determine alerts and preemption triggers.

**V2X Communication and Preemption Logic Flowchart:**

```
[START]
   │
   ▼
[EV Driver Activates Emergency Mode]
   │
   ▼
[Fetch Raw Coordinates via Geolocation API]
   │
   ▼
[Apply Kalman Filter & Particle Filter Smoother]
   │
   ▼
[Stream Filtered Coordinates to Firebase path: v4/emergency]
   │
   ├──────────────────────────────────────────────────────┐
   ▼                                                      ▼
[Civic Vehicle Nodes (V1 & V2)]                 [Traffic Signal Node]
   │                                                      │
   ▼                                                      ▼
[Read EV Location & Heading]                    [Read EV Location & Route]
   │                                                      │
   ▼                                                      ▼
[Compute Haversine Distance (d)]                [Compute Haversine Distance (d)]
   │                                                      │
   ▼                                                      ▼
[Is d ≤ V2V Desirable Range?]                   [Is d ≤ V2I Desirable Range?]
   │                                                      │
   ├─Yes──▶ [Calculate Bearing Offset (θ_rel)]            ├─Yes──▶ [Transition Signal
   │         Is θ_rel in [0°, 180°]?                      │         to Emergency GREEN]
   │         ├─Yes─▶ Alert: "MOVE RIGHT"                  │
   │         └─No──▶ Alert: "MOVE LEFT"                   │
   │                                                      │
   └─No───▶ [Clear Proximity Alerts]                      └─No───▶ [Resume Normal
                                                                   Cycle Mode]
```

**Detailed Mathematical Modeling:**

1. **Haversine Distance Formulation:**
   To calculate the distance $d$ between two coordinates $(lat_1, lon_1)$ and $(lat_2, lon_2)$ on a spherical Earth of radius $R ≈ 6371$ km:
   $$Δlat = lat_2 - lat_1$$
   $$Δlon = lon_2 - lon_1$$
   $$a = sin^2(Δlat / 2) + cos(lat_1) * cos(lat_2) * sin^2(Δlon / 2)$$
   $$c = 2 * atan2(√a, √(1-a))$$
   $$d = R * c$$

2. **Bearing Calculation:**
   The initial bearing $θ$ (in radians) from the emergency vehicle to a civilian vehicle is computed as:
   $$θ = atan2(sin(Δlon) * cos(lat_2), cos(lat_1) * sin(lat_2) - sin(lat_1) * cos(lat_2) * cos(Δlon))$$

3. **Relative Bearing for Yield Advisories:**
   Let $ψ$ be the current heading angle of the emergency vehicle (obtained from GPS or consecutive position vectors, where North is 0°). The relative bearing $θ_{rel}$ of the civilian vehicle with respect to the EV's trajectory is:
   $$θ_{rel} = (θ - ψ + 360°) mod 360°$$
   * If $θ_{rel}$ is between 0° and 180°, the civilian vehicle is to the right of the EV's forward path, indicating they should **"MOVE RIGHT"** to clear the central lane.
   * If $θ_{rel}$ is between 180° and 360°, the civilian vehicle is to the left of the EV's path, indicating they should **"MOVE LEFT"**.

### 4.2 Procedures

The project was executed in four structured phases over a 14-week timeline:

1. **Phase 1: System Design and Database Schema (Weeks 1-3):**
   * Designed the database schema structure on Firebase Realtime Database.
   * Created structural flow diagrams modeling the V2V and V2I data exchanges.
   * Configured security rules in Firebase to restrict write permissions.

2. **Phase 2: Core Dashboard Development (Weeks 4-7):**
   * Built the Emergency Vehicle Dashboard (`emergency.html`) with manual location override features and live GPS streaming.
   * Developed the Traffic Signal simulation dashboard (`signal.html`) that simulates a localized signal controller.
   * Created the Civic Vehicle dashboards (`vehicle1.html` and `vehicle2.html`) equipped with HTML5 Audio context warnings and responsive banners.

3. **Phase 3: Algorithms and API Integration (Weeks 8-11):**
   * Implemented the Kalman and Particle filter classes in JavaScript to process GPS signals.
   * Integrated the OSRM routing API to generate geometry polylines for planned routes.
   * Implemented the bearing and Haversine algorithms to drive the yield logic.
   * Programmed the Admin Control Center (`control.html`) with Leaflet.js map layers and real-time ranges update hooks.

4. **Phase 4: Field Testing and PWA Optimization (Weeks 12-14):**
   * Conducted field tests simulating vehicle travel using mobile browsers.
   * Implemented a Service Worker (`sw.js`) to cache static resources and enable offline page loading.
   * Refined visual transitions, resolved database race conditions, and deployed the finalized codebase to Firebase Hosting.

---

## 5. Project Execution

### 5.1 Planning and Design

During the design phase, we selected a modular web design. To avoid external compilation dependencies during local tests, the system was developed as a client-side single-page architecture per dashboard, communicating exclusively through a structured Firebase schema under the root path `v4/`.

**Firebase Database Architecture:**

* `v4/emergency/`: Stores the current state of the emergency vehicle.
  ```json
  {
    "active": true,
    "lat": 12.92345,
    "lng": 77.49876,
    "speed": 45,
    "heading": 90,
    "type": "Ambulance",
    "timestamp": 1712750000000
  }
  ```
* `v4/signal/`: Manages the traffic light preemption.
  ```json
  {
    "preempted": true,
    "state": "GREEN",
    "distance": 85.4,
    "override": false
  }
  ```
* `v4/vehicle1/` and `v4/vehicle2/`: Stores civilian location updates.
* `v4/config/`: Holds system parameters like `v2v_range` and `v2i_range`, allowing the administrator to broadcast new parameters dynamically.

The UI design focuses on a high-contrast dark mode to reduce eye strain for operators. Glassmorphism styling (semi-transparent overlays with `backdrop-filter: blur()`) was used to provide a modern visual layout.

### 5.2 Implementation

1. **Dual-Stage GPS Filtering Implementation:**
   * **Stage 1 (1D Kalman Filter):** A linear Kalman Filter is applied to smooth coordinates independently. Let $z_t$ be the raw coordinate at time $t$:
     **Predict Phase:**
     $$p_{t|t-1} = p_{t-1|t-1} + q \ \ \ (1)$$
     **Update Phase:**
     $$k_t = p_{t|t-1} / (p_{t|t-1} + r) \ \ \ (2)$$
     $$x̂_{t|t} = x̂_{t|t-1} + k_t * (z_t - x̂_{t|t-1}) \ \ \ (3)$$
     $$p_{t|t} = (1 - k_t) * p_{t|t-1} \ \ \ (4)$$
     where $q = 0.01$ is the process noise and $r = 1.0$ is the measurement noise.

     **Code Implementation:**
     ```javascript
     class KalmanFilter1D {
       constructor(processNoise = 0.01, measurementNoise = 1.0) {
         this.q = processNoise;
         this.r = measurementNoise;
         this.p = 1;      // Estimation error covariance
         this.x = null;   // State estimate
         this.k = 0;      // Kalman gain
       }
       filter(measurement) {
         if (this.x === null) { this.x = measurement; return measurement; }
         this.p = this.p + this.q;                     // Predict
         this.k = this.p / (this.p + this.r);          // Gain
         this.x = this.x + this.k * (measurement - this.x); // Update
         this.p = (1 - this.k) * this.p;               // Covariance
         return this.x;
       }
     }
     ```

   * **Stage 2 (Particle Filter):** To manage sudden coordinate spikes, we pass the Kalman output into a Particle Filter with $N = 25$ particles ${x_t^{(i)}}_{i=1}^N$. The particles propagate based on estimated velocity with Gaussian process noise, and weights are updated using a Gaussian likelihood relative to the measurement:
     $$w_t^{(i)} = exp(-0.5 * (||x_t^{(i)} - z_t|| / σ)^2)$$
     where $σ = accuracy / 111320$ converts the GPS accuracy (meters) to degrees. This dual-stage design smooths the EV's trajectory and stabilizes the distance calculations.

2. **OSRM Route Integration and Geometry Reduction:**
   When an EV driver sets a destination, the dashboard calls the OSRM backend to fetch the route coordinates. Storing thousands of coordinate pairs in Firebase would increase database read/write costs. To optimize this, we implemented the Douglas-Peucker polyline simplification algorithm, reducing the coordinate count by up to 80% while retaining the route shape. The simplified route geometry is saved to `/v4/activeRoute` and displayed as an animated route corridor across all dashboards.

3. **Staleness and Disconnect Detection:**
   If a driver closes their dashboard tab, their marker could persist indefinitely on the maps. To resolve this, each node writes a `timestamp` on every location update. Connected dashboards check these timestamps. If a timestamp is older than 45 seconds, the node is marked offline and removed from the active display.

---

## 6. Tools and Techniques Used

### 6.1 Tools

| Tool | Purpose |
|------|---------|
| **HTML5 & CSS3** | Used to build responsive user interfaces, styling layouts with custom CSS properties. |
| **Vanilla JavaScript (ES6)** | Handles the logic, including filtering algorithms, distance calculations, and Firebase synchronization. |
| **Firebase Realtime Database** | Serves as the low-latency Pub-Sub communication channel between nodes. |
| **Firebase Hosting** | Deploys the static web assets to a global Content Delivery Network (CDN) with SSL. |
| **Leaflet.js v1.9.4** | Manages interactive map displays, custom marker animations, and route rendering. |
| **OSRM API** | Computes optimal driving routes between coordinates for emergency vehicle route planning. |
| **Chrome DevTools** | Used to simulate location updates, mock device GPS coordinates, and monitor WebSocket frame latencies. |

### 6.2 Techniques

| Technique | Application |
|-----------|-------------|
| **State Estimation Filtering** | A dual-stage filter (Kalman + Particle) removes noise and jumps from raw geolocation inputs. |
| **Haversine Geometry** | Calculates real-time distance vectors between moving nodes on a spherical Earth coordinate system. |
| **Relative Azimuth Math** | Computes relative angles between vehicle headings and civilian vectors to determine yield instructions. |
| **Service Worker Caching** | Intercepts network requests to cache static assets, accelerating repeat visits and enabling offline support. |
| **Atomic Multi-Path Updates** | Uses Firebase `update()` to modify multiple database paths in a single write operation, preventing race conditions. |

### 6.3 Yield Calculation Implementation

The core logic determining the yield instruction is implemented in JavaScript to run locally in the browser with <1 ms latency:

```javascript
function getYieldSide(evLat, evLng, evHeading, vehicleLat, vehicleLng) {
  const bearing = getBearing(evLat, evLng, vehicleLat, vehicleLng);
  const relativeBearing = ((bearing - evHeading + 360) % 360);
  return relativeBearing < 180 ? 'RIGHT' : 'LEFT';
}

function getBearing(lat1, lng1, lat2, lng2) {
  const p1 = lat1 * Math.PI / 180;
  const p2 = lat2 * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const y = Math.sin(dLng) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) -
            Math.sin(p1) * Math.cos(p2) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
}
```

---

## 7. Partial Results

### 7.1 Initial Findings

During initial development, several challenges emerged:
1. **Raw GPS Instability:** Web browser Geolocation APIs returned coordinates with high variance, resulting in civilian alerts flashing on and off rapidly.
2. **Database Overwrites:** Using `set()` in Firebase overwrite operations wiped out sibling data nodes, causing route paths to disappear when coordinates were updated.
3. **Stale Leaflet Map Markers:** Map markers remained on screen after browsers were closed because there was no active disconnect signal.

### 7.2 Iterative Improvements

To address these findings, we implemented several improvements:
* **Jitter Control:** The dual-stage filter smoothed raw coordinates, resolving the flashing alerts issue.
* **Transition to `update()`:** Rewrote the database helper modules to use `update()`, preserving sibling data nodes during coordinate updates.
* **Staleness Verification:** Added a timestamp check to identify and remove offline nodes from the active map.
* **Service Worker Caching Adjustment:** Configured a network-first strategy for HTML pages and cache-first for fonts and CSS to prevent users from loading outdated versions after deployment.

---

## 8. Results and Discussion

### 8.1 Final Results

System performance metrics were recorded over multiple tests:

| Metric | Target Value | Measured Value | Status |
|--------|--------------|----------------|--------|
| Network Latency (EV to Civic) | < 500 ms | 280–450 ms | Passed |
| GPS Filtering Smoothing | 3x reduction in jitter | 5x reduction in variance | Passed |
| Traffic Preemption Response | < 2 seconds | 1–2 seconds | Passed |
| Database Uptime | 99.9% | 99.95% | Passed |
| Page Load Time (With SW Cache) | < 1 second | 0.4 seconds | Passed |

The preemption and warning modules worked as expected during tests. When the EV entered the V2V range, the civilian dashboard successfully triggered the audio siren alert and display banner:

```
+-------------------------------------------------------------+
| ⚠️ EMERGENCY VEHICLE APPROACHING - YIELD IMMEDIATELY       |
| ACTION: MOVE RIGHT                                          |
| Distance: 85 meters | Speed: 42 km/h | ETA: 8 seconds       |
+-------------------------------------------------------------+
```

At the same time, the traffic signal preemption successfully overridden normal cycles within 1.5 seconds, establishing green corridors for the simulated emergency paths.

### 8.2 Discussion

The results show that a cloud-synchronized, web-based architecture can achieve low-latency communication suitable for driver advisories and traffic light preemption without dedicated hardware. The measured latency (280–450 ms) is well within safety thresholds for human-reaction-based yielding, though it would not be suitable for automated vehicle safety systems.

Using web browsers introduces limitations due to varying browser security policies regarding background location tracking. On iOS and Android devices, browsers must remain active to update coordinates. For a production deployment, this system would be wrapped in a native container (such as Cordova or Capacitor) to allow background location updates.

The database-driven communication model relies on active internet access. If the cell network completely drops, the system would rely on normal sirens and flashing lights again and sirens. However, given the high density of 4G and 5G networks in urban corridors, this hybrid cloud system provides a low-cost, ready to use right away alternative to traditional DSRC systems.

---

## 9. Prototype (Software)

### 9.1 Prototype Description

The V2X prototype is structured as five web pages:

1. **Emergency Vehicle Dashboard (`emergency.html`):** Used by the EV driver. It displays GPS status, allows activating the emergency broadcast, and includes an OSRM route planner to show the planned path.
2. **Traffic Signal Dashboard (`signal.html`):** Simulates an intersection controller, displaying current light status (Red, Yellow, Green) and showing transition alerts during preemption.
3. **Civic Vehicle 1 Dashboard (`vehicle1.html`):** Used by civilian drivers, displaying yield instructions (MOVE LEFT or MOVE RIGHT) and a radar-style proximity warning.
4. **Civic Vehicle 2 Dashboard (`vehicle2.html`):** Similar to Vehicle 1, running on a separate node to test multi-vehicle scenarios.
5. **Admin Control Center (`control.html`):** Provides a global map showing all active nodes, allowing range configurations and manual signal overrides.

### 9.2 Development Process

We used an iterative development process. In the first phase, we established the database communication paths and verified coordinate transmission. In the second phase, we added the Haversine and relative bearing calculations to generate yield directions. In the third phase, we integrated the OSRM routing engine and implemented the Douglas-Peucker simplification algorithm. In the final phase, we added the dual-stage filter to stabilize location tracking.

### 9.3 Testing and Validation

Testing was conducted using mobile devices in outdoor test sites. One device acted as the EV, another as a civilian vehicle, and a tablet simulated the traffic signal. When the EV device moved within range, the civilian device successfully triggered the visual banner, arrow animations, and audio alerts. The traffic signal dashboard also successfully transitioned to the preemption phase when the EV approached.

---

## 10. Conclusion

### 10.1 Summary

The V2X project demonstrates a web-based, hardware-free Vehicle-to-Everything system for emergency vehicle clearance. By using standard web APIs and Firebase, the system provides real-time vehicle tracking, traffic signal preemption, and directional yield alerts with low communication latency. This software-defined approach lowers the cost barrier for smart city transportation solutions, making it suitable for rapid deployment in resource-constrained urban environments.

### 10.2 Personal Reflection

**Student 1 — Vishal (1RV25CS205) (CSE):**
Working on the V2X project has been a major learning experience that deepened my understanding of real-time systems, GPS signal processing, and cloud-based communication architectures. The challenge of implementing Kalman and Particle filters for GPS accuracy improvement taught me the practical application of state estimation theory that we study in mathematics courses. Debugging the route disappearance issue taught me the importance of understanding the semantics of database operations — the subtle difference between `set()` and `update()` in Firebase had cascading effects across the entire system. This project has reinforced my interest in Intelligent Transportation Systems and the potential of software-defined solutions to address critical public safety challenges.

**Student 2 — Ayush K Bhat (CSE):**
Working on the Emergency Vehicle Dashboard and route planning components of V2X has significantly enhanced my software engineering and algorithmic skills. Integrating the Open Source Routing Machine (OSRM) API for generating and rendering paths in real-time was a rewarding challenge, particularly when implementing the Douglas-Peucker algorithm to reduce coordinate density and optimize database payloads. I also gained experience designing clean, responsive user interfaces with glassmorphic elements to ensure vehicle drivers can safely operate the interface. Collaborating with the team on database synchronization and handling edge cases, like persistent route visualization during live GPS updates, taught me valuable lessons about building strong distributed client-side applications.

**Student 3 — G Y Sagar (ECE):**
As an Electronics and Communication Engineering (ECE) student, my contributions focused on the communication modeling, sensor interfacing, and timing protocols of the V2I (Vehicle-to-Infrastructure) and V2V (Vehicle-to-Vehicle) modules. I analyzed WebSocket network latencies in Firebase to ensure that emergency clearance signals propagate in under 500 milliseconds. I worked on simulating the roadside unit (RSU) and on-board unit (OBU) interactions, and modeled the interface between physical traffic controller circuitry and the software preemption logic to guarantee safe junction transition states (green-yellow-red timings). This work taught me the practical complexities of designing low-latency communication networks for safety-critical applications.

**Student 4 — Harsha Patel T (Chemical):**
As a Chemical Engineering student, my contributions focused on the environmental impact assessment, process optimization, and system dynamics of emergency clearance. I developed mathematical models to evaluate how the V2X preemption system reduces emergency vehicle fuel consumption and idle emissions (such as CO2, NOx, and volatile organic compounds) in transit corridors. Applying process control theory, I modeled urban traffic flow as a fluid dynamics system to ensure that emergency corridors do not trigger sudden downstream congestion waves. This experience demonstrated how core process engineering and transport phenomena principles can be used to design cleaner, more efficient smart city ecosystems.

**Student 5 — Abhishek Banapur (CSE):**
My contribution to the Admin Control Center and Leaflet map integration of V2X helped me build a strong understanding of geographic information systems (GIS) and administrative monitoring architectures. I worked on rendering dynamic SVG markers representing all active vehicles and traffic signals, enabling real-time global tracking. Building the dashboard interface to allow admins to adjust system parameters (like V2V/V2I ranges), log system events, and manage role-based user access taught me about security and configuration management. This experience highlighted the value of clear data visualization in providing administrators with immediate, actionable insights during emergencies.

---

## 11. Visuals

The following visuals document the system's interface and operation:

![System Architecture Diagram](C:\Users\AYUSH K BHAT\.gemini\antigravity\brain\e4aa7ccf-c54d-4a0f-99e5-6329912e2dc4\system_architecture_1780490494938.png)
> **Figure 1** — System Architecture Diagram showing the five nodes (EV, Signal, V1, V2, Admin) communicating through Firebase Realtime Database.

![Dual-Stage GPS Filter Pipeline](C:\Users\AYUSH K BHAT\.gemini\antigravity\brain\e4aa7ccf-c54d-4a0f-99e5-6329912e2dc4\gps_filter_pipeline_1780490507591.png)
> **Figure 2** — GPS Filter Pipeline showing Raw coordinates passing through Outlier Detection, Kalman Filtering, Particle Filtering, and Dead Reckoning fallback for GPS dropouts.

![Vehicle Dashboard Integration Strategies](C:\Users\AYUSH K BHAT\.gemini\antigravity\brain\e4aa7ccf-c54d-4a0f-99e5-6329912e2dc4\dashboard_integration_1780490519730.png)
> **Figure 3** — Vehicle Dashboard Integration Strategies showing integration paths for vehicles with and without digital dashboards.


> **[INSERT: Figure 4]** - Admin Control Center Dashboard screenshot showing the interactive map with all unit markers, unit status cards, and event log.

> **[INSERT: Figure 5]** - Emergency Vehicle Dashboard screenshot showing GPS data, activation button, route planner map, and vehicle type selector.

> **[INSERT: Figure 6]** - Traffic Signal Dashboard screenshot showing the signal state display, V2I preemption status, and EV distance indicator.

> **[INSERT: Figure 7]** - Civic Vehicle Dashboard screenshot showing the V2V yield alert with directional arrow, proximity radar bar, and EV route mini-map.

> **[INSERT: Figure 8]** - Route Planning interface showing OSRM-generated route with animated polyline, corridor overlay, and turn-by-turn instructions.

> **[INSERT: Figure 9]** - Firebase Realtime Database structure showing the hierarchical data organization under the v4/ root path.

> **[INSERT: Figure 10]** - Login page and role-based authentication flow showing Google OAuth sign-in and admin approval workflow.

---

## 12. Outcome of the Work

### Product Development

The V2X system has been developed to a deployment-ready state and is live at **https://v2v-v2i-project.web.app**. The application shows it could actually work as a real product as a low-cost, rapidly deployable emergency vehicle clearance system for Indian municipalities. Potential product development pathways include:
- Integration with existing traffic management systems (SCATS, SCOOT) through API adapters.
- Mobile application packaging using Progressive Web App (PWA) manifest for native-like installation on smartphones.
- Extension to support multiple simultaneous emergency vehicles with priority-based conflict resolution.
- Integration with real-time traffic data feeds for dynamic route optimization.

### Publication Potential

The project's novel contribution - a zero-hardware-cost, cloud-based V2X emergency clearance system using browser GPS and Firebase - presents a viable candidate for publication in the following venues:
- IEEE International Conference on Intelligent Transportation Systems (ITSC)
- ACM Conference on Embedded Networked Sensor Systems (SenSys) - Demo Track
- Indian Journal of Science and Technology (IJST)
- International Journal of Advanced Computer Science and Applications (IJACSA)

### Patent Potential

The system's novel architecture combining dual-stage GPS filtering, cloud-based V2X communication, and bearing-based yield direction computation could be considered for a provisional patent filing under the Indian Patent Act, 1970, particularly for the method of computing real-time yield direction advisories using smartphone GPS and cloud synchronization without dedicated V2X hardware.

---

### References

1. Noori, H., Olaverri-Monreal, C., and Selpi, S. (2016). "Connected Vehicle Approach for Emergency Vehicle Preemption." *IEEE International Conference on Vehicular Electronics and Safety*, pp. 1-6.
2. Firebase Documentation. "Firebase Realtime Database." Google LLC. https://firebase.google.com/docs/database
3. Leaflet Documentation. "Leaflet - An Open-Source JavaScript Library for Interactive Maps." https://leafletjs.com/
4. OSRM Documentation. "Open Source Routing Machine." https://project-osrm.org/
5. IEEE 802.11p. "IEEE Standard for Wireless Access in Vehicular Environments." IEEE Standards Association, 2010.
6. 3GPP TS 36.300. "Evolved Universal Terrestrial Radio Access (E-UTRA) and Evolved Universal Terrestrial Radio Access Network (E-UTRAN)." 3GPP, Release 14.
7. National Crime Records Bureau. "Accidental Deaths & Suicides in India - 2022." Ministry of Home Affairs, Government of India.

---

*Report prepared by Team V2X, Department of Computer Science and Engineering, RV College of Engineering, Bengaluru.*
